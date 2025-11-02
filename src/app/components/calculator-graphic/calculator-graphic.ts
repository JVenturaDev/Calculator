import { Component, OnInit, OnDestroy, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { CalculatorEngineService } from '../../services/calculator-engine';
import { HistoryService } from '../../services/history';
import { DisplayStateService } from '../../services/display';
import { MemoryService } from '../../services/memory';
import { StateService } from '../../services/state-object';
import Complex from 'complex.js';
import { MemoryToggleService } from '../../services/memory-toggle';
import { ToggleService, AngleMode } from '../../services/toggle';
import { PolishNotationParserService } from '../../services/polish-notation-parser-service';
import { Tokenizer } from '../../services/tokenizer';

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
    private tokenizer: Tokenizer
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
  private evalExpression(expr: string): number | Complex {
    const tokens = this.tokenizer.tokenize(expr);
    const postfix = this.parserService.toPostFix(tokens);
    return this.parserService.evaluatePostFix(postfix);
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
  private preprocessExpression(expr: string): string {
    let output = expr;

    // 🔹 Funciones trigonométricas inversas
    output = output
      .replace(/\bacoth\(/g, 'acoth(')
      .replace(/\bacsch\(/g, 'acsch(')
      .replace(/\basech\(/g, 'asech(')
      .replace(/\basin\(/g, 'asin(')
      .replace(/\bacos\(/g, 'acos(')
      .replace(/\batan\(/g, 'atan(')
      .replace(/\basec\(/g, 'asec(')
      .replace(/\bacsc\(/g, 'acsc(')
      .replace(/\bacot\(/g, 'acot(');

    // 🔹 Funciones hiperbólicas inversas
    output = output
      .replace(/\basinh\(/g, 'asinh(')
      .replace(/\bacosh\(/g, 'acosh(')
      .replace(/\batanh\(/g, 'atanh(');

    // 🔹 Funciones hiperbólicas normales
    output = output
      .replace(/\bcoth\(/g, 'coth(')
      .replace(/\bcsch\(/g, 'csch(')
      .replace(/\bsech\(/g, 'sech(')
      .replace(/\bsinh\(/g, 'sinh(')
      .replace(/\bcosh\(/g, 'cosh(')
      .replace(/\btanh\(/g, 'tanh(')
      .replace(/\bsec\(/g, 'sec(')
      .replace(/\bcot\(/g, 'cot(')
      .replace(/\bcsc\(/g, 'csc(')
      .replace(/\bsin\(/g, 'sin(')
      .replace(/\bcos\(/g, 'cos(')
      .replace(/\btan\(/g, 'tan(');

    // 🔹 Exponenciales y logaritmos
    output = output
      .replace(/\be\^\(/g, 'exp(')
      .replace(/\bxylog\(/g, 'logxy(')
      .replace(/\bln\(/g, 'ln(')
      .replace(/\blog\(/g, 'log(');

    // 🔹 Raíces y potencias: se asegura que negativos se envuelvan
    output = output
      .replace(/²√(-?\d+(\.\d+)?)/g, 'sqrt($1)')
      .replace(/∛(-?\d+(\.\d+)?)/g, 'cbrt($1)')
      .replace(/(\d+(\.\d+)?)²/g, '($1**2)')
      .replace(/(\d+(\.\d+)?)³/g, '($1**3)')
      .replace(/2\^x/g, '(2**')
      .replace(/10\^/g, '(10**')
      .replace(/yroot\(/g, 'yroot(')
      .replace(/pow\(/g, 'pow(');

    // 🔹 Otras funciones
    output = output
      .replace(/\|x\|\(/g, 'abs(')
      .replace(/⌊x⌋\(/g, 'floor(')
      .replace(/⌈x⌉\(/g, 'ceil(');

    // 🔹 Constantes
    output = output
      .replace(/\bπ\b/g, 'π')
      .replace(/\be\b/g, 'e');

    // 🔹 Signos negativos antes de exponentes o raíces
    output = output.replace(/-(\d+(\.\d+)?)/g, '(-$1)');

    // 🔹 Agregar paréntesis de cierre faltantes si detecta "func("
    const openParens = (output.match(/\(/g) || []).length;
    const closeParens = (output.match(/\)/g) || []).length;
    const missing = openParens - closeParens;
    if (missing > 0) output += ')'.repeat(missing);

    return output;
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
          const preprocessed = this.preprocessExpression(expr);
          const rawResult = this.evalExpression(preprocessed);
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
