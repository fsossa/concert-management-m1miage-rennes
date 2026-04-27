import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthStoreService } from '../core/auth-store.service';

@Component({
  selector: 'app-organize-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './organize-layout.html'
})
export class OrganizeLayoutComponent {
  private readonly router = inject(Router);
  private readonly authStore = inject(AuthStoreService);

  protected readonly navItems = [
    { label: 'Dashboard', path: '/organize' },
    { label: 'Concerts', path: '/organize/events' },
    { label: 'Billets', path: '/organize/tickets' },
    { label: 'Artistes', path: '/organize/artists' },
    { label: 'Rapports', path: '/organize/reports' }
  ];

  protected openCreateConcertModal(): void {
    void this.router.navigate(['/organize'], { queryParams: { create: '1' } });
  }

  protected goHome(): void {
    void this.router.navigateByUrl('/');
  }

  protected logout(): void {
    this.authStore.clearSession();
    void this.router.navigateByUrl('/auth');
  }
}
