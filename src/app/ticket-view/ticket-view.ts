import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-ticket-view',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './ticket-view.html'
})
export class TicketViewComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly client = computed(() =>
    this.route.snapshot.queryParamMap.get('client') || 'Client non renseigné'
  );

  protected readonly concert = computed(() =>
    this.route.snapshot.queryParamMap.get('concert') || 'Concert non renseigné'
  );

  protected readonly concertDate = computed(() =>
    this.route.snapshot.queryParamMap.get('concertDate') || 'Date non renseignée'
  );

  protected readonly ticket = computed(() =>
    this.route.snapshot.queryParamMap.get('ticket') || 'Ticket standard'
  );

  protected readonly quantity = computed(() =>
    this.route.snapshot.queryParamMap.get('quantity') || '1'
  );

  protected readonly unitPrice = computed(() =>
    this.route.snapshot.queryParamMap.get('unitPrice') || '0,00 €'
  );

  protected readonly totalPrice = computed(() =>
    this.route.snapshot.queryParamMap.get('totalPrice') || '0,00 €'
  );

  protected readonly purchaseDate = computed(() =>
    this.route.snapshot.queryParamMap.get('purchaseDate') || 'Date non renseignée'
  );

  protected readonly reference = computed(() =>
    this.route.snapshot.queryParamMap.get('reference') || 'Référence non disponible'
  );
}