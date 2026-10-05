import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.logged() ? true : inject(Router).createUrlTree(['/login']);
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (!auth.logged()) return inject(Router).createUrlTree(['/login']);
  return auth.isAdmin() ? true : inject(Router).createUrlTree(['/pdv']);
};
