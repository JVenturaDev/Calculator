import type Complex from 'complex.js';

export type CalculatorValue = number | Complex;
export type CalculatorResult = CalculatorValue | string;
export type CalculatorMode = 'basic' | 'scientific' | 'graphic';
export type CalculatorAngleMode = 'RAD' | 'DEG' | 'GRAD';
export type CalculatorPhase = 'editing' | 'result';
export type CalculatorStatus = 'idle' | 'evaluating' | 'error';

export type CalculatorInputTarget =
  | { type: 'calculator' }
  | { type: 'workspace-item'; itemId: string };

export interface CalculatorError {
  code: string;
  message: string;
}

export interface CalculatorState {
  expression: string;
  lastExpression: string | null;
  result: CalculatorResult | null;
  phase: CalculatorPhase;
  status: CalculatorStatus;
  mode: CalculatorMode;
  angleMode: CalculatorAngleMode;
  inputTarget: CalculatorInputTarget;
  error: CalculatorError | null;
  editingMemoryId: number | null;
}

export function createInitialCalculatorState(): CalculatorState {
  return {
    expression: '',
    lastExpression: null,
    result: null,
    phase: 'editing',
    status: 'idle',
    mode: 'graphic',
    angleMode: 'RAD',
    inputTarget: { type: 'calculator' },
    error: null,
    editingMemoryId: null,
  };
}
