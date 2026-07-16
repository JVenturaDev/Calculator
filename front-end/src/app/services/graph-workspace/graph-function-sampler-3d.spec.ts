import { TestBed } from '@angular/core/testing';
import Complex from 'complex.js';

import {
  CALCULATION_ENGINE,
  type CalculationEngine,
} from '../engine-services/calculation-engine.contract';
import {
  cloneDefaultGraphScene3D,
  type GraphFunction,
  type GraphScene3D,
} from './graph-workspace-state';
import {
  GRAPH_SURFACE_SAMPLE_COUNT,
  type GraphSurfaceTraceData,
} from './graph-sampling-3d';
import { GraphFunctionSampler3DService } from './graph-function-sampler-3d';

describe('GraphFunctionSampler3DService', () => {
  let service: GraphFunctionSampler3DService;
  let engine: jasmine.SpyObj<CalculationEngine>;
  const scene: GraphScene3D = {
    ...cloneDefaultGraphScene3D(),
    xMin: -8,
    xMax: 8,
    yMin: -6,
    yMax: 6,
    zMin: -4,
    zMax: 4,
  };

  beforeEach(() => {
    engine = jasmine.createSpyObj<CalculationEngine>('CalculationEngine', [
      'evaluate',
    ]);
    engine.evaluate.and.returnValue(0);
    TestBed.configureTestingModule({
      providers: [{ provide: CALCULATION_ENGINE, useValue: engine }],
    });
    service = TestBed.inject(GraphFunctionSampler3DService);
  });

  it('samples a contour as a 48 by 48 surface grid', () => {
    const sample = service.sampleFunction(
      createFunction({ plotKind: 'contour' }),
      scene
    );
    const trace = sample.trace as GraphSurfaceTraceData;

    expect(sample.status).toBe('ready');
    expect(sample.totalSamples).toBe(GRAPH_SURFACE_SAMPLE_COUNT ** 2);
    expect(trace.kind).toBe('surface');
    expect(trace.x.length).toBe(GRAPH_SURFACE_SAMPLE_COUNT);
    expect(trace.y.length).toBe(GRAPH_SURFACE_SAMPLE_COUNT);
    expect(trace.z.length).toBe(GRAPH_SURFACE_SAMPLE_COUNT);
    expect(trace.z.every(row => row.length === GRAPH_SURFACE_SAMPLE_COUNT))
      .toBeTrue();
    expect(engine.evaluate).toHaveBeenCalledTimes(
      GRAPH_SURFACE_SAMPLE_COUNT ** 2
    );
  });

  it('uses x and y variables for every surface sample', () => {
    service.sampleFunction(createFunction({ plotKind: 'contour' }), scene);

    for (const [, options] of engine.evaluate.calls.allArgs()) {
      expect(Object.keys(options?.variables ?? {}).sort()).toEqual(['x', 'y']);
      expect(options?.variables?.['x']).toEqual(jasmine.any(Number));
      expect(options?.variables?.['y']).toEqual(jasmine.any(Number));
    }
  });

  it('stores surface z values in rows corresponding to each y value', () => {
    engine.evaluate.and.callFake((_expression, options) => {
      const x = options?.variables?.['x'] ?? 0;
      const y = options?.variables?.['y'] ?? 0;
      return x + 100 * y;
    });

    const sample = service.sampleFunction(createFunction({ plotKind: 'contour' }), scene);
    const trace = sample.trace as GraphSurfaceTraceData;

    expect(trace.z[0][0]).toBe(trace.x[0] + 100 * trace.y[0]);
    expect(trace.z[1][0]).toBe(trace.x[0] + 100 * trace.y[1]);
    expect(trace.z[0][1]).toBe(trace.x[1] + 100 * trace.y[0]);
  });

  it('samples multiple functions in their original order', () => {
    const functions = [
      createFunction({ id: 'first', label: 'f1', plotKind: 'contour' }),
      createFunction({ id: 'second', label: 'f2', visible: false, plotKind: 'contour' }),
      createFunction({ id: 'third', label: 'f3', expression: ' ', plotKind: 'contour' }),
      createFunction({ id: 'fourth', label: 'f4', plotKind: 'line' }),
    ];

    const samples = service.sampleFunctions(functions, scene);

    expect(samples.map(({ functionId }) => functionId)).toEqual([
      'first',
      'second',
      'third',
      'fourth',
    ]);
    expect(samples.map(({ status }) => status)).toEqual([
      'ready',
      'hidden',
      'empty',
      'unsupported',
    ]);
  });

  it('does not evaluate hidden, empty or unsupported line functions', () => {
    const hidden = service.sampleFunction(
      createFunction({ visible: false, plotKind: 'contour' }),
      scene
    );
    const empty = service.sampleFunction(
      createFunction({ expression: '   ', plotKind: 'contour' }),
      scene
    );
    const unsupported = service.sampleFunction(createFunction({ plotKind: 'line' }), scene);

    expect(hidden).toEqual({
      functionId: 'function-1',
      status: 'hidden',
      trace: null,
      totalSamples: 0,
      invalidSamples: 0,
    });
    expect(empty.status).toBe('empty');
    expect(empty.trace).toBeNull();
    expect(unsupported.status).toBe('unsupported');
    expect(unsupported.trace).toBeNull();
    expect(engine.evaluate).not.toHaveBeenCalled();
  });

  it('converts a point error to NaN and preserves only the first error', () => {
    let call = 0;
    engine.evaluate.and.callFake(() => {
      if (call++ === 0) {
        throw new Error('undefined at first point');
      }
      return 1;
    });

    const sample = service.sampleFunction(
      createFunction({ plotKind: 'contour' }),
      scene
    );
    const trace = sample.trace as GraphSurfaceTraceData;

    expect(sample.status).toBe('ready');
    expect(sample.invalidSamples).toBe(1);
    expect(sample.firstError).toBe('undefined at first point');
    expect(trace.z[0][0]).toBeNaN();
  });

  it('returns invalid when every sample is invalid', () => {
    engine.evaluate.and.throwError('sampling failed');

    const sample = service.sampleFunction(
      createFunction({ plotKind: 'contour' }),
      scene
    );
    const trace = sample.trace as GraphSurfaceTraceData;

    expect(sample.status).toBe('invalid');
    expect(sample.invalidSamples).toBe(GRAPH_SURFACE_SAMPLE_COUNT ** 2);
    expect(sample.firstError).toBe('sampling failed');
    expect(trace.z.every(row => row.every(Number.isNaN))).toBeTrue();
  });

  it('normalizes NaN and infinite results', () => {
    let call = 0;
    engine.evaluate.and.callFake(() => {
      if (call++ === 0) {
        return NaN;
      }
      if (call === 2) {
        return Number.POSITIVE_INFINITY;
      }
      return 1;
    });

    const sample = service.sampleFunction(
      createFunction({ plotKind: 'contour' }),
      scene
    );
    const trace = sample.trace as GraphSurfaceTraceData;

    expect(sample.status).toBe('ready');
    expect(sample.invalidSamples).toBe(2);
    expect(trace.z[0][0]).toBeNaN();
    expect(trace.z[0][1]).toBeNaN();
  });

  it('uses the real part of a real Complex result', () => {
    engine.evaluate.and.returnValue(new Complex(7, 0));

    const sample = service.sampleFunction(
      createFunction({ plotKind: 'contour' }),
      scene
    );
    const trace = sample.trace as GraphSurfaceTraceData;

    expect(sample.status).toBe('ready');
    expect(sample.invalidSamples).toBe(0);
    expect(trace.z.every(row => row.every(value => value === 7))).toBeTrue();
  });

  it('converts non-real Complex results to NaN', () => {
    engine.evaluate.and.returnValue(new Complex(7, 2));

    const sample = service.sampleFunction(
      createFunction({ plotKind: 'contour' }),
      scene
    );
    const trace = sample.trace as GraphSurfaceTraceData;

    expect(sample.status).toBe('invalid');
    expect(sample.invalidSamples).toBe(GRAPH_SURFACE_SAMPLE_COUNT ** 2);
    expect(trace.z.every(row => row.every(Number.isNaN))).toBeTrue();
  });

  it('rejects an invalid scene before evaluating', () => {
    const invalidScenes: GraphScene3D[] = [
      { ...scene, xMin: 8, xMax: -8 },
      { ...scene, yMin: 6, yMax: 6 },
      { ...scene, zMin: Number.NEGATIVE_INFINITY },
      { ...scene, camera: { ...scene.camera, eye: { ...scene.camera.eye, x: Number.NaN } } },
      { ...scene, camera: { ...scene.camera, up: { ...scene.camera.up, z: Number.POSITIVE_INFINITY } } },
      { ...scene, camera: { ...scene.camera, center: { ...scene.camera.center, y: Number.NaN } } },
    ];

    for (const invalidScene of invalidScenes) {
      expect(() =>
        service.sampleFunction(createFunction({ plotKind: 'contour' }), invalidScene)
      ).toThrowError(RangeError, 'Invalid graph scene');
    }
    expect(engine.evaluate).not.toHaveBeenCalled();
  });

  it('does not mutate the function or scene inputs', () => {
    const graphFunction = Object.freeze(createFunction({ plotKind: 'contour' }));
    const frozenScene = Object.freeze({
      ...scene,
      camera: Object.freeze({
        eye: Object.freeze({ ...scene.camera.eye }),
        up: Object.freeze({ ...scene.camera.up }),
        center: Object.freeze({ ...scene.camera.center }),
      }),
    }) as GraphScene3D;
    const functionSnapshot = { ...graphFunction };
    const sceneSnapshot = {
      ...frozenScene,
      camera: {
        eye: { ...frozenScene.camera.eye },
        up: { ...frozenScene.camera.up },
        center: { ...frozenScene.camera.center },
      },
    };

    service.sampleFunction(graphFunction, frozenScene);

    expect(graphFunction).toEqual(functionSnapshot);
    expect(frozenScene).toEqual(sceneSnapshot);
  });

  function createFunction(
    overrides: Partial<GraphFunction> = {}
  ): GraphFunction {
    const timestamp = new Date('2026-06-07T08:09:10.000Z');
    return {
      id: 'function-1',
      expression: 'x + y',
      label: 'f1',
      color: '#78a9ff',
      visible: true,
      plotKind: 'contour',
      createdAt: timestamp,
      updatedAt: timestamp,
      ...overrides,
    };
  }
});
