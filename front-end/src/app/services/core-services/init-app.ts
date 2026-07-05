import { Injectable } from '@angular/core';
import { DisplayStateService } from '../display-services/display';
import { MemoryService } from '../memory-services/memory';
import { StateService } from './state-object';
import { ToastService } from '../toast-services/toast';

@Injectable({ providedIn: 'root' })
export class AppInitService {
  private initialized = false;

  constructor(
    private display: DisplayStateService,
    private memory: MemoryService,
    private state: StateService,
    private toast: ToastService
  ) {}

  async initApp() {
    if (this.initialized) return;
    this.initialized = true;

    this.display.clear();
    this.state.update({ expression: '', result: 0, equalPressed: 0 });

    try {
      await this.memory.initDB();
    } catch (err) {
      console.error('Error inicializando la memoria:', err);
      this.toast.error(
        'No se pudo inicializar la memoria. Algunas funciones de memoria podrían no estar disponibles.'
      );
      return;
    }

  }
}
