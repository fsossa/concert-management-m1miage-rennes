import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ArtistResponse, ConcertResponse, TicketResponse, UserResponse } from '../core/api.types';
import { AuthStoreService } from '../core/auth-store.service';
import { BackendApiService } from '../core/backend-api.service';

@Component({
  selector: 'app-organize-concert-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './organize-concert-detail.html'
})
export class OrganizeConcertDetailComponent {
  private readonly api = inject(BackendApiService);
  private readonly authStore = inject(AuthStoreService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly concert = signal<ConcertResponse | null>(null);
  protected readonly artists = signal<ArtistResponse[]>([]);
  protected readonly tickets = signal<TicketResponse[]>([]);
  protected readonly customers = signal<UserResponse[]>([]);

  protected readonly totalRevenue = computed(() =>
    this.tickets().reduce((sum, ticket) => sum + (ticket.price * ticket.customerIds.length), 0)
  );

  constructor() {
    this.loadDetails();
  }

  protected formatDate(raw: string): string {
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? raw : date.toLocaleString('fr-FR');
  }

  protected formatMoney(value: number): string {
    return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  protected customerFullName(customer: UserResponse): string {
    return `${customer.firstName} ${customer.lastName}`.trim();
  }

  private loadDetails(): void {
    const token = this.authStore.token();
    if (!token) {
      this.error.set('Session organizer requise.');
      this.loading.set(false);
      return;
    }

    const concertId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(concertId) || concertId <= 0) {
      this.error.set('Concert invalide.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      concert: this.api.organizerConcertById(token, concertId),
      artists: this.api.organizerArtistsByConcert(token, concertId),
      tickets: this.api.organizerTicketsByConcert(token, concertId),
      customers: this.api.organizerCustomersByConcert(token, concertId)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ concert, artists, tickets, customers }) => {
          this.concert.set(concert);
          this.artists.set(artists);
          this.tickets.set(tickets);
          this.customers.set(customers);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Impossible de charger le detail du concert.');
          this.loading.set(false);
        }
      });
  }
}

