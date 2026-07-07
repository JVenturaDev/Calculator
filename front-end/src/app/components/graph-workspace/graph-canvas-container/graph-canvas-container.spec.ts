import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { GraphCanvasContainerComponent } from './graph-canvas-container';
import { GraphFunctionSamplerService } from '../../../services/graph-workspace/graph-function-sampler';
import {
  GraphFunctionSample,
} from '../../../services/graph-workspace/graph-sampling';
import { GraphWorkspaceFacade } from '../../../services/graph-workspace/graph-workspace-facade';
import {
  GraphFunction,
  GraphViewport2D,
  GraphWorkspaceState,
} from '../../../services/graph-workspace/graph-workspace-state';

@Component({
  selector: 'app-graph-canvas',
  standalone: true,
  template: '',
})
class GraphCanvasStubComponent {
  @Input() samples: readonly GraphFunctionSample[] = [];
  @Input({ required: true }) viewport!: GraphViewport2D;
  @Input() ariaLabel = 'Graph Workspace canvas';
}

describe('GraphCanvasContainerComponent', () => {
  let fixture: ComponentFixture<GraphCanvasContainerComponent>;
  let stateSubject: BehaviorSubject<GraphWorkspaceState>;
  let facade: FakeGraphWorkspaceFacade;
  let sampler: jasmine.SpyObj<GraphFunctionSamplerService>;

  const viewport: GraphViewport2D = {
    xMin: -10,
    xMax: 10,
    yMin: -5,
    yMax: 5,
  };

  beforeEach(async () => {
    stateSubject = new BehaviorSubject<GraphWorkspaceState>(
      createState({ functions: [] })
    );
    facade = {
      state$: stateSubject.asObservable(),
      addFunction: jasmine.createSpy('addFunction'),
      updateExpression: jasmine.createSpy('updateExpression'),
      removeFunction: jasmine.createSpy('removeFunction'),
      toggleFunction: jasmine.createSpy('toggleFunction'),
      setColor: jasmine.createSpy('setColor'),
      setPlotKind: jasmine.createSpy('setPlotKind'),
      selectFunction: jasmine.createSpy('selectFunction'),
      setViewport: jasmine.createSpy('setViewport'),
      clear: jasmine.createSpy('clear'),
    };
    sampler = jasmine.createSpyObj<GraphFunctionSamplerService>(
      'GraphFunctionSamplerService',
      ['sampleFunctions']
    );
    sampler.sampleFunctions.and.returnValue([readySample('fn-1')]);

    await TestBed.configureTestingModule({
      imports: [GraphCanvasContainerComponent],
      providers: [
        { provide: GraphWorkspaceFacade, useValue: facade },
        { provide: GraphFunctionSamplerService, useValue: sampler },
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
    stateSubject.complete();
  });

  it('reads state$ and samples functions after the debounce window', fakeAsync(() => {
    const state = createState({ functions: [graphFunction('fn-1')] });
    stateSubject.next(state);

    fixture.detectChanges();
    expect(sampler.sampleFunctions).not.toHaveBeenCalled();

    tick(100);
    fixture.detectChanges();

    expect(sampler.sampleFunctions).toHaveBeenCalledOnceWith(
      state.functions,
      state.viewport
    );
  }));

  it('passes samples, viewport and ariaLabel to GraphCanvasComponent', fakeAsync(() => {
    const samples = [readySample('fn-1')];
    const state = createState({ functions: [graphFunction('fn-1')] });
    sampler.sampleFunctions.and.returnValue(samples);
    stateSubject.next(state);
    fixture.componentInstance.ariaLabel = 'Graph canvas preview';

    fixture.detectChanges();
    tick(100);
    fixture.detectChanges();

    const canvas = getCanvas();
    expect(canvas.samples).toBe(samples);
    expect(canvas.viewport).toBe(state.viewport);
    expect(canvas.ariaLabel).toBe('Graph canvas preview');
  }));

  it('consolidates rapid emissions before sampling', fakeAsync(() => {
    fixture.detectChanges();

    const first = createState({ functions: [graphFunction('fn-1')] });
    const second = createState({
      functions: [graphFunction('fn-1'), graphFunction('fn-2')],
    });
    stateSubject.next(first);
    tick(50);
    stateSubject.next(second);
    tick(99);

    expect(sampler.sampleFunctions).not.toHaveBeenCalled();

    tick(1);
    fixture.detectChanges();

    expect(sampler.sampleFunctions).toHaveBeenCalledTimes(1);
    expect(sampler.sampleFunctions).toHaveBeenCalledWith(
      second.functions,
      second.viewport
    );
  }));

  it('renders an empty canvas for empty functions', fakeAsync(() => {
    sampler.sampleFunctions.and.returnValue([]);
    stateSubject.next(createState({ functions: [] }));

    fixture.detectChanges();
    tick(100);
    fixture.detectChanges();

    const canvas = getCanvas();
    expect(canvas.samples).toEqual([]);
    expect(canvas.viewport).toEqual(viewport);
  }));

  it('keeps hidden, empty and invalid samples from the sampler', fakeAsync(() => {
    const samples = [
      statusSample('hidden', 'fn-1'),
      statusSample('empty', 'fn-2'),
      statusSample('invalid', 'fn-3'),
    ];
    sampler.sampleFunctions.and.returnValue(samples);
    stateSubject.next(createState({
      functions: [
        graphFunction('fn-1'),
        graphFunction('fn-2'),
        graphFunction('fn-3'),
      ],
    }));

    fixture.detectChanges();
    tick(100);
    fixture.detectChanges();

    expect(getCanvas().samples).toBe(samples);
  }));

  it('shows an accessible message and empty samples when sampling fails', fakeAsync(() => {
    sampler.sampleFunctions.and.throwError(new RangeError('Invalid viewport'));
    stateSubject.next(createState({ functions: [graphFunction('fn-1')] }));

    fixture.detectChanges();
    tick(100);
    fixture.detectChanges();

    const error = nativeElement().querySelector<HTMLElement>(
      '.graph-canvas-container__error'
    );
    expect(getCanvas().samples).toEqual([]);
    expect(error?.textContent?.trim())
      .toBe('No se pudo muestrear el Workspace gráfico.');
    expect(error?.getAttribute('role')).toBe('status');
    expect(error?.getAttribute('aria-live')).toBe('polite');
  }));

  it('does not mutate the facade from the container', fakeAsync(() => {
    stateSubject.next(createState({ functions: [graphFunction('fn-1')] }));

    fixture.detectChanges();
    tick(100);
    fixture.detectChanges();

    expect(facade.addFunction).not.toHaveBeenCalled();
    expect(facade.updateExpression).not.toHaveBeenCalled();
    expect(facade.removeFunction).not.toHaveBeenCalled();
    expect(facade.toggleFunction).not.toHaveBeenCalled();
    expect(facade.setColor).not.toHaveBeenCalled();
    expect(facade.setPlotKind).not.toHaveBeenCalled();
    expect(facade.selectFunction).not.toHaveBeenCalled();
    expect(facade.setViewport).not.toHaveBeenCalled();
    expect(facade.clear).not.toHaveBeenCalled();
  }));

  it('does not require CalculationEngine, GraphicPlotService or Plotly', fakeAsync(() => {
    expect(() => {
      fixture.detectChanges();
      tick(100);
      fixture.detectChanges();
    }).not.toThrow();
  }));

  function getCanvas(): GraphCanvasStubComponent {
    return fixture.debugElement.children[0].children[0]
      .componentInstance as GraphCanvasStubComponent;
  }

  function nativeElement(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function createState(
    overrides: Partial<GraphWorkspaceState>
  ): GraphWorkspaceState {
    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    return {
      version: 1,
      id: 'graph-workspace-id',
      name: 'Graph Workspace',
      functions: [],
      selectedFunctionId: null,
      viewport,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...overrides,
    };
  }

  function graphFunction(
    id: string,
    overrides: Partial<GraphFunction> = {}
  ): GraphFunction {
    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    return {
      id,
      expression: 'x',
      label: id,
      color: '#78a9ff',
      visible: true,
      plotKind: 'line',
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

  function statusSample(
    status: 'hidden' | 'empty' | 'invalid',
    functionId: string
  ): GraphFunctionSample {
    return {
      functionId,
      status,
      totalSamples: 0,
      invalidSamples: 0,
      trace: null,
    };
  }
});

interface FakeGraphWorkspaceFacade {
  readonly state$: GraphWorkspaceFacade['state$'];
  readonly addFunction: jasmine.Spy;
  readonly updateExpression: jasmine.Spy;
  readonly removeFunction: jasmine.Spy;
  readonly toggleFunction: jasmine.Spy;
  readonly setColor: jasmine.Spy;
  readonly setPlotKind: jasmine.Spy;
  readonly selectFunction: jasmine.Spy;
  readonly setViewport: jasmine.Spy;
  readonly clear: jasmine.Spy;
}
