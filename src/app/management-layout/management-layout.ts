import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-management-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './management-layout.html'
})
export class ManagementLayoutComponent {
  protected readonly navItems = [
    { label: 'Dashboard', path: '/management' },
    { label: 'Concerts', path: '/management/events' },
    { label: 'Billets', path: '/management/tickets' },
    { label: 'Artistes', path: '/management/artists' },
    { label: 'Rapports', path: '/management/reports' }
  ];
}
