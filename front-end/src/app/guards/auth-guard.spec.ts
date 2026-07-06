import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router } from '@angular/router';

import { authGuard } from './auth-guard';
import { AuthSessionService } from '../services/auth/auth-session';
import { DemoEnvironmentService } from '../services/auth/demo-environment';

describe('authGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => authGuard(...guardParameters));

  let session: AuthSessionService;
  let demoEnvironment: jasmine.SpyObj<DemoEnvironmentService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('calculator.demoGuest');
    demoEnvironment = jasmine.createSpyObj<DemoEnvironmentService>(
      'DemoEnvironmentService',
      ['isDemoAllowed']
    );
    demoEnvironment.isDemoAllowed.and.returnValue(false);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        AuthSessionService,
        { provide: DemoEnvironmentService, useValue: demoEnvironment },
        { provide: Router, useValue: router },
      ],
    });
    session = TestBed.inject(AuthSessionService);
  });

  afterEach(() => {
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('calculator.demoGuest');
  });

  it('allows access with a real token', () => {
    localStorage.setItem('auth_token', 'real-token');

    expect(executeGuard({} as never, {} as never)).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('allows an active demo guest in the permitted GitHub Pages environment', () => {
    demoEnvironment.isDemoAllowed.and.returnValue(true);
    session.startDemoGuest();

    expect(executeGuard({} as never, {} as never)).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('rejects a demo marker on localhost and redirects to login', () => {
    demoEnvironment.isDemoAllowed.and.returnValue(false);
    sessionStorage.setItem('calculator.demoGuest', '1');

    expect(executeGuard({} as never, {} as never)).toBeFalse();
    expect(router.navigate).toHaveBeenCalledOnceWith(['/login']);
  });
});
