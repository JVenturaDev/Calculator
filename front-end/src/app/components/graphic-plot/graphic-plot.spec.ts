import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import Plotly from 'plotly.js-cartesian-dist-min';

import { GraphicComponentPlot } from './graphic-plot';
import {
  CALCULATION_ENGINE,
  CalculationEngine,
} from '../../services/engine-services/calculation-engine.contract';
import { GraphicPlotService } from '../../services/plot-services/graphic-plot';

describe('GraphicPlot', () => {
  let fixture: ComponentFixture<GraphicComponentPlot>;
  let expression$: BehaviorSubject<string>;
  let engine: jasmine.SpyObj<CalculationEngine>;
  let newPlot: jasmine.Spy;
  let resize: jasmine.Spy;
  let purge: jasmine.Spy;
  let observe: jasmine.Spy;
  let disconnect: jasmine.Spy;
  let resizeCallback: ResizeObserverCallback;
  let originalResizeObserver: typeof ResizeObserver | undefined;

  beforeEach(async () => {
    expression$ = new BehaviorSubject('');
    engine = jasmine.createSpyObj<CalculationEngine>('CalculationEngine', ['evaluate']);
    engine.evaluate.and.returnValue(0);

    originalResizeObserver = globalThis.ResizeObserver;
    observe = jasmine.createSpy('observe');
    disconnect = jasmine.createSpy('disconnect');

    class ResizeObserverMock {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
      }

      observe(target: Element): void {
        observe(target);
      }

      unobserve(): void {}

      disconnect(): void {
        disconnect();
      }
    }

    globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
    newPlot = spyOn(Plotly, 'newPlot').and.returnValue(Promise.resolve({}) as never);
    resize = spyOn(Plotly.Plots, 'resize').and.returnValue(Promise.resolve() as never);
    purge = spyOn(Plotly, 'purge');

    await TestBed.configureTestingModule({
      imports: [GraphicComponentPlot],
      providers: [
        { provide: CALCULATION_ENGINE, useValue: engine },
        {
          provide: GraphicPlotService,
          useValue: { expression$: expression$.asObservable() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GraphicComponentPlot);
    fixture.detectChanges();
  });

  afterEach(() => {
    expression$.complete();
    if (originalResizeObserver) {
      globalThis.ResizeObserver = originalResizeObserver;
    } else {
      delete (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
    }
  });

  it('uses the example graph for an empty expression', () => {
    const layout = latestLayout();
    const config = latestConfig();
    const region = nativeElement().querySelector<HTMLElement>('.plot-container');

    expect(latestTrace()['type']).toBe('scatter');
    expect((layout['title'] as Record<string, unknown>)['text'])
      .toBe('Ejemplo: y = sin(x)');
    expect(layout['autosize']).toBeTrue();
    expect(config['responsive']).toBeTrue();
    expect(region?.getAttribute('role')).toBe('region');
    expect(region?.getAttribute('aria-label')).toBe('Ejemplo: y = sin(x)');
  });

  it('renders an expression with x as a scatter trace', () => {
    expression$.next('x^2');

    const trace = latestTrace();
    expect(trace['type']).toBe('scatter');
    expect((trace['x'] as number[]).length).toBe(400);
    expect((trace['y'] as number[]).length).toBe(400);
    expect(engine.evaluate).toHaveBeenCalledTimes(400);
  });

  it('renders an expression with y as a contour trace', () => {
    expression$.next('x+y');

    const trace = latestTrace();
    expect(trace['type']).toBe('contour');
    expect((trace['x'] as number[]).length).toBe(100);
    expect((trace['y'] as number[]).length).toBe(100);
    expect((trace['z'] as number[][]).length).toBe(100);
    expect(engine.evaluate).toHaveBeenCalledTimes(10000);
  });

  it('converts sampling errors to NaN', () => {
    engine.evaluate.and.throwError('sampling error');

    expression$.next('x/0');

    const values = latestTrace()['y'] as number[];
    expect(values.length).toBe(400);
    expect(values.every(Number.isNaN)).toBeTrue();
  });

  it('unsubscribes, disconnects resize and purges Plotly on destroy', () => {
    const container = nativeElement().querySelector('.plot-container') as HTMLDivElement;
    const plotsBeforeDestroy = newPlot.calls.count();

    fixture.destroy();
    expression$.next('x');

    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(purge).toHaveBeenCalledOnceWith(container);
    expect(newPlot.calls.count()).toBe(plotsBeforeDestroy);
  });

  it('resizes without evaluating or plotting the expression again', () => {
    expression$.next('x');
    const evaluationsBeforeResize = engine.evaluate.calls.count();
    const plotsBeforeResize = newPlot.calls.count();
    const container = nativeElement().querySelector('.plot-container') as HTMLDivElement;

    resizeCallback([], {} as ResizeObserver);

    expect(observe).toHaveBeenCalledOnceWith(container);
    expect(resize).toHaveBeenCalledOnceWith(container);
    expect(engine.evaluate.calls.count()).toBe(evaluationsBeforeResize);
    expect(newPlot.calls.count()).toBe(plotsBeforeResize);
  });

  function latestTrace(): Record<string, unknown> {
    const data = newPlot.calls.mostRecent().args[1] as Record<string, unknown>[];
    return data[0];
  }

  function latestLayout(): Record<string, unknown> {
    return newPlot.calls.mostRecent().args[2] as Record<string, unknown>;
  }

  function latestConfig(): Record<string, unknown> {
    return newPlot.calls.mostRecent().args[3] as Record<string, unknown>;
  }

  function nativeElement(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }
});
