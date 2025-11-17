import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalculatorEngineService } from '../../services/engine-services/calculator-engine';
import { DisplayStateService } from '../../services/display-services/display';
import { StateService } from '../../services/core-services/state-object';
import { HistoryService } from '../../services/history-services/history';
import Complex from 'complex.js';

@Component({
  selector: 'app-display',
  templateUrl: './display.html',
  styleUrls: ['./display.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class DisplayComponent {
  value = '';

  constructor(
    private engine: CalculatorEngineService,
    public history: HistoryService,

    private display: DisplayStateService,
    private stateService: StateService,

  ) {
    this.display.value$.subscribe(v => (this.value = v));
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Backspace') {
      this.display.backspace();
      this.stateService.update({ expression: this.display.currentValue });
    } else if (event.key === 'Enter') {
      const expr = this.display.currentValue;
      const replaced = this.engine.replaceFunction(expr);
      const rawResult = this.engine.evalExpresion(replaced);
      const displayResult = rawResult instanceof Complex
        ? rawResult.toString().replace('=', '')
        : String(rawResult);
      const stateResult: string | number = rawResult instanceof Complex
        ? displayResult
        : rawResult;
      this.display.setValue(displayResult);
      this.stateService.update({ expression: expr, result: stateResult });
      this.history.agregarId(expr, stateResult);
      event.preventDefault();
    }
  }
}
