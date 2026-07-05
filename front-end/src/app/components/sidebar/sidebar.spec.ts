import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { CalcType, ToggleService } from '../../services/toggle-services/toggle';
import { SidebarComponent } from './sidebar';

describe('Sidebar', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let visibility: BehaviorSubject<boolean>;
  let activeCalc: BehaviorSubject<CalcType>;
  let toggleService: jasmine.SpyObj<ToggleService>;

  beforeEach(async () => {
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

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [{ provide: ToggleService, useValue: toggleService }],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    visibility.complete();
    activeCalc.complete();
  });

  it('renders only the three real calculator modes', () => {
    const modes = fixture.nativeElement.querySelectorAll('.nav-item');

    expect(component).toBeTruthy();
    expect(modes.length).toBe(3);
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

  it('selects each mode through ToggleService without closing the sidebar', () => {
    visibility.next(true);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll(
      '.nav-item'
    ) as NodeListOf<HTMLButtonElement>;
    buttons.forEach(button => button.click());

    expect(toggleService.setActiveCalc.calls.allArgs()).toEqual([
      ['basic'],
      ['scientific'],
      ['graphic'],
    ]);
    expect(toggleService.getToggle).toHaveBeenCalledOnceWith('sidebar');
    expect(toggleService.hide).not.toHaveBeenCalled();
    expect(component.isVisible).toBeTrue();
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
