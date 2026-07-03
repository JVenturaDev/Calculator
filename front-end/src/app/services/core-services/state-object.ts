import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, distinctUntilChanged, map } from 'rxjs';
import type {
  CalculatorResult,
  CalculatorState,
} from '../calculator-state/calculator-state';
import { CalculatorFacade } from '../calculator-state/calculator-facade';

export interface StateObject {
  /** @deprecated Estado técnico heredado; se conserva solo por compatibilidad. */
  bd: IDBDatabase | null;
  result: number | string;
  expression: string;
  /** @deprecated Use CalculatorState.phase cuando se migren los consumidores. */
  equalPressed: number;
  /** @deprecated Use CalculatorFacade.editingMemoryId$ y sus comandos de memoria. */
  idEnEdicion: number | null;
  /** @deprecated Referencia DOM heredada; no pertenece al estado de cálculo. */
  memoryContainer: HTMLElement | null;
  /** @deprecated Campo heredado sin consumidores activos. */
  valorOriginalMemoria: number;
  /** @deprecated Campo heredado sin consumidores activos. */
  idUltimoResultado: number | null;
}

type TemporaryLegacyState = Pick<
  StateObject,
  'bd' | 'equalPressed' | 'memoryContainer' | 'valorOriginalMemoria' | 'idUltimoResultado'
>;

const INITIAL_TEMPORARY_STATE: TemporaryLegacyState = {
  bd: null,
  equalPressed: 0,
  memoryContainer: null,
  valorOriginalMemoria: 0,
  idUltimoResultado: null,
};

@Injectable({ providedIn: 'root' })
export class StateService {
  private readonly calculator = inject(CalculatorFacade);
  private readonly temporaryState = new BehaviorSubject<TemporaryLegacyState>(
    INITIAL_TEMPORARY_STATE
  );

  readonly state$ = combineLatest([
    this.calculator.state$,
    this.temporaryState.asObservable(),
  ]).pipe(
    map(([calculatorState, temporaryState]) =>
      this.toStateObject(calculatorState, temporaryState)
    ),
    distinctUntilChanged((previous, current) =>
      Object.keys(previous).every(key =>
        previous[key as keyof StateObject] === current[key as keyof StateObject]
      )
    )
  );

  get value(): StateObject {
    return this.toStateObject(this.calculator.snapshot, this.temporaryState.value);
  }

  update(partial: Partial<StateObject>): void {
    const calculationContext: {
      lastExpression?: string;
      result?: CalculatorResult | null;
      editingMemoryId?: number | null;
    } = {};

    if ('expression' in partial) {
      calculationContext.lastExpression = partial.expression;
    }
    if ('result' in partial) {
      calculationContext.result = partial.result;
    }
    if ('idEnEdicion' in partial) {
      calculationContext.editingMemoryId = partial.idEnEdicion;
    }

    if (Object.keys(calculationContext).length > 0) {
      this.calculator.updateCalculationContext(calculationContext);
    }

    const temporaryUpdate = this.pickTemporaryFields(partial);
    if (Object.keys(temporaryUpdate).length > 0) {
      this.temporaryState.next({
        ...this.temporaryState.value,
        ...temporaryUpdate,
      });
    }
  }

  reset(): void {
    this.calculator.updateCalculationContext({
      lastExpression: '',
      result: 0,
      editingMemoryId: null,
    });
    this.temporaryState.next(INITIAL_TEMPORARY_STATE);
  }

  private toStateObject(
    calculatorState: CalculatorState,
    temporaryState: TemporaryLegacyState
  ): StateObject {
    return {
      ...temporaryState,
      expression: calculatorState.lastExpression ?? calculatorState.expression,
      result: this.toLegacyResult(calculatorState.result),
      idEnEdicion: calculatorState.editingMemoryId,
    };
  }

  private toLegacyResult(result: CalculatorResult | null): number | string {
    if (result === null) return 0;
    return typeof result === 'number' || typeof result === 'string'
      ? result
      : result.toString();
  }

  private pickTemporaryFields(partial: Partial<StateObject>): Partial<TemporaryLegacyState> {
    const temporaryUpdate: Partial<TemporaryLegacyState> = {};

    if ('bd' in partial) temporaryUpdate.bd = partial.bd;
    if ('equalPressed' in partial) temporaryUpdate.equalPressed = partial.equalPressed;
    if ('memoryContainer' in partial) {
      temporaryUpdate.memoryContainer = partial.memoryContainer;
    }
    if ('valorOriginalMemoria' in partial) {
      temporaryUpdate.valorOriginalMemoria = partial.valorOriginalMemoria;
    }
    if ('idUltimoResultado' in partial) {
      temporaryUpdate.idUltimoResultado = partial.idUltimoResultado;
    }

    return temporaryUpdate;
  }
}
