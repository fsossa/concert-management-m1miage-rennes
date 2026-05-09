import { Component, DestroyRef, OnDestroy, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthStoreService } from '../core/auth-store.service';
import { BackendApiService } from '../core/backend-api.service';
import { NotificationService } from '../core/notification.service';

@Component({
  selector: 'app-organize-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './organize-layout.html'
})
export class OrganizeLayoutComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly api = inject(BackendApiService);
  private readonly authStore = inject(AuthStoreService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly notificationService = inject(NotificationService);
  protected readonly notificationsOpen = signal(false);
  protected readonly notificationUserId = signal<number | null>(null);
  protected readonly unreadNotificationsCount = computed(() =>
    Math.max(
      this.notificationService.unreadCount(),
      this.notificationService.notifications().filter((notification) => !notification.read).length
    )
  );

  protected readonly navItems = [
    { label: 'Dashboard', path: '/organize' },
    { label: 'Concerts', path: '/organize/events' },
    { label: 'Billets', path: '/organize/tickets' },
    { label: 'Artistes', path: '/organize/artists' },
    { label: 'Rapports', path: '/organize/reports' }
  ];

  constructor() {
    this.initOrganizerNotifications();
  }

  ngOnDestroy(): void {
    this.notificationService.closeStream();
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

  protected openCreateConcertModal(): void {
    void this.router.navigate(['/organize'], { queryParams: { create: '1' } });
  }

  protected goHome(): void {
    void this.router.navigateByUrl('/');
  }

  protected logout(): void {
    this.authStore.clearSession();
    void this.router.navigateByUrl('/auth');
  }

  private initOrganizerNotifications(): void {
    const token = this.authStore.token();
    if (!token) {
      return;
    }

    this.api.organizerConcertSalesMe(token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.notificationUserId.set(response.organizerId);
          this.notificationService.load(response.organizerId, token);
          this.notificationService.connect(response.organizerId);
        },
        error: () => {
          this.notificationService.error.set('Notifications indisponibles.');
        }
      });
  }
}
