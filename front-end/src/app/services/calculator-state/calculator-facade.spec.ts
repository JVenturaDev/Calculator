import { TestBed } from '@angular/core/testing';
import Complex from 'complex.js';
import { CALCULATION_ENGINE } from '../engine-services/calculation-engine.contract';
import { CalculatorFacade } from './calculator-facade';

describe('CalculatorFacade', () => {
  let facade: CalculatorFacade;
  let engine: { evaluate: jasmine.Spy };

  beforeEach(() => {
    engine = {
      evaluate: jasmine.createSpy('evaluate'),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: CALCULATION_ENGINE, useValue: engine }],
    });
    facade = TestBed.inject(CalculatorFacade);
  });

  it('appends tokens and exposes the display value', () => {
    let displayValue = '';
    const subscription = facade.displayValue$.subscribe(value => displayValue = value);

    facade.appendToken('2');
    facade.appendToken('+3');

    expect(facade.snapshot.expression).toBe('2+3');
    expect(facade.snapshot.lastExpression).toBe('2+3');
    expect(displayValue).toBe('2+3');
    subscription.unsubscribe();
  });

  it('sets, clears and removes the last expression character', () => {
    facade.setExpression('123');
    facade.backspace();
    expect(facade.snapshot.expression).toBe('12');
    expect(facade.snapshot.lastExpression).toBe('12');

    facade.clear();
    expect(facade.snapshot.expression).toBe('');
    expect(facade.snapshot.result).toBeNull();
  });

  it('toggles the leading sign without changing an empty expression', () => {
    facade.toggleSign();
    expect(facade.snapshot.expression).toBe('');

    facade.setExpression('5');
    facade.toggleSign();
    expect(facade.snapshot.expression).toBe('-5');
    expect(facade.snapshot.lastExpression).toBe('-5');

    facade.toggleSign();
    expect(facade.snapshot.expression).toBe('5');
  });

  it('updates calculator mode', () => {
    let mode = facade.snapshot.mode;
    const subscription = facade.mode$.subscribe(value => mode = value);

    facade.setMode('scientific');

    expect(facade.snapshot.mode).toBe('scientific');
    expect(mode).toBe('scientific');
    subscription.unsubscribe();
  });

  it('sets and cycles angle mode', () => {
    let angleMode = facade.snapshot.angleMode;
    const subscription = facade.angleMode$.subscribe(value => angleMode = value);

    facade.cycleAngleMode();
    expect(facade.snapshot.angleMode).toBe('GRAD');
    facade.cycleAngleMode();
    expect(facade.snapshot.angleMode).toBe('DEG');
    facade.cycleAngleMode();

    expect(facade.snapshot.angleMode).toBe('RAD');
    expect(angleMode).toBe('RAD');

    facade.setAngleMode('DEG');
    expect(angleMode).toBe('DEG');
    subscription.unsubscribe();
  });

  it('updates the active input target', () => {
    let inputTarget = facade.snapshot.inputTarget;
    const subscription = facade.inputTarget$.subscribe(value => inputTarget = value);

    facade.setInputTarget({ type: 'workspace-item', itemId: 'item-1' });

    expect(facade.snapshot.inputTarget).toEqual({
      type: 'workspace-item',
      itemId: 'item-1',
    });
    expect(inputTarget).toEqual({
      type: 'workspace-item',
      itemId: 'item-1',
    });
    subscription.unsubscribe();
  });

  it('starts without an error and can clear it safely', () => {
    facade.clearError();
    expect(facade.snapshot.error).toBeNull();
    expect(facade.snapshot.status).toBe('idle');
  });

  it('evaluates the current expression and stores its display result', () => {
    engine.evaluate.and.returnValue(4);
    facade.setExpression('2+2');

    const result = facade.evaluate();

    expect(engine.evaluate).toHaveBeenCalledOnceWith('2+2', undefined);
    expect(result).toBe(4);
    expect(facade.snapshot.expression).toBe('4');
    expect(facade.snapshot.lastExpression).toBe('2+2');
    expect(facade.snapshot.result).toBe(4);
    expect(facade.snapshot.phase).toBe('result');
  });

  it('normalizes a complex result for display', () => {
    engine.evaluate.and.returnValue(new Complex(2, 3));
    facade.setExpression('sqrt(-5)');

    const result = facade.evaluate();

    expect(result).toBe('2 + 3i');
    expect(facade.snapshot.expression).toBe('2 + 3i');
    expect(facade.snapshot.result).toBe('2 + 3i');
  });

  it('restores a completed calculation', () => {
    facade.restoreCalculation('6*7', 42);

    expect(facade.snapshot.expression).toBe('42');
    expect(facade.snapshot.lastExpression).toBe('6*7');
    expect(facade.snapshot.result).toBe(42);
    expect(facade.snapshot.phase).toBe('result');
  });

  it('begins and finishes memory editing', () => {
    let editingMemoryId = facade.snapshot.editingMemoryId;
    const subscription = facade.editingMemoryId$.subscribe(
      value => editingMemoryId = value
    );

    facade.beginMemoryEdit(7, '3*3', 9);

    expect(facade.snapshot.expression).toBe('3*3');
    expect(facade.snapshot.lastExpression).toBe('3*3');
    expect(facade.snapshot.result).toBe(9);
    expect(facade.snapshot.phase).toBe('editing');
    expect(editingMemoryId).toBe(7);

    facade.finishMemoryEdit();
    expect(editingMemoryId).toBeNull();
    subscription.unsubscribe();
  });

  it('restores a memory record and cancels an active edit', () => {
    facade.beginMemoryEdit(4, '8/2', 4);
    facade.cancelMemoryEdit();
    expect(facade.snapshot.editingMemoryId).toBeNull();

    facade.beginMemoryEdit(5, '6*7', 42);
    facade.restoreMemoryRecord('2+3', 5);

    expect(facade.snapshot.expression).toBe('5');
    expect(facade.snapshot.lastExpression).toBe('2+3');
    expect(facade.snapshot.result).toBe(5);
    expect(facade.snapshot.phase).toBe('result');
    expect(facade.snapshot.editingMemoryId).toBeNull();
  });
});
