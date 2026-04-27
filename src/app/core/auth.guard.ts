import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthStoreService } from './auth-store.service';

export const authGuard: CanActivateFn = () => {
  const authStore = inject(AuthStoreService);
  const router = inject(Router);

  if (!authStore.token()) {
    void router.navigateByUrl('/auth');
    return false;
  }

  return true;
};

export const organizerGuard: CanActivateFn = () => {
  const authStore = inject(AuthStoreService);
  const router = inject(Router);

  if (!authStore.token()) {
    void router.navigateByUrl('/auth');
    return false;
  }

  const isOrganizer = authStore.roles().some((role) => role === 'ORGANIZER' || role === 'ADMIN');
  if (!isOrganizer) {
    void router.navigateByUrl('/');
    return false;
  }

  return true;
};
