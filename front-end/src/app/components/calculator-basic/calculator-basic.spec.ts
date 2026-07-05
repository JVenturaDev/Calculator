import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalculatorBasicComponent } from './calculator-basic';
import { CalculatorFacade } from '../../services/calculator-state/calculator-facade';
import {
  createInitialCalculatorState,
  type CalculatorState,
} from '../../services/calculator-state/calculator-state';
import { HistoryService } from '../../services/history-services/history';
import { CalculatorMemoryService } from '../../services/memory-services/calculator-memory';
import { MemoryToggleService } from '../../services/memory-services/memory-toggle';

describe('CalculatorBasicComponent', () => {
  let component: CalculatorBasicComponent;
  let fixture: ComponentFixture<CalculatorBasicComponent>;
  let calculatorState: CalculatorState;
  let mockCalculator: jasmine.SpyObj<CalculatorFacade>;
  let mockMemory: jasmine.SpyObj<CalculatorMemoryService>;
  let mockHistory: { agregarId: jasmine.Spy; clearHistory: jasmine.Spy };

  beforeEach(async () => {
    calculatorState = createInitialCalculatorState();
    mockCalculator = jasmine.createSpyObj<CalculatorFacade>(
      'CalculatorFacade',
      [
        'appendToken',
        'clear',
        'backspace',
        'toggleSign',
        'evaluate',
        'setExpression',
        'updateCalculationContext',
      ],
      { snapshot: calculatorState }
    );
    mockCalculator.evaluate.and.returnValue(4);
    mockMemory = jasmine.createSpyObj<CalculatorMemoryService>(
      'CalculatorMemoryService',
      [
        'saveCurrent',
        'clearAll',
        'addCurrentToLast',
        'subtractCurrentFromLast',
        'recallLast',
      ]
    );
    mockMemory.saveCurrent.and.resolveTo(false);
    mockMemory.clearAll.and.resolveTo();
    mockMemory.addCurrentToLast.and.resolveTo(false);
    mockMemory.subtractCurrentFromLast.and.resolveTo(false);
    mockMemory.recallLast.and.resolveTo(false);
    mockHistory = {
      agregarId: jasmine.createSpy('agregarId'),
      clearHistory: jasmine.createSpy('clearHistory'),
    };

    await TestBed.configureTestingModule({
      imports: [CalculatorBasicComponent],
      providers: [
        { provide: CalculatorFacade, useValue: mockCalculator },
        { provide: HistoryService, useValue: mockHistory },
        { provide: CalculatorMemoryService, useValue: mockMemory },
        { provide: MemoryToggleService, useValue: { toggle: jasmine.createSpy('toggle') } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CalculatorBasicComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps every keypad token unchanged', () => {
    const handler = spyOn(component, 'handleButtonClick');
    const buttons = Array.from(
      nativeElement().querySelectorAll<HTMLButtonElement>('[data-token]')
    );

    buttons.forEach(button => button.click());

    expect(handler.calls.allArgs().map(([token]) => token)).toEqual([
      'AC', 'C', 'DEL', '%', '1/', '²', '²√', ',',
      '7', '8', '9', '4', '5', '6', '1', '2', '3', '+/-', '0', '.',
      '/', '*', '-', '+', '=',
    ]);
  });

  it('renders conventional operator labels without changing their tokens', () => {
    const operators = Array.from(
      nativeElement().querySelectorAll<HTMLButtonElement>('.operator-key')
    );

    expect(operators.map(button => button.textContent?.trim())).toEqual([
      '÷', '×', '−', '+', '=',
    ]);
    expect(operators.map(button => button.dataset['token'])).toEqual([
      '/', '*', '-', '+', '=',
    ]);
  });

  it('delegates AC, C, DEL, sign and digits from the DOM', () => {
    clickToken('7');
    clickToken('DEL');
    clickToken('+/-');
    clickToken('AC');
    clickToken('C');

    expect(mockCalculator.appendToken).toHaveBeenCalledOnceWith('7');
    expect(mockCalculator.backspace).toHaveBeenCalledTimes(1);
    expect(mockCalculator.toggleSign).toHaveBeenCalledTimes(1);
    expect(mockCalculator.clear).toHaveBeenCalledTimes(2);
  });

  it('evaluates through CalculatorFacade', () => {
    calculatorState.expression = '2+2';
    clickToken('=');

    expect(mockCalculator.evaluate).toHaveBeenCalledOnceWith();
    expect(mockHistory.agregarId).toHaveBeenCalledWith('2+2', 4);
  });

  it('captures evaluation errors without alerting or duplicating a message', () => {
    const alertSpy = spyOn(window, 'alert');
    const facadeError = {
      code: 'EVALUATION_ERROR',
      message: 'Invalid expression',
    };
    calculatorState.error = facadeError;
    mockCalculator.evaluate.and.throwError('Invalid expression');

    expect(() => component.handleButtonClick('=')).not.toThrow();

    expect(mockCalculator.evaluate).toHaveBeenCalledOnceWith();
    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockHistory.agregarId).not.toHaveBeenCalled();
    expect(calculatorState.error).toBe(facadeError);
    expect('error' in component).toBeFalse();
  });

  it('keeps reciprocal behavior through CalculatorFacade state', () => {
    calculatorState.expression = '4';

    component.handleButtonClick('1/');

    expect(mockCalculator.setExpression).toHaveBeenCalledOnceWith('0.25');
    expect(mockCalculator.updateCalculationContext).toHaveBeenCalledOnceWith({
      lastExpression: '1/(4)',
      result: 0.25,
    });
  });

  it('keeps memory buttons connected to their public adapters', () => {
    const panel = spyOn(component, 'toggleMemoryPanel');
    const recall = spyOn(component, 'recallLast');
    const clear = spyOn(component, 'clearMemory');
    const add = spyOn(component, 'memoryPlus');
    const subtract = spyOn(component, 'memoryMinus');
    const save = spyOn(component, 'saveMemory');

    const buttons = Array.from(
      nativeElement().querySelectorAll<HTMLButtonElement>('[data-memory-action]')
    );
    buttons.forEach(button => button.click());

    expect(panel).toHaveBeenCalledTimes(1);
    expect(recall).toHaveBeenCalledTimes(1);
    expect(clear).toHaveBeenCalledTimes(1);
    expect(add).toHaveBeenCalledTimes(1);
    expect(subtract).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('delegates memory commands to CalculatorMemoryService', async () => {
    await component.saveMemory();
    await component.clearMemory();
    await component.memoryPlus();
    await component.memoryMinus();
    await component.recallLast();

    expect(mockMemory.saveCurrent).toHaveBeenCalled();
    expect(mockMemory.clearAll).toHaveBeenCalled();
    expect(mockMemory.addCurrentToLast).toHaveBeenCalled();
    expect(mockMemory.subtractCurrentFromLast).toHaveBeenCalled();
    expect(mockMemory.recallLast).toHaveBeenCalled();
  });

  it('uses button elements with an explicit type', () => {
    const buttons = Array.from(
      nativeElement().querySelectorAll<HTMLButtonElement>('button')
    );

    expect(buttons.length).toBe(31);
    expect(buttons.every(button => button.type === 'button')).toBeTrue();
  });

  function clickToken(token: string): void {
    const button = Array.from(
      nativeElement().querySelectorAll<HTMLButtonElement>('[data-token]')
    ).find(candidate => candidate.dataset['token'] === token);

    expect(button).withContext(`Missing button for token ${token}`).toBeDefined();
    button?.click();
  }

  function nativeElement(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }
});
