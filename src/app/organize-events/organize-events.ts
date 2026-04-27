import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ConcertResponse } from '../core/api.types';
import { AuthStoreService } from '../core/auth-store.service';
import { BackendApiService } from '../core/backend-api.service';

@Component({
  selector: 'app-organize-events',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './organize-events.html'
})
export class OrganizeEventsComponent {
  private readonly api = inject(BackendApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authStore = inject(AuthStoreService);

  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly toast = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  protected readonly concerts = signal<ConcertResponse[]>([]);

  protected topic = '';
  protected date = '';
  protected description = '';
  protected editingId: number | null = null;

  constructor() {
    this.loadConcerts();
  }

  protected saveConcert(): void {
    const token = this.authStore.token();
    if (!token) {
      this.error.set('Session organizer requise.');
      return;
    }

    if (!this.topic.trim() || !this.date || !this.description.trim()) {
      this.error.set('Topic, date et description sont requis.');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const payload = {
      topic: this.topic.trim(),
      date: this.toLocalDateTime(this.date),
      description: this.description.trim()
    };

    const request$ = this.editingId === null
      ? this.api.organizerCreateConcert(token, payload)
      : this.api.organizerUpdateConcert(token, this.editingId, payload);

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showToast('success', this.editingId === null ? 'Concert cree avec succes.' : 'Concert mis a jour avec succes.');
          this.resetForm();
          this.loadConcerts();
          this.submitting.set(false);
        },
        error: () => {
          this.error.set('Operation impossible sur les concerts.');
          this.showToast('error', 'Impossible d enregistrer le concert.');
          this.submitting.set(false);
        }
      });
  }

  protected editConcert(concert: ConcertResponse): void {
    this.editingId = concert.id;
    this.topic = concert.topic;
    this.description = concert.description;
    this.date = this.toInputDateTime(concert.date);
  }

  protected deleteConcert(concertId: number): void {
    const confirmed = window.confirm('Confirmer la suppression de ce concert ?');
    if (!confirmed) {
      return;
    }

    const token = this.authStore.token();
    if (!token) {
      this.error.set('Session organizer requise.');
      return;
    }

    this.api.organizerDeleteConcert(token, concertId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showToast('success', 'Concert supprime avec succes.');
          this.loadConcerts();
        },
        error: () => {
          this.error.set('Suppression du concert impossible.');
          this.showToast('error', 'Suppression du concert impossible.');
        }
      });
  }

  protected cancelEdit(): void {
    this.resetForm();
  }

  protected formatDate(raw: string): string {
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? raw : date.toLocaleString('fr-FR');
  }

  private loadConcerts(): void {
    const token = this.authStore.token();
    if (!token) {
      this.error.set('Session organizer requise.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.api.organizerConcerts(token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (concerts) => {
          this.concerts.set(concerts);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Impossible de charger les concerts.');
          this.loading.set(false);
        }
      });
  }

  private resetForm(): void {
    this.editingId = null;
    this.topic = '';
    this.date = '';
    this.description = '';
  }

  private toLocalDateTime(value: string): string {
    return value.length === 16 ? `${value}:00` : value;
  }

  private toInputDateTime(raw: string): string {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return raw;
    }

    const pad = (n: number) => `${n}`.padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private showToast(type: 'success' | 'error', message: string): void {
    this.toast.set({ type, message });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
