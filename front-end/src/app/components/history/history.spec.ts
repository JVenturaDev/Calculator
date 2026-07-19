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

  afterEach(() => historyService.changed$.complete());

  function renderHistory(items: HistoryItem[]): void {
    historyService.getHistory.and.returnValue(items);
    component.loadHistory();
    fixture.detectChanges();
  }

  it('should create and show an accessible empty state', () => {
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.history-empty')).toBeTruthy();
    expect(
      (fixture.nativeElement.querySelector('.clear-history') as HTMLButtonElement).disabled
    ).toBeTrue();
  });

  it('renders expression and result separately without duplicated ids or nested controls', () => {
    const item: HistoryItem = {
      idi: 1,
      expression: '6*7',
      result: 42,
    };
    renderHistory([item]);

    expect(fixture.nativeElement.querySelector('.history-expression').textContent).toContain(
      '6*7'
    );
    expect(fixture.nativeElement.querySelector('.history-result').textContent).toContain('42');
    expect(fixture.nativeElement.querySelectorAll('#history-list').length).toBe(1);
    expect(fixture.nativeElement.querySelector('button a, a button')).toBeNull();
  });

  it('restores a history item through CalculatorFacade', () => {
    const item: HistoryItem = {
      idi: 1,
      expression: '6*7',
      result: 42,
    };
    renderHistory([item]);

    (fixture.nativeElement.querySelector('.restore-history') as HTMLButtonElement).click();

    expect(calculator.restoreCalculation).toHaveBeenCalledOnceWith('6*7', 42);
  });

  it('restores CAS metadata when it exists in the history item', () => {
    const calculationResult: NonNullable<HistoryItem['calculationResult']> = {
      kind: 'equation-solutions',
      operation: 'solve',
      source: 'solve(x^2 - 1 = 0, x)',
      display: 'x = -1\nx = 1',
      exact: true,
      expression: 'solve(x^2 - 1 = 0, x)',
      latex: ['-1', '1'],
      variable: 'x',
      solutionKind: 'finite',
      solutions: ['-1', '1'],
    };
    const item: HistoryItem = {
      idi: 2,
      expression: 'solve(x^2 - 1 = 0, x)',
      result: 'x = -1\nx = 1',
      calculationResult,
    };
    renderHistory([item]);

    (fixture.nativeElement.querySelector('.restore-history') as HTMLButtonElement).click();

    expect(calculator.restoreCalculation).toHaveBeenCalledOnceWith(
      'solve(x^2 - 1 = 0, x)',
      'x = -1\nx = 1',
      calculationResult
    );
  });

  it('delegates delete and clear bindings to the repository', () => {
    renderHistory([
      {
        idi: 3,
        expression: '9/3',
        result: 3,
      },
    ]);

    (fixture.nativeElement.querySelector('.delete-history') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('.clear-history') as HTMLButtonElement).click();

    expect(historyService.removeFromLocalStorage).toHaveBeenCalledOnceWith(3);
    expect(historyService.clearHistory).toHaveBeenCalled();
  });

  it('unsubscribes from repository changes on destroy', () => {
    const callsBeforeDestroy = historyService.getHistory.calls.count();
    fixture.destroy();

    historyService.changed$.next();

    expect(historyService.getHistory).toHaveBeenCalledTimes(callsBeforeDestroy);
  });
});
