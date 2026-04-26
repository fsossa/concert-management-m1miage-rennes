import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-organize-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './organize-layout.html'
})
export class OrganizeLayoutComponent {
  protected readonly navItems = [
    { label: 'Dashboard', path: '/organize' },
    { label: 'Concerts', path: '/organize/events' },
    { label: 'Billets', path: '/organize/tickets' },
    { label: 'Artistes', path: '/organize/artists' },
    { label: 'Rapports', path: '/organize/reports' }
  ];
}
