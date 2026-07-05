import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { WorkspaceApiService } from '../../services/workspaceApiService/workspace-api-service';
import { ToggleService } from '../../services/toggle-services/toggle';
import { TopBar } from './top-bar';

describe('TopBar', () => {
  let component: TopBar;
  let fixture: ComponentFixture<TopBar>;
  let sidebarVisible: BehaviorSubject<boolean>;
  let toggleService: jasmine.SpyObj<ToggleService>;
  let workspaceApi: jasmine.SpyObj<WorkspaceApiService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    sidebarVisible = new BehaviorSubject(false);
    toggleService = jasmine.createSpyObj<ToggleService>('ToggleService', ['getToggle', 'toggle']);
    toggleService.getToggle.and.returnValue(sidebarVisible);

    workspaceApi = jasmine.createSpyObj<WorkspaceApiService>(
      'WorkspaceApiService',
      ['isLoggedIn', 'logout']
    );
    workspaceApi.isLoggedIn.and.returnValue(true);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [TopBar],
      providers: [
        { provide: ToggleService, useValue: toggleService },
        { provide: WorkspaceApiService, useValue: workspaceApi },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TopBar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => sidebarVisible.complete());

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

  it('keeps the real logout action', () => {
    const logout = fixture.nativeElement.querySelector('.logout-action') as HTMLButtonElement;

    expect(logout.getAttribute('aria-label')).toBe('Cerrar sesión');
    logout.click();

    expect(workspaceApi.logout).toHaveBeenCalledTimes(1);
  });

  it('keeps login and registration navigation when there is no session', () => {
    workspaceApi.isLoggedIn.and.returnValue(false);
    fixture.detectChanges();

    const actions = fixture.nativeElement.querySelectorAll('.auth-action') as NodeListOf<HTMLButtonElement>;
    actions[0].click();
    actions[1].click();

    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(router.navigate).toHaveBeenCalledWith(['/register']);
  });
});
