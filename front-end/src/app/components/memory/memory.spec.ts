import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { MemoryComponent } from './memory';
import { AppInitService } from '../../services/core-services/init-app';
import { CalculatorMemoryService } from '../../services/memory-services/calculator-memory';
import { MemoryService } from '../../services/memory-services/memory';
import { MemoryToggleService } from '../../services/memory-services/memory-toggle';

describe('MemoryComponent', () => {
  let component: MemoryComponent;
  let fixture: ComponentFixture<MemoryComponent>;
  let changed: BehaviorSubject<void>;
  let visible: BehaviorSubject<boolean>;
  let repository: {
    changed$: BehaviorSubject<void>;
    getAll: jasmine.Spy;
  };
  let calculatorMemory: jasmine.SpyObj<CalculatorMemoryService>;

  beforeEach(async () => {
    changed = new BehaviorSubject<void>(undefined);
    visible = new BehaviorSubject(true);
    repository = {
      changed$: changed,
      getAll: jasmine.createSpy('getAll').and.resolveTo([
        { id: 1, ecuacion: '2+2', resultado: 4 },
      ]),
    };
    calculatorMemory = jasmine.createSpyObj<CalculatorMemoryService>(
      'CalculatorMemoryService',
      [
        'saveCurrent',
        'recallLast',
        'addCurrentToLast',
        'subtractCurrentFromLast',
        'beginEdit',
        'addCurrentToRecord',
        'subtractCurrentFromRecord',
        'delete',
        'clearAll',
      ]
    );
    calculatorMemory.saveCurrent.and.resolveTo(false);
    calculatorMemory.recallLast.and.resolveTo(false);
    calculatorMemory.addCurrentToLast.and.resolveTo(false);
    calculatorMemory.subtractCurrentFromLast.and.resolveTo(false);
    calculatorMemory.beginEdit.and.resolveTo(false);
    calculatorMemory.addCurrentToRecord.and.resolveTo(false);
    calculatorMemory.subtractCurrentFromRecord.and.resolveTo(false);
    calculatorMemory.delete.and.resolveTo();
    calculatorMemory.clearAll.and.resolveTo();

    await TestBed.configureTestingModule({
      imports: [MemoryComponent],
      providers: [
        {
          provide: AppInitService,
          useValue: { initApp: jasmine.createSpy('initApp').and.resolveTo() },
        },
        { provide: CalculatorMemoryService, useValue: calculatorMemory },
        { provide: MemoryService, useValue: repository },
        { provide: MemoryToggleService, useValue: { visible$: visible } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MemoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    changed.complete();
    visible.complete();
  });

  it('should create and load records from MemoryService', () => {
    expect(component).toBeTruthy();
    expect(repository.getAll).toHaveBeenCalledTimes(1);
    expect(component.memoryList).toEqual([
      { id: 1, ecuacion: '2+2', resultado: 4 },
    ]);
  });

  it('reloads from changed$ without an initial duplicate query', () => {
    changed.next();

    expect(repository.getAll).toHaveBeenCalledTimes(2);
  });

  it('does not reload explicitly after saving', async () => {
    calculatorMemory.saveCurrent.and.resolveTo(true);

    await component.saveMemory();

    expect(repository.getAll).toHaveBeenCalledTimes(1);
  });

  it('delegates calculator memory commands', async () => {
    await component.saveMemory();
    await component.recallLast();
    await component.memoryPlus();
    await component.memoryMinus();

    expect(calculatorMemory.saveCurrent).toHaveBeenCalled();
    expect(calculatorMemory.recallLast).toHaveBeenCalled();
    expect(calculatorMemory.addCurrentToLast).toHaveBeenCalled();
    expect(calculatorMemory.subtractCurrentFromLast).toHaveBeenCalled();
  });

  it('delegates selected-record commands', async () => {
    await component.editRecord(3);
    await component.memoryPlusFor(3);
    await component.memoryMinusFor(3);
    await component.deleteRecord(3);

    expect(calculatorMemory.beginEdit).toHaveBeenCalledOnceWith(3);
    expect(calculatorMemory.addCurrentToRecord).toHaveBeenCalledOnceWith(3);
    expect(calculatorMemory.subtractCurrentFromRecord).toHaveBeenCalledOnceWith(3);
    expect(calculatorMemory.delete).toHaveBeenCalledOnceWith(3);
  });

  it('binds Delete all to the orchestrator', async () => {
    const deleteAll = fixture.nativeElement.querySelector(
      '.topBar-memory .style-A'
    ) as HTMLAnchorElement;

    deleteAll.click();
    await fixture.whenStable();

    expect(calculatorMemory.clearAll).toHaveBeenCalled();
  });

  it('unsubscribes visibility and memory listeners on destroy', () => {
    const loadCalls = repository.getAll.calls.count();

    fixture.destroy();
    visible.next(false);
    changed.next();

    expect(component.isVisible).toBeTrue();
    expect(repository.getAll).toHaveBeenCalledTimes(loadCalls);
  });
});
