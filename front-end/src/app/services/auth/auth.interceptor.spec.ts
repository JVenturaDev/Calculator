
import {
  HttpHandlerFn,
  HttpHeaders,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthSessionService } from './auth-session';
import { DemoEnvironmentService } from './demo-environment';

describe('authInterceptor', () => {
  let next: jasmine.Spy<HttpHandlerFn>;
  let session: AuthSessionService;
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
    session = TestBed.inject(AuthSessionService);
    next = jasmine.createSpy<HttpHandlerFn>('next').and.returnValue(
      of(new HttpResponse({ status: 200 }))
    );
  });

  afterEach(() => {
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('calculator.demoGuest');
  });

  it('forwards the original request when there is no token', () => {
    const request = new HttpRequest('GET', '/api/workspaces');

    intercept(request);

    expect(next).toHaveBeenCalledOnceWith(request);
  });

  it('adds the bearer authorization header when a token exists', () => {
    localStorage.setItem('auth_token', 'test-token');
    const request = new HttpRequest('GET', '/api/workspaces');

    intercept(request);

    const forwardedRequest = next.calls.mostRecent().args[0];
    expect(forwardedRequest.headers.get('Authorization')).toBe(
      'Bearer test-token'
    );
  });

  it('does not mutate the original request', () => {
    localStorage.setItem('auth_token', 'test-token');
    const request = new HttpRequest('GET', '/api/workspaces');

    intercept(request);

    const forwardedRequest = next.calls.mostRecent().args[0];
    expect(forwardedRequest).not.toBe(request);
    expect(request.headers.has('Authorization')).toBeFalse();
  });

  it('preserves existing headers when adding authorization', () => {
    localStorage.setItem('auth_token', 'test-token');
    const request = new HttpRequest('GET', '/api/workspaces', {
      headers: new HttpHeaders({ 'X-Request-Id': 'request-123' }),
    });

    intercept(request);

    const forwardedRequest = next.calls.mostRecent().args[0];
    expect(forwardedRequest.headers.get('X-Request-Id')).toBe('request-123');
    expect(forwardedRequest.headers.get('Authorization')).toBe(
      'Bearer test-token'
    );
  });

  it('does not add authorization for an offline demo guest', () => {
    demoEnvironment.isDemoAllowed.and.returnValue(true);
    session.startDemoGuest();
    const request = new HttpRequest('GET', '/api/workspaces');

    intercept(request);

    expect(next).toHaveBeenCalledOnceWith(request);
    expect(
      next.calls.mostRecent().args[0].headers.has('Authorization')
    ).toBeFalse();
  });

  function intercept(request: HttpRequest<unknown>): void {
    TestBed.runInInjectionContext(() => {
      authInterceptor(request, next).subscribe();
    });
  }
});
