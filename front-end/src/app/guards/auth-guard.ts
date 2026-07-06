import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthSessionService } from '../services/auth/auth-session';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const session = inject(AuthSessionService);

  if (session.canAccessMain()) return true;

  router.navigate(['/login']);
  return false;
};
