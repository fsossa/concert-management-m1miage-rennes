import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthStoreService {
  private readonly tokenKey = 'concert_token';
  private readonly rolesKey = 'concert_roles';

  readonly token = signal<string | null>(localStorage.getItem(this.tokenKey));
  readonly roles = signal<string[]>(this.readRoles());

  setSession(token: string, roles: string[]): void {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.rolesKey, JSON.stringify(roles));
    this.token.set(token);
    this.roles.set(roles);
  }

  clearSession(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.rolesKey);
    this.token.set(null);
    this.roles.set([]);
  }

  private readRoles(): string[] {
    const raw = localStorage.getItem(this.rolesKey);
    if (!raw) {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
    } catch {
      return [];
    }
  }
}
