import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-concert-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './concert-detail.html'
})
export class ConcertDetailComponent {
  private readonly route = inject(ActivatedRoute);

  protected get concertId(): string {
    return this.route.snapshot.paramMap.get('id') ?? 'N/A';
  }

  protected readonly invitedArtists = ['Nova Pulse', 'Echo M', 'Lunar X'];
  protected readonly tickets = [
    { type: 'Standard', price: '35 EUR', left: 120 },
    { type: 'Premium', price: '62 EUR', left: 48 },
    { type: 'VIP', price: '95 EUR', left: 15 }
  ];
}
