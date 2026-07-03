import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { DisplayComponent } from './display';
import { CalculatorFacade } from '../../services/calculator-state/calculator-facade';
import {
  createInitialCalculatorState,
  type CalculatorState,
} from '../../services/calculator-state/calculator-state';
import { HistoryService } from '../../services/history-services/history';
import { InputService } from '../../services/input-services/input-services';

describe('DisplayComponent', () => {
  let component: DisplayComponent;
  let fixture: ComponentFixture<DisplayComponent>;
  let displayValue: BehaviorSubject<string>;
  let calculatorState: CalculatorState;
  let calculator: jasmine.SpyObj<CalculatorFacade>;
  let history: { agregarId: jasmine.Spy };

  beforeEach(async () => {
    displayValue = new BehaviorSubject('');
    calculatorState = createInitialCalculatorState();
    calculator = jasmine.createSpyObj<CalculatorFacade>(
      'CalculatorFacade',
      ['backspace', 'evaluate'],
      {
        displayValue$: displayValue.asObservable(),
        snapshot: calculatorState,
      }
    );
    calculator.evaluate.and.returnValue(1);
    history = {
      agregarId: jasmine.createSpy('agregarId'),
    };

    await TestBed.configureTestingModule({
      imports: [DisplayComponent],
      providers: [
        { provide: CalculatorFacade, useValue: calculator },
        { provide: HistoryService, useValue: history },
        {
          provide: InputService,
          useValue: { setCalculatorTarget: jasmine.createSpy('setCalculatorTarget') },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders displayValue$ from CalculatorFacade', () => {
    displayValue.next('12+3');
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('12+3');
  });

  it('delegates Backspace to CalculatorFacade', () => {
    component.onKeyDown(new KeyboardEvent('keydown', { key: 'Backspace' }));

    expect(calculator.backspace).toHaveBeenCalled();
  });

  it('evaluates Enter with the facade angle mode and stores history', () => {
    calculatorState.expression = 'sin(90)';
    calculatorState.angleMode = 'DEG';
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      cancelable: true,
    });

    component.onKeyDown(event);

    expect(calculator.evaluate).toHaveBeenCalledOnceWith({ angleMode: 'DEG' });
    expect(history.agregarId).toHaveBeenCalledWith('sin(90)', 1);
    expect(event.defaultPrevented).toBeTrue();
  });
});
