import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, Observable } from 'rxjs';

import { MemoryToggleService } from '../../services/memory-services/memory-toggle';
import { ToggleService } from '../../services/toggle-services/toggle';
import { GraphicComponentPlot } from '../graphic-plot/graphic-plot';
import { HistoryComponent } from '../history/history';
import { MemoryComponent } from '../memory/memory';
import { InspectorShellComponent } from './inspector-shell';

type PersistentView = 'history' | 'graph';

@Component({
  selector: 'app-history',
  standalone: true,
  template: '<p data-testid="history-content">History content</p>',
})
class HistoryStubComponent {}

@Component({
  selector: 'app-memory',
  standalone: true,
  template: '<p data-testid="memory-content">Memory content</p>',
})
class MemoryStubComponent {}

@Component({
  selector: 'app-graphic-plot',
  standalone: true,
  template: '<p data-testid="graph-content">Graph content</p>',
})
class GraphicPlotStubComponent {}

describe('InspectorShellComponent', () => {
  let component: InspectorShellComponent;
  let fixture: ComponentFixture<InspectorShellComponent>;
  let view: BehaviorSubject<PersistentView>;
  let memoryVisible: BehaviorSubject<boolean>;
  let toggleService: {
    state$: Observable<PersistentView>;
    readonly current: PersistentView;
    GHtoggle: jasmine.Spy;
  };
  let memoryToggleService: {
    visible$: Observable<boolean>;
    show: jasmine.Spy;
    hide: jasmine.Spy;
    toggle: jasmine.Spy;
  };

  beforeEach(async () => {
    view = new BehaviorSubject<PersistentView>('history');
    memoryVisible = new BehaviorSubject(true);
    toggleService = {
      state$: view.asObservable(),
      get current() {
        return view.value;
      },
      GHtoggle: jasmine.createSpy('GHtoggle').and.callFake(() => {
        view.next(view.value === 'history' ? 'graph' : 'history');
      }),
    };
    memoryToggleService = {
      visible$: memoryVisible.asObservable(),
      show: jasmine.createSpy('show').and.callFake(() => memoryVisible.next(true)),
      hide: jasmine.createSpy('hide').and.callFake(() => memoryVisible.next(false)),
      toggle: jasmine.createSpy('toggle').and.callFake(
        () => memoryVisible.next(!memoryVisible.value)
      ),
    };

    await TestBed.configureTestingModule({
      imports: [InspectorShellComponent],
      providers: [
        { provide: ToggleService, useValue: toggleService },
        { provide: MemoryToggleService, useValue: memoryToggleService },
      ],
    })
      .overrideComponent(InspectorShellComponent, {
        remove: { imports: [HistoryComponent, MemoryComponent, GraphicComponentPlot] },
        add: {
          imports: [HistoryStubComponent, MemoryStubComponent, GraphicPlotStubComponent],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(InspectorShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    view.complete();
    memoryVisible.complete();
  });

  it('starts in History and reconciles Memory as initially hidden', () => {
    const tabs = fixture.nativeElement.querySelectorAll('[role="tab"]');

    expect(component).toBeTruthy();
    expect(tabs.length).toBe(3);
    expect(component.activeView).toBe('history');
    expect(memoryToggleService.hide).toHaveBeenCalledTimes(1);
    expect(memoryVisible.value).toBeFalse();
  });

  it('keeps exactly one Memory instance mounted while its panel is hidden', () => {
    const memoryPanel = fixture.nativeElement.querySelector(
      '#inspector-panel-memory'
    ) as HTMLElement;

    expect(fixture.nativeElement.querySelectorAll('app-memory').length).toBe(1);
    expect(fixture.nativeElement.querySelector('[data-testid="memory-content"]')).toBeTruthy();
    expect(memoryPanel.hidden).toBeTrue();

    view.next('graph');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-memory').length).toBe(1);
    expect(fixture.nativeElement.querySelector('[data-testid="memory-content"]')).toBeTruthy();
  });

  it('opens Memory on the first M toggle and returns on the second', () => {
    memoryToggleService.toggle();
    fixture.detectChanges();

    expect(component.activeView).toBe('memory');
    expect(
      (fixture.nativeElement.querySelector('#inspector-panel-memory') as HTMLElement).hidden
    ).toBeFalse();

    memoryToggleService.toggle();
    fixture.detectChanges();

    expect(component.activeView).toBe('history');
  });

  it('returns from Memory to the last History or Graph view', () => {
    (fixture.nativeElement.querySelector('#inspector-tab-graph') as HTMLButtonElement).click();
    fixture.detectChanges();
    memoryToggleService.toggle();
    fixture.detectChanges();
    memoryToggleService.toggle();
    fixture.detectChanges();

    expect(component.activeView).toBe('graph');
    expect(fixture.nativeElement.querySelector('[data-testid="graph-content"]')).toBeTruthy();
  });

  it('selecting the Memory tab calls show and selecting another tab hides it', () => {
    memoryToggleService.show.calls.reset();
    memoryToggleService.hide.calls.reset();

    (fixture.nativeElement.querySelector('#inspector-tab-memory') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(memoryToggleService.show).toHaveBeenCalledTimes(1);

    (fixture.nativeElement.querySelector('#inspector-tab-history') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(memoryToggleService.hide).toHaveBeenCalled();
    expect(component.activeView).toBe('history');
  });

  it('keeps Graph lazy and synchronized with ToggleService', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="graph-content"]')).toBeNull();

    view.next('graph');
    fixture.detectChanges();

    expect(component.activeView).toBe('graph');
    expect(fixture.nativeElement.querySelector('[data-testid="graph-content"]')).toBeTruthy();
  });

  it('cleans up ToggleService and MemoryToggleService subscriptions', () => {
    fixture.destroy();
    view.next('graph');
    memoryVisible.next(true);

    expect(component.activeView).toBe('history');
  });
});
