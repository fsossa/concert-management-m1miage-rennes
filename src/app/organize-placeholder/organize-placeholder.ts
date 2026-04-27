import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthStoreService } from '../core/auth-store.service';
import { BackendApiService } from '../core/backend-api.service';

@Component({
  selector: 'app-organize-placeholder',
  standalone: true,
  templateUrl: './organize-placeholder.html'
})
export class OrganizePlaceholderComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(BackendApiService);
  private readonly authStore = inject(AuthStoreService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly rows = signal<string[]>([]);

  protected get sectionTitle(): string {
    return this.route.snapshot.data['title'] ?? 'Section';
  }

  constructor() {
    this.loadSectionData();
  }

  private loadSectionData(): void {
    const token = this.authStore.token();
    const sectionPath = this.route.snapshot.routeConfig?.path ?? '';

    if (!token) {
      this.error.set('Session organizer requise.');
      this.loading.set(false);
      return;
    }

    if (sectionPath === 'events') {
      this.api.organizerConcerts(token)
        .pipe(takeUntilDestroyed())
        .subscribe({
          next: (concerts) => {
            this.rows.set(concerts.map((c) => `${c.topic} - ${c.date}`));
            this.loading.set(false);
          },
          error: () => this.failLoad()
        });
      return;
    }

    if (sectionPath === 'tickets') {
      this.api.organizerTickets(token)
        .pipe(takeUntilDestroyed())
        .subscribe({
          next: (tickets) => {
            this.rows.set(tickets.map((t) => `${t.title} - ${t.price} EUR - ${t.statut}`));
            this.loading.set(false);
          },
          error: () => this.failLoad()
        });
      return;
    }

    if (sectionPath === 'artists') {
      this.api.organizerArtists(token)
        .pipe(takeUntilDestroyed())
        .subscribe({
          next: (artists) => {
            this.rows.set(artists.map((a) => `${a.name} - concerts: ${a.concertIds.length}`));
            this.loading.set(false);
          },
          error: () => this.failLoad()
        });
      return;
    }

    if (sectionPath === 'reports') {
      this.api.organizerSalesStats(token)
        .pipe(takeUntilDestroyed())
        .subscribe({
          next: (stats) => {
            this.rows.set([
              `CA Billetterie: ${stats.ticketRevenue.toFixed(2)} EUR`,
              `Tickets vendus: ${stats.ticketsSold}`,
              `Clients uniques: ${stats.uniqueCustomers}`,
              `Panier moyen: ${stats.averageBasket.toFixed(2)} EUR`,
              `Taux de vente: ${stats.sellThroughRate.toFixed(1)}%`
            ]);
            this.loading.set(false);
          },
          error: () => this.failLoad()
        });
      return;
    }

    this.loading.set(false);
  }

  private failLoad(): void {
    this.error.set('Impossible de charger les donnees de cette section.');
    this.loading.set(false);
  }
}
