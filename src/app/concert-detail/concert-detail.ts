import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import Swal from 'sweetalert2';

import { ArtistResponse, ConcertResponse, TicketResponse } from '../core/api.types';
import { AuthStoreService } from '../core/auth-store.service';
import { BackendApiService } from '../core/backend-api.service';

interface TicketItem {
  id: number;
  type: string;
  price: string;
  capacity: number;
  soldOut: boolean;
  available: boolean;
}

@Component({
  selector: 'app-concert-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './concert-detail.html'
})
export class ConcertDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(BackendApiService);
  private readonly authStore = inject(AuthStoreService);

  protected readonly loading = signal(true);
  protected readonly buyingTicketId = signal<number | null>(null);
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
      .pipe(
        switchMap((concert) => {
          this.concert.set(concert);
          const artistRequests = concert.artistIds.map((artistId) =>
            this.api.artistById(artistId).pipe(catchError(() => of(null)))
          );
          if (artistRequests.length > 0) {
            forkJoin(artistRequests)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe((artistDtos) => {
                const artistById = new Map<number, ArtistResponse>();
                artistDtos
                  .filter((artist): artist is ArtistResponse => artist !== null)
                  .forEach((artist) => artistById.set(artist.id, artist));

                this.invitedArtists.set(concert.artistIds.map((artistId) => (
                  artistById.get(artistId)?.name ?? `Artiste #${artistId}`
                )));
              });
          } else {
            this.invitedArtists.set([]);
          }

          const detailedTickets = concert.tickets ?? [];
          if (detailedTickets.length > 0) {
            this.tickets.set(detailedTickets.map((ticket) => this.toTicketItem(ticket)));
            return of(null);
          }

          const ticketRequests = concert.ticketIds.map((ticketId) =>
            this.api.ticketById(ticketId).pipe(catchError(() => of(null)))
          );

          if (ticketRequests.length === 0) {
            this.tickets.set([]);
            return of(null);
          }

          return forkJoin(ticketRequests).pipe(
            map((ticketDtos) => {
              const resolved = ticketDtos.filter((ticket): ticket is TicketResponse => ticket !== null);
              if (resolved.length > 0) {
                this.tickets.set(resolved.map((ticket) => this.toTicketItem(ticket)));
              } else {
                this.tickets.set(
                  concert.ticketIds.map((ticketId) => ({
                    id: ticketId,
                    type: `Ticket #${ticketId}`,
                    price: 'Prix indisponible',
                    capacity: 0,
                    soldOut: true,
                    available: false
                  }))
                );
              }
              return null;
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Concert introuvable ou indisponible.');
          this.loading.set(false);
        }
      });
  }

  protected canBuyTicket(): boolean {
    const token = this.authStore.token();
    const roles = this.authStore.roles();
    return !!token && roles.includes('CUSTOMER');
  }

  protected async buyTicket(ticket: TicketItem): Promise<void> {
    if (!this.canBuyTicket()) {
      return;
    }
    if (!ticket.available || ticket.capacity <= 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'Ticket indisponible',
        text: 'Ce ticket n est plus disponible.'
      });
      return;
    }

    const token = this.authStore.token();
    if (!token) {
      return;
    }

    const confirmation = await Swal.fire({
      icon: 'question',
      title: 'Confirmer le paiement',
      text: `Acheter le ticket "${ticket.type}" ?`,
      showCancelButton: true,
      confirmButtonText: 'Confirmer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#16a34a'
    });

    if (!confirmation.isConfirmed) {
      await Swal.fire({
        icon: 'info',
        title: 'Annule',
        timer: 1200,
        showConfirmButton: false
      });
      return;
    }

    const previousCapacity = ticket.capacity;
    this.buyingTicketId.set(ticket.id);

    this.api.buyTicket(token, { ticketId: ticket.id })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedTicket) => {
          this.tickets.update((current) => current.map((item) => (
            item.id === updatedTicket.id ? this.toTicketItem(updatedTicket) : item
          )));
          this.buyingTicketId.set(null);
          void Swal.fire({
            icon: 'success',
            title: 'Paiement confirme',
            text: 'Le ticket a ete achete avec succes.'
          });
        },
        error: () => {
          this.api.ticketById(ticket.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (refreshedTicket) => {
                this.tickets.update((current) => current.map((item) => (
                  item.id === refreshedTicket.id ? this.toTicketItem(refreshedTicket) : item
                )));
                this.buyingTicketId.set(null);

                if (refreshedTicket.capacity < previousCapacity) {
                  void Swal.fire({
                    icon: 'success',
                    title: 'Paiement confirme',
                    text: 'Le ticket a bien ete achete. Le stock a ete mis a jour.'
                  });
                } else {
                  void Swal.fire({
                    icon: 'error',
                    title: 'Paiement non abouti',
                    text: 'Achat refuse. Verifie la disponibilite du ticket.'
                  });
                }
              },
              error: () => {
                this.buyingTicketId.set(null);
                void Swal.fire({
                  icon: 'error',
                  title: 'Paiement non abouti',
                  text: 'Une erreur est survenue lors du paiement.'
                });
              }
            });
        }
      });
  }

  private toTicketItem(ticket: TicketResponse): TicketItem {
    return {
      id: ticket.id,
      type: ticket.title || `Ticket #${ticket.id}`,
      price: `${ticket.price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`,
      capacity: ticket.capacity,
      soldOut: ticket.statut.toLowerCase() === 'soldout' || ticket.capacity <= 0,
      available: ticket.statut.toLowerCase() === 'available' && ticket.capacity > 0
    };
  }
}
