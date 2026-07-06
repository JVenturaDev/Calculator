import { TestBed } from '@angular/core/testing';
import { AuthSessionService } from './auth-session';
import { DemoEnvironmentService } from './demo-environment';

describe('AuthSessionService', () => {
  let service: AuthSessionService;
  let demoEnvironment: jasmine.SpyObj<DemoEnvironmentService>;

  beforeEach(() => {
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('calculator.demoGuest');
    demoEnvironment = jasmine.createSpyObj<DemoEnvironmentService>(
      'DemoEnvironmentService',
      ['isDemoAllowed']
    );
    demoEnvironment.isDemoAllowed.and.returnValue(false);

    TestBed.configureTestingModule({
      providers: [
        AuthSessionService,
        { provide: DemoEnvironmentService, useValue: demoEnvironment },
      ],
    });
    service = TestBed.inject(AuthSessionService);
  });

  afterEach(() => {
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('calculator.demoGuest');
  });

  it('recognizes a real token without creating a demo session', () => {
    localStorage.setItem('auth_token', 'real-token');

    expect(service.hasRealSession()).toBeTrue();
    expect(service.getRealToken()).toBe('real-token');
    expect(service.canAccessMain()).toBeTrue();
    expect(service.isDemoGuest()).toBeFalse();
  });

  it('starts a demo guest only in the allowed environment and removes real tokens', () => {
    demoEnvironment.isDemoAllowed.and.returnValue(true);
    localStorage.setItem('auth_token', 'real-token');

    expect(service.startDemoGuest()).toBeTrue();

    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(sessionStorage.getItem('calculator.demoGuest')).toBe('1');
    expect(service.isDemoGuest()).toBeTrue();
    expect(service.getRealToken()).toBeNull();
  });

  it('does not activate a demo marker outside the allowed environment', () => {
    sessionStorage.setItem('calculator.demoGuest', '1');

    expect(service.isDemoGuest()).toBeFalse();
    expect(service.canAccessMain()).toBeFalse();
  });

  it('clears real and demo sessions together', () => {
    localStorage.setItem('auth_token', 'real-token');
    sessionStorage.setItem('calculator.demoGuest', '1');

    service.clearSession();

    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(sessionStorage.getItem('calculator.demoGuest')).toBeNull();
  });

  it('clears only the demo marker without removing the real token', () => {
    localStorage.setItem('auth_token', 'real-token');
    sessionStorage.setItem('calculator.demoGuest', '1');

    service.clearDemoGuest();

    expect(localStorage.getItem('auth_token')).toBe('real-token');
    expect(sessionStorage.getItem('calculator.demoGuest')).toBeNull();
  });
});
