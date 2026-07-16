import { Inject, Injectable } from '@angular/core';
import Complex from 'complex.js';

import {
  CALCULATION_ENGINE,
  type CalculationEngine,
} from '../engine-services/calculation-engine.contract';
import type {
  GraphFunction,
  GraphScene3D,
} from './graph-workspace-state';
import {
  GRAPH_SURFACE_SAMPLE_COUNT,
  type GraphSurfaceSample,
  type GraphSurfaceTraceData,
} from './graph-sampling-3d';

interface SampledValue {
  value: number;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class GraphFunctionSampler3DService {
  constructor(
    @Inject(CALCULATION_ENGINE)
    private readonly engine: CalculationEngine
  ) {}

  sampleFunction(
    graphFunction: GraphFunction,
    scene: GraphScene3D
  ): GraphSurfaceSample {
    this.validateScene(scene);
    return this.sampleValidatedFunction(graphFunction, scene);
  }

  sampleFunctions(
    functions: readonly GraphFunction[],
    scene: GraphScene3D
  ): GraphSurfaceSample[] {
    this.validateScene(scene);
    return functions.map(graphFunction =>
      this.sampleValidatedFunction(graphFunction, scene)
    );
  }

  private sampleValidatedFunction(
    graphFunction: GraphFunction,
    scene: GraphScene3D
  ): GraphSurfaceSample {
    if (!graphFunction.visible) {
      return this.withoutTrace(graphFunction.id, 'hidden');
    }
    if (!graphFunction.expression.trim()) {
      return this.withoutTrace(graphFunction.id, 'empty');
    }
    if (graphFunction.plotKind === 'line') {
      return this.withoutTrace(graphFunction.id, 'unsupported');
    }

    return this.sampleSurface(graphFunction, scene);
  }

  private sampleSurface(
    graphFunction: GraphFunction,
    scene: GraphScene3D
  ): GraphSurfaceSample {
    const x = this.linspace(scene.xMin, scene.xMax, GRAPH_SURFACE_SAMPLE_COUNT);
    const y = this.linspace(scene.yMin, scene.yMax, GRAPH_SURFACE_SAMPLE_COUNT);
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
    const trace: GraphSurfaceTraceData = {
      kind: 'surface',
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
    trace: GraphSurfaceTraceData,
    totalSamples: number,
    invalidSamples: number,
    firstError?: string
  ): GraphSurfaceSample {
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
    status: 'hidden' | 'empty' | 'unsupported'
  ): GraphSurfaceSample {
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

  private validateScene(scene: GraphScene3D): void {
    if (
      !this.isValidRange(scene.xMin, scene.xMax) ||
      !this.isValidRange(scene.yMin, scene.yMax) ||
      !this.isValidRange(scene.zMin, scene.zMax) ||
      !this.isValidVector(scene.camera.eye) ||
      !this.isValidVector(scene.camera.up) ||
      !this.isValidVector(scene.camera.center)
    ) {
      throw new RangeError('Invalid graph scene');
    }
  }

  private isValidRange(min: number, max: number): boolean {
    return (
      Number.isFinite(min) &&
      Number.isFinite(max) &&
      min < max
    );
  }

  private isValidVector(vector: { x: number; y: number; z: number }): boolean {
    return (
      Number.isFinite(vector.x) &&
      Number.isFinite(vector.y) &&
      Number.isFinite(vector.z)
    );
  }
}
