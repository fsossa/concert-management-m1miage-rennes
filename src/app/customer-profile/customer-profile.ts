import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthStoreService } from '../core/auth-store.service';
import { BackendApiService } from '../core/backend-api.service';
import { TicketResponse, UserResponse } from '../core/api.types';

@Component({
  selector: 'app-customer-profile',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './customer-profile.html'
})
export class CustomerProfileComponent {
  private readonly authStore = inject(AuthStoreService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(BackendApiService);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly user = signal<UserResponse | null>(null);
  protected readonly purchasedTickets = signal<TicketResponse[]>([]);
  protected readonly isConnected = computed(() => !!this.authStore.token());

  constructor() {
    this.loadProfile();
  }

  protected simulateConnection(): void {
    // Keep dev helper: use a known seeded account if needed.
    this.error.set("Utilise la page /auth pour te connecter reellement.");
  }

  protected logout(): void {
    this.authStore.clearSession();
    this.user.set(null);
    this.purchasedTickets.set([]);
  }

  private loadProfile(): void {
    const token = this.authStore.token();
    if (!token) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      user: this.api.customerProfile(token),
      tickets: this.api.customerTickets(token)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ user, tickets }) => {
          this.user.set(user);
          this.purchasedTickets.set(tickets);
          this.loading.set(false);
        },
        error: () => {
          this.authStore.clearSession();
          this.error.set('Session invalide ou expiree. Reconnecte-toi.');
          this.loading.set(false);
        }
      });
  }
}

