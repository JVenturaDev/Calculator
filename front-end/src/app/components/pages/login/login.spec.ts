import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { WorkspaceApiService } from '../../../services/workspaceApiService/workspace-api-service';
import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let api: jasmine.SpyObj<WorkspaceApiService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<WorkspaceApiService>('WorkspaceApiService', ['login', 'guest']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: WorkspaceApiService, useValue: api },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and expose labelled credential fields', () => {
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.querySelector('label[for="username"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('label[for="password"]')).toBeTruthy();
  });

  it('uses the temporary Calculator identity without legacy branding', () => {
    const header = fixture.nativeElement.querySelector('.login-header') as HTMLElement;

    expect(header.querySelector('.calculator-mark')).toBeTruthy();
    expect(header.querySelector('h1')?.textContent?.trim()).toBe('Calculator');
  });

  it('logs in with the current credentials and navigates to main', () => {
    api.login.and.returnValue(of({ token: 'token' }));
    component.username = 'jon';
    component.password = 'secret';

    component.login();

    expect(api.login).toHaveBeenCalledOnceWith('jon', 'secret');
    expect(router.navigate).toHaveBeenCalledOnceWith(['/main']);
    expect(component.loadingAction).toBeNull();
  });

  it('keeps controls busy and blocks another authentication request while login is pending', () => {
    const response$ = new Subject<{ token: string }>();
    api.login.and.returnValue(response$);

    component.login();
    component.continueAsGuest();

    expect(component.loadingAction).toBe('login');
    expect(api.guest).not.toHaveBeenCalled();

    response$.complete();
    expect(component.loadingAction).toBeNull();
  });

  it('shows a credential error and clears loading after a failed login', () => {
    api.login.and.returnValue(throwError(() => new Error('Unauthorized')));

    component.login();

    expect(component.error).toContain('Credenciales inválidas');
    expect(component.loadingAction).toBeNull();
  });

  it('starts a guest session and navigates to main', () => {
    api.guest.and.returnValue(of({ token: 'guest-token' }));

    component.continueAsGuest();

    expect(api.guest).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledOnceWith(['/main']);
  });

  it('navigates to registration', () => {
    component.goRegister();

    expect(router.navigate).toHaveBeenCalledOnceWith(['/register']);
  });
});
