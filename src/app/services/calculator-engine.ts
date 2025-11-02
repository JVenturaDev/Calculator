import { Injectable } from '@angular/core';
import { replaceFunction, evalExpresion } from '../lib/buttonFunctions';
import Complex from 'complex.js';

@Injectable({ providedIn: 'root' })
export class CalculatorEngineService {

  replaceFunction(expression: string): string {
    return replaceFunction(expression);
  }

  evalExpresion(expression: string): number | Complex {
    return evalExpresion(expression);
  }

  // Nueva función para trabajar con variables (x, y, etc.)
  evalExpressionWithVariables(
    expression: string,
    variables: Record<string, number>
  ): number | Complex {
    let replaced = replaceFunction(expression);

    // Sustituye variables
    for (const [name, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\b${name}\\b`, 'g');
      replaced = replaced.replace(regex, `(${value})`);
    }

    return evalExpresion(replaced);
  }
}
