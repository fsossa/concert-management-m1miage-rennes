import { Injectable, NgZone, computed, inject, signal } from '@angular/core';

import { CreateNotificationPayload, NotificationResponse } from './notification.types';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly zone = inject(NgZone);
  private readonly baseUrl = 'http://localhost:8080';
  private eventSource: EventSource | null = null;
  private connectedUserId: number | null = null;

  readonly notifications = signal<NotificationResponse[]>([]);
  private readonly serverUnreadCount = signal(0);
  readonly unreadCount = computed(() => Math.max(
    this.serverUnreadCount(),
    this.countUnread(this.notifications())
  ));
  readonly connected = signal(false);
  readonly error = signal<string | null>(null);
  readonly ticketRefreshVersion = signal(0);

  async create(payload: CreateNotificationPayload, token?: string): Promise<void> {
    try {
      await this.requestJson<NotificationResponse>('/notifications', {
        method: 'POST',
        body: JSON.stringify(payload)
      }, token);
    } catch {
      this.zone.run(() => {
        this.error.set('Impossible de creer la notification.');
      });
    }
  }

  async load(userId: number, token?: string): Promise<void> {
    const [notifications, unreadCount] = await Promise.all([
      this.requestJson<NotificationResponse[]>(`/notifications/user/${userId}`, {}, token).catch(() => []),
      this.requestJson<number>(`/notifications/user/${userId}/unread-count`, {}, token).catch(() => 0)
    ]);

    this.zone.run(() => {
      const sortedNotifications = this.sortNotifications(notifications.map((notification) => this.normalizeNotification(notification)));
      const localUnreadCount = this.countUnread(sortedNotifications);

      this.notifications.set(sortedNotifications);
      this.serverUnreadCount.set(Math.max(unreadCount, localUnreadCount));
    });
  }

  connect(userId: number): void {
    if (this.eventSource && this.connectedUserId === userId) {
      return;
    }

    this.closeStream();
    this.connectedUserId = userId;

    const source = new EventSource(`${this.baseUrl}/notifications/stream/${userId}`);
    this.eventSource = source;

    source.onopen = () => {
      this.zone.run(() => {
        this.connected.set(true);
        this.error.set(null);
      });
    };

    source.onmessage = (event) => this.receiveEvent(event);
    source.addEventListener('notification', (event) => this.receiveEvent(event));

    source.onerror = () => {
      this.zone.run(() => {
        this.connected.set(false);
        this.error.set('Flux notifications indisponible.');
      });
    };
  }

  async markAsRead(notificationId: number, token?: string): Promise<void> {
    try {
      const notification = await this.requestJson<NotificationResponse>(`/notifications/${notificationId}/read`, {
        method: 'PUT'
      }, token);

      this.zone.run(() => {
        this.replaceNotification(notification);
      });
    } catch {
      this.zone.run(() => {
        this.error.set('Impossible de marquer la notification comme lue.');
      });
    }
  }

  async markAllAsRead(userId: number, token?: string): Promise<void> {
    try {
      await this.requestEmpty(`/notifications/user/${userId}/read-all`, { method: 'PUT' }, token);

      this.zone.run(() => {
        this.notifications.set(this.notifications().map((notification) => ({ ...notification, read: true })));
        this.serverUnreadCount.set(0);
      });
    } catch {
      this.zone.run(() => {
        this.error.set('Impossible de marquer toutes les notifications comme lues.');
      });
    }
  }

  closeStream(): void {
    this.eventSource?.close();
    this.eventSource = null;
    this.connectedUserId = null;
    this.connected.set(false);
  }

  reset(): void {
    this.closeStream();
    this.notifications.set([]);
    this.serverUnreadCount.set(0);
    this.error.set(null);
  }

  private receiveEvent(event: MessageEvent): void {
    this.zone.run(() => {
      try {
        const notification = this.normalizeNotification(JSON.parse(event.data) as NotificationResponse);
        this.upsertNotification(notification);
        this.error.set(null);
      } catch {
        this.error.set('Notification recue illisible.');
      }
    });
  }

  private upsertNotification(notification: NotificationResponse): void {
    const notifications = this.sortNotifications([
      this.normalizeNotification(notification),
      ...this.notifications().filter((item) => item.id !== notification.id)
    ]);

    this.notifications.set(notifications);
    this.ticketRefreshVersion.update((version) => version + 1);
  }

  private replaceNotification(notification: NotificationResponse): void {
    const normalizedNotification = this.normalizeNotification(notification);
    const notifications = this.sortNotifications(
      this.notifications().map((item) => item.id === normalizedNotification.id ? normalizedNotification : item)
    );

    this.notifications.set(notifications);
  }

  private countUnread(notifications: NotificationResponse[]): number {
    return notifications.filter((item) => this.isUnread(item)).length;
  }

  private isUnread(notification: NotificationResponse): boolean {
    return notification.read !== true;
  }

  private normalizeNotification(notification: NotificationResponse): NotificationResponse {
    const readValue = notification.read ?? notification.isRead ?? false;

    return {
      ...notification,
      organizerId: this.extractOrganizerId(notification),
      read: this.toBoolean(readValue)
    };
  }

  private extractOrganizerId(notification: NotificationResponse): number | null {
    return this.toNullableNumber(
      notification.organizerId
      ?? notification.organizerID
      ?? notification.organizer_id
      ?? notification.organizerid
      ?? notification.concertOrganizerId
      ?? notification.organizer?.id
    );
  }

  private toNullableNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'number') {
      return Number.isNaN(value) ? null : value;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private toBoolean(value: boolean | string | number): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    return value.toLowerCase() === 'true' || value === '1';
  }

  private sortNotifications(notifications: NotificationResponse[]): NotificationResponse[] {
    return [...notifications].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  private async requestJson<T>(path: string, init: RequestInit, token?: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: this.headers(token, init.headers)
    });

    if (!response.ok) {
      throw new Error(`Notification request failed with ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  private async requestEmpty(path: string, init: RequestInit, token?: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: this.headers(token, init.headers)
    });

    if (!response.ok) {
      throw new Error(`Notification request failed with ${response.status}`);
    }
  }

  private headers(token?: string, headers?: HeadersInit): Headers {
    const result = new Headers(headers);
    result.set('Content-Type', 'application/json');

    if (token) {
      result.set('Authorization', `Bearer ${token}`);
    }

    return result;
  }
}
