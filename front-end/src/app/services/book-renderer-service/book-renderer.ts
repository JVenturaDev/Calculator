import { Injectable } from '@angular/core';
import { Step } from '../polish-services/polish-evaluator';
import { CalculationParserService } from '../calculation/calculation-parser';
import Complex from 'complex.js';

export type BookStep = {
  numerator: number | Complex;
  denominator?: number | Complex; 
  operator?: string;             
  result: number | Complex;
  level: number;
};


@Injectable({ providedIn: 'root' })
export class BookRenderer {
  constructor(private parser: CalculationParserService) {}

  convertToBookSteps(steps: Step[]): BookStep[] {
    const format = (v: number | Complex) => this.parser.formatValue(v);

    return steps.map(s => {
      if (s.type === 'Operator' && s.name === '/') {
        return {
          numerator: s.operands[0],
          denominator: s.operands[1],
          result: s.result,
          level: 0
        };
      } else {
        // otros operadores se pueden mostrar lineal
        return {
          numerator: s.operands[0],
          operator: s.name,
          result: s.result,
          level: 0
        };
      }
    });
  }
}

