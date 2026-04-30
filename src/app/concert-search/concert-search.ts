import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { BackendApiService } from '../core/backend-api.service';
import { ConcertResponse } from '../core/api.types';

interface SearchConcertItem {
  id: number;
  title: string;
  topic: string;
  description: string;
  artist: string;
  date: string;
}

@Component({
  selector: 'app-concert-search',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './concert-search.html'
})
export class ConcertSearchComponent {
  private readonly api = inject(BackendApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly results = signal<SearchConcertItem[]>([]);

  protected topic = '';
  protected date = '';
  protected description = '';
  protected artistName = '';
  protected organizerName = '';
  protected priceMin = '';
  protected priceMax = '';

  constructor() {
    // On ne lance pas la recherche automatiquement.
  }

  protected search(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.searchConcerts({
      topic: this.topic,
      date: this.date,
      description: this.description,
      artistName: this.artistName,
      organizerName: this.organizerName,
      priceMin: this.toNumberOrUndefined(this.priceMin),
      priceMax: this.toNumberOrUndefined(this.priceMax)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (concerts) => {
          this.results.set(concerts.map((concert) => this.toItem(concert)));
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Erreur lors de la recherche.');
          this.loading.set(false);
        }
      });
  }

  protected resetFilters(): void {
    this.topic = '';
    this.date = '';
    this.description = '';
    this.artistName = '';
    this.organizerName = '';
    this.priceMin = '';
    this.priceMax = '';
    this.results.set([]);
    this.error.set(null);
  }

  private toNumberOrUndefined(value: string): number | undefined {
    if (!value || value.trim() === '') {
      return undefined;
    }

    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) {
      return undefined;
    }

    return numberValue;
  }

  private toItem(concert: ConcertResponse): SearchConcertItem {
    return {
      id: concert.id,
      title: concert.topic || 'Concert',
      topic: concert.topic || 'N/A',
      description: concert.description || 'Aucune description',
      artist: concert.artistIds.length > 0
        ? `Artistes : ${concert.artistIds.join(', ')}`
        : 'Sans artiste associé',
      date: this.formatDate(concert.date)
    };
  }

  private formatDate(raw: string): string {
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? raw : date.toLocaleString('fr-FR');
  }
}