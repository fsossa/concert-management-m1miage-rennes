import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-component',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './auth-component.html'
})
export class AuthComponent {
  private readonly router = inject(Router);
  activeTab = signal<'login' | 'register'>('login');

  setTab(tab: 'login' | 'register'): void {
    this.activeTab.set(tab);
  }

  login(): void {
    void this.router.navigateByUrl('/management');
  }
}
