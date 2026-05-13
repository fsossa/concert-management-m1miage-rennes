import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthStoreService } from './auth-store.service';

export const authRedirectInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStoreService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
        const isAuthEndpoint = req.url.includes('/api/auth/login') || req.url.includes('/api/auth/register');
        if (!isAuthEndpoint) {
          authStore.clearSession();
          void router.navigateByUrl('/auth');
        }
      }

      return throwError(() => error);
    })
  );
};
