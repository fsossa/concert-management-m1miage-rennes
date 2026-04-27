import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { AuthStoreService } from '../core/auth-store.service';
import { BackendApiService } from '../core/backend-api.service';
import { ArtistResponse, ConcertResponse } from '../core/api.types';

@Component({
  selector: 'app-organize-artists',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './organize-artists.html'
})
export class OrganizeArtistsComponent {
  private readonly api = inject(BackendApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authStore = inject(AuthStoreService);

  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly toast = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  protected readonly artists = signal<ArtistResponse[]>([]);
  protected readonly concerts = signal<ConcertResponse[]>([]);

  protected name = '';
  protected concertId: number | null = null;
  protected editingId: number | null = null;

  constructor() {
    this.loadData();
  }

  protected saveArtist(): void {
    const token = this.authStore.token();
    if (!token) {
      this.error.set('Session organizer requise.');
      return;
    }

    if (!this.name.trim()) {
      this.error.set('Le nom artiste est requis.');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    if (this.editingId === null && !this.concertId) {
      this.error.set('Selectionne un concert pour creer un artiste.');
      this.submitting.set(false);
      return;
    }

    const request$ = this.editingId === null
      ? this.api.organizerCreateArtistForConcert(token, this.concertId!, { name: this.name.trim() })
      : this.api.organizerUpdateArtist(token, this.editingId, { name: this.name.trim() });

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showToast('success', this.editingId === null ? 'Artiste cree avec succes.' : 'Artiste mis a jour avec succes.');
          this.resetForm();
          this.loadData();
          this.submitting.set(false);
        },
        error: () => {
          this.error.set('Operation impossible sur les artistes.');
          this.showToast('error', 'Impossible d enregistrer l artiste.');
          this.submitting.set(false);
        }
      });
  }

  protected editArtist(artist: ArtistResponse): void {
    this.editingId = artist.id;
    this.name = artist.name;
    this.concertId = artist.concertIds[0] ?? null;
  }

  protected deleteArtist(artist: ArtistResponse): void {
    const confirmed = window.confirm('Confirmer la suppression de cet artiste (unlink de tous ses concerts) ?');
    if (!confirmed) {
      return;
    }

    const token = this.authStore.token();
    if (!token) {
      this.error.set('Session organizer requise.');
      return;
    }

    if (artist.concertIds.length === 0) {
      this.error.set('Aucun concert lie pour supprimer cet artiste.');
      return;
    }

    const unlinkCalls = artist.concertIds.map((id) => this.api.organizerUnlinkArtistFromConcert(token, artist.id, id));
    forkJoin(unlinkCalls)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showToast('success', 'Artiste supprime (unlink) avec succes.');
          this.loadData();
        },
        error: () => {
          this.error.set('Suppression (unlink) de artiste impossible.');
          this.showToast('error', 'Suppression (unlink) de artiste impossible.');
        }
      });
  }

  protected cancelEdit(): void {
    this.resetForm();
  }

  protected concertNames(concertIds: number[]): string {
    if (concertIds.length === 0) {
      return 'Aucun';
    }

    return concertIds
      .map((id) => this.concerts().find((concert) => concert.id === id)?.topic ?? `Concert #${id}`)
      .join(', ');
  }

  private loadData(): void {
    const token = this.authStore.token();
    if (!token) {
      this.error.set('Session organizer requise.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      artists: this.api.organizerArtists(token),
      concerts: this.api.organizerConcerts(token)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ artists, concerts }) => {
          this.artists.set(artists);
          this.concerts.set(concerts);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Impossible de charger les artistes.');
          this.loading.set(false);
        }
      });
  }

  private resetForm(): void {
    this.editingId = null;
    this.name = '';
    this.concertId = null;
  }

  private showToast(type: 'success' | 'error', message: string): void {
    this.toast.set({ type, message });
    setTimeout(() => this.toast.set(null), 3000);
  }
}

