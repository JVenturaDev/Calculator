import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { CalculatorFacade } from '../calculator-state/calculator-facade';

@Injectable({ providedIn: 'root' })
export class DisplayStateService {
  readonly value$: Observable<string>;

  constructor(private readonly calculator: CalculatorFacade) {
    this.value$ = this.calculator.displayValue$;
  }

  get currentValue(): string {
    return this.calculator.snapshot.expression;
  }

  setValue(val: string): void {
    this.calculator.setExpression(val);
  }

  appendValue(val: string): void {
    this.calculator.appendToken(val);
  }

  clear(): void {
    this.calculator.clear();
  }

  backspace(): void {
    this.calculator.backspace();
  }
}
