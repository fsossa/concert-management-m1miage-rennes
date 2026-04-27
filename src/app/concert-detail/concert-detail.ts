import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { signal } from '@angular/core';

import { BackendApiService } from '../core/backend-api.service';
import { ConcertResponse } from '../core/api.types';

interface TicketItem {
  type: string;
  price: string;
  left: number;
}

@Component({
  selector: 'app-concert-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './concert-detail.html'
})
export class ConcertDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(BackendApiService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly concert = signal<ConcertResponse | null>(null);
  protected readonly invitedArtists = signal<string[]>([]);
  protected readonly tickets = signal<TicketItem[]>([]);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id)) {
      this.error.set('Concert invalide.');
      this.loading.set(false);
      return;
    }

    this.api.concertById(id)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (concert) => {
          this.concert.set(concert);
          this.invitedArtists.set(concert.artistIds.map((artistId) => `Artiste #${artistId}`));
          this.tickets.set(
            concert.ticketIds.map((ticketId) => ({
              type: `Ticket #${ticketId}`,
              price: 'Prix via endpoint tickets',
              left: 0
            }))
          );
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Concert introuvable ou indisponible.');
          this.loading.set(false);
        }
      });
  }
}
