import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthStoreService } from '../core/auth-store.service';
import { BackendApiService } from '../core/backend-api.service';

@Component({
  selector: 'app-auth-component',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './auth-component.html'
})
export class AuthComponent {
  private readonly router = inject(Router);
  private readonly api = inject(BackendApiService);
  private readonly authStore = inject(AuthStoreService);

  activeTab = signal<'login' | 'register'>('login');
  selectedProfile = signal<'CUSTOMER' | 'ORGANIZER'>('CUSTOMER');
  loading = signal(false);
  loginError = signal<string | null>(null);
  registerError = signal<string | null>(null);

  loginEmail = '';
  loginPassword = '';

  registerFirstName = '';
  registerLastName = '';
  registerBirthDate = '';
  registerEmail = '';
  registerPassword = '';

  setTab(tab: 'login' | 'register'): void {
    this.activeTab.set(tab);
    this.loginError.set(null);
    this.registerError.set(null);
  }

  selectProfile(profile: 'CUSTOMER' | 'ORGANIZER'): void {
    this.selectedProfile.set(profile);
  }

  login(): void {
    if (!this.loginEmail.trim() || !this.loginPassword.trim()) {
      this.loginError.set('Email et mot de passe requis.');
      return;
    }

    this.loading.set(true);
    this.loginError.set(null);

    this.api.login({ email: this.loginEmail.trim(), password: this.loginPassword })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.authStore.setSession(response.token, response.roles);
          const isOrganizer = response.roles.includes('ORGANIZER') || response.roles.includes('ADMIN');
          void this.router.navigateByUrl(isOrganizer ? '/organize' : '/');
        },
        error: () => {
          this.loginError.set('Connexion impossible. Verifie tes identifiants.');
        }
      });
  }

  register(): void {
    if (!this.registerFirstName.trim() || !this.registerLastName.trim() || !this.registerBirthDate || !this.registerEmail.trim() || !this.registerPassword.trim()) {
      this.registerError.set('Tous les champs register sont requis.');
      return;
    }

    this.loading.set(true);
    this.registerError.set(null);

    this.api.register({
      firstname: this.registerFirstName.trim(),
      lastname: this.registerLastName.trim(),
      dateOfBirth: this.registerBirthDate,
      email: this.registerEmail.trim(),
      password: this.registerPassword,
      role: this.selectedProfile()
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.authStore.setSession(response.token, response.roles);
          const isOrganizer = response.roles.includes('ORGANIZER') || response.roles.includes('ADMIN');
          void this.router.navigateByUrl(isOrganizer ? '/organize' : '/');
        },
        error: () => {
          this.registerError.set('Inscription impossible. Verifie les donnees saisies.');
        }
      });
  }
}
