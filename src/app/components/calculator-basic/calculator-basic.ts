import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CalculatorEngineService } from '../../services/calculator-engine';
import { HistoryService } from '../../services/history';
import { DisplayStateService } from '../../services/display';
import { MemoryService } from '../../services/memory';
import { StateService } from '../../services/state-object';
import Complex from "complex.js";
import { MemoryToggleService } from '../../services/memory-toggle';
import { ToggleService, } from '../../services/toggle';

@Component({
  selector: 'app-calculator-basic',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calculator-basic.html',
  styleUrls: ['./calculator-basic.css']
})

export class CalculatorBasicComponent implements OnInit, OnDestroy {
  inputValue = '';
  private sub!: Subscription;
  isVisible = false;

  constructor(
    private display: DisplayStateService,
    private engine: CalculatorEngineService,
    public history: HistoryService,
    private memoryService: MemoryService,
    private stateService: StateService,
    private memoryToggle: MemoryToggleService,
    private toggle: ToggleService
  ) { }

  ngOnInit(): void {
    this.sub = this.toggle.activeCalc$.subscribe(v => {
      this.isVisible = (v === 'basic');
    });
    this.sub = this.display.value$.subscribe(val => {
      this.stateService.update({ expression: this.display.currentValue });
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
  toggleMemoryPanel(): void {
    this.memoryToggle.toggle();
  }


  handleButtonClick(value: string): void {
    try {
      switch (value) {
        case 'AC':
        case 'C':
          this.display.clear();
          this.stateService.update({ expression: '', result: 0 });
          return;

        case 'DEL':
          this.display.backspace();
          this.stateService.update({ expression: this.display.currentValue });
          return;

        case '+/-':
          const currentVal = this.display.currentValue;
          if (currentVal.startsWith('-')) {
            this.display.setValue(currentVal.slice(1));
          } else if (currentVal) {
            this.display.setValue('-' + currentVal);
          }
          this.stateService.update({ expression: this.display.currentValue });
          return;

        case '1/':
          const num = Number(this.display.currentValue);
          if (!isNaN(num) && num !== 0) {
            const inv = 1 / num;
            this.display.setValue(inv.toString());
            this.stateService.update({ expression: `1/(${num})`, result: inv });
          }
          return;

        case '=':
          const expr = this.display.currentValue;
          const replaced = this.engine.replaceFunction(expr);
          const rawResult = this.engine.evalExpresion(replaced); // number | Complex
          const displayResult = rawResult instanceof Complex
            ? rawResult.toString().replace('=', '')
            : String(rawResult);
          const stateResult: string | number = rawResult instanceof Complex
            ? displayResult
            : rawResult;
          this.display.setValue(displayResult);
          this.stateService.update({ expression: expr, result: stateResult });
          this.history.agregarId(expr, stateResult);
          return;
        default:
          this.display.appendValue(value);
          this.stateService.update({ expression: this.display.currentValue });
          return;
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  }



  async saveMemory() {
    const resultado = Number(this.stateService.value.result);
    const expresion = this.stateService.value.expression || String(resultado);
    if (isNaN(resultado)) return;

    const idEdit = this.stateService.value.idEnEdicion;
    if (idEdit != null) {

      await this.memoryService.updateRecord(idEdit, expresion, resultado);
      this.stateService.update({ idEnEdicion: null });
    } else {
      await this.memoryService.saveRecord(expresion, resultado);
    }
  }


  async clearMemory() {
    await this.memoryService.clear();
  }

  async memoryPlus() {
    const last = await this.memoryService.getLastRecord();
    if (!last) return;
    const nuevo = Number(last.resultado) + Number(this.stateService.value.result);
    await this.memoryService.updateRecord(last.id!, last.ecuacion, nuevo);
  }

  async memoryMinus() {
    const last = await this.memoryService.getLastRecord();
    if (!last) return;
    const nuevo = Number(last.resultado) - Number(this.stateService.value.result);
    await this.memoryService.updateRecord(last.id!, last.ecuacion, nuevo);
  }

  async recallLast() {
    const last = await this.memoryService.getLastRecord();
    if (!last) return;
    this.stateService.update({ expression: last.ecuacion, result: last.resultado });
    this.display.setValue(last.resultado.toString());
  }
  clearHistory(): void {
    this.history.clearHistory();
  }
}
