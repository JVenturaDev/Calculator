import { Injectable } from '@angular/core';
import { CalculatorFacade } from '../calculator-state/calculator-facade';
import { MemoryService } from '../memory-services/memory';
import { ToastService } from '../toast-services/toast';

@Injectable({ providedIn: 'root' })
export class AppInitService {
  private initialized = false;

  constructor(
    private calculator: CalculatorFacade,
    private memory: MemoryService,
    private toast: ToastService
  ) {}

  async initApp() {
    if (this.initialized) return;
    this.initialized = true;

    this.calculator.clear();
    this.calculator.updateCalculationContext({
      lastExpression: '',
      result: 0,
    });

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
