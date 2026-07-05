import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, map, type Observable } from 'rxjs';
import Complex from 'complex.js';
import {
  CALCULATION_ENGINE,
  type CalculationEngine,
  type CalculationOptions,
} from '../engine-services/calculation-engine.contract';
import { createInitialCalculatorState } from './calculator-state';
import type {
  CalculatorAngleMode,
  CalculatorInputTarget,
  CalculatorMode,
  CalculatorState,
} from './calculator-state';

export type CalculationContextUpdate = Partial<
  Pick<CalculatorState, 'lastExpression' | 'result' | 'editingMemoryId'>
>;

@Injectable({ providedIn: 'root' })
export class CalculatorFacade {
  private readonly engine = inject<CalculationEngine>(CALCULATION_ENGINE);
  private readonly stateSubject = new BehaviorSubject<CalculatorState>(
    createInitialCalculatorState()
  );

  readonly state$ = this.stateSubject.asObservable();
  readonly displayValue$ = this.select(state => state.expression);
  readonly mode$ = this.select(state => state.mode);
  readonly angleMode$ = this.select(state => state.angleMode);
  readonly inputTarget$ = this.select(state => state.inputTarget);
  readonly error$ = this.select(state => state.error);
  readonly editingMemoryId$ = this.select(state => state.editingMemoryId);

  get snapshot(): CalculatorState {
    return this.stateSubject.value;
  }

  appendToken(token: string): void {
    const expression = this.snapshot.expression + token;
    this.update({
      expression,
      lastExpression: expression,
      phase: 'editing',
      error: null,
    });
  }

  setExpression(expression: string): void {
    this.update({
      expression,
      phase: 'editing',
      error: null,
    });
  }

  clear(): void {
    this.update({
      expression: '',
      lastExpression: null,
      result: null,
      phase: 'editing',
      status: 'idle',
      error: null,
      editingMemoryId: null,
    });
  }

  backspace(): void {
    const expression = this.snapshot.expression.slice(0, -1);
    this.update({
      expression,
      lastExpression: expression,
      phase: 'editing',
      error: null,
    });
  }

  toggleSign(): void {
    const expression = this.snapshot.expression;
    if (!expression) return;

    const toggledExpression = expression.startsWith('-')
      ? expression.slice(1)
      : `-${expression}`;
    this.update({
      expression: toggledExpression,
      lastExpression: toggledExpression,
      phase: 'editing',
      error: null,
    });
  }

  setMode(mode: CalculatorMode): void {
    this.update({ mode });
  }

  setAngleMode(angleMode: CalculatorAngleMode): void {
    this.update({ angleMode });
  }

  cycleAngleMode(): void {
    const current = this.snapshot.angleMode;
    const next: CalculatorAngleMode =
      current === 'RAD' ? 'GRAD' :
      current === 'GRAD' ? 'DEG' : 'RAD';

    this.setAngleMode(next);
  }

  setInputTarget(inputTarget: CalculatorInputTarget): void {
    this.update({ inputTarget });
  }

  evaluate(options?: CalculationOptions): number | string {
    const expression = this.snapshot.expression;
    this.update({ status: 'evaluating', error: null });

    try {
      const rawResult = this.engine.evaluate(expression, options);
      const result: number | string = rawResult instanceof Complex
        ? rawResult.toString().replace('=', '')
        : rawResult;

      this.update({
        expression: String(result),
        lastExpression: expression,
        result,
        phase: 'result',
        status: 'idle',
        error: null,
      });

      return result;
    } catch (error) {
      this.update({
        status: 'error',
        error: {
          code: 'EVALUATION_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  }

  restoreCalculation(expression: string, result: number | string): void {
    this.update({
      expression: String(result),
      lastExpression: expression,
      result,
      phase: 'result',
      status: 'idle',
      error: null,
    });
  }

  beginMemoryEdit(id: number, expression: string, result: number | string): void {
    this.update({
      expression,
      lastExpression: expression,
      result,
      phase: 'editing',
      status: 'idle',
      error: null,
      editingMemoryId: id,
    });
  }

  restoreMemoryRecord(expression: string, result: number | string): void {
    this.update({
      expression: String(result),
      lastExpression: expression,
      result,
      phase: 'result',
      status: 'idle',
      error: null,
      editingMemoryId: null,
    });
  }

  finishMemoryEdit(): void {
    this.update({ editingMemoryId: null });
  }

  cancelMemoryEdit(): void {
    this.update({ editingMemoryId: null });
  }

  updateCalculationContext(context: CalculationContextUpdate): void {
    this.update(context);
  }

  reportError(error: unknown, code = 'EVALUATION_ERROR'): void {
    this.update({
      status: 'error',
      error: {
        code,
        message: error instanceof Error ? error.message : String(error),
      },
    });
  }

  clearError(): void {
    this.update({
      error: null,
      status: this.snapshot.status === 'error' ? 'idle' : this.snapshot.status,
    });
  }

  private select<T>(project: (state: CalculatorState) => T): Observable<T> {
    return this.state$.pipe(
      map(project),
      distinctUntilChanged()
    );
  }

  private update(partial: Partial<CalculatorState>): void {
    this.stateSubject.next({
      ...this.snapshot,
      ...partial,
    });
  }
}
