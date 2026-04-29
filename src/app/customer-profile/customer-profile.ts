import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { jsPDF } from 'jspdf';

import { CustomerTicketPurchaseResponse, UserResponse } from '../core/api.types';
import { AuthStoreService } from '../core/auth-store.service';
import { BackendApiService } from '../core/backend-api.service';
import { ElementRef, ViewChild } from '@angular/core';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';

@Component({
  selector: 'app-customer-profile',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './customer-profile.html',
   styleUrl: './customer-profile.css'

})
export class CustomerProfileComponent {
  private readonly authStore = inject(AuthStoreService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(BackendApiService);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly user = signal<UserResponse | null>(null);
  protected readonly purchases = signal<CustomerTicketPurchaseResponse[]>([]);

  protected readonly isConnected = computed(() => !!this.authStore.token());

  protected readonly totalTicketsPurchased = computed(() =>
    this.purchases().reduce((total, purchase) => total + purchase.quantity, 0)
  );

  protected readonly totalSpent = computed(() =>
    this.purchases().reduce((total, purchase) => total + purchase.totalPrice, 0)
  );

  protected readonly nextConcertLabel = computed(() => {
    const upcomingPurchases = this.purchases()
      .filter((purchase) => !!purchase.concertDate)
      .filter((purchase) => new Date(purchase.concertDate as string).getTime() >= Date.now())
      .sort((a, b) =>
        new Date(a.concertDate as string).getTime() - new Date(b.concertDate as string).getTime()
      );

    return upcomingPurchases[0]?.concertTopic ?? 'Aucun concert à venir';
  });

  constructor() {
    this.loadProfile();
  }

  protected simulateConnection(): void {
    this.error.set('Utilise la page /auth pour te connecter réellement.');
  }

  protected logout(): void {
    this.authStore.clearSession();
    this.user.set(null);
    this.purchases.set([]);
  }

  protected formatDate(value: string | null): string {
    if (!value) {
      return 'Date non disponible';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString('fr-FR');
  }

  protected statusLabel(status: string): string {
    if (!status) {
      return 'Acheté';
    }

    if (status.toUpperCase() === 'PURCHASED') {
      return 'Acheté';
    }

    return status;
  }

protected async downloadTicket(purchase: CustomerTicketPurchaseResponse): Promise<void> {
  try {
    this.selectedPurchase.set(purchase);

    const params = new URLSearchParams({
      client: this.fullCustomerName(),
      concert: purchase.concertTopic || 'Concert non renseigné',
      concertDate: this.formatDateForTicket(purchase.concertDate),
      ticket: purchase.ticketTitle || 'Ticket standard',
      quantity: String(purchase.quantity || 1),
      unitPrice: this.formatPrice(purchase.unitPrice),
      totalPrice: this.formatPrice(purchase.totalPrice),
      purchaseDate: this.formatDateForTicket(purchase.purchaseDate),
      reference: purchase.reference || `TICKET-${purchase.purchaseId}`
    });

    const qrPayload = `${window.location.origin}/ticket-view?${params.toString()}`;

    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 220,
      margin: 1
    });

    this.ticketQrCode.set(qrDataUrl);

    await new Promise((resolve) => setTimeout(resolve, 200));

    const element = this.pdfTicketRef?.nativeElement;

    if (!element) {
      this.error.set('Template du ticket introuvable.');
      return;
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true
    });

    const imageData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const margin = 8;
    const maxWidth = pdfWidth - margin * 2;
    const maxHeight = pdfHeight - margin * 2;

    const ratio = Math.min(
      maxWidth / canvas.width,
      maxHeight / canvas.height
    );

    const renderWidth = canvas.width * ratio;
    const renderHeight = canvas.height * ratio;

    const x = (pdfWidth - renderWidth) / 2;
    const y = (pdfHeight - renderHeight) / 2;

    pdf.addImage(imageData, 'PNG', x, y, renderWidth, renderHeight);

    const fileName = this.safeFileName(
      purchase.reference || `ticket-${purchase.purchaseId}`
    );

    pdf.save(`${fileName}.pdf`);
  } catch (error) {
    console.error(error);
    this.error.set('Impossible de générer le ticket PDF.');
  }
}
protected fullCustomerName(): string {
  const currentUser = this.user();
  if (!currentUser) {
    return 'Client';
  }

  return `${currentUser.firstName} ${currentUser.lastName}`;
}

protected formatDateForTicket(value: string | null | undefined): string {
  if (!value) {
    return 'Date non disponible';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
}

protected formatPrice(value: number | null | undefined): string {
  return `${(value ?? 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} €`;
}

  private safeFileName(value: string): string {
    return value.replace(/[^a-z0-9-_]/gi, '_');
  }
  @ViewChild('pdfTicket') private pdfTicketRef?: ElementRef<HTMLDivElement>;

  protected readonly selectedPurchase = signal<CustomerTicketPurchaseResponse | null>(null);
  protected readonly ticketQrCode = signal<string>('');

  private loadProfile(): void {
  const token = this.authStore.token();

  if (!token) {
    return;
  }

  this.loading.set(true);
  this.error.set(null);

  forkJoin({
    user: this.api.customerProfile(token),

    purchases: this.api.customerPurchases(token).pipe(
      catchError(() => {
        this.error.set(
          'Profil chargé, mais impossible de charger les achats. Vérifie que la route /api/custom/my-purchases existe côté backend.'
        );

        return of([]);
      })
    )
  })
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: ({ user, purchases }) => {
        this.user.set(user);
        this.purchases.set(purchases);
        this.loading.set(false);
      },

      error: () => {
        this.authStore.clearSession();
        this.user.set(null);
        this.purchases.set([]);
        this.error.set('Session invalide ou expirée. Reconnecte-toi.');
        this.loading.set(false);
      }
    });
}
}