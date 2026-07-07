import { Inject, Injectable } from '@angular/core';
import Complex from 'complex.js';

import {
  CALCULATION_ENGINE,
  type CalculationEngine,
} from '../engine-services/calculation-engine.contract';
import type {
  GraphFunction,
  GraphViewport2D,
} from './graph-workspace-state';
import {
  GRAPH_CONTOUR_SAMPLE_COUNT,
  GRAPH_LINE_SAMPLE_COUNT,
  type GraphContourTraceData,
  type GraphFunctionSample,
  type GraphLineTraceData,
} from './graph-sampling';

interface SampledValue {
  value: number;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class GraphFunctionSamplerService {
  constructor(
    @Inject(CALCULATION_ENGINE)
    private readonly engine: CalculationEngine
  ) {}

  sampleFunction(
    graphFunction: GraphFunction,
    viewport: GraphViewport2D
  ): GraphFunctionSample {
    this.validateViewport(viewport);
    return this.sampleValidatedFunction(graphFunction, viewport);
  }

  sampleFunctions(
    functions: readonly GraphFunction[],
    viewport: GraphViewport2D
  ): GraphFunctionSample[] {
    this.validateViewport(viewport);
    return functions.map(graphFunction =>
      this.sampleValidatedFunction(graphFunction, viewport)
    );
  }

  private sampleValidatedFunction(
    graphFunction: GraphFunction,
    viewport: GraphViewport2D
  ): GraphFunctionSample {
    if (!graphFunction.visible) {
      return this.withoutTrace(graphFunction.id, 'hidden');
    }
    if (!graphFunction.expression.trim()) {
      return this.withoutTrace(graphFunction.id, 'empty');
    }

    switch (graphFunction.plotKind) {
      case 'line':
        return this.sampleLine(graphFunction, viewport);
      case 'contour':
        return this.sampleContour(graphFunction, viewport);
    }
  }

  private sampleLine(
    graphFunction: GraphFunction,
    viewport: GraphViewport2D
  ): GraphFunctionSample {
    const x = this.linspace(
      viewport.xMin,
      viewport.xMax,
      GRAPH_LINE_SAMPLE_COUNT
    );
    let invalidSamples = 0;
    let firstError: string | undefined;
    const y = x.map(xValue => {
      const sampled = this.evaluate(graphFunction.expression, { x: xValue });
      if (Number.isNaN(sampled.value)) {
        invalidSamples++;
        firstError ??= sampled.error;
      }
      return sampled.value;
    });
    const trace: GraphLineTraceData = {
      kind: 'line',
      functionId: graphFunction.id,
      label: graphFunction.label,
      expression: graphFunction.expression,
      color: graphFunction.color,
      x,
      y,
    };

    return this.withTrace(
      graphFunction.id,
      trace,
      x.length,
      invalidSamples,
      firstError
    );
  }

  private sampleContour(
    graphFunction: GraphFunction,
    viewport: GraphViewport2D
  ): GraphFunctionSample {
    const x = this.linspace(
      viewport.xMin,
      viewport.xMax,
      GRAPH_CONTOUR_SAMPLE_COUNT
    );
    const y = this.linspace(
      viewport.yMin,
      viewport.yMax,
      GRAPH_CONTOUR_SAMPLE_COUNT
    );
    let invalidSamples = 0;
    let firstError: string | undefined;
    const z = y.map(yValue =>
      x.map(xValue => {
        const sampled = this.evaluate(graphFunction.expression, {
          x: xValue,
          y: yValue,
        });
        if (Number.isNaN(sampled.value)) {
          invalidSamples++;
          firstError ??= sampled.error;
        }
        return sampled.value;
      })
    );
    const trace: GraphContourTraceData = {
      kind: 'contour',
      functionId: graphFunction.id,
      label: graphFunction.label,
      expression: graphFunction.expression,
      color: graphFunction.color,
      x,
      y,
      z,
    };

    return this.withTrace(
      graphFunction.id,
      trace,
      x.length * y.length,
      invalidSamples,
      firstError
    );
  }

  private evaluate(
    expression: string,
    variables: Record<string, number>
  ): SampledValue {
    try {
      const result = this.engine.evaluate(expression, { variables });
      if (typeof result === 'number') {
        return Number.isFinite(result)
          ? { value: result }
          : { value: NaN, error: 'Non-finite result' };
      }

      if (
        result instanceof Complex &&
        result.im === 0 &&
        Number.isFinite(result.re)
      ) {
        return { value: result.re };
      }

      return { value: NaN, error: 'Non-real complex result' };
    } catch (error) {
      return {
        value: NaN,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private withTrace(
    functionId: string,
    trace: GraphLineTraceData | GraphContourTraceData,
    totalSamples: number,
    invalidSamples: number,
    firstError?: string
  ): GraphFunctionSample {
    return {
      functionId,
      status: invalidSamples === totalSamples ? 'invalid' : 'ready',
      trace,
      totalSamples,
      invalidSamples,
      ...(firstError === undefined ? {} : { firstError }),
    };
  }

  private withoutTrace(
    functionId: string,
    status: 'hidden' | 'empty'
  ): GraphFunctionSample {
    return {
      functionId,
      status,
      trace: null,
      totalSamples: 0,
      invalidSamples: 0,
    };
  }

  private linspace(start: number, end: number, count: number): number[] {
    const step = (end - start) / (count - 1);
    return Array.from({ length: count }, (_, index) =>
      index === count - 1 ? end : start + step * index
    );
  }

  private validateViewport(viewport: GraphViewport2D): void {
    if (
      !Number.isFinite(viewport.xMin) ||
      !Number.isFinite(viewport.xMax) ||
      !Number.isFinite(viewport.yMin) ||
      !Number.isFinite(viewport.yMax) ||
      viewport.xMin >= viewport.xMax ||
      viewport.yMin >= viewport.yMax
    ) {
      throw new RangeError('Invalid graph viewport');
    }
  }
}
