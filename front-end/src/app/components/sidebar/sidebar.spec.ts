import { ComponentFixture, TestBed } from '@angular/core/testing';
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
      ['getToggle', 'setActiveCalc']
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
  });

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
