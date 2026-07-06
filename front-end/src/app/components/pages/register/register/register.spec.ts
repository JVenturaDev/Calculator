import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { WorkspaceApiService } from '../../../../services/workspace-api-service/workspace-api-service';
import { AuthSessionService } from '../../../../services/auth/auth-session';
import { DemoEnvironmentService } from '../../../../services/auth/demo-environment';
import { ToastService } from '../../../../services/toast-services/toast';
import { Register } from './register';

describe('Register', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;
  let api: jasmine.SpyObj<WorkspaceApiService>;
  let router: jasmine.SpyObj<Router>;
  let toast: jasmine.SpyObj<ToastService>;
  let authSession: jasmine.SpyObj<AuthSessionService>;
  let demoEnvironment: jasmine.SpyObj<DemoEnvironmentService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<WorkspaceApiService>('WorkspaceApiService', ['register', 'guest']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success']);
    authSession = jasmine.createSpyObj<AuthSessionService>(
      'AuthSessionService',
      ['clearDemoGuest', 'startDemoGuest']
    );
    demoEnvironment = jasmine.createSpyObj<DemoEnvironmentService>(
      'DemoEnvironmentService',
      ['isDemoAllowed']
    );
    demoEnvironment.isDemoAllowed.and.returnValue(false);
    authSession.startDemoGuest.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        { provide: WorkspaceApiService, useValue: api },
        { provide: Router, useValue: router },
        { provide: ToastService, useValue: toast },
        { provide: AuthSessionService, useValue: authSession },
        { provide: DemoEnvironmentService, useValue: demoEnvironment },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the Register title and temporary Calculator identity', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Register');
    expect(element.querySelector('.product-name')?.textContent?.trim()).toBe('Calculator');
  });

  it('associates labels with the required username and password inputs', () => {
    const element = fixture.nativeElement as HTMLElement;
    const username = element.querySelector('#register-username') as HTMLInputElement;
    const password = element.querySelector('#register-password') as HTMLInputElement;

    expect(element.querySelector('label[for="register-username"]')).toBeTruthy();
    expect(element.querySelector('label[for="register-password"]')).toBeTruthy();
    expect(username.required).toBeTrue();
    expect(username.autocomplete).toBe('username');
    expect(password.required).toBeTrue();
    expect(password.autocomplete).toBe('new-password');
  });

  it('submits the current credentials through the existing register flow', () => {
    spyOn(window, 'alert');
    api.register.and.returnValue(of('registered'));
    component.username = 'jon';
    component.password = 'secret';

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));

    expect(api.register).toHaveBeenCalledOnceWith('jon', 'secret');
    expect(authSession.clearDemoGuest).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledOnceWith(
      'Registro completado. Ya puedes iniciar sesión.'
    );
    expect(window.alert).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledOnceWith(['/login']);
  });

  it('uses the existing guest flow', () => {
    api.guest.and.returnValue(of({ token: 'guest-token' }));

    const guestButton = fixture.nativeElement.querySelector(
      '.secondary-action',
    ) as HTMLButtonElement;
    guestButton.click();

    expect(api.guest).toHaveBeenCalledTimes(1);
    expect(authSession.clearDemoGuest).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledOnceWith(['/main']);
  });

  it('starts an offline guest on GitHub Pages without calling the backend', () => {
    demoEnvironment.isDemoAllowed.and.returnValue(true);

    component.continueAsGuest();

    expect(authSession.startDemoGuest).toHaveBeenCalledTimes(1);
    expect(api.guest).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledOnceWith(['/main']);
  });

  it('returns to login through the existing navigation action', () => {
    const loginButton = fixture.nativeElement.querySelector(
      '.register-footer button',
    ) as HTMLButtonElement;
    loginButton.click();

    expect(router.navigate).toHaveBeenCalledOnceWith(['/login']);
  });

  it('renders registration errors as an accessible alert', () => {
    api.register.and.returnValue(throwError(() => new Error('Invalid user')));

    component.register();
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    expect(alert).toBeTruthy();
    expect(alert.textContent).toContain('user invalido');
  });
});
