import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize, forkJoin, map, of, switchMap } from 'rxjs';

import { AuthStoreService } from '../core/auth-store.service';
import { BackendApiService } from '../core/backend-api.service';
import { ConcertResponse } from '../core/api.types';

interface DashboardKpi {
  label: string;
  value: string;
  detail: string;
}

interface DashboardConcertRow {
  name: string;
  venue: string;
  date: string;
  status: string;
}

interface TicketDraft {
  title: string;
  capacity: number;
  price: number;
  statut: string;
}

@Component({
  selector: 'app-organize-dashboard',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './organize-dashboard.html'
})
export class OrganizeDashboardComponent {
  private readonly api = inject(BackendApiService);
  private readonly authStore = inject(AuthStoreService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly creating = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly modalError = signal<string | null>(null);
  protected readonly toast = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  protected readonly kpis = signal<DashboardKpi[]>([]);
  protected readonly upcomingConcerts = signal<DashboardConcertRow[]>([]);

  protected readonly showCreateModal = signal(false);

  protected concertTopic = '';
  protected concertDate = '';
  protected concertDescription = '';

  protected artistName = '';
  protected readonly artistDrafts = signal<string[]>([]);

  protected ticketTitle = '';
  protected ticketCapacity = 0;
  protected ticketPrice = 0;
  protected ticketStatut = 'available';
  protected readonly ticketDrafts = signal<TicketDraft[]>([]);

  constructor() {
    this.loadDashboard();
  }

  protected openCreateModal(): void {
    this.modalError.set(null);
    this.showCreateModal.set(true);
  }

  protected closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.resetModalForm();
  }

  protected addArtistDraft(): void {
    const value = this.artistName.trim();
    if (!value) {
      return;
    }

    this.artistDrafts.set([...this.artistDrafts(), value]);
    this.artistName = '';
  }

  protected removeArtistDraft(index: number): void {
    const copy = [...this.artistDrafts()];
    copy.splice(index, 1);
    this.artistDrafts.set(copy);
  }

  protected addTicketDraft(): void {
    if (!this.ticketTitle.trim() || this.ticketCapacity < 0 || this.ticketPrice < 0) {
      this.modalError.set('Renseigne un ticket valide (titre, capacite, prix).');
      return;
    }

    const draft: TicketDraft = {
      title: this.ticketTitle.trim(),
      capacity: this.ticketCapacity,
      price: this.ticketPrice,
      statut: this.ticketStatut
    };

    this.ticketDrafts.set([...this.ticketDrafts(), draft]);
    this.ticketTitle = '';
    this.ticketCapacity = 0;
    this.ticketPrice = 0;
    this.ticketStatut = 'available';
    this.modalError.set(null);
  }

  protected removeTicketDraft(index: number): void {
    const copy = [...this.ticketDrafts()];
    copy.splice(index, 1);
    this.ticketDrafts.set(copy);
  }

  protected submitCreateConcert(): void {
    const token = this.authStore.token();
    if (!token) {
      this.showToast('error', 'Session organizer requise.');
      return;
    }

    if (!this.concertTopic.trim() || !this.concertDate || !this.concertDescription.trim()) {
      this.modalError.set('Topic, date et description sont requis.');
      return;
    }

    this.creating.set(true);
    this.modalError.set(null);

    const payload = {
      topic: this.concertTopic.trim(),
      date: this.toLocalDateTime(this.concertDate),
      description: this.concertDescription.trim()
    };

    this.api.organizerCreateConcert(token, payload)
      .pipe(
        switchMap((concert) => {
          const calls = [
            ...this.artistDrafts().map((name) => this.api.organizerCreateArtistForConcert(token, concert.id, { name })),
            ...this.ticketDrafts().map((ticket) => this.api.organizerCreateTicket(token, { ...ticket, concertId: concert.id }))
          ];

          return (calls.length > 0 ? forkJoin(calls) : of([])).pipe(map(() => concert));
        }),
        finalize(() => this.creating.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.showToast('success', 'Concert, artistes et tickets crees avec succes.');
          this.closeCreateModal();
          this.loadDashboard();
        },
        error: () => {
          this.modalError.set('Creation impossible. Verifie les champs et reessaie.');
        }
      });
  }

  protected launchPromo(): void {
    void this.router.navigateByUrl('/organize/reports');
    this.showToast('success', 'Redirection vers Rapports pour lancer une promo.');
  }

  protected exportSales(): void {
    const token = this.authStore.token();
    if (!token) {
      this.showToast('error', 'Session organizer requise.');
      return;
    }

    this.api.organizerSalesStats(token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stats) => {
          const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `organize-sales-${new Date().toISOString().slice(0, 10)}.json`;
          link.click();
          URL.revokeObjectURL(url);
          this.showToast('success', 'Export des ventes genere.');
        },
        error: () => {
          this.showToast('error', 'Export des ventes impossible.');
        }
      });
  }

  private loadDashboard(): void {
    const token = this.authStore.token();
    if (!token) {
      this.error.set('Session organizer requise.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);

    this.api.organizerDashboard(token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (dashboard) => {
          const stats = dashboard.stats;
          this.kpis.set([
            { label: 'BILLETS VENDUS', value: this.formatInt(stats.ticketsSold), detail: `${stats.sellThroughRate.toFixed(1)}% taux de vente` },
            { label: 'CA BILLETTERIE', value: `${this.formatMoney(stats.ticketRevenue)} EUR`, detail: `${this.formatInt(stats.uniqueCustomers)} clients` },
            { label: 'CONCERTS A VENIR', value: this.formatInt(stats.upcomingConcerts), detail: `${this.formatInt(stats.soldOutConcerts)} sold-out` },
            { label: 'PANIER MOYEN', value: `${this.formatMoney(stats.averageBasket)} EUR`, detail: `${this.formatInt(stats.ticketsRemaining)} tickets restants` }
          ]);

          this.upcomingConcerts.set(dashboard.upcomingConcerts.map((concert) => this.toConcertRow(concert)));
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Impossible de charger le dashboard organize.');
          this.loading.set(false);
        }
      });
  }

  private toConcertRow(concert: ConcertResponse): DashboardConcertRow {
    return {
      name: concert.topic || `Concert #${concert.id}`,
      venue: `Organizer #${concert.organizerId ?? 'N/A'}`,
      date: this.formatDate(concert.date),
      status: concert.ticketIds.length > 0 ? 'Ouvert' : 'A configurer'
    };
  }

  private toLocalDateTime(value: string): string {
    return value.length === 16 ? `${value}:00` : value;
  }

  private resetModalForm(): void {
    this.concertTopic = '';
    this.concertDate = '';
    this.concertDescription = '';
    this.artistName = '';
    this.artistDrafts.set([]);
    this.ticketTitle = '';
    this.ticketCapacity = 0;
    this.ticketPrice = 0;
    this.ticketStatut = 'available';
    this.ticketDrafts.set([]);
    this.modalError.set(null);
  }

  private formatDate(raw: string): string {
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString('fr-FR');
  }

  private formatInt(value: number): string {
    return Math.round(value).toLocaleString('fr-FR');
  }

  private formatMoney(value: number): string {
    return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private showToast(type: 'success' | 'error', message: string): void {
    this.toast.set({ type, message });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
