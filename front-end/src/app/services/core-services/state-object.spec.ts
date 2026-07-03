import { TestBed } from '@angular/core/testing';
import { CalculatorFacade } from '../calculator-state/calculator-facade';
import { CALCULATION_ENGINE } from '../engine-services/calculation-engine.contract';
import { StateService } from './state-object';

describe('StateService', () => {
  let stateobject: StateService;
  let calculator: CalculatorFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: CALCULATION_ENGINE, useValue: { evaluate: jasmine.createSpy('evaluate') } },
      ],
    });
    stateobject = TestBed.inject(StateService);
    calculator = TestBed.inject(CalculatorFacade);
  });

  it('should be created', () => {
    expect(stateobject).toBeTruthy();
  });

  it('delegates calculation fields to CalculatorFacade', () => {
    stateobject.update({
      expression: '6*7',
      result: 42,
      idEnEdicion: 3,
    });

    expect(calculator.snapshot.lastExpression).toBe('6*7');
    expect(calculator.snapshot.result).toBe(42);
    expect(calculator.snapshot.editingMemoryId).toBe(3);
    expect(stateobject.value.expression).toBe('6*7');
    expect(stateobject.value.result).toBe(42);
    expect(stateobject.value.idEnEdicion).toBe(3);
  });

  it('does not overwrite the visible expression with the legacy expression', () => {
    calculator.setExpression('42');

    stateobject.update({ expression: '6*7', result: 42 });

    expect(calculator.snapshot.expression).toBe('42');
    expect(stateobject.value.expression).toBe('6*7');
  });

  it('keeps temporary compatibility fields isolated', () => {
    stateobject.update({ equalPressed: 1, valorOriginalMemoria: 12 });

    expect(stateobject.value.equalPressed).toBe(1);
    expect(stateobject.value.valorOriginalMemoria).toBe(12);
  });

  it('resets delegated and temporary state', () => {
    stateobject.update({
      expression: '2+2',
      result: 4,
      idEnEdicion: 8,
      equalPressed: 1,
    });

    stateobject.reset();

    expect(stateobject.value.expression).toBe('');
    expect(stateobject.value.result).toBe(0);
    expect(stateobject.value.idEnEdicion).toBeNull();
    expect(stateobject.value.equalPressed).toBe(0);
  });
});
