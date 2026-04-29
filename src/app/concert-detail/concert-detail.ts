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
  rawPrice: number;
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

  // Ici on stocke une quantité par ticket.
  // Exemple : { 3: 2, 8: 1 }
  protected readonly quantitiesByTicketId = signal<Record<number, number>>({});

  constructor() {
    this.loadConcert();
  }

  protected canBuyTicket(): boolean {
    const token = this.authStore.token();
    const roles = this.authStore.roles();

    return !!token && roles.includes('CUSTOMER');
  }

  protected ticketQuantity(ticketId: number): number {
    return this.quantitiesByTicketId()[ticketId] ?? 1;
  }

  protected updateQuantity(ticket: TicketItem, event: Event): void {
    const input = event.target as HTMLInputElement;
    let quantity = Number(input.value);

    if (Number.isNaN(quantity) || quantity < 1) {
      quantity = 1;
    }

    if (quantity > ticket.capacity) {
      quantity = ticket.capacity;
    }

    this.quantitiesByTicketId.update((current) => ({
      ...current,
      [ticket.id]: quantity
    }));
  }

  protected async buyTicket(ticket: TicketItem): Promise<void> {
    if (!this.canBuyTicket()) {
      return;
    }

    if (!ticket.available || ticket.capacity <= 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'Ticket indisponible',
        text: 'Ce ticket n’est plus disponible.'
      });
      return;
    }

    const quantity = this.ticketQuantity(ticket.id);

    if (quantity <= 0 || quantity > ticket.capacity) {
      await Swal.fire({
        icon: 'warning',
        title: 'Quantité invalide',
        text: `Choisis une quantité entre 1 et ${ticket.capacity}.`
      });
      return;
    }

    const token = this.authStore.token();

    if (!token) {
      return;
    }

    const total = ticket.rawPrice * quantity;

    const confirmation = await Swal.fire({
      icon: 'question',
      title: 'Confirmer le paiement',
      html: `
        <div style="text-align:left">
          <p><strong>Ticket :</strong> ${ticket.type}</p>
          <p><strong>Quantité :</strong> ${quantity} billet(s)</p>
          <p><strong>Total :</strong> ${total.toLocaleString('fr-FR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} EUR</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Confirmer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#16a34a'
    });

    if (!confirmation.isConfirmed) {
      await Swal.fire({
        icon: 'info',
        title: 'Annulé',
        timer: 1200,
        showConfirmButton: false
      });
      return;
    }

    this.buyingTicketId.set(ticket.id);

    this.api.buyTicket(token, {
      ticketId: ticket.id,
      quantity
    })
      .pipe(
        switchMap((purchase) =>
          this.api.ticketById(ticket.id).pipe(
            map((refreshedTicket) => ({
              purchase,
              refreshedTicket
            })),
            catchError(() => of({
              purchase,
              refreshedTicket: null as TicketResponse | null
            }))
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ purchase, refreshedTicket }) => {
          if (refreshedTicket) {
            this.tickets.update((current) =>
              current.map((item) =>
                item.id === refreshedTicket.id ? this.toTicketItem(refreshedTicket) : item
              )
            );
          } else {
            // Si on ne peut pas rafraîchir, on diminue quand même l'affichage localement.
            this.tickets.update((current) =>
              current.map((item) => {
                if (item.id !== ticket.id) {
                  return item;
                }

                const newCapacity = Math.max(item.capacity - quantity, 0);

                return {
                  ...item,
                  capacity: newCapacity,
                  soldOut: newCapacity <= 0,
                  available: newCapacity > 0
                };
              })
            );
          }

          // Après achat, on remet la quantité à 1 pour ce ticket.
          this.quantitiesByTicketId.update((current) => ({
            ...current,
            [ticket.id]: 1
          }));

          this.buyingTicketId.set(null);

          void Swal.fire({
            icon: 'success',
            title: 'Paiement confirmé',
            html: `
              <div style="text-align:left">
                <p>Le ticket a été acheté avec succès.</p>
                <p><strong>Quantité :</strong> ${purchase.quantity} billet(s)</p>
                <p><strong>Total payé :</strong> ${purchase.totalPrice} EUR</p>
                <p><strong>Référence :</strong> ${purchase.reference}</p>
              </div>
            `
          });
        },
        error: () => {
          this.buyingTicketId.set(null);

          void Swal.fire({
            icon: 'error',
            title: 'Paiement non abouti',
            text: 'Achat refusé. Vérifie la disponibilité du ticket.'
          });
        }
      });
  }

  private loadConcert(): void {
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

                this.invitedArtists.set(
                  concert.artistIds.map((artistId) =>
                    artistById.get(artistId)?.name ?? `Artiste #${artistId}`
                  )
                );
              });
          } else {
            this.invitedArtists.set([]);
          }

          const detailedTickets = concert.tickets ?? [];

          if (detailedTickets.length > 0) {
            this.tickets.set(detailedTickets.map((ticket) => this.toTicketItem(ticket)));
            this.initQuantities(detailedTickets);
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
              const resolved = ticketDtos.filter(
                (ticket): ticket is TicketResponse => ticket !== null
              );

              if (resolved.length > 0) {
                this.tickets.set(resolved.map((ticket) => this.toTicketItem(ticket)));
                this.initQuantities(resolved);
              } else {
                this.tickets.set(
                  concert.ticketIds.map((ticketId) => ({
                    id: ticketId,
                    type: `Ticket #${ticketId}`,
                    price: 'Prix indisponible',
                    rawPrice: 0,
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

  private initQuantities(tickets: TicketResponse[]): void {
    const quantities: Record<number, number> = {};

    tickets.forEach((ticket) => {
      quantities[ticket.id] = 1;
    });

    this.quantitiesByTicketId.set(quantities);
  }

  private toTicketItem(ticket: TicketResponse): TicketItem {
    return {
      id: ticket.id,
      type: ticket.title || `Ticket #${ticket.id}`,
      price: `${ticket.price.toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })} EUR`,
      rawPrice: ticket.price,
      capacity: ticket.capacity,
      soldOut: ticket.statut.toLowerCase() === 'soldout' || ticket.capacity <= 0,
      available: ticket.statut.toLowerCase() === 'available' && ticket.capacity > 0
    };
  }
}