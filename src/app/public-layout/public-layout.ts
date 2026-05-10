import { Location } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthStoreService } from '../core/auth-store.service';
import { BackendApiService } from '../core/backend-api.service';
import { NotificationPreferencesService } from '../core/notification-preferences.service';
import { NotificationService } from '../core/notification.service';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './public-layout.html'
})
export class PublicLayoutComponent implements OnDestroy {
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly authStore = inject(AuthStoreService);
  private readonly api = inject(BackendApiService);
  protected readonly notificationPreferences = inject(NotificationPreferencesService);
  protected readonly notificationService = inject(NotificationService);
  protected readonly notificationsOpen = signal(false);
  protected readonly notificationUserId = signal<number | null>(null);
  protected readonly visibleNotifications = computed(() =>
    this.notificationService.notifications().filter((notification) =>
      this.notificationPreferences.acceptsOrganizer(notification.organizerId)
    )
  );
  protected readonly unreadNotificationsCount = computed(() =>
    this.visibleNotifications().filter((notification) => !notification.read).length
  );

  protected readonly isConnected = computed(() => !!this.authStore.token());
  protected readonly isOrganizer = computed(
    () => this.isConnected() && this.authStore.roles().some((role) => {
      const normalizedRole = this.normalizeRole(role);
      return normalizedRole === 'ORGANIZER' || normalizedRole === 'ADMIN';
    })
  );
  constructor() {
    this.initNotifications();
  }

  ngOnDestroy(): void {
    this.notificationService.closeStream();
  }

  protected goBack(): void {
    this.location.back();
  }

  protected toggleNotifications(): void {
    this.notificationsOpen.update((open) => !open);
  }

  protected closeNotifications(): void {
    this.notificationsOpen.set(false);
  }

  protected markNotificationAsRead(notificationId: number): void {
    this.notificationService.markAsRead(notificationId, this.authStore.token() ?? undefined);
  }

  protected markAllNotificationsAsRead(): void {
    const userId = this.notificationUserId();
    if (!userId) {
      return;
    }

    this.notificationService.markAllAsRead(userId, this.authStore.token() ?? undefined);
  }

  protected formatNotificationDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  protected logout(): void {
    this.authStore.clearSession();
    this.notificationPreferences.reset();
    this.notificationService.reset();
    void this.router.navigateByUrl('/');
  }

  private initNotifications(): void {
    const token = this.authStore.token();
    if (!token) {
      return;
    }

    this.api.customerProfile(token)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (response) => {
          this.startNotifications(response.id, token);
        },
        error: () => {
          this.notificationService.error.set('Notifications indisponibles.');
        }
      });
  }

  private startNotifications(userId: number, token: string): void {
    this.notificationUserId.set(userId);
    this.notificationPreferences.load();
    this.notificationService.load(userId, token);
    this.notificationService.connect(userId);
  }

  private normalizeRole(role: string): string {
    return role.replace(/^ROLE_/, '').toUpperCase();
  }
}
