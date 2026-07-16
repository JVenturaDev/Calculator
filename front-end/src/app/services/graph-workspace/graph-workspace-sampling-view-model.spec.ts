import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { GraphFunctionSamplerService } from './graph-function-sampler';
import {
  type GraphFunctionSample,
} from './graph-sampling';
import { GraphWorkspaceFacade } from './graph-workspace-facade';
import {
  type GraphFunction,
  type GraphViewport2D,
  type GraphWorkspaceState,
} from './graph-workspace-state';
import { GraphWorkspaceSamplingViewModelService } from './graph-workspace-sampling-view-model';

describe('GraphWorkspaceSamplingViewModelService', () => {
  let stateSubject: BehaviorSubject<GraphWorkspaceState>;
  let sampler: jasmine.SpyObj<GraphFunctionSamplerService>;
  let service: GraphWorkspaceSamplingViewModelService;

  const viewport: GraphViewport2D = {
    xMin: -10,
    xMax: 10,
    yMin: -5,
    yMax: 5,
  };

  beforeEach(() => {
    stateSubject = new BehaviorSubject<GraphWorkspaceState>(
      createState({ functions: [] })
    );
    sampler = jasmine.createSpyObj<GraphFunctionSamplerService>(
      'GraphFunctionSamplerService',
      ['sampleFunctions']
    );
    sampler.sampleFunctions.and.returnValue([]);

    TestBed.configureTestingModule({
      providers: [
        GraphWorkspaceSamplingViewModelService,
        {
          provide: GraphWorkspaceFacade,
          useValue: { state$: stateSubject.asObservable() },
        },
        { provide: GraphFunctionSamplerService, useValue: sampler },
      ],
    });

    service = TestBed.inject(GraphWorkspaceSamplingViewModelService);
  });

  afterEach(() => {
    stateSubject.complete();
  });

  it('emits the initial state after the debounce window', fakeAsync(() => {
    let emitted: GraphWorkspaceState | undefined;

    service.vm$.subscribe(vm => {
      emitted = vm.state;
    });
    tick(100);

    expect(emitted).toBe(stateSubject.value);
  }));

  it('samples functions with the current functions and viewport', fakeAsync(() => {
    const state = createState({ functions: [graphFunction('fn-1')] });
    stateSubject.next(state);

    service.vm$.subscribe();
    tick(100);

    expect(sampler.sampleFunctions).toHaveBeenCalledOnceWith(
      state.functions,
      state.viewport
    );
  }));

  it('debounces rapid state changes', fakeAsync(() => {
    service.vm$.subscribe();

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

    expect(sampler.sampleFunctions).toHaveBeenCalledOnceWith(
      second.functions,
      second.viewport
    );
  }));

  it('does not duplicate sampling for two subscribers', fakeAsync(() => {
    service.vm$.subscribe();
    service.vm$.subscribe();

    tick(100);

    expect(sampler.sampleFunctions).toHaveBeenCalledTimes(1);
  }));

  it('calculates selectedFunction and selectedSample', fakeAsync(() => {
    const selected = graphFunction('fn-2');
    const sample = readySample('fn-2');
    sampler.sampleFunctions.and.returnValue([
      readySample('fn-1'),
      sample,
    ]);
    stateSubject.next(createState({
      functions: [graphFunction('fn-1'), selected],
      selectedFunctionId: 'fn-2',
    }));
    let selectedFunction: GraphFunction | null | undefined;
    let selectedSample: GraphFunctionSample | null | undefined;

    service.vm$.subscribe(vm => {
      selectedFunction = vm.selectedFunction;
      selectedSample = vm.selectedSample;
    });
    tick(100);

    expect(selectedFunction).toBe(selected);
    expect(selectedSample).toBe(sample);
  }));

  it('sets selectedFunction and selectedSample to null when there is no selection', fakeAsync(() => {
    stateSubject.next(createState({ functions: [graphFunction('fn-1')] }));
    let selectedFunction: GraphFunction | null | undefined;
    let selectedSample: GraphFunctionSample | null | undefined;

    service.vm$.subscribe(vm => {
      selectedFunction = vm.selectedFunction;
      selectedSample = vm.selectedSample;
    });
    tick(100);

    expect(selectedFunction).toBeNull();
    expect(selectedSample).toBeNull();
  }));

  it('returns empty samples and an error when sampling fails', fakeAsync(() => {
    sampler.sampleFunctions.and.throwError(new RangeError('Invalid viewport'));
    let emitted:
      | { samples: readonly GraphFunctionSample[]; error: string | null }
      | undefined;

    service.vm$.subscribe(vm => {
      emitted = { samples: vm.samples, error: vm.error };
    });
    tick(100);

    expect(emitted?.samples).toEqual([]);
    expect(emitted?.error)
      .toBe('No se pudo muestrear el Workspace gráfico.');
  }));

  it('counts visible, ready and invalid functions', fakeAsync(() => {
    sampler.sampleFunctions.and.returnValue([
      readySample('fn-1'),
      statusSample('invalid', 'fn-2'),
      statusSample('hidden', 'fn-3'),
      statusSample('unsupported', 'fn-4'),
    ]);
    stateSubject.next(createState({
      functions: [
        graphFunction('fn-1'),
        graphFunction('fn-2'),
        graphFunction('fn-3', { visible: false }),
        graphFunction('fn-4', {
          plotKind: 'line',
          expression: 'x + y',
        }),
      ],
    }));
    let counts:
      | {
          visibleFunctions: number;
          readyFunctions: number;
          invalidFunctions: number;
          unsupportedFunctions: number;
        }
      | undefined;

    service.vm$.subscribe(vm => {
      counts = {
        visibleFunctions: vm.visibleFunctions,
        readyFunctions: vm.readyFunctions,
        invalidFunctions: vm.invalidFunctions,
        unsupportedFunctions: vm.unsupportedFunctions,
      };
    });
    tick(100);

    expect(counts).toEqual({
      visibleFunctions: 3,
      readyFunctions: 1,
      invalidFunctions: 1,
      unsupportedFunctions: 1,
    });
  }));

  function createState(
    overrides: Partial<GraphWorkspaceState>
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
      totalSamples: 400,
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
    status: 'hidden' | 'empty' | 'invalid' | 'unsupported',
    functionId: string
  ): GraphFunctionSample {
    return {
      functionId,
      status,
      totalSamples: status === 'invalid' ? 400 : 0,
      invalidSamples: status === 'invalid' ? 400 : 0,
      trace: null,
    };
  }
});
