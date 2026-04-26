import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home-landing.html'
})
export class HomeLandingComponent {
  protected readonly incomingConcerts = [
    { id: 101, title: 'Electro Wave 2026', date: '02 Mai 2026', venue: 'Paris - Zenith', price: 'A partir de 35 EUR' },
    { id: 102, title: 'Moonlight Jazz', date: '10 Mai 2026', venue: 'Lyon - Hall 3', price: 'A partir de 28 EUR' },
    { id: 103, title: 'Rock City Live', date: '14 Mai 2026', venue: 'Marseille - Dome', price: 'A partir de 41 EUR' },
    { id: 104, title: 'Urban Festival', date: '19 Mai 2026', venue: 'Bordeaux - Arena', price: 'A partir de 39 EUR' },
    { id: 105, title: 'Indie Sunset', date: '24 Mai 2026', venue: 'Nantes - Expo', price: 'A partir de 30 EUR' }
  ];

  protected readonly latestConcerts = [
    { id: 201, title: 'Neo Pop Night', date: '31 Mai 2026', venue: 'Lille - Dome', price: 'A partir de 26 EUR' },
    { id: 202, title: 'Golden Rap Session', date: '06 Juin 2026', venue: 'Paris - Arena', price: 'A partir de 44 EUR' },
    { id: 203, title: 'Symphonic Lights', date: '12 Juin 2026', venue: 'Toulouse - Palais', price: 'A partir de 32 EUR' },
    { id: 204, title: 'Bass Kingdom', date: '18 Juin 2026', venue: 'Nice - Stadium', price: 'A partir de 37 EUR' },
    { id: 205, title: 'Acoustic Stories', date: '21 Juin 2026', venue: 'Grenoble - Forum', price: 'A partir de 24 EUR' },
    { id: 206, title: 'Fusion Groove', date: '25 Juin 2026', venue: 'Rennes - Park', price: 'A partir de 29 EUR' },
    { id: 207, title: 'Metal Storm', date: '29 Juin 2026', venue: 'Nancy - Hall', price: 'A partir de 38 EUR' },
    { id: 208, title: 'Summer Vibes', date: '03 Juil 2026', venue: 'Montpellier - Open Air', price: 'A partir de 22 EUR' },
    { id: 209, title: 'Latin Fire', date: '07 Juil 2026', venue: 'Strasbourg - Event', price: 'A partir de 27 EUR' },
    { id: 210, title: 'Classic Emotion', date: '12 Juil 2026', venue: 'Dijon - Theatre', price: 'A partir de 31 EUR' }
  ];
}
