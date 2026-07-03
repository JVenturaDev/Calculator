import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { HistoryService } from '../../services/history-services/history';
import { CalculatorMemoryService } from '../../services/memory-services/calculator-memory';
import { MemoryToggleService } from '../../services/memory-services/memory-toggle';
import { ToggleService } from '../../services/toggle-services/toggle';
import { CalculatorFacade } from '../../services/calculator-state/calculator-facade';

@Component({
  selector: 'app-calculator-scientific',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calculator-scientific.html',
  styleUrls: ['./calculator-scientific.css']
})
export class CalculatorScientificComponent implements OnInit, OnDestroy {
  inputValue = '';
  private sub!: Subscription;
  isVisible = false;
  showMemoryButtons = false;

  constructor(
    private calculator: CalculatorFacade,
    public history: HistoryService,
    private calculatorMemory: CalculatorMemoryService,
    private memoryToggle: MemoryToggleService,
    private toggle: ToggleService
  ) {
  }

  ngOnInit(): void {
    this.sub = this.toggle.activeCalc$.subscribe(v => this.isVisible = (v === 'scientific'));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }



  cycleAngleMode() {
    this.calculator.cycleAngleMode();
    const btn = document.getElementById('multiBtn') as HTMLButtonElement;
    if (btn) btn.textContent = this.calculator.snapshot.angleMode;
  }


  toggleMemoryPanel(): void {
    this.memoryToggle.toggle();
  }

  handleButtonClick(value: string): void {
    try {
      switch (value) {
        case 'AC':
        case 'CE':
          this.calculator.clear();
          return;

        case 'DEL':
          this.calculator.backspace();
          return;

        case '+/-':
          if (this.calculator.snapshot.expression) {
            this.calculator.toggleSign();
          } else {
            this.calculator.setExpression('-');
          }
          return;
        case '=':
          const expr = this.calculator.snapshot.expression;
          const result = this.calculator.evaluate({
            angleMode: this.calculator.snapshot.angleMode,
          });
          this.history.agregarId(expr, result);
          return;
        default:
          this.calculator.appendToken(value);
          return;
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
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
