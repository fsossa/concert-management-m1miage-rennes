import { Injectable, inject, signal } from '@angular/core';

import { NotificationPreferencesResponse } from './api.types';
import { AuthStoreService } from './auth-store.service';
import { BackendApiService } from './backend-api.service';

export type NotificationPreferenceMode = 'ALL' | 'SELECTED';

export type NotificationPreferences = NotificationPreferencesResponse;

@Injectable({ providedIn: 'root' })
export class NotificationPreferencesService {
  private readonly api = inject(BackendApiService);
  private readonly authStore = inject(AuthStoreService);

  readonly error = signal<string | null>(null);
  readonly loading = signal(false);
  readonly preferences = signal<NotificationPreferences>({
    notifyAllOrganizers: true,
    organizerIds: []
  });

  load(): void {
    const token = this.authStore.token();
    if (!token || !this.isCustomer()) {
      this.reset();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.api.customerNotificationPreferences(token).subscribe({
      next: (preferences) => {
        this.preferences.set(this.normalize(preferences));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les préférences de notifications.');
        this.loading.set(false);
      }
    });
  }

  setMode(mode: NotificationPreferenceMode): void {
    this.save({
      ...this.preferences(),
      notifyAllOrganizers: mode === 'ALL'
    });
  }

  toggleOrganizer(organizerId: number): void {
    const current = this.preferences();
    const organizerIds = current.organizerIds.includes(organizerId)
      ? current.organizerIds.filter((id) => id !== organizerId)
      : [...current.organizerIds, organizerId];

    this.save({
      ...current,
      organizerIds
    });
  }

  acceptsOrganizer(organizerId: number | string | null | undefined): boolean {
    const current = this.preferences();

    if (current.notifyAllOrganizers) {
      return true;
    }

    const normalizedOrganizerId = this.toNullableNumber(organizerId);
    if (normalizedOrganizerId === null) {
      return false;
    }

    return current.organizerIds.includes(normalizedOrganizerId);
  }

  reset(): void {
    this.error.set(null);
    this.loading.set(false);
    this.preferences.set({ notifyAllOrganizers: true, organizerIds: [] });
  }

  mode(): NotificationPreferenceMode {
    return this.preferences().notifyAllOrganizers ? 'ALL' : 'SELECTED';
  }

  private save(preferences: NotificationPreferences): void {
    const token = this.authStore.token();
    if (!token) {
      return;
    }

    const previous = this.preferences();
    const next = this.normalize(preferences);
    this.preferences.set(next);
    this.error.set(null);

    this.api.updateCustomerNotificationPreferences(token, next).subscribe({
      next: (savedPreferences) => {
        this.preferences.set(this.normalize(savedPreferences));
      },
      error: () => {
        this.preferences.set(previous);
        this.error.set('Impossible de sauvegarder les préférences de notifications.');
      }
    });
  }

  private normalize(preferences: NotificationPreferences): NotificationPreferences {
    const organizerIds = (preferences.organizerIds ?? [])
      .map((id) => this.toNullableNumber(id))
      .filter((id): id is number => id !== null);

    return {
      notifyAllOrganizers: preferences.notifyAllOrganizers,
      organizerIds: [...new Set(organizerIds)].sort((a, b) => a - b)
    };
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

  private isCustomer(): boolean {
    return this.authStore.roles().some((role) => role.replace(/^ROLE_/, '').toUpperCase() === 'CUSTOMER');
  }
}
