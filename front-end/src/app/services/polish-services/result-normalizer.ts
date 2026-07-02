import Complex from 'complex.js';
import type { Step } from './polish-evaluator';

export type RawValue = number | Complex;

export type NormalizedValue =
  | {
      type: 'real';
      value: number;
      display: string;
    }
  | {
      type: 'complex';
      re: number;
      im: number;
      display: string;
    };

export interface NormalizedStep {
  type: Step['type'];
  name: string;
  operands: NormalizedValue[];
  result: NormalizedValue;
  stackBefore?: NormalizedValue[];
  stackAfter?: NormalizedValue[];
}

export class ResultNormalizer {
  normalize(value: RawValue): NormalizedValue {
    if (value instanceof Complex) {
      if (value.im === 0) {
        return {
          type: 'real',
          value: value.re,
          display: String(value.re),
        };
      }

      return {
        type: 'complex',
        re: value.re,
        im: value.im,
        display: this.formatComplex(value),
      };
    }

    return {
      type: 'real',
      value,
      display: String(value),
    };
  }

  normalizeStep(step: Step): NormalizedStep {
    const normalized: NormalizedStep = {
      type: step.type,
      name: step.name,
      operands: step.operands.map(value => this.normalize(value)),
      result: this.normalize(step.result),
    };

    if (step.stackBefore) {
      normalized.stackBefore = step.stackBefore.map(value => this.normalize(value));
    }
    if (step.stackAfter) {
      normalized.stackAfter = step.stackAfter.map(value => this.normalize(value));
    }

    return normalized;
  }

  normalizeSteps(steps: Step[]): NormalizedStep[] {
    return steps.map(step => this.normalizeStep(step));
  }

  simplify(value: RawValue): RawValue {
    if (value instanceof Complex && value.im === 0) {
      return value.re;
    }

    return value;
  }

  private formatComplex(value: Complex): string {
    if (value.re === 0) return `${value.im}i`;
    return `${value.re}${value.im >= 0 ? '+' : ''}${value.im}i`;
  }
}
