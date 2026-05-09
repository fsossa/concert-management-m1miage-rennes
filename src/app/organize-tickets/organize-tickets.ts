import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, catchError, forkJoin, of, switchMap } from 'rxjs';

import { AuthStoreService } from '../core/auth-store.service';
import { BackendApiService } from '../core/backend-api.service';
import { ConcertResponse, TicketResponse } from '../core/api.types';
import { NotificationService } from '../core/notification.service';

@Component({
  selector: 'app-organize-tickets',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './organize-tickets.html'
})
export class OrganizeTicketsComponent {
  private readonly api = inject(BackendApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authStore = inject(AuthStoreService);
  private readonly notificationService = inject(NotificationService);
  private lastTicketRefreshVersion = 0;

  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly toast = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  protected readonly tickets = signal<TicketResponse[]>([]);
  protected readonly concerts = signal<ConcertResponse[]>([]);

  protected title = '';
  protected capacity = 0;
  protected price = 0;
  protected statut = 'available';
  protected concertId: number | null = null;
  protected editingId: number | null = null;

  constructor() {
    this.loadData();

    effect(() => {
      const version = this.notificationService.ticketRefreshVersion();
      if (version === 0 || version === this.lastTicketRefreshVersion) {
        return;
      }

      this.lastTicketRefreshVersion = version;
      this.loadData(false);
    });
  }

  protected saveTicket(): void {
    const token = this.authStore.token();
    if (!token) {
      this.error.set('Session organizer requise.');
      return;
    }

    if (!this.title.trim() || this.capacity < 0 || this.price < 0 || !this.concertId) {
      this.error.set('Titre, capacite, prix et concert sont requis.');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const createPayload = {
      title: this.title.trim(),
      capacity: this.capacity,
      price: this.price,
      statut: this.statut,
      concertId: this.concertId
    };

    const updatePayload = {
      title: this.title.trim(),
      capacity: this.capacity,
      price: this.price,
      statut: this.statut
    };

    const request$ = this.editingId === null
      ? this.api.organizerCreateTicket(token, createPayload)
      : this.api.organizerUpdateTicket(token, this.editingId, updatePayload);

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showToast('success', this.editingId === null ? 'Billet cree avec succes.' : 'Billet mis a jour avec succes.');
          this.resetForm();
          this.loadData();
          this.submitting.set(false);
        },
        error: () => {
          this.error.set('Operation impossible sur les billets.');
          this.showToast('error', 'Impossible d enregistrer le billet.');
          this.submitting.set(false);
        }
      });
  }

  protected editTicket(ticket: TicketResponse): void {
    this.editingId = ticket.id;
    this.title = ticket.title;
    this.capacity = ticket.capacity;
    this.price = ticket.price;
    this.statut = ticket.statut;
    this.concertId = ticket.concertId;
  }

  protected deleteTicket(ticketId: number): void {
    const confirmed = window.confirm('Confirmer la suppression de ce billet ?');
    if (!confirmed) {
      return;
    }

    const token = this.authStore.token();
    if (!token) {
      this.error.set('Session organizer requise.');
      return;
    }

    this.api.organizerDeleteTicket(token, ticketId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showToast('success', 'Billet supprime avec succes.');
          this.loadData();
        },
        error: () => {
          this.error.set('Suppression du billet impossible.');
          this.showToast('error', 'Suppression du billet impossible.');
        }
      });
  }

  protected cancelEdit(): void {
    this.resetForm();
  }

  protected concertTopic(concertId: number | null): string {
    if (concertId === null) {
      return 'N/A';
    }
    const concert = this.concerts().find((c) => c.id === concertId);
    return concert?.topic ?? `Concert #${concertId}`;
  }

  protected isTicketAvailable(statut: string, capacity: number): boolean {
    return statut.toLowerCase() === 'available' && capacity > 0;
  }

  private loadData(showLoading = true): void {
    const token = this.authStore.token();
    if (!token) {
      this.error.set('Session organizer requise.');
      this.loading.set(false);
      return;
    }

    if (showLoading) {
      this.loading.set(true);
    }
    this.error.set(null);

    forkJoin({
      concerts: this.api.organizerConcerts(token),
      tickets: this.api.organizerTickets(token).pipe(
        switchMap((tickets) => this.hydrateTicketsFromDetailEndpoint(tickets))
      )
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ concerts, tickets }) => {
          this.concerts.set(concerts);
          this.tickets.set(tickets);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Impossible de charger les billets.');
          this.loading.set(false);
        }
      });
  }

  private hydrateTicketsFromDetailEndpoint(tickets: TicketResponse[]): Observable<TicketResponse[]> {
    if (tickets.length === 0) {
      return of([]);
    }

    return forkJoin(
      tickets.map((ticket) =>
        this.api.ticketById(ticket.id).pipe(catchError(() => of(ticket)))
      )
    );
  }

  private resetForm(): void {
    this.editingId = null;
    this.title = '';
    this.capacity = 0;
    this.price = 0;
    this.statut = 'available';
    this.concertId = null;
  }

  private showToast(type: 'success' | 'error', message: string): void {
    this.toast.set({ type, message });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
