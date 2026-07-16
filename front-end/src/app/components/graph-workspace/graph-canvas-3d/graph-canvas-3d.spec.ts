import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphCanvas3DComponent } from './graph-canvas-3d';
import { GraphPlotly3DLoaderService, type GraphPlotly3DModule } from '../../../services/graph-workspace/graph-plotly-3d-loader';
import {
  cloneDefaultGraphScene3D,
  type GraphScene3D,
} from '../../../services/graph-workspace/graph-workspace-state';
import type { GraphSurfaceSample } from '../../../services/graph-workspace/graph-sampling-3d';

describe('GraphCanvas3DComponent', () => {
  let fixture: ComponentFixture<GraphCanvas3DComponent>;
  let component: GraphCanvas3DComponent;
  let loader: jasmine.SpyObj<GraphPlotly3DLoaderService>;
  let module: GraphPlotly3DModule;
  let newPlot: jasmine.Spy;
  let react: jasmine.Spy;
  let resize: jasmine.Spy;
  let purge: jasmine.Spy;
  let on: jasmine.Spy;
  let removeListener: jasmine.Spy;
  let observe: jasmine.Spy;
  let disconnect: jasmine.Spy;
  let resizeCallback: ResizeObserverCallback;
  let relayoutHandler:
    | ((event: Record<string, unknown>) => void)
    | undefined;
  let originalResizeObserver: typeof ResizeObserver | undefined;
  let originalOn: unknown;
  let originalRemoveListener: unknown;

  const scene: GraphScene3D = {
    ...cloneDefaultGraphScene3D(),
    xMin: -8,
    xMax: 8,
    yMin: -6,
    yMax: 6,
    zMin: -5,
    zMax: 5,
  };

  beforeEach(async () => {
    originalResizeObserver = globalThis.ResizeObserver;
    const divPrototype = HTMLDivElement.prototype as PlotlyEventPrototype;
    originalOn = divPrototype.on;
    originalRemoveListener = divPrototype.removeListener;

    on = jasmine.createSpy('on').and.callFake(
      (eventName: string, handler: (event: Record<string, unknown>) => void) => {
        if (eventName === 'plotly_relayout') {
          relayoutHandler = handler;
        }
      }
    );
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

    newPlot = jasmine.createSpy('newPlot').and.resolveTo({});
    react = jasmine.createSpy('react').and.resolveTo({});
    resize = jasmine.createSpy('resize').and.resolveTo({});
    purge = jasmine.createSpy('purge');

    module = {
      newPlot,
      react,
      purge,
      Plots: {
        resize,
      },
    };

    loader = jasmine.createSpyObj<GraphPlotly3DLoaderService>('GraphPlotly3DLoaderService', ['load']);
    loader.load.and.resolveTo(module);

    await TestBed.configureTestingModule({
      imports: [GraphCanvas3DComponent],
      providers: [{ provide: GraphPlotly3DLoaderService, useValue: loader }],
    }).compileComponents();

    fixture = TestBed.createComponent(GraphCanvas3DComponent);
    component = fixture.componentInstance;
    component.scene = scene;
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

  it('renders ready surface samples as Plotly surface traces', async () => {
    component.samples = [surfaceSample('first'), surfaceSample('second')];

    fixture.detectChanges();
    await fixture.whenStable();

    const traces = latestNewPlotData();

    expect(traces.map(trace => trace['uid'])).toEqual(['first', 'second']);
    expect(traces[0]['type']).toBe('surface');
    expect(traces[0]['name']).toBe('f(x,y)');
    expect(traces[0]['colorscale']).toEqual([
      [0, '#78a9ff'],
      [1, '#78a9ff'],
    ]);
    expect(traces[0]['showscale']).toBeFalse();
    expect(traces[0]['z']).toEqual([[1, 2], [3, 4]]);
  });

  it('dims non-selected traces and keeps the selected surface on top', async () => {
    component.samples = [surfaceSample('first', '#78a9ff'), surfaceSample('second', '#c2a7ff')];
    component.selectedFunctionId = 'second';

    fixture.detectChanges();
    await fixture.whenStable();

    const traces = latestNewPlotData();
    expect(traces.map(trace => trace['uid'])).toEqual(['first', 'second']);
    expect(findTrace('first')['opacity']).toBe(0.42);
    expect(findTrace('second')['opacity']).toBe(1);
  });

  it('omits unsupported, hidden, empty and invalid samples', async () => {
    component.samples = [
      surfaceSample('ready'),
      { ...surfaceSample('hidden'), status: 'hidden', trace: null },
      { ...surfaceSample('empty'), status: 'empty', trace: null },
      { ...surfaceSample('unsupported'), status: 'unsupported', trace: null },
      { ...surfaceSample('invalid'), status: 'invalid', trace: null },
    ];

    fixture.detectChanges();
    await fixture.whenStable();

    expect(latestNewPlotData().map(trace => trace['uid'])).toEqual(['ready']);
  });

  it('uses newPlot on first render and react on updates', async () => {
    component.samples = [surfaceSample('first')];

    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentRef.setInput('samples', [surfaceSample('second')]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(newPlot).toHaveBeenCalledTimes(1);
    expect(react).toHaveBeenCalledTimes(1);
    expect(on).toHaveBeenCalledWith('plotly_relayout', jasmine.any(Function));
  });

  it('resizes through ResizeObserver without re-rendering', async () => {
    component.samples = [surfaceSample('first')];

    fixture.detectChanges();
    await fixture.whenStable();

    const plotCount = newPlot.calls.count();
    const container = fixture.nativeElement.querySelector('.graph-canvas-plot') as HTMLDivElement;

    resizeCallback([], {} as ResizeObserver);

    expect(observe).toHaveBeenCalledOnceWith(container);
    expect(resize).toHaveBeenCalledOnceWith(container);
    expect(newPlot.calls.count()).toBe(plotCount);
    expect(react).not.toHaveBeenCalled();
  });

  it('emits sceneChange from valid relayout camera and range updates', async () => {
    const emitted: GraphScene3D[] = [];
    component.sceneChange.subscribe(sceneValue => emitted.push(sceneValue));

    fixture.detectChanges();
    await fixture.whenStable();

    relayoutHandler?.({
      'scene.camera.eye.x': 2,
      'scene.camera.eye.y': 3,
      'scene.camera.eye.z': 4,
      'scene.xaxis.range[0]': -4,
      'scene.xaxis.range[1]': 4,
      'scene.yaxis.range[0]': -5,
      'scene.yaxis.range[1]': 5,
      'scene.zaxis.range[0]': -6,
      'scene.zaxis.range[1]': 6,
    });

    expect(emitted).toHaveSize(1);
    expect(emitted[0].camera.eye).toEqual({ x: 2, y: 3, z: 4 });
    expect(emitted[0].xMin).toBe(-4);
    expect(emitted[0].zMax).toBe(6);
  });

  it('ignores incomplete, autorange and invalid relayout updates', async () => {
    const emitted = spyOn(component.sceneChange, 'emit');

    fixture.detectChanges();
    await fixture.whenStable();

    relayoutHandler?.({ 'scene.xaxis.range[0]': -1 });
    relayoutHandler?.({ 'scene.xaxis.autorange': true });
    relayoutHandler?.({
      'scene.xaxis.range[0]': -1,
      'scene.xaxis.range[1]': Number.POSITIVE_INFINITY,
      'scene.yaxis.range[0]': -2,
      'scene.yaxis.range[1]': 2,
      'scene.zaxis.range[0]': -3,
      'scene.zaxis.range[1]': 3,
    });
    relayoutHandler?.({
      'scene.xaxis.range[0]': 4,
      'scene.xaxis.range[1]': -4,
      'scene.yaxis.range[0]': -2,
      'scene.yaxis.range[1]': 2,
      'scene.zaxis.range[0]': -3,
      'scene.zaxis.range[1]': 3,
    });

    expect(emitted).not.toHaveBeenCalled();
  });

  it('shows loading while the bundle is pending and reports loader failures', async () => {
    const deferred = createDeferred<GraphPlotly3DModule>();
    loader.load.and.returnValue(deferred.promise);

    fixture.detectChanges();

    expect(textContent()).toContain('Cargando vista 3D');

    deferred.reject(new Error('load failed'));
    await expectAsync(deferred.promise).toBeRejected();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(textContent()).toContain('No se pudo cargar la vista gráfica 3D.');
  });

  it('has an accessible label and does not mutate inputs', async () => {
    component.ariaLabel = 'Graph Workspace 3D';
    const samples = [surfaceSample('first')];
    const sampleSnapshot = JSON.parse(JSON.stringify(samples)) as unknown;
    const sceneSnapshot = JSON.parse(JSON.stringify(scene)) as GraphScene3D;
    component.samples = samples;

    fixture.detectChanges();
    await fixture.whenStable();

    const shell = fixture.nativeElement.querySelector('.graph-canvas-shell');
    const plot = fixture.nativeElement.querySelector('.graph-canvas-plot');

    expect(shell?.getAttribute('aria-label')).toBe('Graph Workspace 3D');
    expect(plot?.getAttribute('aria-label')).toBe('Graph Workspace 3D');
    expect(samples).toEqual(sampleSnapshot as GraphSurfaceSample[]);
    expect(scene).toEqual(sceneSnapshot);
  });

  it('purges Plotly and disconnects resize on destroy', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const container = fixture.nativeElement.querySelector('.graph-canvas-plot') as HTMLDivElement;

    fixture.destroy();

    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(removeListener).toHaveBeenCalledWith(
      'plotly_relayout',
      jasmine.any(Function)
    );
    expect(purge).toHaveBeenCalledOnceWith(container);
  });

  function surfaceSample(functionId: string, color = '#78a9ff'): GraphSurfaceSample {
    return {
      functionId,
      status: 'ready',
      totalSamples: 4,
      invalidSamples: 0,
      trace: {
        kind: 'surface',
        functionId,
        label: 'f(x,y)',
        expression: 'x + y',
        color,
        x: [-1, 1],
        y: [-2, 2],
        z: [[1, 2], [3, 4]],
      },
    };
  }

  function latestNewPlotData(): Record<string, unknown>[] {
    return newPlot.calls.mostRecent().args[1] as Record<string, unknown>[];
  }

  function findTrace(uid: string): Record<string, unknown> {
    const trace = latestNewPlotData().find(item => item['uid'] === uid);
    if (!trace) {
      fail(`Expected trace ${uid}`);
    }
    return trace!;
  }

  function textContent(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function createDeferred<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((innerResolve, innerReject) => {
      resolve = innerResolve;
      reject = innerReject;
    });

    return { promise, resolve, reject };
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
