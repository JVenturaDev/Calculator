import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { CalculatorScientificComponent } from './calculator-scientific';
import { CalculatorFacade } from '../../services/calculator-state/calculator-facade';
import {
  createInitialCalculatorState,
  type CalculatorState,
} from '../../services/calculator-state/calculator-state';
import { HistoryService } from '../../services/history-services/history';
import { CalculatorMemoryService } from '../../services/memory-services/calculator-memory';
import { MemoryToggleService } from '../../services/memory-services/memory-toggle';
import { ToggleService } from '../../services/toggle-services/toggle';

describe('CalculatorScientificComponent', () => {
  let component: CalculatorScientificComponent;
  let fixture: ComponentFixture<CalculatorScientificComponent>;
  let calculatorState: CalculatorState;
  let mockCalculator: jasmine.SpyObj<CalculatorFacade>;
  let mockMemory: jasmine.SpyObj<CalculatorMemoryService>;
  let mockHistory: { agregarId: jasmine.Spy; clearHistory: jasmine.Spy };
  let mockToggle: {
    activeCalc$: BehaviorSubject<string>;
  };

  beforeEach(async () => {
    calculatorState = createInitialCalculatorState();
    mockCalculator = jasmine.createSpyObj<CalculatorFacade>(
      'CalculatorFacade',
      [
        'appendToken',
        'clear',
        'backspace',
        'toggleSign',
        'setExpression',
        'cycleAngleMode',
        'evaluate',
      ],
      { snapshot: calculatorState }
    );
    mockCalculator.cycleAngleMode.and.callFake(() => {
      calculatorState.angleMode =
        calculatorState.angleMode === 'RAD'
          ? 'GRAD'
          : calculatorState.angleMode === 'GRAD'
            ? 'DEG'
            : 'RAD';
    });
    mockCalculator.evaluate.and.returnValue(3);

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
    mockToggle = {
      activeCalc$: new BehaviorSubject('scientific'),
    };

    await TestBed.configureTestingModule({
      imports: [CalculatorScientificComponent],
      providers: [
        { provide: CalculatorFacade, useValue: mockCalculator },
        { provide: HistoryService, useValue: mockHistory },
        { provide: CalculatorMemoryService, useValue: mockMemory },
        { provide: MemoryToggleService, useValue: { toggle: jasmine.createSpy('toggle') } },
        { provide: ToggleService, useValue: mockToggle },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CalculatorScientificComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('delegates editing commands to CalculatorFacade', () => {
    calculatorState.expression = 'sin(';

    component.handleButtonClick('9');
    component.handleButtonClick('DEL');
    component.handleButtonClick('+/-');
    component.handleButtonClick('AC');

    expect(mockCalculator.appendToken).toHaveBeenCalledOnceWith('9');
    expect(mockCalculator.backspace).toHaveBeenCalled();
    expect(mockCalculator.toggleSign).toHaveBeenCalled();
    expect(mockCalculator.clear).toHaveBeenCalled();
  });

  it('preserves the leading minus behavior for an empty expression', () => {
    calculatorState.expression = '';

    component.handleButtonClick('+/-');

    expect(mockCalculator.setExpression).toHaveBeenCalledOnceWith('-');
    expect(mockCalculator.toggleSign).not.toHaveBeenCalled();
  });

  it('evaluates through CalculatorFacade with the selected angle mode', () => {
    calculatorState.expression = 'sqrt(9)';

    component.handleButtonClick('=');

    expect(mockCalculator.evaluate).toHaveBeenCalledOnceWith({ angleMode: 'RAD' });
    expect(mockHistory.agregarId).toHaveBeenCalledWith('sqrt(9)', 3);
  });

  it('cycles RAD, GRAD and DEG through CalculatorFacade', () => {
    component.cycleAngleMode();
    expect(calculatorState.angleMode).toBe('GRAD');

    component.cycleAngleMode();
    expect(calculatorState.angleMode).toBe('DEG');

    component.cycleAngleMode();
    expect(calculatorState.angleMode).toBe('RAD');
    expect(mockCalculator.cycleAngleMode).toHaveBeenCalledTimes(3);
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
});
