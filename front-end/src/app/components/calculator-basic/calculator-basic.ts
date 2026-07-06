import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HistoryService } from '../../services/history-services/history';
import { CalculatorMemoryService } from '../../services/memory-services/calculator-memory';
import { MemoryToggleService } from '../../services/memory-services/memory-toggle';
import { CalculatorFacade } from '../../services/calculator-state/calculator-facade';

@Component({
  selector: 'app-calculator-basic',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calculator-basic.html',
  styleUrls: ['./calculator-basic.css']
})

export class CalculatorBasicComponent {
  inputValue = '';

  constructor(
    private calculator: CalculatorFacade,
    public history: HistoryService,
    private calculatorMemory: CalculatorMemoryService,
    private memoryToggle: MemoryToggleService
  ) { }

  onCalculatorPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse') return;

    const target = event.target;
    if (!(target instanceof Element) || !target.closest('button')) return;

    const activeElement = document.activeElement;
    if (
      activeElement instanceof HTMLInputElement &&
      activeElement.id === 'calculatorInput'
    ) {
      activeElement.blur();
    }
  }

  toggleMemoryPanel(): void {
    this.memoryToggle.toggle();
  }


  handleButtonClick(value: string): void {
    try {
      switch (value) {
        case 'AC':
        case 'C':
          this.calculator.clear();
          return;

        case 'DEL':
          this.calculator.backspace();
          return;

        case '+/-':
          this.calculator.toggleSign();
          return;

        case '1/':
          const num = Number(this.calculator.snapshot.expression);
          if (!isNaN(num) && num !== 0) {
            const inv = 1 / num;
            this.calculator.setExpression(inv.toString());
            this.calculator.updateCalculationContext({
              lastExpression: `1/(${num})`,
              result: inv,
            });
          }
          return;

        case '=':
          const expr = this.calculator.snapshot.expression;
          const result = this.calculator.evaluate();
          this.history.agregarId(expr, result);
          return;
        default:
          this.calculator.appendToken(value);
          return;
      }
    } catch {
      // CalculatorFacade conserva el error para que Display lo presente.
    }
  }



  async saveMemory() {
    await this.calculatorMemory.saveCurrent();
  }


  async clearMemory() {
    await this.calculatorMemory.clearAll();
  }

  async memoryPlus() {
    await this.calculatorMemory.addCurrentToLast();
  }

  async memoryMinus() {
    await this.calculatorMemory.subtractCurrentFromLast();
  }

  async recallLast() {
    await this.calculatorMemory.recallLast();
  }
  clearHistory(): void {
    this.history.clearHistory();
  }
}
