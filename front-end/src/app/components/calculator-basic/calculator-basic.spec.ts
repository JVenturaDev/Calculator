import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { CalculatorBasicComponent } from './calculator-basic';
import { CALCULATION_ENGINE } from '../../services/engine-services/calculation-engine.contract';
import { DisplayStateService } from '../../services/display-services/display';
import { StateService } from '../../services/core-services/state-object';
import { HistoryService } from '../../services/history-services/history';
import { MemoryService } from '../../services/memory-services/memory';
import { MemoryToggleService } from '../../services/memory-services/memory-toggle';
import { ToggleService } from '../../services/toggle-services/toggle';

describe('CalculatorBasicComponent', () => {
  let component: CalculatorBasicComponent;
  let fixture: ComponentFixture<CalculatorBasicComponent>;
  let displayValue: BehaviorSubject<string>;
  let mockDisplay: jasmine.SpyObj<DisplayStateService> & { currentValue: string };
  let mockEngine: { evaluate: jasmine.Spy };
  let mockState: { value: Record<string, unknown>; update: jasmine.Spy };
  let mockHistory: { agregarId: jasmine.Spy; clearHistory: jasmine.Spy };

  beforeEach(async () => {
    displayValue = new BehaviorSubject('');
    mockDisplay = jasmine.createSpyObj<DisplayStateService>(
      'DisplayStateService',
      ['setValue', 'appendValue', 'clear', 'backspace'],
      { value$: displayValue.asObservable(), currentValue: '' }
    ) as jasmine.SpyObj<DisplayStateService> & { currentValue: string };
    mockDisplay.setValue.and.callFake(value => {
      mockDisplay.currentValue = value;
      displayValue.next(value);
    });

    mockEngine = {
      evaluate: jasmine.createSpy('evaluate').and.returnValue(4),
    };
    mockState = {
      value: { result: 0, expression: '', idEnEdicion: null },
      update: jasmine.createSpy('update'),
    };
    mockHistory = {
      agregarId: jasmine.createSpy('agregarId'),
      clearHistory: jasmine.createSpy('clearHistory'),
    };

    await TestBed.configureTestingModule({
      imports: [CalculatorBasicComponent],
      providers: [
        { provide: CALCULATION_ENGINE, useValue: mockEngine },
        { provide: DisplayStateService, useValue: mockDisplay },
        { provide: StateService, useValue: mockState },
        { provide: HistoryService, useValue: mockHistory },
        { provide: MemoryService, useValue: {} },
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

  it('evaluates through the shared calculation engine', () => {
    mockDisplay.currentValue = '2+2';

    component.handleButtonClick('=');

    expect(mockEngine.evaluate).toHaveBeenCalledOnceWith('2+2');
    expect(mockDisplay.setValue).toHaveBeenCalledWith('4');
    expect(mockHistory.agregarId).toHaveBeenCalledWith('2+2', 4);
  });
});
