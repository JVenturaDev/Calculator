import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { DisplayComponent } from './display';
import { CalculatorFacade } from '../../services/calculator-state/calculator-facade';
import { CALCULATION_ENGINE } from '../../services/engine-services/calculation-engine.contract';
import {
  createInitialCalculatorState,
  type CalculatorState,
} from '../../services/calculator-state/calculator-state';
import { HistoryService } from '../../services/history-services/history';
import { InputService } from '../../services/input-services/input-services';

describe('DisplayComponent', () => {
  let component: DisplayComponent;
  let fixture: ComponentFixture<DisplayComponent>;
  let calculatorState$: BehaviorSubject<CalculatorState>;
  let calculatorState: CalculatorState;
  let calculator: jasmine.SpyObj<CalculatorFacade>;
  let history: { agregarId: jasmine.Spy };
  let inputService: { setCalculatorTarget: jasmine.Spy };

  beforeEach(async () => {
    calculatorState = createInitialCalculatorState();
    calculatorState$ = new BehaviorSubject(calculatorState);
    calculator = jasmine.createSpyObj<CalculatorFacade>(
      'CalculatorFacade',
      ['backspace', 'evaluate', 'setExpression'],
      {
        state$: calculatorState$.asObservable(),
        snapshot: calculatorState,
      }
    );
    calculator.evaluate.and.returnValue(1);
    history = {
      agregarId: jasmine.createSpy('agregarId'),
    };
    inputService = {
      setCalculatorTarget: jasmine.createSpy('setCalculatorTarget'),
    };

    await TestBed.configureTestingModule({
      imports: [DisplayComponent],
      providers: [
        { provide: CalculatorFacade, useValue: calculator },
        { provide: HistoryService, useValue: history },
        { provide: InputService, useValue: inputService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the expression from CalculatorFacade state', async () => {
    emitState({ expression: '12+3' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const input = getInput();
    expect(input.value).toBe('12+3');
  });

  it('keeps long expressions and results intact without truncating the value', async () => {
    const longExpression = '1234567890'.repeat(5);
    const longResult = '9'.repeat(40);

    emitState({
      expression: longExpression,
      result: longResult,
      phase: 'result',
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(getInput().value).toBe(longExpression);
    expect(fixture.nativeElement.querySelector('.result-value').textContent).toContain(
      longResult
    );
  });

  it('renders the original expression and result when phase is result', async () => {
    emitState({
      expression: '4',
      lastExpression: '2+2',
      result: 4,
      phase: 'result',
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(getInput().value).toBe('2+2');
    expect(
      fixture.nativeElement.querySelector('.result-value').textContent.trim()
    ).toContain('4');
  });

  it('renders the real calculator error', () => {
    emitState({
      status: 'error',
      error: { code: 'EVALUATION_ERROR', message: 'Expresión inválida' },
    });
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.display-error').textContent.trim()
    ).toBe('Expresión inválida');
    expect(
      fixture.nativeElement.querySelector('.status-badge').textContent.trim()
    ).toBe('Error');
  });

  it('updates CalculatorFacade when typing directly', async () => {
    const input = getInput();
    input.value = '12+3';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(calculator.setExpression).toHaveBeenCalledOnceWith('12+3');
  });

  it('delegates Backspace once and prevents native deletion', () => {
    calculatorState.expression = '123';
    const event = new KeyboardEvent('keydown', {
      key: 'Backspace',
      cancelable: true,
    });

    component.onKeyDown(event);

    expect(calculator.backspace).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBeTrue();
  });

  it('evaluates Enter with the facade angle mode and stores history', () => {
    calculatorState.expression = 'sin(90)';
    calculatorState.angleMode = 'DEG';
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      cancelable: true,
    });

    component.onKeyDown(event);

    expect(calculator.evaluate).toHaveBeenCalledTimes(1);
    expect(calculator.evaluate).toHaveBeenCalledWith({ angleMode: 'DEG' });
    expect(history.agregarId).toHaveBeenCalledWith('sin(90)', 1);
    expect(event.defaultPrevented).toBeTrue();
  });

  it('keeps the current typed x expression when Enter is pressed in graphic mode', async () => {
    emitState({
      mode: 'graphic',
      expression: 'x',
      phase: 'editing',
      status: 'idle',
      error: null,
    });
    fixture.detectChanges();
    await fixture.whenStable();

    const input = getInput();
    input.value = 'x';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      cancelable: true,
    });

    input.dispatchEvent(event);
    fixture.detectChanges();

    expect(calculator.evaluate).toHaveBeenCalledOnceWith({ angleMode: 'RAD' });
    expect(history.agregarId).toHaveBeenCalledWith('x', 1);
    expect(event.defaultPrevented).toBeTrue();
  });

  it('keeps calculatorInput and reports focus through InputService', () => {
    const input = fixture.nativeElement.querySelector(
      '#calculatorInput'
    ) as HTMLInputElement;

    expect(input).not.toBeNull();

    input.dispatchEvent(new Event('focus'));

    expect(inputService.setCalculatorTarget).toHaveBeenCalledTimes(1);
  });

  it('reveals the caret when the input is focused at the end of a long expression', fakeAsync(() => {
    const input = getInput();
    input.focus();
    input.value = '1234567890'.repeat(6);
    input.setSelectionRange(input.value.length, input.value.length);

    const rafSpy = spyOn(window, 'requestAnimationFrame').and.callFake(
      callback => {
        callback(0);
        return 1;
      }
    );

    component.onExpressionChange(input.value);
    tick();

    expect(rafSpy).toHaveBeenCalled();
    expect(input.scrollLeft).toBeGreaterThan(0);
  }));

  it('does not force the caret to the end when a middle selection is active', fakeAsync(() => {
    const input = getInput();
    input.focus();
    input.value = '1234567890'.repeat(6);
    input.setSelectionRange(8, 8);

    spyOn(window, 'requestAnimationFrame').and.callFake(callback => {
      callback(0);
      return 1;
    });

    component.onExpressionChange(input.value);
    tick();

    expect(input.scrollLeft).toBe(0);
  }));

  function emitState(partial: Partial<CalculatorState>): void {
    Object.assign(calculatorState, partial);
    calculatorState$.next({ ...calculatorState });
  }

  function getInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector(
      '#calculatorInput'
    ) as HTMLInputElement;
  }
});

describe('DisplayComponent with real CalculatorFacade', () => {
  let fixture: ComponentFixture<DisplayComponent>;
  let engine: jasmine.SpyObj<{ evaluate: (expression: string, options?: unknown) => number }>;
  let history: { agregarId: jasmine.Spy };
  let inputService: { setCalculatorTarget: jasmine.Spy };

  beforeEach(async () => {
    engine = jasmine.createSpyObj('CalculationEngine', ['evaluate']);
    engine.evaluate.and.returnValue(1);
    history = {
      agregarId: jasmine.createSpy('agregarId'),
    };
    inputService = {
      setCalculatorTarget: jasmine.createSpy('setCalculatorTarget'),
    };

    await TestBed.configureTestingModule({
      imports: [DisplayComponent],
      providers: [
        { provide: CALCULATION_ENGINE, useValue: engine },
        { provide: HistoryService, useValue: history },
        { provide: InputService, useValue: inputService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DisplayComponent);
    fixture.detectChanges();
  });

  it('evaluates a typed x expression through the real facade when Enter is pressed', async () => {
    const calculator = TestBed.inject(CalculatorFacade);
    const input = fixture.nativeElement.querySelector(
      '#calculatorInput'
    ) as HTMLInputElement;

    calculator.setMode('graphic');
    input.value = 'x';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', cancelable: true, bubbles: true })
    );
    fixture.detectChanges();

    expect(engine.evaluate).toHaveBeenCalledOnceWith(
      'x',
      jasmine.objectContaining({ variables: { x: 0 } })
    );
    expect(history.agregarId).toHaveBeenCalledOnceWith('x', 1);
  });
});
