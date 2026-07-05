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
    const tablist = fixture.nativeElement.querySelector('[role="tablist"]') as HTMLElement;

    expect(component).toBeTruthy();
    expect(tabs.length).toBe(3);
    expect(tablist.getAttribute('aria-orientation')).toBe('horizontal');
    expect(component.activeView).toBe('history');
    expect(memoryToggleService.hide).toHaveBeenCalledTimes(1);
    expect(memoryVisible.value).toBeFalse();
  });

  it('keeps exactly one active tab in the roving tabindex', () => {
    expectActiveTab('history');

    pressKey('history', 'ArrowRight');
    expectActiveTab('memory');

    pressKey('memory', 'ArrowRight');
    expectActiveTab('graph');
  });

  it('cycles ArrowRight through History, Memory, Graph and History', () => {
    pressKey('history', 'ArrowRight');
    expect(component.activeView).toBe('memory');

    pressKey('memory', 'ArrowRight');
    expect(component.activeView).toBe('graph');

    pressKey('graph', 'ArrowRight');
    expect(component.activeView).toBe('history');
  });

  it('cycles ArrowLeft through History, Graph, Memory and History', () => {
    pressKey('history', 'ArrowLeft');
    expect(component.activeView).toBe('graph');

    pressKey('graph', 'ArrowLeft');
    expect(component.activeView).toBe('memory');

    pressKey('memory', 'ArrowLeft');
    expect(component.activeView).toBe('history');
  });

  it('uses Home and End to select and focus the boundary tabs', () => {
    pressKey('history', 'End');

    const graphTab = getTab('graph');
    expect(component.activeView).toBe('graph');
    expect(document.activeElement).toBe(graphTab);

    pressKey('graph', 'Home');

    const historyTab = getTab('history');
    expect(component.activeView).toBe('history');
    expect(document.activeElement).toBe(historyTab);
  });

  it('keeps every aria-controls target present while panels are lazy', () => {
    const tabs = fixture.nativeElement.querySelectorAll(
      '[role="tab"]'
    ) as NodeListOf<HTMLButtonElement>;

    tabs.forEach(tab => {
      const panelId = tab.getAttribute('aria-controls');
      expect(panelId).toBeTruthy();
      expect(fixture.nativeElement.querySelector(`#${panelId}`)).toBeTruthy();
    });

    expect(fixture.nativeElement.querySelector('[data-testid="graph-content"]')).toBeNull();
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
    const graphPanel = fixture.nativeElement.querySelector(
      '#inspector-panel-graph'
    ) as HTMLElement;

    expect(graphPanel).toBeTruthy();
    expect(graphPanel.hidden).toBeTrue();
    expect(fixture.nativeElement.querySelector('[data-testid="graph-content"]')).toBeNull();

    view.next('graph');
    fixture.detectChanges();

    expect(component.activeView).toBe('graph');
    expect(graphPanel.hidden).toBeFalse();
    expect(fixture.nativeElement.querySelector('[data-testid="graph-content"]')).toBeTruthy();

    view.next('history');
    fixture.detectChanges();

    expect(graphPanel.hidden).toBeTrue();
    expect(fixture.nativeElement.querySelector('[data-testid="graph-content"]')).toBeNull();
  });

  it('cleans up ToggleService and MemoryToggleService subscriptions', () => {
    fixture.destroy();
    view.next('graph');
    memoryVisible.next(true);

    expect(component.activeView).toBe('history');
  });

  function pressKey(viewName: 'history' | 'memory' | 'graph', key: string): void {
    const tab = getTab(viewName);
    tab.focus();
    tab.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    fixture.detectChanges();
  }

  function getTab(viewName: 'history' | 'memory' | 'graph'): HTMLButtonElement {
    return fixture.nativeElement.querySelector(
      `[data-view="${viewName}"]`
    ) as HTMLButtonElement;
  }

  function expectActiveTab(viewName: 'history' | 'memory' | 'graph'): void {
    const tabs = fixture.nativeElement.querySelectorAll(
      '[role="tab"]'
    ) as NodeListOf<HTMLButtonElement>;
    const tabbable = Array.from(tabs).filter(tab => tab.tabIndex === 0);

    expect(tabbable.length).toBe(1);
    expect(tabbable[0]).toBe(getTab(viewName));
    expect(getTab(viewName).getAttribute('aria-selected')).toBe('true');
  }
});
