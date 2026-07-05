import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { MemoryComponent } from './memory';
import { AppInitService } from '../../services/core-services/init-app';
import { CalculatorMemoryService } from '../../services/memory-services/calculator-memory';
import { MemoryService } from '../../services/memory-services/memory';
import { MemoryToggleService } from '../../services/memory-services/memory-toggle';
import { ToastService } from '../../services/toast-services/toast';

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
  let toast: jasmine.SpyObj<ToastService>;

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
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['error']);

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
        { provide: ToastService, useValue: toast },
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
    expect(fixture.nativeElement.querySelector('.memory-expression').textContent).toContain(
      '2+2'
    );
    expect(fixture.nativeElement.querySelector('.memory-result').textContent).toContain('4');
    expect(fixture.nativeElement.querySelector('a')).toBeNull();
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
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('binds edit, M+, M− and delete to the selected record', async () => {
    const edit = fixture.nativeElement.querySelector('.edit-memory') as HTMLButtonElement;
    const adjust = fixture.nativeElement.querySelectorAll(
      '.adjust-memory'
    ) as NodeListOf<HTMLButtonElement>;
    const remove = fixture.nativeElement.querySelector('.delete-memory') as HTMLButtonElement;

    edit.click();
    adjust[0].click();
    adjust[1].click();
    remove.click();
    await fixture.whenStable();

    expect(calculatorMemory.beginEdit).toHaveBeenCalledOnceWith(1);
    expect(calculatorMemory.addCurrentToRecord).toHaveBeenCalledOnceWith(1);
    expect(calculatorMemory.subtractCurrentFromRecord).toHaveBeenCalledOnceWith(1);
    expect(calculatorMemory.delete).toHaveBeenCalledOnceWith(1);
  });

  it('binds the accessible clear button to the orchestrator', async () => {
    const deleteAll = fixture.nativeElement.querySelector('.clear-memory') as HTMLButtonElement;

    deleteAll.click();
    await fixture.whenStable();

    expect(calculatorMemory.clearAll).toHaveBeenCalled();
  });

  it('shows loading and empty states without adding records', async () => {
    component.isLoading = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.loading-spinner')).toBeTruthy();

    repository.getAll.and.resolveTo([]);
    await component.loadMemory();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.memory-card')).toBeNull();
    expect(fixture.nativeElement.querySelector('.memory-state').textContent).toContain(
      'Memoria vacía'
    );
    expect(
      (fixture.nativeElement.querySelector('.clear-memory') as HTMLButtonElement).disabled
    ).toBeTrue();
  });

  it('reports repository loading errors and finishes the loading state', async () => {
    const error = new Error('read failed');
    const consoleError = spyOn(console, 'error');
    repository.getAll.and.rejectWith(error);

    await component.loadMemory();

    expect(consoleError).toHaveBeenCalledOnceWith(
      'Error cargando memoria:',
      error
    );
    expect(toast.error).toHaveBeenCalledOnceWith(
      'No se pudieron cargar los registros de memoria.',
      8000
    );
    expect(component.memoryList).toEqual([]);
    expect(component.isLoading).toBeFalse();
  });

  it('reports operational save, clear, delete, edit and recall errors', async () => {
    const error = new Error('operation failed');
    const consoleError = spyOn(console, 'error');
    calculatorMemory.saveCurrent.and.rejectWith(error);
    calculatorMemory.clearAll.and.rejectWith(error);
    calculatorMemory.delete.and.rejectWith(error);
    calculatorMemory.beginEdit.and.rejectWith(error);
    calculatorMemory.recallLast.and.rejectWith(error);

    await component.saveMemory();
    await component.clearMemory();
    await component.deleteRecord(1);
    await component.editRecord(1);
    await component.recallLast();

    expect(toast.error.calls.allArgs()).toEqual([
      ['No se pudo guardar el resultado en memoria.', 8000],
      ['No se pudo limpiar la memoria.', 8000],
      ['No se pudo eliminar el registro de memoria.', 8000],
      ['No se pudo abrir el registro para editarlo.', 8000],
      ['No se pudo recuperar el último registro de memoria.', 8000],
    ]);
    expect(consoleError.calls.allArgs()).toEqual([
      ['Error guardando en memoria:', error],
      ['Error limpiando memoria:', error],
      ['Error eliminando registro:', error],
      ['Error editando registro:', error],
      ['Error recuperando último registro:', error],
    ]);
  });

  it('reports rejected M+ and M− operations without propagating them', async () => {
    const error = new Error('adjustment failed');
    const consoleError = spyOn(console, 'error');
    calculatorMemory.addCurrentToRecord.and.rejectWith(error);
    calculatorMemory.subtractCurrentFromRecord.and.rejectWith(error);
    calculatorMemory.addCurrentToLast.and.rejectWith(error);
    calculatorMemory.subtractCurrentFromLast.and.rejectWith(error);

    await expectAsync(component.memoryPlusFor(1)).toBeResolved();
    await expectAsync(component.memoryMinusFor(1)).toBeResolved();
    await expectAsync(component.memoryPlus()).toBeResolved();
    await expectAsync(component.memoryMinus()).toBeResolved();

    expect(toast.error.calls.allArgs()).toEqual([
      ['No se pudo sumar el resultado al registro de memoria.', 8000],
      ['No se pudo restar el resultado del registro de memoria.', 8000],
      ['No se pudo sumar el resultado al registro de memoria.', 8000],
      ['No se pudo restar el resultado del registro de memoria.', 8000],
    ]);
    expect(consoleError.calls.allArgs()).toEqual([
      ['Error sumando al registro de memoria:', error],
      ['Error restando al registro de memoria:', error],
      ['Error sumando al último registro de memoria:', error],
      ['Error restando al último registro de memoria:', error],
    ]);
  });

  it('keeps expected false results silent', async () => {
    await component.saveMemory();
    await component.recallLast();
    await component.editRecord(1);
    await component.memoryPlusFor(1);
    await component.memoryMinusFor(1);
    await component.memoryPlus();
    await component.memoryMinus();

    expect(toast.error).not.toHaveBeenCalled();
  });

  it('does not show error toasts for successful operations', async () => {
    calculatorMemory.saveCurrent.and.resolveTo(true);
    calculatorMemory.recallLast.and.resolveTo(true);
    calculatorMemory.beginEdit.and.resolveTo(true);
    calculatorMemory.addCurrentToRecord.and.resolveTo(true);
    calculatorMemory.subtractCurrentFromRecord.and.resolveTo(true);
    calculatorMemory.addCurrentToLast.and.resolveTo(true);
    calculatorMemory.subtractCurrentFromLast.and.resolveTo(true);

    await component.saveMemory();
    await component.clearMemory();
    await component.deleteRecord(1);
    await component.editRecord(1);
    await component.recallLast();
    await component.memoryPlusFor(1);
    await component.memoryMinusFor(1);
    await component.memoryPlus();
    await component.memoryMinus();

    expect(toast.error).not.toHaveBeenCalled();
  });

  it('keeps missing record ids silent', async () => {
    await component.deleteRecord();
    await component.editRecord();
    await component.memoryPlusFor();
    await component.memoryMinusFor();

    expect(calculatorMemory.delete).not.toHaveBeenCalled();
    expect(calculatorMemory.beginEdit).not.toHaveBeenCalled();
    expect(calculatorMemory.addCurrentToRecord).not.toHaveBeenCalled();
    expect(calculatorMemory.subtractCurrentFromRecord).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
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
