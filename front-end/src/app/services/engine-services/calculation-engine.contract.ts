import { InjectionToken } from '@angular/core';
import Complex from 'complex.js';

export type CalculationAngleMode = 'RAD' | 'DEG' | 'GRAD';

export interface CalculationOptions {
  variables?: Record<string, number>;
  angleMode?: CalculationAngleMode;
}

export interface CalculationEngine {
  evaluate(expression: string, options?: CalculationOptions): number | Complex;
}

export const CALCULATION_ENGINE = new InjectionToken<CalculationEngine>('CALCULATION_ENGINE');
