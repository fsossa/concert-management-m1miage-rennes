import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-customer-profile',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './customer-profile.html'
})
export class CustomerProfileComponent {
  protected readonly isConnected = signal(false);

  protected readonly purchasedTickets = [
    { event: 'Electro Wave 2026', seat: 'B-12', date: '02 Mai 2026' },
    { event: 'Moonlight Jazz', seat: 'A-08', date: '10 Mai 2026' }
  ];

  protected simulateConnection(): void {
    this.isConnected.set(true);
  }
}
