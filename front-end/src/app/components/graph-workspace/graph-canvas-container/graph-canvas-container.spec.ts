import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { GraphCanvasContainerComponent } from './graph-canvas-container';
import { type GraphCanvasHover } from '../graph-canvas/graph-canvas';
import { GraphWorkspaceFacade } from '../../../services/graph-workspace/graph-workspace-facade';
import {
  type GraphFunctionSample,
} from '../../../services/graph-workspace/graph-sampling';
import {
  type GraphViewport2D,
  type GraphWorkspaceState,
} from '../../../services/graph-workspace/graph-workspace-state';
import {
  GraphWorkspaceSamplingViewModel,
  GraphWorkspaceSamplingViewModelService,
} from '../../../services/graph-workspace/graph-workspace-sampling-view-model';

@Component({
  selector: 'app-graph-canvas',
  standalone: true,
  template: '',
})
class GraphCanvasStubComponent {
  @Input() samples: readonly GraphFunctionSample[] = [];
  @Input({ required: true }) viewport!: GraphViewport2D;
  @Input() selectedFunctionId: string | null = null;
  @Input() ariaLabel = 'Graph Workspace canvas';
  @Output() readonly viewportChange = new EventEmitter<GraphViewport2D>();
  @Output() readonly functionSelect = new EventEmitter<string>();
  @Output() readonly hoverChange = new EventEmitter<GraphCanvasHover | null>();
}

describe('GraphCanvasContainerComponent', () => {
  let fixture: ComponentFixture<GraphCanvasContainerComponent>;
  let vmSubject: BehaviorSubject<GraphWorkspaceSamplingViewModel>;
  let facade: FakeGraphWorkspaceFacade;

  const viewport: GraphViewport2D = {
    xMin: -10,
    xMax: 10,
    yMin: -5,
    yMax: 5,
  };

  beforeEach(async () => {
    vmSubject = new BehaviorSubject<GraphWorkspaceSamplingViewModel>(
      createViewModel()
    );
    facade = {
      resetViewport: jasmine.createSpy('resetViewport'),
      selectFunction: jasmine.createSpy('selectFunction'),
      setViewport: jasmine.createSpy('setViewport'),
    };

    await TestBed.configureTestingModule({
      imports: [GraphCanvasContainerComponent],
      providers: [
        { provide: GraphWorkspaceFacade, useValue: facade },
        {
          provide: GraphWorkspaceSamplingViewModelService,
          useValue: { vm$: vmSubject.asObservable() },
        },
      ],
    })
      .overrideComponent(GraphCanvasContainerComponent, {
        set: {
          imports: [CommonModule, GraphCanvasStubComponent],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(GraphCanvasContainerComponent);
  });

  afterEach(() => {
    vmSubject.complete();
  });

  it('consumes the shared view model and passes samples and viewport to the canvas', () => {
    const samples = [readySample('fn-1')];
    vmSubject.next(createViewModel({
      samples,
      state: createState({ selectedFunctionId: 'fn-1' }),
    }));

    fixture.detectChanges();

    const canvas = getCanvas();
    expect(canvas.samples).toBe(samples);
    expect(canvas.viewport).toBe(viewport);
    expect(canvas.selectedFunctionId).toBe('fn-1');
  });

  it('keeps the ariaLabel input', () => {
    fixture.componentInstance.ariaLabel = 'Graph canvas preview';

    fixture.detectChanges();

    expect(getCanvas().ariaLabel).toBe('Graph canvas preview');
  });

  it('shows an accessible message when the shared view model has an error', () => {
    vmSubject.next(createViewModel({
      samples: [],
      error: 'No se pudo muestrear el Workspace gráfico.',
    }));

    fixture.detectChanges();

    const error = nativeElement().querySelector<HTMLElement>(
      '.graph-canvas-container__error'
    );
    expect(error?.textContent?.trim())
      .toBe('No se pudo muestrear el Workspace gráfico.');
    expect(error?.getAttribute('role')).toBe('status');
    expect(error?.getAttribute('aria-live')).toBe('polite');
  });

  it('does not require a direct GraphFunctionSamplerService provider', () => {
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('renders an accessible reset viewport button', () => {
    fixture.detectChanges();

    const button = nativeElement().querySelector<HTMLButtonElement>(
      '.graph-canvas-toolbar__button'
    );

    expect(button).not.toBeNull();
    expect(button?.textContent?.trim()).toBe('Reset viewport');
    expect(button?.getAttribute('type')).toBe('button');
    expect(button?.getAttribute('aria-label')).toBe('Restablecer viewport');
  });

  it('resets the viewport from the toolbar button', () => {
    fixture.detectChanges();

    const button = nativeElement().querySelector<HTMLButtonElement>(
      '.graph-canvas-toolbar__button'
    )!;
    button.click();

    expect(facade.resetViewport).toHaveBeenCalledTimes(1);
    expect(facade.setViewport).not.toHaveBeenCalled();
  });

  it('persists a changed viewport from the canvas', () => {
    fixture.detectChanges();

    getCanvas().viewportChange.emit({
      xMin: -20,
      xMax: 20,
      yMin: -10,
      yMax: 10,
    });

    expect(facade.setViewport).toHaveBeenCalledOnceWith({
      xMin: -20,
      xMax: 20,
      yMin: -10,
      yMax: 10,
    });
  });

  it('selects a function emitted by the canvas', () => {
    fixture.detectChanges();

    getCanvas().functionSelect.emit('fn-1');

    expect(facade.selectFunction).toHaveBeenCalledOnceWith('fn-1');
    expect(facade.setViewport).not.toHaveBeenCalled();
  });

  it('stores hoveredPoint emitted by the canvas without calling the facade', () => {
    fixture.detectChanges();

    const hoveredPoint: GraphCanvasHover = {
      functionId: 'fn-1',
      x: 1,
      y: 2,
      z: 3,
      pointIndex: 4,
    };
    getCanvas().hoverChange.emit(hoveredPoint);

    expect(fixture.componentInstance.hoveredPoint).toBe(hoveredPoint);
    expect(facade.selectFunction).not.toHaveBeenCalled();
    expect(facade.setViewport).not.toHaveBeenCalled();
    expect(facade.resetViewport).not.toHaveBeenCalled();
  });

  it('clears hoveredPoint when the canvas emits null', () => {
    fixture.componentInstance.hoveredPoint = {
      functionId: 'fn-1',
      x: 1,
      y: 2,
    };
    fixture.detectChanges();

    getCanvas().hoverChange.emit(null);

    expect(fixture.componentInstance.hoveredPoint).toBeNull();
  });

  it('ignores viewportChange when it matches the current viewport', () => {
    fixture.detectChanges();

    getCanvas().viewportChange.emit({ ...viewport });

    expect(facade.setViewport).not.toHaveBeenCalled();
  });

  it('ignores viewportChange differences within tolerance', () => {
    fixture.detectChanges();

    getCanvas().viewportChange.emit({
      xMin: viewport.xMin + 5e-10,
      xMax: viewport.xMax - 5e-10,
      yMin: viewport.yMin + 5e-10,
      yMax: viewport.yMax - 5e-10,
    });

    expect(facade.setViewport).not.toHaveBeenCalled();
  });

  it('does not sample manually when the viewport changes', () => {
    fixture.detectChanges();

    getCanvas().viewportChange.emit({
      xMin: -30,
      xMax: 30,
      yMin: -15,
      yMax: 15,
    });

    expect(facade.setViewport).toHaveBeenCalledTimes(1);
  });

  it('does not sample manually when selecting a function', () => {
    fixture.detectChanges();

    getCanvas().functionSelect.emit('fn-2');

    expect(facade.selectFunction).toHaveBeenCalledOnceWith('fn-2');
  });

  function getCanvas(): GraphCanvasStubComponent {
    return fixture.debugElement.query(By.directive(GraphCanvasStubComponent))
      .componentInstance as GraphCanvasStubComponent;
  }

  function nativeElement(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function createViewModel(
    overrides: Partial<GraphWorkspaceSamplingViewModel> = {}
  ): GraphWorkspaceSamplingViewModel {
    const state = createState();
    return {
      state,
      samples: [],
      selectedFunction: null,
      selectedSample: null,
      viewport,
      hasFunctions: false,
      visibleFunctions: 0,
      readyFunctions: 0,
      invalidFunctions: 0,
      error: null,
      ...overrides,
    };
  }

  function createState(
    overrides: Partial<GraphWorkspaceState> = {}
  ): GraphWorkspaceState {
    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    const viewport2D = viewport;
    return {
      version: 2,
      id: 'graph-workspace-id',
      name: 'Graph Workspace',
      viewMode: '2d',
      functions: [],
      selectedFunctionId: null,
      viewport2D,
      viewport: viewport2D,
      scene3D: {
        xMin: -10,
        xMax: 10,
        yMin: -10,
        yMax: 10,
        zMin: -10,
        zMax: 10,
        camera: {
          eye: { x: 1.25, y: 1.25, z: 1.25 },
          up: { x: 0, y: 0, z: 1 },
          center: { x: 0, y: 0, z: 0 },
        },
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      ...overrides,
    };
  }

  function readySample(functionId: string): GraphFunctionSample {
    return {
      functionId,
      status: 'ready',
      totalSamples: 2,
      invalidSamples: 0,
      trace: {
        kind: 'line',
        functionId,
        label: functionId,
        expression: 'x',
        color: '#78a9ff',
        x: [0, 1],
        y: [0, 1],
      },
    };
  }
});

interface FakeGraphWorkspaceFacade {
  readonly resetViewport: jasmine.Spy;
  readonly selectFunction: jasmine.Spy;
  readonly setViewport: jasmine.Spy;
}
