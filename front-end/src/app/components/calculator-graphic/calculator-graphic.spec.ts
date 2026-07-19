import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { GraphicComponent } from './calculator-graphic';
import { CalculatorFacade } from '../../services/calculator-state/calculator-facade';
import {
  createInitialCalculatorState,
  type CalculatorSymbolicComputationResult,
  type CalculatorState,
} from '../../services/calculator-state/calculator-state';
import {
  CALCULATION_ENGINE,
  type CalculationEngine,
} from '../../services/engine-services/calculation-engine.contract';
import { HistoryService } from '../../services/history-services/history';
import { InputService, type InputTarget } from '../../services/input-services/input-services';
import { CalculatorMemoryService } from '../../services/memory-services/calculator-memory';
import { MemoryToggleService } from '../../services/memory-services/memory-toggle';
import { GraphicPlotService } from '../../services/plot-services/graphic-plot';
import { evaluator } from '../../services/polish-services/polish-evaluator';
import { parser } from '../../services/polish-services/polish-notation-parser-service';
import { PreprocessModule } from '../../services/polish-services/preprocess-module';
import { Tokenizer } from '../../services/polish-services/tokenizer';
import { ToggleService } from '../../services/toggle-services/toggle';
import { WorkspaceService } from '../../services/workspace-services/workspace-service';
import { ToastService } from '../../services/toast-services/toast';

describe('GraphicComponent', () => {
  let component: GraphicComponent;
  let fixture: ComponentFixture<GraphicComponent>;
  let calculatorState: CalculatorState;
  let calculator: jasmine.SpyObj<CalculatorFacade>;
  let toast: jasmine.SpyObj<ToastService>;
  let engine: jasmine.SpyObj<CalculationEngine>;
  let memory: jasmine.SpyObj<CalculatorMemoryService>;
  let history: { agregarId: jasmine.Spy; clearHistory: jasmine.Spy };
  let inputTarget: BehaviorSubject<InputTarget>;
  let inputService: { target$: BehaviorSubject<InputTarget>; target: InputTarget };
  let plot: { setExpression: jasmine.Spy };
  let tokenizer: { tokenize: jasmine.Spy };
  let polishParser: { toPostFix: jasmine.Spy };
  let polishEvaluator: { evaluatePostFix: jasmine.Spy };
  let preprocess: { preprocessExpression: jasmine.Spy };
  let workspace: {
    activeItemId$: BehaviorSubject<string | null>;
    workspaceItems$: BehaviorSubject<unknown[]>;
    activeItem: { currentExpression: string } | null;
    clearCurrentExpression: jasmine.Spy;
    updateCurrentExpression: jasmine.Spy;
    appendToCurrentExpression: jasmine.Spy;
    addCalculationToActiveItem: jasmine.Spy;
  };

  beforeEach(async () => {
    calculatorState = createInitialCalculatorState();
    calculator = jasmine.createSpyObj<CalculatorFacade>(
      'CalculatorFacade',
      [
        'appendToken',
        'clear',
        'backspace',
        'toggleSign',
        'setExpression',
        'evaluate',
        'restoreCalculation',
        'reportError',
      ],
      { snapshot: calculatorState }
    );
    engine = jasmine.createSpyObj<CalculationEngine>('CalculationEngine', [
      'evaluate',
    ]);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['error']);
    memory = jasmine.createSpyObj<CalculatorMemoryService>(
      'CalculatorMemoryService',
      [
        'saveCurrent',
        'clearAll',
        'addCurrentToLast',
        'subtractCurrentFromLast',
        'recallLast',
      ]
    );
    memory.saveCurrent.and.resolveTo(false);
    memory.clearAll.and.resolveTo();
    memory.addCurrentToLast.and.resolveTo(false);
    memory.subtractCurrentFromLast.and.resolveTo(false);
    memory.recallLast.and.resolveTo(false);
    history = {
      agregarId: jasmine.createSpy('agregarId'),
      clearHistory: jasmine.createSpy('clearHistory'),
    };
    inputTarget = new BehaviorSubject<InputTarget>({ type: 'calculator' });
    inputService = {
      target$: inputTarget,
      target: { type: 'calculator' },
    };
    plot = { setExpression: jasmine.createSpy('setExpression') };
    const realTokenizer = new Tokenizer();
    spyOn(realTokenizer, 'tokenize').and.callThrough();
    tokenizer = realTokenizer as unknown as { tokenize: jasmine.Spy };
    polishParser = {
      toPostFix: jasmine.createSpy('toPostFix').and.returnValue([]),
    };
    polishEvaluator = {
      evaluatePostFix: jasmine.createSpy('evaluatePostFix').and.returnValue({
        result: 4,
        steps: [],
      }),
    };
    preprocess = {
      preprocessExpression: jasmine.createSpy('preprocessExpression')
        .and.callFake((expression: string) => expression),
    };
    workspace = {
      activeItemId$: new BehaviorSubject<string | null>(null),
      workspaceItems$: new BehaviorSubject<unknown[]>([]),
      activeItem: null,
      clearCurrentExpression: jasmine.createSpy('clearCurrentExpression'),
      updateCurrentExpression: jasmine.createSpy('updateCurrentExpression'),
      appendToCurrentExpression: jasmine.createSpy('appendToCurrentExpression'),
      addCalculationToActiveItem: jasmine.createSpy('addCalculationToActiveItem'),
    };

    await TestBed.configureTestingModule({
      imports: [GraphicComponent],
      providers: [
        { provide: CalculatorFacade, useValue: calculator },
        { provide: CALCULATION_ENGINE, useValue: engine },
        { provide: CalculatorMemoryService, useValue: memory },
        { provide: HistoryService, useValue: history },
        { provide: MemoryToggleService, useValue: { toggle: jasmine.createSpy('toggle') } },
        {
          provide: ToggleService,
          useValue: {
            GHtoggle: jasmine.createSpy('GHtoggle'),
          },
        },
        { provide: InputService, useValue: inputService },
        { provide: GraphicPlotService, useValue: plot },
        { provide: Tokenizer, useValue: tokenizer },
        { provide: parser, useValue: polishParser },
        { provide: evaluator, useValue: polishEvaluator },
        { provide: PreprocessModule, useValue: preprocess },
        { provide: WorkspaceService, useValue: workspace },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GraphicComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    inputTarget.complete();
    workspace.activeItemId$.complete();
    workspace.workspaceItems$.complete();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps 83 explicit buttons when memory and inequalities are open', () => {
    component.showMemoryButtons = true;
    component.showInequalitySymbols = true;
    fixture.detectChanges();

    const buttons = Array.from(
      nativeElement().querySelectorAll<HTMLButtonElement>('button')
    );

    expect(buttons.length).toBe(83);
    expect(buttons.every(button => button.type === 'button')).toBeTrue();
  });

  it('keeps all 74 graphical tokens unchanged', () => {
    component.showInequalitySymbols = true;
    fixture.detectChanges();

    const buttons = tokenButtons();

    expect(buttons.length).toBe(74);
    expect(buttons.map(button => button.dataset['token'])).toEqual([
      '<', '≥', '⩵', '≠', '≤', '>',
      'acoth(', 'acsch(', 'asech(', 'asin(', 'acos(', 'atan(', 'asec(', 'acsc(',
      'acot(', 'asinh(', 'acosh(', 'atanh(', 'coth(', 'csch(', 'sech(', 'sinh(',
      'cosh(', 'tanh(', 'sec(', 'cot(', 'csc(', 'sin(', 'cos(', 'tan(',
      'e^(', 'xylog(', '2^x', 'yroot(', '∛', '³', 'ln(', 'log(',
      '10^', 'pow(', '²√', '²', '|x|(', '⌊x⌋(', '⌈x⌉(', ',',
      'π', '1/', '(', 'e', '|x|(', ')', 'AC', 'x', '⩵', 'DEL', 'y',
      '7', '8', '9', '4', '5', '6', '1', '2', '3', '-', '0', '.',
      '/', '*', '-', '+', '=',
    ]);
  });

  it('keeps mousedown prevention on all 74 token buttons', () => {
    component.showInequalitySymbols = true;
    fixture.detectChanges();

    const events = tokenButtons().map(button => {
      const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      button.dispatchEvent(event);
      return event;
    });

    expect(events.length).toBe(74);
    expect(events.every(event => event.defaultPrevented)).toBeTrue();
  });

  it('blurs calculatorInput on touch when the logical target is calculator', () => {
    const input = attachFocusedInput('calculatorInput');
    const event = new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerType: 'touch',
    });

    tokenButtons()[0].dispatchEvent(event);

    expect(document.activeElement).not.toBe(input);
    expect(event.defaultPrevented).toBeFalse();
    input.remove();
  });

  it('keeps the Workspace input focused for touch buttons', () => {
    inputService.target = { type: 'workspace-item', itemId: 'item-1' };
    const input = attachFocusedInput('workspace-input-item-1');
    const event = new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerType: 'touch',
    });

    tokenButtons()[0].dispatchEvent(event);

    expect(document.activeElement).toBe(input);
    expect(event.defaultPrevented).toBeFalse();
    input.remove();
  });

  it('keeps one childless inequality trigger and one inequality panel', () => {
    component.showInequalitySymbols = true;
    fixture.detectChanges();

    const triggers = nativeElement().querySelectorAll<HTMLButtonElement>('.btnInequality');
    const panels = nativeElement().querySelectorAll<HTMLElement>('.graphic-buttons');

    expect(triggers.length).toBe(1);
    expect(triggers.item(0).childElementCount).toBe(0);
    expect(panels.length).toBe(1);
  });

  it('opens and closes the inequality panel from its trigger', () => {
    const trigger = nativeElement().querySelector<HTMLButtonElement>('.btnInequality');

    expect(nativeElement().querySelector('.graphic-buttons')).toBeNull();
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');

    trigger?.click();
    fixture.detectChanges();

    expect(nativeElement().querySelector('.graphic-buttons')).not.toBeNull();
    expect(trigger?.getAttribute('aria-expanded')).toBe('true');

    trigger?.click();
    fixture.detectChanges();

    expect(nativeElement().querySelector('.graphic-buttons')).toBeNull();
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps the six Unicode inequality tokens', () => {
    component.showInequalitySymbols = true;
    fixture.detectChanges();

    const tokens = Array.from(
      nativeElement().querySelectorAll<HTMLButtonElement>('.graphic-buttons [data-token]')
    ).map(button => button.dataset['token']);

    expect(tokens).toEqual(['<', '≥', '⩵', '≠', '≤', '>']);
  });

  it('delegates calculator editing commands to CalculatorFacade', () => {
    calculatorState.expression = '12';

    component.handleButtonClick('3');
    component.handleButtonClick('DEL');
    component.handleButtonClick('+/-');
    component.handleButtonClick('AC');

    expect(calculator.appendToken).toHaveBeenCalledOnceWith('3');
    expect(calculator.backspace).toHaveBeenCalled();
    expect(calculator.toggleSign).toHaveBeenCalled();
    expect(calculator.clear).toHaveBeenCalled();
  });

  it('preserves the leading minus behavior for an empty expression', () => {
    calculatorState.expression = '';

    component.handleButtonClick('+/-');

    expect(calculator.setExpression).toHaveBeenCalledOnceWith('-');
  });

  it('keeps scalar evaluation on the low-level evaluator with steps', () => {
    calculatorState.expression = '2+2';

    component.handleButtonClick('=');

    expect(tokenizer.tokenize).toHaveBeenCalledWith('2+2');
    expect(polishParser.toPostFix).toHaveBeenCalled();
    expect(polishEvaluator.evaluatePostFix).toHaveBeenCalledWith([], {}, true);
    expect(engine.evaluate).not.toHaveBeenCalled();
    expect(calculator.restoreCalculation).toHaveBeenCalledOnceWith('2+2', 4);
    expect(history.agregarId).toHaveBeenCalledWith('2+2', 4);
  });

  it('preserves CAS metadata when a symbolic command is evaluated from Graphic', () => {
    const calculationResult: CalculatorSymbolicComputationResult = {
      kind: 'symbolic',
      source: 'simplify(2*x + 3*x)',
      operation: 'simplify',
      display: '5 * x',
      exact: true,
      expression: '5 * x',
      latex: '5x',
    };
    calculatorState.expression = 'simplify(2*x + 3*x)';
    calculatorState.calculationResult = calculationResult;
    calculator.evaluate.and.returnValue('5 * x' as never);

    component.handleButtonClick('=');

    expect(calculator.evaluate).toHaveBeenCalledOnceWith();
    expect(history.agregarId).toHaveBeenCalledWith(
      'simplify(2*x + 3*x)',
      '5 * x',
      calculationResult
    );
  });

  it('keeps graphical evaluation and sends the preprocessed expression to the plot', () => {
    calculatorState.expression = 'x^2';
    preprocess.preprocessExpression.and.returnValue('x^2');
    engine.evaluate.and.returnValue(0);

    component.handleButtonClick('=');

    expect(engine.evaluate).toHaveBeenCalledOnceWith('x^2', {
      variables: { x: 0 },
    });
    expect(calculator.restoreCalculation).toHaveBeenCalledOnceWith('x^2', '0');
    expect(plot.setExpression).toHaveBeenCalledOnceWith('x^2');
  });

  it('keeps graphical evaluation for y-only expressions', () => {
    calculatorState.expression = 'y';
    preprocess.preprocessExpression.and.returnValue('y');
    engine.evaluate.and.returnValue(0);

    component.handleButtonClick('=');

    expect(engine.evaluate).toHaveBeenCalledOnceWith('y', {
      variables: { y: 0 },
    });
    expect(calculator.restoreCalculation).toHaveBeenCalledOnceWith('y', '0');
    expect(plot.setExpression).toHaveBeenCalledOnceWith('y');
  });

  it('uses both x and y variables when they are actually present', () => {
    calculatorState.expression = 'x+y';
    preprocess.preprocessExpression.and.returnValue('x+y');
    engine.evaluate.and.returnValue(0);

    component.handleButtonClick('=');

    expect(engine.evaluate).toHaveBeenCalledOnceWith('x+y', {
      variables: { x: 0, y: 0 },
    });
    expect(calculator.restoreCalculation).toHaveBeenCalledOnceWith('x+y', '0');
    expect(plot.setExpression).toHaveBeenCalledOnceWith('x+y');
  });

  it('converts graphical evaluation errors to NaN and still plots', () => {
    calculatorState.expression = 'x/0';
    engine.evaluate.and.throwError('sampling error');

    component.handleButtonClick('=');

    expect(calculator.restoreCalculation).toHaveBeenCalledOnceWith('x/0', 'NaN');
    expect(plot.setExpression).toHaveBeenCalledOnceWith('x/0');
    expect(calculator.reportError).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('reports calculator evaluation errors through CalculatorFacade without alerting', () => {
    const error = new Error('invalid scalar expression');
    const alertSpy = spyOn(window, 'alert');
    calculatorState.expression = '2+';
    tokenizer.tokenize.and.throwError(error);

    expect(() => component.handleButtonClick('=')).not.toThrow();

    expect(calculator.reportError).toHaveBeenCalledOnceWith(
      error,
      'GRAPHIC_EVALUATION_ERROR'
    );
    expect(toast.error).not.toHaveBeenCalled();
    expect(history.agregarId).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('returns workspace commands before touching calculator state', () => {
    inputService.target = { type: 'workspace-item', itemId: 'item-1' };

    component.handleButtonClick('7');
    component.handleButtonClick('AC');

    expect(workspace.appendToCurrentExpression).toHaveBeenCalledOnceWith(
      'item-1',
      '7'
    );
    expect(workspace.clearCurrentExpression).toHaveBeenCalledOnceWith('item-1');
    expect(calculator.appendToken).not.toHaveBeenCalled();
    expect(calculator.clear).not.toHaveBeenCalled();
    expect(calculator.restoreCalculation).not.toHaveBeenCalled();
  });

  it('sends x, y and 2^x tokens exactly from the graphic keypad', () => {
    component.handleButtonClick('x');
    component.handleButtonClick('y');
    component.handleButtonClick('2^x');

    expect(calculator.appendToken).toHaveBeenCalledWith('x');
    expect(calculator.appendToken).toHaveBeenCalledWith('y');
    expect(calculator.appendToken).toHaveBeenCalledWith('2^x');
  });

  it('evaluates workspace x, y and x+y expressions with the needed variables', () => {
    inputService.target = { type: 'workspace-item', itemId: 'item-1' };
    workspace.activeItemId$.next('item-1');

    workspace.workspaceItems$.next([
      { id: 'item-1', currentExpression: 'x' },
    ]);
    component.handleButtonClick('=');
    expect(polishEvaluator.evaluatePostFix).toHaveBeenCalledWith([], { x: 0 }, true);
    expect(workspace.addCalculationToActiveItem).toHaveBeenCalledTimes(1);

    polishEvaluator.evaluatePostFix.calls.reset();
    workspace.addCalculationToActiveItem.calls.reset();
    workspace.workspaceItems$.next([
      { id: 'item-1', currentExpression: 'y' },
    ]);
    component.handleButtonClick('=');
    expect(polishEvaluator.evaluatePostFix).toHaveBeenCalledWith([], { y: 0 }, true);
    expect(workspace.addCalculationToActiveItem).toHaveBeenCalledTimes(1);

    polishEvaluator.evaluatePostFix.calls.reset();
    workspace.addCalculationToActiveItem.calls.reset();
    workspace.workspaceItems$.next([
      { id: 'item-1', currentExpression: 'x+y' },
    ]);
    component.handleButtonClick('=');
    expect(polishEvaluator.evaluatePostFix).toHaveBeenCalledWith([], { x: 0, y: 0 }, true);
    expect(workspace.addCalculationToActiveItem).toHaveBeenCalledTimes(1);
  });

  it('reports workspace evaluation errors through a finite toast only', () => {
    const alertSpy = spyOn(window, 'alert');
    inputService.target = { type: 'workspace-item', itemId: 'item-1' };
    workspace.activeItemId$.next('item-1');
    workspace.workspaceItems$.next([
      { id: 'item-1', currentExpression: '2+' },
    ]);
    tokenizer.tokenize.and.throwError('invalid workspace expression');

    expect(() => component.handleButtonClick('=')).not.toThrow();

    expect(toast.error).toHaveBeenCalledOnceWith(
      'No se pudo evaluar la expresión del Workspace: invalid workspace expression',
      8000
    );
    expect(calculator.reportError).not.toHaveBeenCalled();
    expect(workspace.addCalculationToActiveItem).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('keeps successful workspace evaluation on the low-level path', () => {
    inputService.target = { type: 'workspace-item', itemId: 'item-1' };
    workspace.activeItemId$.next('item-1');
    workspace.workspaceItems$.next([
      { id: 'item-1', currentExpression: '2+2' },
    ]);

    component.handleButtonClick('=');

    expect(tokenizer.tokenize).toHaveBeenCalledOnceWith('2+2');
    expect(polishParser.toPostFix).toHaveBeenCalled();
    expect(polishEvaluator.evaluatePostFix).toHaveBeenCalledWith([], {}, true);
    expect(workspace.addCalculationToActiveItem).toHaveBeenCalledTimes(1);
    expect(calculator.reportError).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('delegates memory commands to CalculatorMemoryService', async () => {
    await component.saveMemory();
    await component.clearMemory();
    await component.memoryPlus();
    await component.memoryMinus();
    await component.recallLast();

    expect(memory.saveCurrent).toHaveBeenCalled();
    expect(memory.clearAll).toHaveBeenCalled();
    expect(memory.addCurrentToLast).toHaveBeenCalled();
    expect(memory.subtractCurrentFromLast).toHaveBeenCalled();
    expect(memory.recallLast).toHaveBeenCalled();
  });

  it('keeps memory buttons connected to their public adapters', () => {
    component.showMemoryButtons = true;
    fixture.detectChanges();

    const clear = spyOn(component, 'clearMemory');
    const recall = spyOn(component, 'recallLast');
    const add = spyOn(component, 'memoryPlus');
    const subtract = spyOn(component, 'memoryMinus');
    const save = spyOn(component, 'saveMemory');

    const buttons = Array.from(
      nativeElement().querySelectorAll<HTMLButtonElement>('[data-memory-action]')
    );
    buttons.forEach(button => button.click());

    expect(clear).toHaveBeenCalledTimes(1);
    expect(recall).toHaveBeenCalledTimes(1);
    expect(add).toHaveBeenCalledTimes(1);
    expect(subtract).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('ignores the initial input target so mounting does not steal focus', () => {
    const focus = spyOn(component, 'focusCalculatorInput');

    expect(focus).not.toHaveBeenCalled();
  });

  it('focuses only on later calculator-target requests and unsubscribes on destroy', () => {
    const focus = spyOn(component, 'focusCalculatorInput');

    inputTarget.next({ type: 'workspace-item', itemId: 'item-1' });
    inputTarget.next({ type: 'calculator' });
    expect(focus).toHaveBeenCalledTimes(1);

    fixture.destroy();
    inputTarget.next({ type: 'calculator' });

    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('resets More and inequalities when the keyboard is mounted again', () => {
    component.showMemoryButtons = true;
    component.showInequalitySymbols = true;
    fixture.detectChanges();
    fixture.destroy();

    fixture = TestBed.createComponent(GraphicComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.showMemoryButtons).toBeFalse();
    expect(component.showInequalitySymbols).toBeFalse();
    expect(nativeElement().querySelector('.memory-toolbar')).toBeNull();
    expect(nativeElement().querySelector('.graphic-buttons')).toBeNull();
  });

  function tokenButtons(): HTMLButtonElement[] {
    return Array.from(
      nativeElement().querySelectorAll<HTMLButtonElement>('[data-token]')
    );
  }

  function nativeElement(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function attachFocusedInput(id: string): HTMLInputElement {
    const input = document.createElement('input');
    input.id = id;
    document.body.appendChild(input);
    input.focus();
    expect(document.activeElement).toBe(input);
    return input;
  }
});
