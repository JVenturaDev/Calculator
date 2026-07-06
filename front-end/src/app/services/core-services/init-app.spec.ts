import { TestBed } from '@angular/core/testing';

import { CalculatorFacade } from '../calculator-state/calculator-facade';
import { MemoryService } from '../memory-services/memory';
import { ToastService } from '../toast-services/toast';
import { AppInitService } from './init-app';

describe('InitApp', () => {
  let service: AppInitService;
  let calculator: jasmine.SpyObj<CalculatorFacade>;
  let memory: jasmine.SpyObj<MemoryService>;
  let toast: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    calculator = jasmine.createSpyObj<CalculatorFacade>(
      'CalculatorFacade',
      ['clear', 'updateCalculationContext']
    );
    memory = jasmine.createSpyObj<MemoryService>('MemoryService', ['initDB']);
    memory.initDB.and.resolveTo();
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['error']);

    TestBed.configureTestingModule({
      providers: [
        { provide: CalculatorFacade, useValue: calculator },
        { provide: MemoryService, useValue: memory },
        { provide: ToastService, useValue: toast },
      ],
    });
    service = TestBed.inject(AppInitService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('initializes CalculatorFacade and the memory repository', async () => {
    await service.initApp();

    expect(calculator.clear).toHaveBeenCalledTimes(1);
    expect(calculator.updateCalculationContext).toHaveBeenCalledOnceWith({
      lastExpression: '',
      result: 0,
    });
    expect(memory.initDB).toHaveBeenCalledTimes(1);
  });

  it('initializes only once', async () => {
    await service.initApp();
    await service.initApp();

    expect(calculator.clear).toHaveBeenCalledTimes(1);
    expect(calculator.updateCalculationContext).toHaveBeenCalledTimes(1);
    expect(memory.initDB).toHaveBeenCalledTimes(1);
  });

  it('reports memory initialization errors without using window.alert', async () => {
    const error = new Error('IndexedDB unavailable');
    const consoleError = spyOn(console, 'error');
    const alertSpy = spyOn(window, 'alert');
    memory.initDB.and.rejectWith(error);

    await service.initApp();

    expect(consoleError).toHaveBeenCalledWith(
      'Error inicializando la memoria:',
      error
    );
    expect(toast.error).toHaveBeenCalledOnceWith(
      'No se pudo inicializar la memoria. Algunas funciones de memoria podrían no estar disponibles.'
    );
    expect(calculator.clear).toHaveBeenCalledTimes(1);
    expect(calculator.updateCalculationContext).toHaveBeenCalledOnceWith({
      lastExpression: '',
      result: 0,
    });
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
