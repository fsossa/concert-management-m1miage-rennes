import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { jsPDF } from 'jspdf';

import { CustomerTicketPurchaseResponse, UserResponse } from '../core/api.types';
import { AuthStoreService } from '../core/auth-store.service';
import { BackendApiService } from '../core/backend-api.service';

@Component({
  selector: 'app-customer-profile',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './customer-profile.html'
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

  protected downloadTicket(purchase: CustomerTicketPurchaseResponse): void {
    const currentUser = this.user();

    if (!currentUser) {
      this.error.set('Impossible de générer le ticket : utilisateur non chargé.');
      return;
    }

    const customerName = `${currentUser.firstName} ${currentUser.lastName}`;
    const customerEmail = currentUser.email;

    const ticketTitle = purchase.ticketTitle ?? 'Ticket';
    const concertName = purchase.concertTopic ?? 'Concert non lié';
    const concertDate = this.formatDate(purchase.concertDate);
    const purchaseDate = this.formatDate(purchase.purchaseDate);
    const ticketReference = purchase.reference || `TICKET-${purchase.purchaseId}`;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Fond de page
    doc.setFillColor(243, 233, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Dimensions du ticket
    const ticketW = 250;
    const ticketH = 115;
    const ticketX = (pageWidth - ticketW) / 2;
    const ticketY = (pageHeight - ticketH) / 2;

    // Carte principale
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(ticketX, ticketY, ticketW, ticketH, 6, 6, 'F');

    doc.setDrawColor(216, 200, 255);
    doc.setLineWidth(0.6);
    doc.roundedRect(ticketX, ticketY, ticketW, ticketH, 6, 6, 'S');

    // Bande gauche
    const leftW = 78;

    doc.setFillColor(0, 106, 123);
    doc.roundedRect(ticketX, ticketY, leftW, ticketH, 6, 6, 'F');

    // Corrige l'arrondi à droite de la bande gauche
    doc.setFillColor(0, 106, 123);
    doc.rect(ticketX + leftW - 6, ticketY, 6, ticketH, 'F');

    // Texte gauche
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');

    doc.setFontSize(10);
    doc.text('CONCERT TICKETS', ticketX + 10, ticketY + 16);

    doc.setFontSize(21);
    doc.text('BILLET', ticketX + 10, ticketY + 40);
    doc.text('ELECTRONIQUE', ticketX + 10, ticketY + 52);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Ticket officiel client', ticketX + 10, ticketY + 68);

    // Référence à gauche
    doc.setDrawColor(255, 255, 255);
    doc.setLineDashPattern([2, 2], 0);
    doc.roundedRect(ticketX + 10, ticketY + 80, leftW - 20, 23, 3, 3, 'S');
    doc.setLineDashPattern([], 0);

    doc.setFontSize(7);
    doc.text('REFERENCE', ticketX + 14, ticketY + 88);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const refLines = doc.splitTextToSize(ticketReference, leftW - 28);
    doc.text(refLines.slice(0, 2), ticketX + 14, ticketY + 96);

    // Partie droite
    const contentX = ticketX + leftW + 12;
    const contentY = ticketY + 13;

    // Badge
    doc.setFillColor(234, 249, 237);
    doc.roundedRect(contentX, contentY, 35, 10, 5, 5, 'F');

    doc.setTextColor(30, 138, 99);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('ACHETE', contentX + 10, contentY + 7);

    // Titre
    doc.setTextColor(31, 43, 58);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);

    const titleLines = doc.splitTextToSize(ticketTitle, 150);
    doc.text(titleLines.slice(0, 1), contentX, contentY + 24);

    doc.setFontSize(10);
    doc.setTextColor(107, 129, 144);

    const concertLines = doc.splitTextToSize(concertName, 150);
    doc.text(concertLines.slice(0, 1), contentX, contentY + 32);

    const drawInfoBox = (
      x: number,
      y: number,
      width: number,
      height: number,
      label: string,
      value: string
    ): void => {
      doc.setFillColor(248, 252, 255);
      doc.setDrawColor(213, 232, 239);
      doc.setLineWidth(0.4);
      doc.roundedRect(x, y, width, height, 4, 4, 'FD');

      doc.setTextColor(107, 129, 144);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(label, x + 4, y + 6);

      doc.setTextColor(46, 73, 93);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);

      const lines = doc.splitTextToSize(value, width - 8);
      doc.text(lines.slice(0, 2), x + 4, y + 14);
    };

    // Ligne 1
    drawInfoBox(contentX, contentY + 41, 70, 22, 'Nom du client', customerName);
    drawInfoBox(contentX + 78, contentY + 41, 78, 22, 'Email', customerEmail);

    // Ligne 2
    drawInfoBox(contentX, contentY + 68, 70, 22, 'Date du concert', concertDate);
    drawInfoBox(contentX + 78, contentY + 68, 35, 22, 'Quantite', `${purchase.quantity} billet(s)`);
    drawInfoBox(contentX + 121, contentY + 68, 35, 22, 'Total paye', `${purchase.totalPrice} EUR`);

    // Ligne 3 courte
    drawInfoBox(contentX + 162, contentY + 68, 35, 22, 'Prix unite', `${purchase.unitPrice} EUR`);

    // Date d'achat
    doc.setTextColor(107, 129, 144);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    const footerText = `Achat effectue le ${purchaseDate}. Merci de presenter ce billet a l'entree du concert.`;
    const footerLines = doc.splitTextToSize(footerText, 180);
    doc.text(footerLines, contentX, ticketY + ticketH - 9);

    doc.save(`${this.safeFileName(ticketReference)}.pdf`);
  }

  private safeFileName(value: string): string {
    return value.replace(/[^a-z0-9-_]/gi, '_');
  }

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