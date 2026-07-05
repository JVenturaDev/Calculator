import { TestBed } from '@angular/core/testing';

import { DisplayStateService } from '../display-services/display';
import { MemoryService } from '../memory-services/memory';
import { ToastService } from '../toast-services/toast';
import { AppInitService } from './init-app';
import { StateService } from './state-object';

describe('InitApp', () => {
  let service: AppInitService;
  let display: jasmine.SpyObj<DisplayStateService>;
  let memory: jasmine.SpyObj<MemoryService>;
  let state: jasmine.SpyObj<StateService>;
  let toast: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    display = jasmine.createSpyObj<DisplayStateService>(
      'DisplayStateService',
      ['clear']
    );
    memory = jasmine.createSpyObj<MemoryService>('MemoryService', ['initDB']);
    state = jasmine.createSpyObj<StateService>('StateService', ['update']);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['error']);

    TestBed.configureTestingModule({
      providers: [
        { provide: DisplayStateService, useValue: display },
        { provide: MemoryService, useValue: memory },
        { provide: StateService, useValue: state },
        { provide: ToastService, useValue: toast },
      ],
    });
    service = TestBed.inject(AppInitService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
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
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
