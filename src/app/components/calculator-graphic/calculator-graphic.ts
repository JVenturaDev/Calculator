
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CalculatorEngineService } from '../../services/calculator-engine';
import { HistoryService } from '../../services/history';
import { DisplayStateService } from '../../services/display';
import { MemoryService } from '../../services/memory';
import { StateService } from '../../services/state-object';
import Complex from 'complex.js';
import { MemoryToggleService } from '../../services/memory-toggle';
import { ToggleService, AngleMode } from '../../services/toggle';

@Component({
  selector: 'app-graphic',
  templateUrl: './calculator-graphic.html',
  styleUrls: ['./calculator-graphic.css'],
  imports: [CommonModule]
})
export class GraphicComponent implements OnInit, OnDestroy {
  inputValue = '';
  private sub!: Subscription;
  isVisible = false;
  showMemoryButtons = false;


  constructor(
    private display: DisplayStateService,
    private engine: CalculatorEngineService,
    public history: HistoryService,
    private memoryService: MemoryService,
    private stateService: StateService,
    private memoryToggle: MemoryToggleService,
    private toggle: ToggleService,
    public toggleService: ToggleService
  ) {
  }

  ngOnInit(): void {
    this.sub = this.toggle.activeCalc$.subscribe(v => this.isVisible = (v === 'graphic'));
    this.sub = this.display.value$.subscribe(() => {
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
        case 'CE':
          this.display.clear();
          this.stateService.update({ expression: '', result: 0 });
          return;

        case 'DEL':
          this.display.backspace();
          this.stateService.update({ expression: this.display.currentValue });
          return;

        case '+/-':
          const currentVal = this.display.currentValue;
          this.display.setValue(currentVal.startsWith('-') ? currentVal.slice(1) : '-' + currentVal);
          this.stateService.update({ expression: this.display.currentValue });
          return;
        case '=':
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

  // 🔹 Funciones de memoria
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

