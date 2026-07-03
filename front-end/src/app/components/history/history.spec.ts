import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { CalculatorFacade } from '../../services/calculator-state/calculator-facade';
import {
  HistoryItem,
  HistoryService,
} from '../../services/history-services/history';
import { HistoryComponent } from './history';

describe('HistoryComponent', () => {
  let component: HistoryComponent;
  let fixture: ComponentFixture<HistoryComponent>;
  let calculator: jasmine.SpyObj<CalculatorFacade>;
  let historyService: {
    changed$: BehaviorSubject<void>;
    getHistory: jasmine.Spy;
    removeFromLocalStorage: jasmine.Spy;
    clearHistory: jasmine.Spy;
  };

  beforeEach(async () => {
    calculator = jasmine.createSpyObj<CalculatorFacade>(
      'CalculatorFacade',
      ['restoreCalculation']
    );
    historyService = {
      changed$: new BehaviorSubject<void>(undefined),
      getHistory: jasmine.createSpy('getHistory').and.returnValue([]),
      removeFromLocalStorage: jasmine.createSpy('removeFromLocalStorage'),
      clearHistory: jasmine.createSpy('clearHistory'),
    };

    await TestBed.configureTestingModule({
      imports: [HistoryComponent],
      providers: [
        { provide: CalculatorFacade, useValue: calculator },
        { provide: HistoryService, useValue: historyService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('restores a history item through CalculatorFacade', () => {
    const item: HistoryItem = {
      idi: 1,
      expression: '6*7',
      result: 42,
    };

    component.restoreHistory(item);

    expect(calculator.restoreCalculation).toHaveBeenCalledOnceWith('6*7', 42);
  });

  it('delegates delete and clear operations to the repository', () => {
    component.deleteItem(3);
    component.clearAll();

    expect(historyService.removeFromLocalStorage).toHaveBeenCalledOnceWith(3);
    expect(historyService.clearHistory).toHaveBeenCalled();
  });
});
