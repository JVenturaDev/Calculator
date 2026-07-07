import { ComponentFixture, TestBed } from '@angular/core/testing';
import Plotly from 'plotly.js-cartesian-dist-min';

import { GraphCanvasComponent } from './graph-canvas';
import { GraphFunctionSample } from '../../../services/graph-workspace/graph-sampling';
import { GraphViewport2D } from '../../../services/graph-workspace/graph-workspace-state';

describe('GraphCanvasComponent', () => {
  let fixture: ComponentFixture<GraphCanvasComponent>;
  let component: GraphCanvasComponent;
  let newPlot: jasmine.Spy;
  let react: jasmine.Spy;
  let resize: jasmine.Spy;
  let purge: jasmine.Spy;
  let observe: jasmine.Spy;
  let disconnect: jasmine.Spy;
  let resizeCallback: ResizeObserverCallback;
  let originalResizeObserver: typeof ResizeObserver | undefined;

  const viewport: GraphViewport2D = {
    xMin: -5,
    xMax: 5,
    yMin: -3,
    yMax: 7,
  };

  beforeEach(async () => {
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
    react = spyOn(Plotly, 'react').and.returnValue(Promise.resolve({}) as never);
    resize = spyOn(Plotly.Plots, 'resize').and.returnValue(Promise.resolve() as never);
    purge = spyOn(Plotly, 'purge');

    await TestBed.configureTestingModule({
      imports: [GraphCanvasComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GraphCanvasComponent);
    component = fixture.componentInstance;
    component.viewport = viewport;
    component.samples = [];
  });

  afterEach(() => {
    if (originalResizeObserver) {
      globalThis.ResizeObserver = originalResizeObserver;
    } else {
      delete (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
    }
  });

  it('renders a line sample as a scatter trace', async () => {
    component.samples = [lineSample()];

    fixture.detectChanges();
    await fixture.whenStable();

    const trace = latestNewPlotTrace();
    expect(trace['type']).toBe('scatter');
    expect(trace['mode']).toBe('lines');
    expect(trace['x']).toEqual([0, 1, 2]);
    expect(trace['y']).toEqual([1, 2, 3]);
    expect(trace['name']).toBe('f1');
    expect(trace['uid']).toBe('line-1');
    expect(trace['legendgroup']).toBe('line-1');
    expect(trace['connectgaps']).toBeFalse();
    expect(trace['line']).toEqual({ color: '#78a9ff', width: 2.5 });
  });

  it('renders a contour sample as a contour trace', async () => {
    component.samples = [contourSample()];

    fixture.detectChanges();
    await fixture.whenStable();

    const trace = latestNewPlotTrace();
    expect(trace['type']).toBe('contour');
    expect(trace['x']).toEqual([-1, 1]);
    expect(trace['y']).toEqual([-2, 2]);
    expect(trace['z']).toEqual([[0, 1], [2, 3]]);
    expect(trace['name']).toBe('g1');
    expect(trace['uid']).toBe('contour-1');
    expect(trace['legendgroup']).toBe('contour-1');
    expect(trace['colorscale']).toEqual([
      [0, '#c2a7ff'],
      [1, '#c2a7ff'],
    ]);
    expect(trace['contours']).toEqual({ coloring: 'lines' });
    expect(trace['showscale']).toBeFalse();
  });

  it('preserves the order of multiple traces', async () => {
    component.samples = [contourSample(), lineSample()];

    fixture.detectChanges();
    await fixture.whenStable();

    const traces = latestNewPlotData();
    expect(traces.map(trace => trace['uid'])).toEqual(['contour-1', 'line-1']);
  });

  it('omits hidden, empty and invalid samples', async () => {
    component.samples = [
      lineSample('hidden'),
      lineSample('empty'),
      lineSample('invalid'),
      contourSample(),
    ];

    fixture.detectChanges();
    await fixture.whenStable();

    const traces = latestNewPlotData();
    expect(traces.length).toBe(1);
    expect(traces[0]['uid']).toBe('contour-1');
  });

  it('tolerates NaN values in sampled data', async () => {
    component.samples = [lineSample('ready', [1, Number.NaN, 3])];

    fixture.detectChanges();
    await fixture.whenStable();

    const values = latestNewPlotTrace()['y'] as number[];
    expect(Number.isNaN(values[1])).toBeTrue();
  });

  it('applies the viewport to axis ranges', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const layout = latestNewPlotLayout();
    expect((layout['xaxis'] as Record<string, unknown>)['range']).toEqual([-5, 5]);
    expect((layout['yaxis'] as Record<string, unknown>)['range']).toEqual([-3, 7]);
    expect(layout['autosize']).toBeTrue();
    expect(layout['showlegend']).toBeTrue();
    expect(layout['hovermode']).toBe('closest');
  });

  it('uses newPlot for the first render and react for updates', async () => {
    component.samples = [lineSample()];

    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentRef.setInput('samples', [contourSample()]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(newPlot).toHaveBeenCalledTimes(1);
    expect(react).toHaveBeenCalledTimes(1);
    expect((react.calls.mostRecent().args[1] as Record<string, unknown>[])[0]['uid'])
      .toBe('contour-1');
  });

  it('resizes without rendering again', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const plotCount = newPlot.calls.count();
    const container = nativeElement().querySelector('.graph-canvas-plot') as HTMLDivElement;

    resizeCallback([], {} as ResizeObserver);

    expect(observe).toHaveBeenCalledOnceWith(container);
    expect(resize).toHaveBeenCalledOnceWith(container);
    expect(newPlot.calls.count()).toBe(plotCount);
    expect(react).not.toHaveBeenCalled();
  });

  it('purges Plotly and disconnects resize on destroy', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const container = nativeElement().querySelector('.graph-canvas-plot') as HTMLDivElement;

    fixture.destroy();

    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(purge).toHaveBeenCalledOnceWith(container);
  });

  it('does not mutate sample inputs', async () => {
    const sample = contourSample();
    const sampleTrace = sample.trace;
    if (!sampleTrace || sampleTrace.kind !== 'contour') {
      fail('Expected contour sample');
      return;
    }
    const originalX = [...sampleTrace.x];
    const originalZ = sampleTrace.z.map(row => [...row]);

    component.samples = [sample];

    fixture.detectChanges();
    await fixture.whenStable();

    const trace = latestNewPlotTrace();
    (trace['x'] as number[]).push(999);
    (trace['z'] as number[][])[0].push(999);

    expect(sampleTrace.x).toEqual(originalX);
    expect(sampleTrace.z).toEqual(originalZ);
  });

  it('has an accessible label', async () => {
    component.ariaLabel = 'Multi-function graph';

    fixture.detectChanges();
    await fixture.whenStable();

    const shell = nativeElement().querySelector('.graph-canvas-shell');
    const plot = nativeElement().querySelector('.graph-canvas-plot');

    expect(shell?.getAttribute('aria-label')).toBe('Multi-function graph');
    expect(plot?.getAttribute('role')).toBe('img');
    expect(plot?.getAttribute('aria-label')).toBe('Multi-function graph');
  });

  it('does not request calculation, sampling or graphic plot services', () => {
    expect(() => {
      fixture.detectChanges();
    }).not.toThrow();
  });

  function lineSample(
    status: GraphFunctionSample['status'] = 'ready',
    y: number[] = [1, 2, 3]
  ): GraphFunctionSample {
    return {
      functionId: 'line-1',
      status,
      totalSamples: 3,
      invalidSamples: 0,
      trace: status === 'ready'
        ? {
            kind: 'line',
            functionId: 'line-1',
            label: 'f1',
            expression: 'x',
            color: '#78a9ff',
            x: [0, 1, 2],
            y,
          }
        : null,
    };
  }

  function contourSample(
    status: GraphFunctionSample['status'] = 'ready'
  ): GraphFunctionSample {
    return {
      functionId: 'contour-1',
      status,
      totalSamples: 4,
      invalidSamples: 0,
      trace: status === 'ready'
        ? {
            kind: 'contour',
            functionId: 'contour-1',
            label: 'g1',
            expression: 'x+y',
            color: '#c2a7ff',
            x: [-1, 1],
            y: [-2, 2],
            z: [[0, 1], [2, 3]],
          }
        : null,
    };
  }

  function latestNewPlotData(): Record<string, unknown>[] {
    return newPlot.calls.mostRecent().args[1] as Record<string, unknown>[];
  }

  function latestNewPlotTrace(): Record<string, unknown> {
    return latestNewPlotData()[0];
  }

  function latestNewPlotLayout(): Record<string, unknown> {
    return newPlot.calls.mostRecent().args[2] as Record<string, unknown>;
  }

  function nativeElement(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }
});
