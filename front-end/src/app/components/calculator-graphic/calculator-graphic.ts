import { Component, Inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { skip, Subscription } from 'rxjs';
import { HistoryService } from '../../services/history-services/history';
import { CalculatorFacade } from '../../services/calculator-state/calculator-facade';
import { CalculatorMemoryService } from '../../services/memory-services/calculator-memory';
import Complex from 'complex.js';
import { MemoryToggleService } from '../../services/memory-services/memory-toggle';
import { ToggleService } from '../../services/toggle-services/toggle';
import { parser } from '../../services/polish-services/polish-notation-parser-service';
import { Tokenizer } from '../../services/polish-services/tokenizer';
import { GraphicPlotService } from '../../services/plot-services/graphic-plot';
import { evaluator } from '../../services/polish-services/polish-evaluator';
import { PreprocessModule } from '../../services/polish-services/preprocess-module';
import { InputService } from '../../services/input-services/input-services';
import { WorkspaceService } from '../../services/workspace-services/workspace-service';
import {
  CALCULATION_ENGINE,
  CalculationEngine,
} from '../../services/engine-services/calculation-engine.contract';
import { ToastService } from '../../services/toast-services/toast';
@Component({
  selector: 'app-graphic',
  templateUrl: './calculator-graphic.html',
  styleUrls: ['./calculator-graphic.css'],
  imports: [CommonModule]
})
export class GraphicComponent implements OnInit, OnDestroy {
  inputValue = '';
  private readonly subscriptions = new Subscription();
  showMemoryButtons = false;
  showInequalitySymbols = false;

  constructor(
    private calculator: CalculatorFacade,
    @Inject(CALCULATION_ENGINE) private engine: CalculationEngine,
    public history: HistoryService,
    private calculatorMemory: CalculatorMemoryService,
    private memoryToggle: MemoryToggleService,
    public toggleService: ToggleService,
    private parserService: parser,
    private tokenizer: Tokenizer,
    private graphicService: GraphicPlotService,
    private process: PreprocessModule,
    private inputService: InputService,
    private wsService: WorkspaceService,
    private polishEvaluator: evaluator,
    private toast: ToastService
  ) { }

  ngOnInit(): void {
    this.subscriptions.add(
      this.inputService.target$.pipe(skip(1)).subscribe(target => {
        if (target.type === 'calculator') {
          this.focusCalculatorInput();
        }
      })
    );
  }
  focusCalculatorInput() {
    const input = document.querySelector<HTMLInputElement>('#calculatorInput');
    input?.focus();
  }

  onCalculatorPointerDown(event: PointerEvent): void {
    if (
      event.pointerType === 'mouse' ||
      this.inputService.target.type !== 'calculator'
    ) {
      return;
    }

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

  toggleHistory() {
    this.toggleService.GHtoggle();
  }

  private evalExpression(expr: string, variables: Record<string, number> = {}): number | Complex {
    // motor polaco
    const tokens = this.tokenizer.tokenize(expr);
    const postfix = this.parserService.toPostFix(tokens);
    const evaluation = this.polishEvaluator.evaluatePostFix(postfix, variables, true);
    // para que el motor polaco muestre pasos
    if (typeof evaluation === 'object' && 'result' in evaluation && 'steps' in evaluation) {
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
    this.subscriptions.unsubscribe();
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
    const target = this.inputService.target;
    if (target.type === 'workspace-item') {
      try {
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
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.toast.error(
          `No se pudo evaluar la expresión del Workspace: ${message}`,
          8000
        );
      }
      return;
    }

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
            this.calculator.restoreCalculation(expr, displayResult);
            this.history.agregarId(expr, displayResult);
            this.graphicService.setExpression(preprocessed);
            return;
          }

          const rawResult = this.evalExpression(preprocessed);
          const displayRes = rawResult instanceof Complex ? rawResult.toString().replace('=', '') : String(rawResult);
          const stateRes: string | number = rawResult instanceof Complex ? displayRes : rawResult;

          this.calculator.restoreCalculation(expr, stateRes);
          this.history.agregarId(expr, stateRes);
          return;

        default:
          this.calculator.appendToken(value);
          return;
      }
    } catch (error) {
      this.calculator.reportError(error, 'GRAPHIC_EVALUATION_ERROR');
    }
  }

  evaluateWorkspaceItem() {
    const activeId = this.wsService.activeItemId$.value;
    if (!activeId) return;

    const item = this.wsService.workspaceItems$.value.find(i => i.id === activeId);
    if (!item || !item.currentExpression) return;

    const tokens = this.tokenizer.tokenize(item.currentExpression);
    const postfix = this.parserService.toPostFix(tokens);
    const evaluation = this.polishEvaluator.evaluatePostFix(postfix, {}, true);

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
