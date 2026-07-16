import { TestBed } from '@angular/core/testing';
import Complex from 'complex.js';

import {
  CALCULATION_ENGINE,
  type CalculationEngine,
} from '../engine-services/calculation-engine.contract';
import { GraphFunctionSamplerService } from './graph-function-sampler';
import {
  GRAPH_CONTOUR_SAMPLE_COUNT,
  GRAPH_LINE_SAMPLE_COUNT,
  type GraphContourTraceData,
  type GraphLineTraceData,
} from './graph-sampling';
import type {
  GraphFunction,
  GraphViewport2D,
} from './graph-workspace-state';

describe('GraphFunctionSamplerService', () => {
  let service: GraphFunctionSamplerService;
  let engine: jasmine.SpyObj<CalculationEngine>;
  const viewport: GraphViewport2D = {
    xMin: -10,
    xMax: 10,
    yMin: -6,
    yMax: 6,
  };

  beforeEach(() => {
    engine = jasmine.createSpyObj<CalculationEngine>(
      'CalculationEngine',
      ['evaluate']
    );
    engine.evaluate.and.returnValue(0);
    TestBed.configureTestingModule({
      providers: [
        { provide: CALCULATION_ENGINE, useValue: engine },
      ],
    });
    service = TestBed.inject(GraphFunctionSamplerService);
  });

  it('samples a line with four hundred points and inclusive viewport bounds', () => {
    engine.evaluate.and.callFake(
      (_expression, options) => options?.variables?.['x'] ?? NaN
    );

    const sample = service.sampleFunction(createFunction(), viewport);
    const trace = sample.trace as GraphLineTraceData;

    expect(sample.status).toBe('ready');
    expect(sample.totalSamples).toBe(GRAPH_LINE_SAMPLE_COUNT);
    expect(trace.x.length).toBe(400);
    expect(trace.y.length).toBe(400);
    expect(trace.x[0]).toBe(viewport.xMin);
    expect(trace.x.at(-1)).toBe(viewport.xMax);
  });

  it('passes only x as the line variable', () => {
    service.sampleFunction(createFunction(), viewport);

    expect(engine.evaluate).toHaveBeenCalledTimes(400);
    for (const [, options] of engine.evaluate.calls.allArgs()) {
      expect(options?.variables).toEqual({
        x: jasmine.any(Number) as unknown as number,
      });
      expect(Object.keys(options?.variables ?? {})).toEqual(['x']);
    }
  });

  it('marks line functions that use y as unsupported without sampling', () => {
    const sample = service.sampleFunction(
      createFunction({ expression: 'x + y' }),
      viewport
    );

    expect(sample.status).toBe('unsupported');
    expect(sample.trace).toBeNull();
    expect(sample.totalSamples).toBe(0);
    expect(sample.invalidSamples).toBe(0);
    expect(engine.evaluate).not.toHaveBeenCalled();
  });

  it('samples a contour on a sixty-four by sixty-four grid', () => {
    const sample = service.sampleFunction(
      createFunction({ plotKind: 'contour' }),
      viewport
    );
    const trace = sample.trace as GraphContourTraceData;

    expect(sample.status).toBe('ready');
    expect(sample.totalSamples).toBe(64 * 64);
    expect(trace.x.length).toBe(GRAPH_CONTOUR_SAMPLE_COUNT);
    expect(trace.y.length).toBe(GRAPH_CONTOUR_SAMPLE_COUNT);
    expect(trace.z.length).toBe(GRAPH_CONTOUR_SAMPLE_COUNT);
    expect(trace.z.every(row => row.length === 64)).toBeTrue();
    expect(engine.evaluate).toHaveBeenCalledTimes(64 * 64);
  });

  it('passes x and y to every contour evaluation', () => {
    service.sampleFunction(
      createFunction({ plotKind: 'contour' }),
      viewport
    );

    for (const [, options] of engine.evaluate.calls.allArgs()) {
      expect(Object.keys(options?.variables ?? {}).sort()).toEqual(['x', 'y']);
      expect(options?.variables?.['x']).toEqual(jasmine.any(Number));
      expect(options?.variables?.['y']).toEqual(jasmine.any(Number));
    }
  });

  it('stores contour z values in rows corresponding to each y value', () => {
    engine.evaluate.and.callFake((_expression, options) => {
      const x = options?.variables?.['x'] ?? 0;
      const y = options?.variables?.['y'] ?? 0;
      return x + 100 * y;
    });

    const sample = service.sampleFunction(
      createFunction({ plotKind: 'contour' }),
      viewport
    );
    const trace = sample.trace as GraphContourTraceData;

    expect(trace.z[0][0]).toBe(trace.x[0] + 100 * trace.y[0]);
    expect(trace.z[1][0]).toBe(trace.x[0] + 100 * trace.y[1]);
    expect(trace.z[0][1]).toBe(trace.x[1] + 100 * trace.y[0]);
  });

  it('samples multiple functions in their original order', () => {
    const functions = [
      createFunction({ id: 'first', label: 'f1' }),
      createFunction({ id: 'second', label: 'f2', visible: false }),
      createFunction({ id: 'third', label: 'f3', expression: ' ' }),
    ];

    const samples = service.sampleFunctions(functions, viewport);

    expect(samples.map(({ functionId }) => functionId))
      .toEqual(['first', 'second', 'third']);
    expect(samples.map(({ status }) => status))
      .toEqual(['ready', 'hidden', 'empty']);
  });

  it('does not evaluate hidden functions', () => {
    const sample = service.sampleFunction(
      createFunction({ visible: false }),
      viewport
    );

    expect(sample).toEqual({
      functionId: 'function-1',
      status: 'hidden',
      trace: null,
      totalSamples: 0,
      invalidSamples: 0,
    });
    expect(engine.evaluate).not.toHaveBeenCalled();
  });

  it('does not evaluate empty expressions', () => {
    const sample = service.sampleFunction(
      createFunction({ expression: '   ' }),
      viewport
    );

    expect(sample.status).toBe('empty');
    expect(sample.trace).toBeNull();
    expect(engine.evaluate).not.toHaveBeenCalled();
  });

  it('converts a point error to NaN and preserves only the first error', () => {
    let call = 0;
    engine.evaluate.and.callFake(() => {
      if (call++ === 0) throw new Error('undefined at first point');
      return 1;
    });

    const sample = service.sampleFunction(createFunction(), viewport);
    const trace = sample.trace as GraphLineTraceData;

    expect(sample.status).toBe('ready');
    expect(sample.invalidSamples).toBe(1);
    expect(sample.firstError).toBe('undefined at first point');
    expect(trace.y[0]).toBeNaN();
    expect(trace.y.slice(1).every(value => value === 1)).toBeTrue();
  });

  it('returns invalid when every sample throws', () => {
    engine.evaluate.and.throwError('sampling failed');

    const sample = service.sampleFunction(createFunction(), viewport);
    const trace = sample.trace as GraphLineTraceData;

    expect(sample.status).toBe('invalid');
    expect(sample.invalidSamples).toBe(GRAPH_LINE_SAMPLE_COUNT);
    expect(sample.firstError).toBe('sampling failed');
    expect(trace.y.every(Number.isNaN)).toBeTrue();
  });

  it('normalizes NaN and infinite results', () => {
    let call = 0;
    engine.evaluate.and.callFake(() => {
      if (call++ === 0) return NaN;
      if (call === 2) return Number.POSITIVE_INFINITY;
      return 1;
    });

    const sample = service.sampleFunction(createFunction(), viewport);
    const trace = sample.trace as GraphLineTraceData;

    expect(sample.status).toBe('ready');
    expect(sample.invalidSamples).toBe(2);
    expect(trace.y[0]).toBeNaN();
    expect(trace.y[1]).toBeNaN();
  });

  it('uses the real part of a real Complex result', () => {
    engine.evaluate.and.returnValue(new Complex(7, 0));

    const sample = service.sampleFunction(createFunction(), viewport);
    const trace = sample.trace as GraphLineTraceData;

    expect(sample.status).toBe('ready');
    expect(sample.invalidSamples).toBe(0);
    expect(trace.y.every(value => value === 7)).toBeTrue();
  });

  it('converts non-real Complex results to NaN', () => {
    engine.evaluate.and.returnValue(new Complex(7, 2));

    const sample = service.sampleFunction(createFunction(), viewport);
    const trace = sample.trace as GraphLineTraceData;

    expect(sample.status).toBe('invalid');
    expect(sample.invalidSamples).toBe(GRAPH_LINE_SAMPLE_COUNT);
    expect(trace.y.every(Number.isNaN)).toBeTrue();
  });

  it('rejects an invalid viewport before evaluating', () => {
    const invalidViewports: GraphViewport2D[] = [
      { ...viewport, xMin: 10, xMax: -10 },
      { ...viewport, yMin: 6, yMax: 6 },
      { ...viewport, xMax: Number.POSITIVE_INFINITY },
      { ...viewport, yMin: Number.NaN },
    ];

    for (const invalidViewport of invalidViewports) {
      expect(() =>
        service.sampleFunction(createFunction(), invalidViewport)
      ).toThrowError(RangeError, 'Invalid graph viewport');
    }
    expect(engine.evaluate).not.toHaveBeenCalled();
  });

  it('does not mutate the function or viewport inputs', () => {
    const graphFunction = Object.freeze(createFunction());
    const frozenViewport = Object.freeze({ ...viewport });
    const functionSnapshot = { ...graphFunction };
    const viewportSnapshot = { ...frozenViewport };

    service.sampleFunction(graphFunction, frozenViewport);

    expect(graphFunction).toEqual(functionSnapshot);
    expect(frozenViewport).toEqual(viewportSnapshot);
  });

  function createFunction(
    overrides: Partial<GraphFunction> = {}
  ): GraphFunction {
    const timestamp = new Date('2026-06-07T08:09:10.000Z');
    return {
      id: 'function-1',
      expression: 'sin(x)',
      label: 'f1',
      color: '#78a9ff',
      visible: true,
      plotKind: 'line',
      createdAt: timestamp,
      updatedAt: timestamp,
      ...overrides,
    };
  }
});
