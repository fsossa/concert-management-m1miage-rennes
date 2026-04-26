import { Component } from '@angular/core';

@Component({
  selector: 'app-organize-dashboard',
  standalone: true,
  templateUrl: './organize-dashboard.html'
})
export class OrganizeDashboardComponent {
  protected readonly kpis = [
    { label: 'Billets vendus (30j)', value: '18 240', detail: '+12.4%' },
    { label: 'CA Billetterie', value: '€ 486 900', detail: '+8.7%' },
    { label: 'Concerts a venir', value: '27', detail: '6 sold-out' },
    { label: 'Panier moyen', value: '€ 26.70', detail: '+1.9%' }
  ];

  protected readonly upcomingConcerts = [
    { name: 'Electro Pulse Night', venue: 'Zenith Paris', date: '12 Avr 2026', status: 'Ouvert' },
    { name: 'Rock Horizon Live', venue: 'Accor Arena', date: '18 Avr 2026', status: 'Presque complet' },
    { name: 'Jazz Under Stars', venue: 'Lyon Hall', date: '22 Avr 2026', status: 'Ouvert' },
    { name: 'Urban Vibes Tour', venue: 'Bordeaux Dome', date: '30 Avr 2026', status: 'Ouvert' }
  ];
}
