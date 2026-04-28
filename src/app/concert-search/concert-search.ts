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

  constructor() {
    //Pour éviter que les résultats soient chargés dès l'affichage de la page, on ne lance pas la recherche automatiquement.
    //this.search();
  }

  protected search(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.searchConcerts({
      topic: this.topic.trim() || undefined,
      date: this.date || undefined,
      description: this.description.trim() || undefined,
      artistName: this.artistName.trim() || undefined,
      organizerName: this.organizerName.trim() || undefined
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (concerts) => {
          this.results.set(concerts.map((c) => this.toItem(c)));
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Recherche indisponible pour le moment.');
          this.loading.set(false);
        }
      });
  }

  private toItem(concert: ConcertResponse): SearchConcertItem {
    return {
      id: concert.id,
      title: concert.topic || 'Concert',
      topic: concert.topic || 'N/A',
      artist: concert.artistIds.length > 0 ? `Artistes: ${concert.artistIds.join(', ')}` : 'Sans artiste associe',
      date: this.formatDate(concert.date)
    };
  }

  private formatDate(raw: string): string {
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? raw : date.toLocaleString('fr-FR');
  }
}

