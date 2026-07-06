import { Injectable } from '@angular/core';
import { DemoEnvironmentService } from './demo-environment';

const AUTH_TOKEN_KEY = 'auth_token';
const DEMO_GUEST_KEY = 'calculator.demoGuest';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  constructor(private readonly demoEnvironment: DemoEnvironmentService) {}

  getRealToken(): string | null {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    return token?.trim() ? token : null;
  }

  hasRealSession(): boolean {
    return this.getRealToken() !== null;
  }

  isDemoGuest(): boolean {
    return (
      this.demoEnvironment.isDemoAllowed() &&
      sessionStorage.getItem(DEMO_GUEST_KEY) === '1'
    );
  }

  startDemoGuest(): boolean {
    localStorage.removeItem(AUTH_TOKEN_KEY);

    if (!this.demoEnvironment.isDemoAllowed()) {
      sessionStorage.removeItem(DEMO_GUEST_KEY);
      return false;
    }

    sessionStorage.setItem(DEMO_GUEST_KEY, '1');
    return true;
  }

  clearDemoGuest(): void {
    sessionStorage.removeItem(DEMO_GUEST_KEY);
  }

  clearSession(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    this.clearDemoGuest();
  }

  canAccessMain(): boolean {
    return this.hasRealSession() || this.isDemoGuest();
  }
}
