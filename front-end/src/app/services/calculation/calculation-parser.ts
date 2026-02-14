import { Injectable } from '@angular/core';
import { Step } from '../polish-services/polish-evaluator';
import { CalculationIR, ValueNode, OperationNode } from './calculation-ir';
import Complex from 'complex.js';

@Injectable({ providedIn: 'root' })
export class CalculationParserService {

  parse(steps: Step[]): CalculationIR {
    const values = new Map<string, ValueNode>();
    const operations = new Map<string, OperationNode>();
    const valueStack: string[] = [];

    let rootOperationId: string | null = null;

    steps.forEach((step, index) => {

      const opId = `op_${index}`;
      const resultId = `val_${index}`;

      const operandIds: string[] = [];

      step.operands.forEach((operand) => {

        const existing = [...values.values()]
          .find(v => v.value === operand);

        if (existing) {
          operandIds.push(existing.id);
        } else {
          const newId = `val_input_${index}_${operandIds.length}`;
          values.set(newId, { id: newId, value: operand });
          operandIds.push(newId);
        }
      });

      operations.set(opId, {
        id: opId,
        type: step.type,
        name: step.name,
        operands: operandIds,
        result: resultId
      });

      values.set(resultId, {
        id: resultId,
        value: step.result
      });

      rootOperationId = opId;
    });

    return {
      values,
      operations,
      rootOperationId: rootOperationId!
    };
  }

  formatValue(value: any): string {
    if (value instanceof Complex) {
      const re = this.formatPeriodic(value.re);
      const im = this.formatPeriodic(value.im);

      if (value.im === 0) return re === '0' ? '0' : re;
      if (value.re === 0) return `${im}i`;
      return `${re}${value.im >= 0 ? '+' : ''}${im}i`;
    }

    if (typeof value === 'number') {
      return this.formatPeriodic(value);
    }

    return value?.toString() ?? '';
  }

  formatPeriodic(n: number, decimals = 5): string {
    if (Number.isInteger(n)) return n.toString();

    const rounded = n.toFixed(decimals);
    const decimalPart = rounded.split('.')[1] ?? '';
    const match = decimalPart.match(/(\d)\1+$/);
    if (match) {
      const nonRepeating = decimalPart.slice(0, decimalPart.length - match[0].length);
      return `${Math.floor(n)}.${nonRepeating}(${match[1]})`;
    }

    return rounded;
  }


}
