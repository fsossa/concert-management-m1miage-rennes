import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ConcertResponse, TicketResponse, UserResponse } from '../core/api.types';
import { AuthStoreService } from '../core/auth-store.service';
import { BackendApiService } from '../core/backend-api.service';

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
  protected readonly concertsById = signal<Record<number, ConcertResponse>>({});
  protected readonly isConnected = computed(() => !!this.authStore.token());

  constructor() {
    this.loadProfile();
  }

  protected simulateConnection(): void {
    this.error.set('Utilise la page /auth pour te connecter reellement.');
  }

  protected logout(): void {
    this.authStore.clearSession();
    this.user.set(null);
    this.purchasedTickets.set([]);
    this.concertsById.set({});
  }

  protected isTicketAvailable(statut: string, capacity: number): boolean {
    return statut.toLowerCase() === 'available' && capacity > 0;
  }

  protected concertTopicForTicket(ticket: TicketResponse): string {
    if (ticket.concertId === null) {
      return 'Concert non lie';
    }
    return this.concertsById()[ticket.concertId]?.topic ?? `Concert #${ticket.concertId}`;
  }

  protected concertDateForTicket(ticket: TicketResponse): string {
    if (ticket.concertId === null) {
      return '';
    }

    const rawDate = this.concertsById()[ticket.concertId]?.date;
    if (!rawDate) {
      return '';
    }

    const date = new Date(rawDate);
    return Number.isNaN(date.getTime()) ? rawDate : date.toLocaleString('fr-FR');
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
      .pipe(
        switchMap(({ user, tickets }) => {
          const uniqueConcertIds = [...new Set(tickets
            .map((ticket) => ticket.concertId)
            .filter((id): id is number => id !== null))];

          if (uniqueConcertIds.length === 0) {
            return of({ user, tickets, concerts: [] as ConcertResponse[] });
          }

          return forkJoin(
            uniqueConcertIds.map((concertId) =>
              this.api.concertById(concertId).pipe(catchError(() => of(null)))
            )
          ).pipe(
            map((concerts) => ({
              user,
              tickets,
              concerts: concerts.filter((concert): concert is ConcertResponse => concert !== null)
            }))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ user, tickets, concerts }) => {
          this.user.set(user);
          this.purchasedTickets.set(tickets);
          const byId: Record<number, ConcertResponse> = {};
          concerts.forEach((concert) => {
            byId[concert.id] = concert;
          });
          this.concertsById.set(byId);
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
