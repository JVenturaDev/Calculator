import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalculatorEngineService } from '../../services/engine-services/calculator-engine';
import { DisplayStateService } from '../../services/display-services/display';
import { StateService } from '../../services/core-services/state-object';
import { HistoryService } from '../../services/history-services/history';
import { InputService } from '../../services/input-services/input-services';
import Complex from 'complex.js';
import {
  CALCULATION_ENGINE,
  CalculationEngine,
} from '../../services/engine-services/calculation-engine.contract';
import { ToggleService } from '../../services/toggle-services/toggle';

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
    private legacyEngine: CalculatorEngineService,
    @Inject(CALCULATION_ENGINE) private engine: CalculationEngine,
    public history: HistoryService,
    public inputService: InputService,
    public display: DisplayStateService,
    private stateService: StateService,
    private toggleService: ToggleService,

  ) {
    this.display.value$.subscribe(v => (this.value = v));
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Backspace') {
      this.display.backspace();
      this.stateService.update({ expression: this.display.currentValue });
    } else if (event.key === 'Enter') {
      const expr = this.display.currentValue;
      const rawResult = this.toggleService.getActiveCalc() === 'graphic'
        ? this.legacyEngine.evalExpresion(this.legacyEngine.replaceFunction(expr))
        : this.engine.evaluate(expr, { angleMode: this.toggleService.getAngleMode() });
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
