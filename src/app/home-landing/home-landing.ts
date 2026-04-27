import { Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { BackendApiService } from '../core/backend-api.service';
import { ConcertResponse } from '../core/api.types';

interface HomeConcertCard {
  id: number;
  title: string;
  date: string;
  topic: string;
  price: string;
}

@Component({
  selector: 'app-home-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home-landing.html'
})
export class HomeLandingComponent {
  private readonly api = inject(BackendApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly incomingConcerts = signal<HomeConcertCard[]>([]);
  protected readonly latestConcerts = signal<HomeConcertCard[]>([]);

  constructor() {
    this.loadIncoming();
    this.loadLatest();
  }

  private loadIncoming(): void {
    this.api.incomingConcerts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (concerts) => {
          this.incomingConcerts.set(concerts.map((c) => this.toCard(c)));
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Impossible de charger les concerts a venir.');
          this.loading.set(false);
        }
      });
  }

  private loadLatest(): void {
    this.api.latestConcerts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (concerts) => {
          this.latestConcerts.set(concerts.slice(0, 10).map((c) => this.toCard(c)));
        },
        error: () => {
          this.error.set('Impossible de charger les derniers concerts.');
        }
      });
  }

  private toCard(concert: ConcertResponse): HomeConcertCard {
    return {
      id: concert.id,
      title: concert.description?.trim() ? concert.description : `Concert #${concert.id}`,
      date: this.formatDate(concert.date),
      topic: concert.topic || 'N/A',
      price: `A partir de ${this.formatPrice(concert.minPrice ?? 0)}`
    };
  }

  private formatDate(raw: string): string {
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private formatPrice(price: number): string {
    return `${price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`;
  }
}

