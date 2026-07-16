import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { GraphCanvas3DComponent } from '../graph-canvas-3d/graph-canvas-3d';
import { GraphCanvasContainer3DComponent } from './graph-canvas-container-3d';
import { GraphPlotly3DLoaderService } from '../../../services/graph-workspace/graph-plotly-3d-loader';
import {
  GraphWorkspaceSamplingViewModel3DService,
  type GraphWorkspaceSamplingViewModel3D,
} from '../../../services/graph-workspace/graph-workspace-sampling-view-model-3d';
import {
  cloneDefaultGraphScene3D,
  createInitialGraphWorkspaceState,
} from '../../../services/graph-workspace/graph-workspace-state';
import type { GraphSurfaceSample } from '../../../services/graph-workspace/graph-sampling-3d';
import { By } from '@angular/platform-browser';

describe('GraphCanvasContainer3DComponent', () => {
  let fixture: ComponentFixture<GraphCanvasContainer3DComponent>;
  let component: GraphCanvasContainer3DComponent;
  let viewModel$: BehaviorSubject<GraphWorkspaceSamplingViewModel3D>;
  let loader: jasmine.SpyObj<GraphPlotly3DLoaderService>;
  let newPlot: jasmine.Spy;
  let react: jasmine.Spy;
  let resize: jasmine.Spy;
  let purge: jasmine.Spy;
  let on: jasmine.Spy;
  let removeListener: jasmine.Spy;
  let observe: jasmine.Spy;
  let disconnect: jasmine.Spy;
  let originalResizeObserver: typeof ResizeObserver | undefined;
  let originalOn: unknown;
  let originalRemoveListener: unknown;
  let resizeCallback: ResizeObserverCallback = () => {};

  beforeEach(async () => {
    originalResizeObserver = globalThis.ResizeObserver;
    const divPrototype = HTMLDivElement.prototype as PlotlyEventPrototype;
    originalOn = divPrototype.on;
    originalRemoveListener = divPrototype.removeListener;

    on = jasmine.createSpy('on').and.callFake(() => {});
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

    loader = jasmine.createSpyObj<GraphPlotly3DLoaderService>('GraphPlotly3DLoaderService', ['load']);
    loader.load.and.resolveTo({
      newPlot,
      react,
      purge,
      Plots: { resize },
    });

    viewModel$ = new BehaviorSubject(createVm());

    await TestBed.configureTestingModule({
      imports: [GraphCanvasContainer3DComponent, CommonModule],
      providers: [
        { provide: GraphWorkspaceSamplingViewModel3DService, useValue: { vm$: viewModel$.asObservable() } },
        { provide: GraphPlotly3DLoaderService, useValue: loader },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GraphCanvasContainer3DComponent);
    component = fixture.componentInstance;
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

  it('passes the shared VM to the 3D canvas and renders errors', async () => {
    viewModel$.next({
      ...createVm(),
      error: 'No se pudo muestrear la vista gráfica 3D.',
    });

    fixture.detectChanges();
    await fixture.whenStable();

    const canvas = fixture.debugElement.query(By.directive(GraphCanvas3DComponent));
    expect(canvas.componentInstance.samples).toEqual(createVm().samples);
    expect(canvas.componentInstance.scene).toEqual(createVm().scene);
    expect(canvas.componentInstance.selectedFunctionId).toBe('surface-1');
    expect(canvas.componentInstance.ariaLabel).toBe('Graph Workspace 3D canvas');

    const error = fixture.nativeElement.querySelector('.graph-canvas-container-3d__error');
    expect(error?.textContent).toContain('No se pudo muestrear la vista gráfica 3D.');
  });

  it('does not inject the sampler or Plotly directly', () => {
    expect(component).toBeTruthy();
    expect(() => TestBed.inject(GraphWorkspaceSamplingViewModel3DService)).not.toThrow();
    expect(() => TestBed.inject(GraphPlotly3DLoaderService)).not.toThrow();
  });

  it('keeps the canvas mounted and resizes via the child component', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const plotCount = newPlot.calls.count();
    const canvas = fixture.nativeElement.querySelector('.graph-canvas-plot') as HTMLDivElement;

    resizeCallback([], {} as ResizeObserver);

    expect(observe).toHaveBeenCalledOnceWith(canvas);
    expect(resize).toHaveBeenCalledOnceWith(canvas);
    expect(newPlot.calls.count()).toBe(plotCount);
  });

  function createVm(): GraphWorkspaceSamplingViewModel3D {
    const state = createInitialGraphWorkspaceState('graph-1');
    const sample: GraphSurfaceSample = {
      functionId: 'surface-1',
      status: 'ready',
      totalSamples: 4,
      invalidSamples: 0,
      trace: {
        kind: 'surface',
        functionId: 'surface-1',
        label: 'f(x,y)',
        expression: 'x + y',
        color: '#78a9ff',
        x: [-1, 1],
        y: [-1, 1],
        z: [[0, 1], [1, 2]],
      },
    };

    return {
      state: {
        ...state,
        viewMode: '3d',
        selectedFunctionId: 'surface-1',
        scene3D: cloneDefaultGraphScene3D(),
      },
      scene: cloneDefaultGraphScene3D(),
      samples: [sample],
      selectedFunctionId: 'surface-1',
      compatibleFunctions: 1,
      unsupportedFunctions: 0,
      readyFunctions: 1,
      invalidFunctions: 0,
      error: null,
    };
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
