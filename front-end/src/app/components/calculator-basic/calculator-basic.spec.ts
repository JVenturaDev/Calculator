import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { CalculatorBasicComponent } from './calculator-basic';
import { CalculatorFacade } from '../../services/calculator-state/calculator-facade';
import {
  createInitialCalculatorState,
  type CalculatorState,
} from '../../services/calculator-state/calculator-state';
import { HistoryService } from '../../services/history-services/history';
import { CalculatorMemoryService } from '../../services/memory-services/calculator-memory';
import { MemoryToggleService } from '../../services/memory-services/memory-toggle';
import { ToggleService } from '../../services/toggle-services/toggle';

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
        {
          provide: ToggleService,
          useValue: { activeCalc$: new BehaviorSubject('basic') },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CalculatorBasicComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('delegates editing commands to CalculatorFacade', () => {
    component.handleButtonClick('7');
    component.handleButtonClick('DEL');
    component.handleButtonClick('+/-');
    component.handleButtonClick('AC');

    expect(mockCalculator.appendToken).toHaveBeenCalledOnceWith('7');
    expect(mockCalculator.backspace).toHaveBeenCalled();
    expect(mockCalculator.toggleSign).toHaveBeenCalled();
    expect(mockCalculator.clear).toHaveBeenCalled();
  });

  it('evaluates through CalculatorFacade', () => {
    calculatorState.expression = '2+2';
    component.handleButtonClick('=');

    expect(mockCalculator.evaluate).toHaveBeenCalledOnceWith();
    expect(mockHistory.agregarId).toHaveBeenCalledWith('2+2', 4);
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
