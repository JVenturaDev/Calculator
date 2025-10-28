import { Injectable } from '@angular/core';
import { DisplayStateService } from './display';
import { MemoryService } from './memory';
import { CalculatorEngineService } from './calculator-engine';
import { HistoryService } from './history';
import { StateService } from './state-object';

@Injectable({ providedIn: 'root' })
export class AppInitService {
  private initialized = false;

  constructor(
    private display: DisplayStateService,
    private memory: MemoryService,
    private engine: CalculatorEngineService,
    private history: HistoryService,
    private state: StateService
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
      alert('Error inicializando la memoria');
      return;
    }

    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  private handleResize() {
  
  }
}
