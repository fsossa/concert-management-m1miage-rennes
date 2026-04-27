import { Location } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthStoreService } from '../core/auth-store.service';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './public-layout.html'
})
export class PublicLayoutComponent {
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly authStore = inject(AuthStoreService);

  protected readonly isConnected = computed(() => !!this.authStore.token());
  protected readonly isOrganizer = computed(
    () => this.isConnected() && this.authStore.roles().some((role) => role === 'ORGANIZER' || role === 'ADMIN')
  );

  protected goBack(): void {
    this.location.back();
  }

  protected logout(): void {
    this.authStore.clearSession();
    void this.router.navigateByUrl('/');
  }
}
