import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';
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
export class DisplayComponent implements AfterViewInit, OnDestroy {
  readonly viewModel$;
  @ViewChild('expressionInput') private expressionInput?: ElementRef<HTMLInputElement>;
  private caretSyncHandle: number | null = null;

  constructor(
    private calculator: CalculatorFacade,
    public history: HistoryService,
    public inputService: InputService,
  ) {
    this.viewModel$ = this.calculator.state$.pipe(
      map(state => this.toViewModel(state))
    );
  }

  ngAfterViewInit(): void {
    this.scheduleCaretReveal();
  }

  ngOnDestroy(): void {
    if (this.caretSyncHandle !== null) {
      cancelAnimationFrame(this.caretSyncHandle);
      this.caretSyncHandle = null;
    }
  }

  onExpressionChange(expression: string): void {
    this.calculator.setExpression(expression);
    this.scheduleCaretReveal();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Backspace') {
      event.preventDefault();

      const state = this.calculator.snapshot;
      if (state.phase === 'result' && state.lastExpression !== null) {
        this.calculator.setExpression(state.lastExpression);
      }

      this.calculator.backspace();
      this.scheduleCaretReveal();
    } else if (event.key === 'Enter') {
      const expr = this.calculator.snapshot.expression;
      const result = this.calculator.evaluate({
        angleMode: this.calculator.snapshot.angleMode,
      });
      this.history.agregarId(expr, result);
      event.preventDefault();
    }
  }

  onExpressionFocus(): void {
    this.inputService.setCalculatorTarget();
    this.scheduleCaretReveal();
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

  private scheduleCaretReveal(): void {
    if (this.caretSyncHandle !== null) {
      cancelAnimationFrame(this.caretSyncHandle);
    }

    this.caretSyncHandle = requestAnimationFrame(() => {
      this.caretSyncHandle = null;
      const input = this.expressionInput?.nativeElement;
      if (!input || document.activeElement !== input) return;

      const selectionStart = input.selectionStart;
      const selectionEnd = input.selectionEnd;
      if (
        selectionStart === null ||
        selectionEnd === null ||
        selectionStart !== selectionEnd ||
        selectionEnd !== input.value.length
      ) {
        return;
      }

      input.scrollLeft = input.scrollWidth;
    });
  }
}
