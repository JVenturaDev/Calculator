import { Injectable } from '@angular/core';
import { replaceFunction,evalExpresion } from '../../lib/buttonFunctions';
import Complex from 'complex.js';
import { Tokenizer } from '../polish-services/tokenizer';
import { PolishNotationParserService } from '../polish-services/polish-notation-parser-service';
@Injectable({ providedIn: 'root' })
export class CalculatorEngineService {
  constructor(
    private tokenizer: Tokenizer,
    private parser: PolishNotationParserService
  ) { }
  replaceFunction(expression: string): string {
    return replaceFunction(expression);
  }

  evalExpresion(expression: string): number | Complex {
    return evalExpresion(expression);
  }
  evalExpressionWithVariables(
    expression: string,
    variables: Record<string, number> = {}
  ): number | Complex {
    try {
      const tokens = this.tokenizer.tokenize(expression);
      const postfix = this.parser.toPostFix(tokens);
      const result = this.parser.evaluatePostFix(postfix, variables);
      if (result instanceof Complex) {
        return result.im === 0 ? result.re : result;
      }
      return result;
    } catch (err) {
      console.error('Error al evaluar expresión:', err);
      return NaN;
    }
  }
}
