import { Component, OnInit, OnDestroy, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { CalculatorEngineService } from '../../services/engine-services/calculator-engine';
import { HistoryService } from '../../services/history-services/history';
import { DisplayStateService } from '../../services/display-services/display';
import { MemoryService } from '../../services/memory-services/memory';
import { StateService } from '../../services/core-services/state-object';
import Complex from 'complex.js';
import { MemoryToggleService } from '../../services/memory-services/memory-toggle';
import { ToggleService, AngleMode } from '../../services/toggle-services/toggle';
import { PolishNotationParserService } from '../../services/polish-services/polish-notation-parser-service';
import { Tokenizer } from '../../services/polish-services/tokenizer';
import { GraphicPlotService } from '../../services/plot-services/graphic-plot';
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
  showInequalitySymbols = false;

  constructor(
    private display: DisplayStateService,
    private engine: CalculatorEngineService,
    public history: HistoryService,
    private memoryService: MemoryService,
    private stateService: StateService,
    private memoryToggle: MemoryToggleService,
    private toggle: ToggleService,
    public toggleService: ToggleService,
    private elRef: ElementRef,
    private parserService: PolishNotationParserService,
    private tokenizer: Tokenizer,
    private graphicService: GraphicPlotService
  ) { }

  ngOnInit(): void {
    this.sub = this.toggle.activeCalc$.subscribe(v => this.isVisible = (v === 'graphic'));
    this.sub = this.display.value$.subscribe(() => {
      this.stateService.update({ expression: this.display.currentValue });
    });
  }


  toggleHistory() {
    this.toggleService.GHtoggle();
  }
  private evalExpression(expr: string, variables: Record<string, number> = {}): number | Complex {
    const tokens = this.tokenizer.tokenize(expr);
    const postfix = this.parserService.toPostFix(tokens);
    return this.parserService.evaluatePostFix(postfix, variables);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  toggleMemoryPanel(): void {
    this.memoryToggle.toggle();
  }

  toggleInequalitySymbols(event?: MouseEvent) {
    if (event) event.stopPropagation();
    this.showInequalitySymbols = !this.showInequalitySymbols;
  }

  @HostListener('document:click', ['$event'])
  onClickAnywhere(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const container = document.querySelector('.graphic-buttons');
    const button = document.querySelector('.btnInequality');

    if (this.showInequalitySymbols && button && target !== button && container) {
      this.showInequalitySymbols = false;
    }
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
          const preprocessed = this.tokenizer.preprocessExpression(expr);
          if (/[xy]/i.test(preprocessed)) {
            let result: number | Complex;
            try {
              result = this.engine.evalExpressionWithVariables(preprocessed, { x: 0, y: 0 });
            } catch {
              result = NaN;
            }
            const displayResult = result instanceof Complex ? result.toString() : String(result);
            this.display.setValue(displayResult);
            this.stateService.update({ expression: expr, result: displayResult });
            this.history.agregarId(expr, displayResult);
            this.graphicService.setExpression(preprocessed);
            return;
          }
          const rawResult = this.evalExpression(preprocessed);
          const displayRes = rawResult instanceof Complex ? rawResult.toString().replace('=', '') : String(rawResult);
          const stateRes: string | number = rawResult instanceof Complex ? displayRes : rawResult;

          this.display.setValue(displayRes);
          this.stateService.update({ expression: expr, result: stateRes });
          this.history.agregarId(expr, stateRes);
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

  async clearMemory() { await this.memoryService.clear(); }
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

  clearHistory(): void { this.history.clearHistory(); }
}
