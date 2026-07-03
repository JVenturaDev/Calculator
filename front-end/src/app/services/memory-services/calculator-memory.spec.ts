import { TestBed } from '@angular/core/testing';
import { CalculatorFacade } from '../calculator-state/calculator-facade';
import {
  createInitialCalculatorState,
  type CalculatorState,
} from '../calculator-state/calculator-state';
import { CalculatorMemoryService } from './calculator-memory';
import { MemoryService } from './memory';

describe('CalculatorMemoryService', () => {
  let service: CalculatorMemoryService;
  let state: CalculatorState;
  let calculator: jasmine.SpyObj<CalculatorFacade>;
  let repository: jasmine.SpyObj<MemoryService>;

  beforeEach(() => {
    state = createInitialCalculatorState();
    calculator = jasmine.createSpyObj<CalculatorFacade>(
      'CalculatorFacade',
      [
        'beginMemoryEdit',
        'restoreMemoryRecord',
        'finishMemoryEdit',
      ],
      { snapshot: state }
    );
    repository = jasmine.createSpyObj<MemoryService>('MemoryService', [
      'saveRecord',
      'updateRecord',
      'getLastRecord',
      'getRecord',
      'delete',
      'clear',
    ]);
    repository.saveRecord.and.resolveTo(1);
    repository.updateRecord.and.resolveTo();
    repository.delete.and.resolveTo();
    repository.clear.and.resolveTo();

    TestBed.configureTestingModule({
      providers: [
        CalculatorMemoryService,
        { provide: CalculatorFacade, useValue: calculator },
        { provide: MemoryService, useValue: repository },
      ],
    });
    service = TestBed.inject(CalculatorMemoryService);
  });

  it('saves the current calculation as a new record', async () => {
    state.lastExpression = '2+2';
    state.expression = '4';
    state.result = 4;

    const saved = await service.saveCurrent();

    expect(saved).toBeTrue();
    expect(repository.saveRecord).toHaveBeenCalledOnceWith('2+2', 4);
    expect(repository.updateRecord).not.toHaveBeenCalled();
  });

  it('updates the record being edited and finishes editing', async () => {
    state.lastExpression = '3*3';
    state.result = 9;
    state.editingMemoryId = 7;

    const saved = await service.saveCurrent();

    expect(saved).toBeTrue();
    expect(repository.updateRecord).toHaveBeenCalledOnceWith(7, '3*3', 9);
    expect(calculator.finishMemoryEdit).toHaveBeenCalled();
  });

  it('silently rejects a non-numeric current result', async () => {
    state.result = '2 + 3i';

    const saved = await service.saveCurrent();

    expect(saved).toBeFalse();
    expect(repository.saveRecord).not.toHaveBeenCalled();
    expect(repository.updateRecord).not.toHaveBeenCalled();
  });

  it('recalls the last record through CalculatorFacade', async () => {
    repository.getLastRecord.and.resolveTo({
      id: 4,
      ecuacion: '6*7',
      resultado: 42,
    });

    const recalled = await service.recallLast();

    expect(recalled).toBeTrue();
    expect(calculator.restoreMemoryRecord).toHaveBeenCalledOnceWith('6*7', 42);
  });

  it('adds and subtracts the current result from the last record', async () => {
    state.result = 5;
    repository.getLastRecord.and.resolveTo({
      id: 2,
      ecuacion: '10',
      resultado: 10,
    });

    expect(await service.addCurrentToLast()).toBeTrue();
    expect(repository.updateRecord).toHaveBeenCalledWith(2, '10', 15);

    expect(await service.subtractCurrentFromLast()).toBeTrue();
    expect(repository.updateRecord).toHaveBeenCalledWith(2, '10', 5);
  });

  it('begins editing an existing record', async () => {
    repository.getRecord.and.resolveTo({
      id: 8,
      ecuacion: '8/2',
      resultado: 4,
    });

    const editing = await service.beginEdit(8);

    expect(editing).toBeTrue();
    expect(calculator.beginMemoryEdit).toHaveBeenCalledOnceWith(8, '8/2', 4);
  });

  it('adds and subtracts the current result from a selected record', async () => {
    state.result = '2';
    repository.getRecord.and.resolveTo({
      id: 9,
      ecuacion: '5',
      resultado: 5,
    });

    expect(await service.addCurrentToRecord(9)).toBeTrue();
    expect(repository.updateRecord).toHaveBeenCalledWith(9, '5', 7);

    expect(await service.subtractCurrentFromRecord(9)).toBeTrue();
    expect(repository.updateRecord).toHaveBeenCalledWith(9, '5', 3);
  });

  it('deletes one record and clears all records', async () => {
    await service.delete(3);
    await service.clearAll();

    expect(repository.delete).toHaveBeenCalledOnceWith(3);
    expect(repository.clear).toHaveBeenCalled();
  });
});
