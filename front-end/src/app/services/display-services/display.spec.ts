import { TestBed } from '@angular/core/testing';
import { CalculatorFacade } from '../calculator-state/calculator-facade';
import { CALCULATION_ENGINE } from '../engine-services/calculation-engine.contract';
import { DisplayStateService } from './display';

describe('DisplayStateService', () => {
  let service: DisplayStateService;
  let facade: CalculatorFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: CALCULATION_ENGINE, useValue: { evaluate: jasmine.createSpy('evaluate') } },
      ],
    });
    service = TestBed.inject(DisplayStateService);
    facade = TestBed.inject(CalculatorFacade);
  });

  it('delegates its current value and observable to CalculatorFacade', () => {
    let emitted = '';
    const subscription = service.value$.subscribe(value => emitted = value);

    service.setValue('12');
    service.appendValue('+3');

    expect(service.currentValue).toBe('12+3');
    expect(facade.snapshot.expression).toBe('12+3');
    expect(emitted).toBe('12+3');
    subscription.unsubscribe();
  });

  it('delegates backspace and clear without keeping separate state', () => {
    service.setValue('123');
    service.backspace();
    expect(service.currentValue).toBe('12');

    service.clear();
    expect(service.currentValue).toBe('');
    expect(facade.snapshot.expression).toBe('');
  });
});
