import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { CalcType, ToggleService } from '../../services/toggle-services/toggle';
import { SidebarComponent } from './sidebar';

describe('Sidebar', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let visibility: BehaviorSubject<boolean>;
  let activeCalc: BehaviorSubject<CalcType>;
  let toggleService: jasmine.SpyObj<ToggleService>;
  let router: jasmine.SpyObj<Router>;
  let routerUrl = '/main';

  beforeEach(async () => {
    routerUrl = '/main';
    visibility = new BehaviorSubject(false);
    activeCalc = new BehaviorSubject<CalcType>('graphic');
    toggleService = jasmine.createSpyObj<ToggleService>(
      'ToggleService',
      ['getToggle', 'setActiveCalc', 'hide']
    );
    toggleService.getToggle.and.returnValue(visibility);
    Object.defineProperty(toggleService, 'activeCalc$', {
      value: activeCalc.asObservable(),
    });
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.returnValue(Promise.resolve(true));
    Object.defineProperty(router, 'url', {
      get: () => routerUrl,
    });

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        { provide: ToggleService, useValue: toggleService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    visibility.complete();
    activeCalc.complete();
  });

  function findNavItemByText(text: string): HTMLButtonElement {
    const items = Array.from(
      fixture.nativeElement.querySelectorAll('.nav-item')
    ) as HTMLButtonElement[];
    const item = items.find(candidate => candidate.textContent?.includes(text));

    expect(item).toBeDefined();
    return item as HTMLButtonElement;
  }

  it('renders calculator and workspaces sections', () => {
    const sections = fixture.nativeElement.querySelectorAll('.navigation-section');
    const modes = fixture.nativeElement.querySelectorAll('[data-mode]');
    const items = fixture.nativeElement.querySelectorAll('.nav-item');

    expect(component).toBeTruthy();
    expect(sections.length).toBe(2);
    expect(modes.length).toBe(3);
    expect(items.length).toBe(5);
    expect(fixture.nativeElement.textContent).toContain('Calculadora');
    expect(fixture.nativeElement.textContent).toContain('Workspaces');
    expect(fixture.nativeElement.textContent).toContain('Calculator Workspace');
    expect(fixture.nativeElement.textContent).toContain('Graph Workspace');
    expect(fixture.nativeElement.textContent).not.toContain('Gallery Sections');
    expect(fixture.nativeElement.textContent).not.toContain('Settings');
  });

  it('reacts to the existing sidebar visibility toggle', () => {
    const sidebar = fixture.nativeElement.querySelector('.sidebar') as HTMLElement;
    expect(sidebar.classList.contains('sidebar--visible')).toBeFalse();
    expect(sidebar.getAttribute('aria-hidden')).toBe('true');

    visibility.next(true);
    fixture.detectChanges();

    expect(sidebar.classList.contains('sidebar--visible')).toBeTrue();
    expect(sidebar.getAttribute('aria-hidden')).toBe('false');
    expect(sidebar.getAttribute('role')).toBe('dialog');
    expect(sidebar.getAttribute('aria-modal')).toBe('true');
  });

  it('renders the backdrop only while open and closes it through ToggleService', () => {
    expect(fixture.nativeElement.querySelector('.sidebar-backdrop')).toBeNull();

    visibility.next(true);
    fixture.detectChanges();

    const backdrop = fixture.nativeElement.querySelector(
      '.sidebar-backdrop'
    ) as HTMLElement;
    expect(backdrop).toBeTruthy();

    backdrop.click();
    expect(toggleService.hide).toHaveBeenCalledOnceWith('sidebar');
  });

  it('closes with Escape while open', () => {
    visibility.next(true);
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(toggleService.hide).toHaveBeenCalledOnceWith('sidebar');
  });

  it('focuses the active mode when opened', fakeAsync(() => {
    activeCalc.next('scientific');
    visibility.next(true);
    fixture.detectChanges();
    tick();

    const scientific = fixture.nativeElement.querySelector(
      '[data-mode="scientific"]'
    ) as HTMLButtonElement;
    expect(document.activeElement).toBe(scientific);
  }));

  it('restores the previously focused element when closed', fakeAsync(() => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    visibility.next(true);
    fixture.detectChanges();
    tick();
    visibility.next(false);
    fixture.detectChanges();
    tick();

    expect(document.activeElement).toBe(opener);
    opener.remove();
  }));

  it('cycles Tab and Shift+Tab inside the sidebar', fakeAsync(() => {
    visibility.next(true);
    fixture.detectChanges();
    tick();

    const buttons = fixture.nativeElement.querySelectorAll(
      '.nav-item'
    ) as NodeListOf<HTMLButtonElement>;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    const sidebar = fixture.nativeElement.querySelector('.sidebar') as HTMLElement;

    last.focus();
    sidebar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(first);

    first.focus();
    sidebar.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })
    );
    expect(document.activeElement).toBe(last);
    expect(buttons.length).toBe(5);
  }));

  it('shows the active mode visually and accessibly', () => {
    activeCalc.next('scientific');
    fixture.detectChanges();

    const scientific = fixture.nativeElement.querySelector(
      '[data-mode="scientific"]'
    ) as HTMLButtonElement;
    const graphic = fixture.nativeElement.querySelector(
      '[data-mode="graphic"]'
    ) as HTMLButtonElement;

    expect(scientific.classList.contains('nav-item--active')).toBeTrue();
    expect(scientific.getAttribute('aria-pressed')).toBe('true');
    expect(graphic.getAttribute('aria-pressed')).toBe('false');
  });

  it('shows the active workspace route accessibly', () => {
    routerUrl = '/graph-workspace';
    fixture.detectChanges();

    const graphWorkspace = findNavItemByText('Graph Workspace');
    const calculatorWorkspace = findNavItemByText('Calculator Workspace');

    expect(graphWorkspace.classList.contains('nav-item--active')).toBeTrue();
    expect(graphWorkspace.getAttribute('aria-current')).toBe('page');
    expect(calculatorWorkspace.getAttribute('aria-current')).toBeNull();
  });

  it('shows Calculator Workspace active on /main', () => {
    routerUrl = '/main';
    fixture.detectChanges();

    const calculatorWorkspace = findNavItemByText('Calculator Workspace');

    expect(calculatorWorkspace.classList.contains('nav-item--active')).toBeTrue();
    expect(calculatorWorkspace.getAttribute('aria-current')).toBe('page');
  });

  it('selects each mode through ToggleService without closing the sidebar on /main', () => {
    visibility.next(true);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll(
      '[data-mode]'
    ) as NodeListOf<HTMLButtonElement>;
    buttons.forEach(button => button.click());

    expect(toggleService.setActiveCalc.calls.allArgs()).toEqual([
      ['basic'],
      ['scientific'],
      ['graphic'],
    ]);
    expect(toggleService.getToggle).toHaveBeenCalledOnceWith('sidebar');
    expect(toggleService.hide).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.isVisible).toBeTrue();
  });

  it('navigates to main and selects mode from graph workspace', () => {
    routerUrl = '/graph-workspace';
    fixture.detectChanges();

    const basic = fixture.nativeElement.querySelector(
      '[data-mode="basic"]'
    ) as HTMLButtonElement;
    basic.click();

    expect(toggleService.setActiveCalc).toHaveBeenCalledOnceWith('basic');
    expect(router.navigate).toHaveBeenCalledOnceWith(['/main']);
    expect(toggleService.hide).not.toHaveBeenCalled();
  });

  it('navigates to Graph Workspace without changing CalcType', () => {
    visibility.next(true);
    fixture.detectChanges();

    const graphWorkspace = findNavItemByText('Graph Workspace');
    graphWorkspace.click();

    expect(router.navigate).toHaveBeenCalledOnceWith(['/graph-workspace']);
    expect(toggleService.setActiveCalc).not.toHaveBeenCalled();
    expect(toggleService.hide).toHaveBeenCalledOnceWith('sidebar');
  });

  it('navigates to Calculator Workspace and closes the sidebar', () => {
    visibility.next(true);
    fixture.detectChanges();

    const calculatorWorkspace = findNavItemByText('Calculator Workspace');
    calculatorWorkspace.click();

    expect(router.navigate).toHaveBeenCalledOnceWith(['/main']);
    expect(toggleService.hide).toHaveBeenCalledOnceWith('sidebar');
  });

  it('cleans up visibility and mode subscriptions when destroyed', () => {
    visibility.next(true);
    activeCalc.next('basic');
    fixture.destroy();

    visibility.next(false);
    activeCalc.next('graphic');

    expect(component.isVisible).toBeTrue();
    expect(component.activeCalc).toBe('basic');
  });
});
