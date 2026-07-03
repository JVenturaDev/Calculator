import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HistoryService } from '../../services/history-services/history';
import { InputService } from '../../services/input-services/input-services';
import { CalculatorFacade } from '../../services/calculator-state/calculator-facade';

@Component({
  selector: 'app-display',
  templateUrl: './display.html',
  styleUrls: ['./display.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class DisplayComponent {
  readonly displayValue$;

  constructor(
    private calculator: CalculatorFacade,
    public history: HistoryService,
    public inputService: InputService,
  ) {
    this.displayValue$ = this.calculator.displayValue$;
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Backspace') {
      this.calculator.backspace();
    } else if (event.key === 'Enter') {
      const expr = this.calculator.snapshot.expression;
      const result = this.calculator.evaluate({
        angleMode: this.calculator.snapshot.angleMode,
      });
      this.history.agregarId(expr, result);
      event.preventDefault();
    }
  }
}
