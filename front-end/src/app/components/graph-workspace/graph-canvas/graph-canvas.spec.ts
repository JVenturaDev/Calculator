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
  let on: jasmine.Spy;
  let removeListener: jasmine.Spy;
  let observe: jasmine.Spy;
  let disconnect: jasmine.Spy;
  let resizeCallback: ResizeObserverCallback;
  let relayoutHandler: ((event: Record<string, unknown>) => void) | undefined;
  let clickHandler: ((event: PlotlyClickEvent) => void) | undefined;
  let legendClickHandler:
    | ((event: PlotlyLegendClickEvent) => void)
    | undefined;
  let hoverHandler: ((event: PlotlyClickEvent) => void) | undefined;
  let unhoverHandler: (() => void) | undefined;
  let originalResizeObserver: typeof ResizeObserver | undefined;
  let originalOn: unknown;
  let originalRemoveListener: unknown;

  const viewport: GraphViewport2D = {
    xMin: -5,
    xMax: 5,
    yMin: -3,
    yMax: 7,
  };

  beforeEach(async () => {
    originalResizeObserver = globalThis.ResizeObserver;
    const divPrototype = HTMLDivElement.prototype as PlotlyEventPrototype;
    originalOn = divPrototype.on;
    originalRemoveListener = divPrototype.removeListener;

    on = jasmine.createSpy('on').and.callFake((
      eventName: string,
      handler: (event: Record<string, unknown>) => void
    ) => {
      if (eventName === 'plotly_relayout') relayoutHandler = handler;
      if (eventName === 'plotly_click') {
        clickHandler = handler as (event: PlotlyClickEvent) => void;
      }
      if (eventName === 'plotly_legendclick') {
        legendClickHandler =
          handler as (event: PlotlyLegendClickEvent) => void;
      }
      if (eventName === 'plotly_hover') {
        hoverHandler = handler as (event: PlotlyClickEvent) => void;
      }
      if (eventName === 'plotly_unhover') {
        unhoverHandler = handler as () => void;
      }
    });
    removeListener = jasmine.createSpy('removeListener');
    divPrototype.on = on;
    divPrototype.removeListener = removeListener;

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
    const divPrototype = HTMLDivElement.prototype as PlotlyEventPrototype;
    if (originalOn === undefined) {
      delete divPrototype.on;
    } else {
      divPrototype.on = originalOn as PlotlyEventPrototype['on'];
    }
    if (originalRemoveListener === undefined) {
      delete divPrototype.removeListener;
    } else {
      divPrototype.removeListener =
        originalRemoveListener as PlotlyEventPrototype['removeListener'];
    }

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

  it('keeps the existing visual style when no function is selected', async () => {
    component.samples = [lineSample()];
    component.selectedFunctionId = null;

    fixture.detectChanges();
    await fixture.whenStable();

    const trace = latestNewPlotTrace();
    expect(trace['opacity']).toBeUndefined();
    expect(trace['line']).toEqual({ color: '#78a9ff', width: 2.5 });
  });

  it('emphasizes the selected line and dims the other traces', async () => {
    component.samples = [lineSample(), contourSample()];
    component.selectedFunctionId = 'line-1';

    fixture.detectChanges();
    await fixture.whenStable();

    const traces = latestNewPlotData();
    const selectedLine = findTrace('line-1');
    const otherContour = findTrace('contour-1');
    expect(traces.map(trace => trace['uid'])).toEqual(['contour-1', 'line-1']);
    expect(selectedLine['line']).toEqual({ color: '#78a9ff', width: 4 });
    expect(selectedLine['opacity']).toBe(1);
    expect(otherContour['opacity']).toBe(0.42);
  });

  it('keeps contour data intact when the contour is selected', async () => {
    component.samples = [lineSample(), contourSample()];
    component.selectedFunctionId = 'contour-1';

    fixture.detectChanges();
    await fixture.whenStable();

    const selectedContour = findTrace('contour-1');
    expect(selectedContour['x']).toEqual([-1, 1]);
    expect(selectedContour['y']).toEqual([-2, 2]);
    expect(selectedContour['z']).toEqual([[0, 1], [2, 3]]);
    expect(selectedContour['opacity']).toBe(1);
  });

  it('dims a non-selected contour without changing identifiers', async () => {
    component.samples = [lineSample(), contourSample()];
    component.selectedFunctionId = 'line-1';

    fixture.detectChanges();
    await fixture.whenStable();

    const contour = findTrace('contour-1');
    expect(contour['opacity']).toBe(0.42);
    expect(contour['uid']).toBe('contour-1');
    expect(contour['legendgroup']).toBe('contour-1');
  });

  it('preserves selected line identifiers', async () => {
    component.samples = [lineSample(), contourSample()];
    component.selectedFunctionId = 'line-1';

    fixture.detectChanges();
    await fixture.whenStable();

    const line = findTrace('line-1');
    expect(line['uid']).toBe('line-1');
    expect(line['legendgroup']).toBe('line-1');
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
    expect(on).toHaveBeenCalledWith('plotly_relayout', jasmine.any(Function));
    expect(on).toHaveBeenCalledWith('plotly_click', jasmine.any(Function));
    expect(on).toHaveBeenCalledWith(
      'plotly_legendclick',
      jasmine.any(Function)
    );
    expect(on).toHaveBeenCalledWith('plotly_hover', jasmine.any(Function));
    expect(on).toHaveBeenCalledWith('plotly_unhover', jasmine.any(Function));
  });

  it('emits viewportChange from a valid Plotly relayout event', async () => {
    const emitted: GraphViewport2D[] = [];
    component.viewportChange.subscribe(viewport => emitted.push(viewport));

    fixture.detectChanges();
    await fixture.whenStable();

    relayoutHandler?.({
      'xaxis.range[0]': -2,
      'xaxis.range[1]': 8,
      'yaxis.range[0]': -4,
      'yaxis.range[1]': 6,
    });

    expect(emitted).toEqual([{
      xMin: -2,
      xMax: 8,
      yMin: -4,
      yMax: 6,
    }]);
  });

  it('ignores incomplete relayout events', async () => {
    const emitted = spyOn(component.viewportChange, 'emit');

    fixture.detectChanges();
    await fixture.whenStable();

    relayoutHandler?.({
      'xaxis.range[0]': -2,
      'xaxis.range[1]': 8,
    });

    expect(emitted).not.toHaveBeenCalled();
  });

  it('ignores autorange relayout events', async () => {
    const emitted = spyOn(component.viewportChange, 'emit');

    fixture.detectChanges();
    await fixture.whenStable();

    relayoutHandler?.({
      'xaxis.autorange': true,
      'yaxis.autorange': true,
    });

    expect(emitted).not.toHaveBeenCalled();
  });

  it('ignores non-finite relayout values', async () => {
    const emitted = spyOn(component.viewportChange, 'emit');

    fixture.detectChanges();
    await fixture.whenStable();

    relayoutHandler?.({
      'xaxis.range[0]': -2,
      'xaxis.range[1]': Number.POSITIVE_INFINITY,
      'yaxis.range[0]': -4,
      'yaxis.range[1]': 6,
    });

    expect(emitted).not.toHaveBeenCalled();
  });

  it('ignores inverted relayout ranges', async () => {
    const emitted = spyOn(component.viewportChange, 'emit');

    fixture.detectChanges();
    await fixture.whenStable();

    relayoutHandler?.({
      'xaxis.range[0]': 8,
      'xaxis.range[1]': -2,
      'yaxis.range[0]': -4,
      'yaxis.range[1]': 6,
    });

    expect(emitted).not.toHaveBeenCalled();
  });

  it('emits functionSelect from a Plotly click data uid', async () => {
    const selected: string[] = [];
    component.functionSelect.subscribe(functionId => selected.push(functionId));

    fixture.detectChanges();
    await fixture.whenStable();

    clickHandler?.({
      points: [
        {
          data: { uid: 'line-1' },
          fullData: { uid: 'fallback-id' },
        },
      ],
    });

    expect(selected).toEqual(['line-1']);
  });

  it('emits functionSelect from fullData uid when data uid is missing', async () => {
    const selected: string[] = [];
    component.functionSelect.subscribe(functionId => selected.push(functionId));

    fixture.detectChanges();
    await fixture.whenStable();

    clickHandler?.({
      points: [
        {
          fullData: { uid: 'contour-1' },
        },
      ],
    });

    expect(selected).toEqual(['contour-1']);
  });

  it('emits functionSelect from a Plotly legend click data uid', async () => {
    const selected: string[] = [];
    component.functionSelect.subscribe(functionId => selected.push(functionId));

    fixture.detectChanges();
    await fixture.whenStable();

    legendClickHandler?.({
      curveNumber: 0,
      data: [
        {
          uid: 'line-1',
        },
      ],
      fullData: {
        uid: 'fallback-id',
      },
    });

    expect(selected).toEqual(['line-1']);
  });

  it('emits functionSelect from fullData uid when legend data uid is missing', async () => {
    const selected: string[] = [];
    component.functionSelect.subscribe(functionId => selected.push(functionId));

    fixture.detectChanges();
    await fixture.whenStable();

    legendClickHandler?.({
      curveNumber: 0,
      data: [
        {},
      ],
      fullData: {
        uid: 'contour-1',
      },
    });

    expect(selected).toEqual(['contour-1']);
  });

  it('ignores Plotly legend click events with an invalid curveNumber', async () => {
    const emitted = spyOn(component.functionSelect, 'emit');

    fixture.detectChanges();
    await fixture.whenStable();

    legendClickHandler?.({
      curveNumber: -1,
      data: [{ uid: 'line-1' }],
    });
    legendClickHandler?.({
      curveNumber: Number.NaN,
      data: [{ uid: 'line-1' }],
    });

    expect(emitted).not.toHaveBeenCalled();
  });

  it('ignores Plotly legend click events with an empty uid', async () => {
    const emitted = spyOn(component.functionSelect, 'emit');

    fixture.detectChanges();
    await fixture.whenStable();

    legendClickHandler?.({
      curveNumber: 0,
      data: [{ uid: '   ' }],
      fullData: { uid: '   ' },
    });

    expect(emitted).not.toHaveBeenCalled();
  });

  it('ignores Plotly legend click events without a uid', async () => {
    const emitted = spyOn(component.functionSelect, 'emit');

    fixture.detectChanges();
    await fixture.whenStable();

    legendClickHandler?.({
      curveNumber: 0,
      data: [{}],
      fullData: {},
    });

    expect(emitted).not.toHaveBeenCalled();
  });

  it('ignores Plotly click events without points', async () => {
    const emitted = spyOn(component.functionSelect, 'emit');

    fixture.detectChanges();
    await fixture.whenStable();

    clickHandler?.({});

    expect(emitted).not.toHaveBeenCalled();
  });

  it('ignores Plotly click events with a non-string uid', async () => {
    const emitted = spyOn(component.functionSelect, 'emit');

    fixture.detectChanges();
    await fixture.whenStable();

    clickHandler?.({
      points: [
        {
          data: { uid: 123 },
        },
      ],
    });

    expect(emitted).not.toHaveBeenCalled();
  });

  it('ignores Plotly click events with an empty uid', async () => {
    const emitted = spyOn(component.functionSelect, 'emit');

    fixture.detectChanges();
    await fixture.whenStable();

    clickHandler?.({
      points: [
        {
          data: { uid: '   ' },
        },
      ],
    });

    expect(emitted).not.toHaveBeenCalled();
  });

  it('emits hoverChange from a valid Plotly hover event using data uid', async () => {
    const emitted: unknown[] = [];
    component.hoverChange.subscribe(point => emitted.push(point));

    fixture.detectChanges();
    await fixture.whenStable();

    hoverHandler?.({
      points: [
        {
          data: { uid: 'line-1' },
          fullData: { uid: 'fallback-id' },
          x: 1.5,
          y: -2.25,
          z: 4,
          pointIndex: 12,
        },
      ],
    });

    expect(emitted).toEqual([{
      functionId: 'line-1',
      x: 1.5,
      y: -2.25,
      z: 4,
      pointIndex: 12,
    }]);
  });

  it('emits hoverChange using fullData uid when data uid is missing', async () => {
    const emitted: unknown[] = [];
    component.hoverChange.subscribe(point => emitted.push(point));

    fixture.detectChanges();
    await fixture.whenStable();

    hoverHandler?.({
      points: [
        {
          fullData: { uid: 'contour-1' },
          x: 2,
          y: 3,
          pointNumber: 7,
        },
      ],
    });

    expect(emitted).toEqual([{
      functionId: 'contour-1',
      x: 2,
      y: 3,
      pointIndex: 7,
    }]);
  });

  it('ignores invalid Plotly hover events', async () => {
    const emitted = spyOn(component.hoverChange, 'emit');

    fixture.detectChanges();
    await fixture.whenStable();

    hoverHandler?.({});
    hoverHandler?.({ points: [{ data: { uid: '' }, x: 1, y: 2 }] });
    hoverHandler?.({ points: [{ data: { uid: 123 }, x: 1, y: 2 }] });
    hoverHandler?.({ points: [{ data: { uid: 'line-1' }, x: Number.NaN, y: 2 }] });
    hoverHandler?.({ points: [{ data: { uid: 'line-1' }, x: 1, y: Number.POSITIVE_INFINITY }] });

    expect(emitted).not.toHaveBeenCalled();
  });

  it('emits null on Plotly unhover', async () => {
    const emitted: unknown[] = [];
    component.hoverChange.subscribe(point => emitted.push(point));

    fixture.detectChanges();
    await fixture.whenStable();

    unhoverHandler?.();

    expect(emitted).toEqual([null]);
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
    expect(removeListener).toHaveBeenCalledWith(
      'plotly_relayout',
      jasmine.any(Function)
    );
    expect(removeListener).toHaveBeenCalledWith(
      'plotly_click',
      jasmine.any(Function)
    );
    expect(removeListener).toHaveBeenCalledWith(
      'plotly_legendclick',
      jasmine.any(Function)
    );
    expect(removeListener).toHaveBeenCalledWith(
      'plotly_hover',
      jasmine.any(Function)
    );
    expect(removeListener).toHaveBeenCalledWith(
      'plotly_unhover',
      jasmine.any(Function)
    );
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

  function findTrace(uid: string): Record<string, unknown> {
    const trace = latestNewPlotData().find(trace => trace['uid'] === uid);
    if (!trace) fail(`Expected trace ${uid}`);
    return trace!;
  }

  function latestNewPlotLayout(): Record<string, unknown> {
    return newPlot.calls.mostRecent().args[2] as Record<string, unknown>;
  }

  function nativeElement(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }
});

interface PlotlyEventPrototype {
  on?: (
    eventName: string,
    handler: (event: Record<string, unknown>) => void
  ) => void;
  removeListener?: (
    eventName: string,
    handler: (event: Record<string, unknown>) => void
  ) => void;
}

interface PlotlyClickEvent {
  readonly points?: readonly {
    readonly data?: { readonly uid?: unknown };
    readonly fullData?: { readonly uid?: unknown };
    readonly x?: unknown;
    readonly y?: unknown;
    readonly z?: unknown;
    readonly pointIndex?: unknown;
    readonly pointNumber?: unknown;
  }[];
}

interface PlotlyLegendClickEvent {
  readonly curveNumber?: unknown;
  readonly data?: readonly {
    readonly uid?: unknown;
  }[];
  readonly fullData?: {
    readonly uid?: unknown;
  };
}
