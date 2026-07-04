import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { map } from 'rxjs';
import { HistoryService } from '../../services/history-services/history';
import { InputService } from '../../services/input-services/input-services';
import { CalculatorFacade } from '../../services/calculator-state/calculator-facade';
import type {
  CalculatorState,
  CalculatorStatus,
} from '../../services/calculator-state/calculator-state';

interface DisplayViewModel {
  expression: string;
  result: string | null;
  error: string | null;
  status: CalculatorStatus;
  statusLabel: string;
}

@Component({
  selector: 'app-display',
  templateUrl: './display.html',
  styleUrls: ['./display.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class DisplayComponent {
  readonly viewModel$;

  constructor(
    private calculator: CalculatorFacade,
    public history: HistoryService,
    public inputService: InputService,
  ) {
    this.viewModel$ = this.calculator.state$.pipe(
      map(state => this.toViewModel(state))
    );
  }

  onExpressionChange(expression: string): void {
    this.calculator.setExpression(expression);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Backspace') {
      event.preventDefault();

      const state = this.calculator.snapshot;
      if (state.phase === 'result' && state.lastExpression !== null) {
        this.calculator.setExpression(state.lastExpression);
      }

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

  private toViewModel(state: CalculatorState): DisplayViewModel {
    return {
      expression:
        state.phase === 'result'
          ? state.lastExpression ?? state.expression
          : state.expression,
      result:
        state.phase === 'result' && state.result !== null
          ? String(state.result)
          : null,
      error: state.error?.message ?? null,
      status: state.status,
      statusLabel: this.getStatusLabel(state),
    };
  }

  private getStatusLabel(state: CalculatorState): string {
    if (state.status === 'evaluating') return 'Calculando';
    if (state.status === 'error') return 'Error';
    if (state.phase === 'result') return 'Resultado';
    return 'Listo';
  }
}
