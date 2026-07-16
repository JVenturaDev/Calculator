import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { GraphFunctionSampler3DService } from './graph-function-sampler-3d';
import { GraphWorkspaceFacade } from './graph-workspace-facade';
import { GraphWorkspaceSamplingViewModel3DService } from './graph-workspace-sampling-view-model-3d';
import type { GraphWorkspaceSamplingViewModel3D } from './graph-workspace-sampling-view-model-3d';
import {
  cloneDefaultGraphScene3D,
  createInitialGraphWorkspaceState,
  type GraphFunction,
  type GraphWorkspaceState,
} from './graph-workspace-state';
import type { GraphSurfaceSample } from './graph-sampling-3d';

describe('GraphWorkspaceSamplingViewModel3DService', () => {
  let service: GraphWorkspaceSamplingViewModel3DService;
  let facadeState$: BehaviorSubject<GraphWorkspaceState>;
  let sampler: jasmine.SpyObj<GraphFunctionSampler3DService>;

  beforeEach(() => {
    facadeState$ = new BehaviorSubject(createState('2d'));
    sampler = jasmine.createSpyObj<GraphFunctionSampler3DService>(
      'GraphFunctionSampler3DService',
      ['sampleFunctions']
    );
    sampler.sampleFunctions.and.returnValue([createSample('surface-1')]);

    TestBed.configureTestingModule({
      providers: [
        GraphWorkspaceSamplingViewModel3DService,
        { provide: GraphWorkspaceFacade, useValue: { state$: facadeState$.asObservable() } },
        { provide: GraphFunctionSampler3DService, useValue: sampler },
      ],
    });

    service = TestBed.inject(GraphWorkspaceSamplingViewModel3DService);
  });

  it('emits the initial 2D state without sampling', fakeAsync(() => {
    let vm: GraphWorkspaceSamplingViewModel3D | undefined;
    service.vm$.subscribe(value => {
      vm = value;
    });

    tick(120);

    expect(sampler.sampleFunctions).not.toHaveBeenCalled();
    expect(vm?.state.viewMode).toBe('2d');
    expect(vm?.samples).toEqual([]);
    expect(vm?.error).toBeNull();
    expect(vm?.selectedFunctionId).toBeNull();
  }));

  it('samples only when the view mode is 3d', fakeAsync(() => {
    let vm: GraphWorkspaceSamplingViewModel3D | undefined;
    service.vm$.subscribe(value => {
      vm = value;
    });

    facadeState$.next(createState('3d', [createFunction('surface-1')], 'surface-1-selected'));
    tick(120);

    expect(sampler.sampleFunctions).toHaveBeenCalledTimes(1);
    expect(sampler.sampleFunctions).toHaveBeenCalledWith(
      jasmine.any(Array),
      jasmine.any(Object)
    );
    expect(vm?.samples.map(sample => sample.functionId)).toEqual(['surface-1']);
    expect(vm?.scene).toEqual(cloneDefaultGraphScene3D());
    expect(vm?.selectedFunctionId).toBe('surface-1-selected');
  }));

  it('applies debounce and consolidates rapid emissions', fakeAsync(() => {
    service.vm$.subscribe();

    facadeState$.next(createState('3d', [createFunction('a')]));
    facadeState$.next(createState('3d', [createFunction('b')]));

    tick(119);
    expect(sampler.sampleFunctions).not.toHaveBeenCalled();

    tick(1);
    expect(sampler.sampleFunctions).toHaveBeenCalledTimes(1);
    expect(
      sampler.sampleFunctions.calls.mostRecent().args[0].map((graphFunction: GraphFunction) => graphFunction.id)
    ).toEqual(['b']);
  }));

  it('does not duplicate sampling for multiple subscribers', fakeAsync(() => {
    service.vm$.subscribe();
    service.vm$.subscribe();

    facadeState$.next(createState('3d', [createFunction('a')]));
    tick(120);

    expect(sampler.sampleFunctions).toHaveBeenCalledTimes(1);
  }));

  it('counts compatible, ready, invalid and unsupported functions', fakeAsync(() => {
    sampler.sampleFunctions.and.returnValue([
      createSample('ready-1', 'ready'),
      createSample('invalid-1', 'invalid'),
      createSample('unsupported-1', 'unsupported'),
    ]);

    let vm: GraphWorkspaceSamplingViewModel3D | undefined;
    service.vm$.subscribe(value => {
      vm = value;
    });

    facadeState$.next(
      createState('3d', [
        createFunction('contour-ready', { plotKind: 'contour', expression: 'x + y' }),
        createFunction('contour-empty', { plotKind: 'contour', expression: '   ' }),
        createFunction('line-1', { plotKind: 'line' }),
      ])
    );
    tick(120);

    expect(vm?.compatibleFunctions).toBe(1);
    expect(vm?.readyFunctions).toBe(1);
    expect(vm?.invalidFunctions).toBe(1);
    expect(vm?.unsupportedFunctions).toBe(1);
  }));

  it('surfaces sampler errors without breaking the stream', fakeAsync(() => {
    sampler.sampleFunctions.and.throwError('boom');

    let vm: { samples: readonly GraphSurfaceSample[]; error: string | null } | undefined;
    service.vm$.subscribe(value => {
      vm = value;
    });

    facadeState$.next(createState('3d'));
    tick(120);

    expect(vm?.samples).toEqual([]);
    expect(vm?.error).toBe('No se pudo muestrear la vista gráfica 3D.');
  }));

  function createState(
    viewMode: GraphWorkspaceState['viewMode'],
    functions: readonly GraphFunction[] = [createFunction('surface-1')],
    selectedFunctionId: string | null = null
  ): GraphWorkspaceState {
    const timestamp = new Date('2026-07-01T12:00:00.000Z');
    const state = createInitialGraphWorkspaceState('graph-1', timestamp);

    return {
      ...state,
      viewMode,
      functions,
      selectedFunctionId,
      scene3D: cloneDefaultGraphScene3D(),
    };
  }

  function createFunction(
    id: string,
    overrides: Partial<GraphFunction> = {}
  ): GraphFunction {
    const timestamp = new Date('2026-07-01T12:00:00.000Z');
    return {
      id,
      expression: 'x + y',
      label: id,
      color: '#78a9ff',
      visible: true,
      plotKind: 'contour',
      createdAt: timestamp,
      updatedAt: timestamp,
      ...overrides,
    };
  }

  function createSample(
    functionId: string,
    status: GraphSurfaceSample['status'] = 'ready'
  ): GraphSurfaceSample {
    return {
      functionId,
      status,
      trace:
        status === 'ready'
          ? {
              kind: 'surface',
              functionId,
              label: functionId,
              expression: 'x + y',
              color: '#78a9ff',
              x: [0, 1],
              y: [0, 1],
              z: [
                [0, 1],
                [1, 2],
              ],
            }
          : null,
      totalSamples: status === 'ready' ? 4 : 0,
      invalidSamples: status === 'invalid' ? 4 : 0,
    };
  }
});
