import { Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './public-layout.html'
})
export class PublicLayoutComponent {
  private readonly location = inject(Location);

  protected readonly navItems = [
    { label: 'Rechercher', path: '/search', variant: 'ghost' },
    { label: 'Profil', path: '/profile', variant: 'ghost' },
    { label: 'Connexion', path: '/auth', variant: 'primary' },
    { label: 'Espace Organize', path: '/organize', variant: 'ghost' }
  ];

  protected goBack(): void {
    this.location.back();
  }
}
