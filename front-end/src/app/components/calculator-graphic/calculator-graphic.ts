import { Component, Inject, OnInit, OnDestroy, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { HistoryService } from '../../services/history-services/history';
import { DisplayStateService } from '../../services/display-services/display';
import { CalculatorMemoryService } from '../../services/memory-services/calculator-memory';
import { StateService } from '../../services/core-services/state-object';
import Complex from 'complex.js';
import { MemoryToggleService } from '../../services/memory-services/memory-toggle';
import { ToggleService } from '../../services/toggle-services/toggle';
import { parser } from '../../services/polish-services/polish-notation-parser-service';
import { Tokenizer } from '../../services/polish-services/tokenizer';
import { GraphicPlotService } from '../../services/plot-services/graphic-plot';
import { evaluator } from '../../services/polish-services/polish-evaluator';
import { PreprocessModule } from '../../services/polish-services/preprocess-module';
import { InputService } from '../../services/input-services/input-services';
import { WorkSpace } from '../work-space/work-space';
import { WorkspaceService } from '../../services/workSpace-services/worsk-space-service';
import {
  CALCULATION_ENGINE,
  CalculationEngine,
} from '../../services/engine-services/calculation-engine.contract';
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
    @Inject(CALCULATION_ENGINE) private engine: CalculationEngine,
    public history: HistoryService,
    private calculatorMemory: CalculatorMemoryService,
    private stateService: StateService,
    private memoryToggle: MemoryToggleService,
    private toggle: ToggleService,
    public toggleService: ToggleService,
    private parserService: parser,
    private tokenizer: Tokenizer,
    private graphicService: GraphicPlotService,
    private process: PreprocessModule,
    private inputService: InputService,
    private wsService: WorkspaceService,
    private evalutorPolish: evaluator
  ) { }

  ngOnInit(): void {
    this.sub = this.toggle.activeCalc$.subscribe(v => this.isVisible = (v === 'graphic'));
    this.sub = this.display.value$.subscribe(() => {
      this.stateService.update({ expression: this.display.currentValue });
    });
    this.inputService.target$.subscribe(target => {
      if (target.type === 'calculator') {
        this.focusCalculatorInput();
      }
    });
  }
  focusCalculatorInput() {
    const input = document.querySelector<HTMLInputElement>('#calculatorInput');
    input?.focus();
  }

  toggleHistory() {
    this.toggleService.GHtoggle();
  }

  private evalExpression(expr: string, variables: Record<string, number> = {}): number | Complex {
    // motor polaco
    const tokens = this.tokenizer.tokenize(expr);
    const postfix = this.parserService.toPostFix(tokens);
    const evaluation = this.evalutorPolish.evaluatePostFix(postfix, variables, true);
    // para que el motor polaco muestre pasos
    if (typeof evaluation === 'object' && 'result' in evaluation && 'steps' in evaluation) {
      console.log("Resultado final:", evaluation.result);
      console.log("Pasos del cálculo:", evaluation.steps);
      return evaluation.result;
    }

    return evaluation as number | Complex;
  }

  pressButton(value: string) {
    const target = this.inputService.target;

    if (target.type === 'calculator') return;

    if (target.type === 'workspace-item') {
      this.wsService.appendToCurrentExpression(target.itemId, value);
    }
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
      const target = this.inputService.target;
      if (target.type === 'workspace-item') {
        switch (value) {
          case 'AC':
          case 'CE':
            this.wsService.clearCurrentExpression(target.itemId);
            break;
          case 'DEL':
            const current = this.wsService.activeItem?.currentExpression || '';
            this.wsService.updateCurrentExpression(target.itemId, current.slice(0, -1));
            break;
          case '=':
            this.evaluateWorkspaceItem();
            break;
          default:
            this.wsService.appendToCurrentExpression(target.itemId, value);
        }
        return;
      }

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
          const preprocessed = this.process.preprocessExpression(expr);

          if (/[xy]/i.test(preprocessed)) {
            let result: number | Complex;
            try {
              result = this.engine.evaluate(preprocessed, {
                variables: { x: 0, y: 0 },
              });
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

  evaluateWorkspaceItem() {
    const activeId = this.wsService.activeItemId$.value;
    if (!activeId) return;

    const item = this.wsService.workspaceItems$.value.find(i => i.id === activeId);
    if (!item || !item.currentExpression) return;

    const tokens = this.tokenizer.tokenize(item.currentExpression);
    const postfix = this.parserService.toPostFix(tokens);
    const evaluation = this.evalutorPolish.evaluatePostFix(postfix, {}, true);

    if (typeof evaluation !== 'object' || !('steps' in evaluation)) return;

    const calc = {
      id: crypto.randomUUID(),
      expression: item.currentExpression,
      result: evaluation.result,
      steps: evaluation.steps,
      timestamp: new Date()
    };

    this.wsService.addCalculationToActiveItem(calc);
    item.currentExpression = '';
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

  clearHistory(): void { this.history.clearHistory(); }
}
