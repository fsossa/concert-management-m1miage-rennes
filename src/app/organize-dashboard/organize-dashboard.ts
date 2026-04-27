import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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

@Component({
  selector: 'app-organize-dashboard',
  standalone: true,
  templateUrl: './organize-dashboard.html'
})
export class OrganizeDashboardComponent {
  private readonly api = inject(BackendApiService);
  private readonly authStore = inject(AuthStoreService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly kpis = signal<DashboardKpi[]>([]);
  protected readonly upcomingConcerts = signal<DashboardConcertRow[]>([]);

  constructor() {
    const token = this.authStore.token();
    if (!token) {
      this.error.set('Session organizer requise.');
      this.loading.set(false);
      return;
    }

    this.api.organizerDashboard(token)
      .pipe(takeUntilDestroyed())
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
}
