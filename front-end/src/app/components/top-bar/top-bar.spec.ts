import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { AuthSessionService } from '../../services/auth/auth-session';
import { DemoEnvironmentService } from '../../services/auth/demo-environment';
import { ToggleService } from '../../services/toggle-services/toggle';
import { TopBar } from './top-bar';

describe('TopBar', () => {
  let component: TopBar;
  let fixture: ComponentFixture<TopBar>;
  let sidebarVisible: BehaviorSubject<boolean>;
  let toggleService: jasmine.SpyObj<ToggleService>;
  let router: jasmine.SpyObj<Router>;
  let authSession: AuthSessionService;
  let demoEnvironment: jasmine.SpyObj<DemoEnvironmentService>;

  beforeEach(async () => {
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('calculator.demoGuest');
    sidebarVisible = new BehaviorSubject(false);
    toggleService = jasmine.createSpyObj<ToggleService>('ToggleService', ['getToggle', 'toggle']);
    toggleService.getToggle.and.returnValue(sidebarVisible);

    demoEnvironment = jasmine.createSpyObj<DemoEnvironmentService>(
      'DemoEnvironmentService',
      ['isDemoAllowed']
    );
    demoEnvironment.isDemoAllowed.and.returnValue(false);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    localStorage.setItem('auth_token', 'real-token');

    await TestBed.configureTestingModule({
      imports: [TopBar],
      providers: [
        { provide: ToggleService, useValue: toggleService },
        { provide: Router, useValue: router },
        { provide: DemoEnvironmentService, useValue: demoEnvironment },
      ],
    }).compileComponents();

    authSession = TestBed.inject(AuthSessionService);
    fixture = TestBed.createComponent(TopBar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    authSession.clearSession();
    sidebarVisible.complete();
  });

  it('renders the temporary Calculator Workspace brand', () => {
    const brand = fixture.nativeElement.querySelector('.brand') as HTMLElement;

    expect(component).toBeTruthy();
    expect(brand.textContent).toContain('Calculator');
    expect(brand.textContent).toContain('Workspace');
  });

  it('toggles the existing sidebar from the accessible menu button', () => {
    const menu = fixture.nativeElement.querySelector('.menuHamburger') as HTMLButtonElement;

    expect(menu.getAttribute('aria-expanded')).toBe('false');
    expect(menu.getAttribute('aria-controls')).toBe('calculator-sidebar');
    menu.click();

    expect(toggleService.toggle).toHaveBeenCalledOnceWith('sidebar');
  });

  it('reflects sidebar visibility in aria-expanded', () => {
    sidebarVisible.next(true);
    fixture.detectChanges();

    const menu = fixture.nativeElement.querySelector('.menuHamburger') as HTMLButtonElement;
    expect(menu.getAttribute('aria-expanded')).toBe('true');
  });

  it('recognizes a real token and clears every session on logout using the Router', () => {
    sessionStorage.setItem('calculator.demoGuest', '1');
    const logout = fixture.nativeElement.querySelector('.logout-action') as HTMLButtonElement;

    expect(logout.getAttribute('aria-label')).toBe('Cerrar sesión');
    logout.click();

    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(sessionStorage.getItem('calculator.demoGuest')).toBeNull();
    expect(router.navigate).toHaveBeenCalledOnceWith(['/login']);
  });

  it('recognizes an allowed offline demo guest as an authenticated session', () => {
    authSession.clearSession();
    demoEnvironment.isDemoAllowed.and.returnValue(true);
    sessionStorage.setItem('calculator.demoGuest', '1');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.logout-action')).toBeTruthy();
  });

  it('keeps login and registration navigation when there is no session', () => {
    authSession.clearSession();
    fixture.detectChanges();

    const actions = fixture.nativeElement.querySelectorAll('.auth-action') as NodeListOf<HTMLButtonElement>;
    actions[0].click();
    actions[1].click();

    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(router.navigate).toHaveBeenCalledWith(['/register']);
  });
});
