import { Injectable } from '@angular/core';
import { Step } from '../polish-services/polish-evaluator';
import { CalculationIR, ValueNode, OperationNode } from './calculation-ir';
import Complex from 'complex.js';

@Injectable({ providedIn: 'root' })
export class CalculationParserService {

  parse(steps: Step[]): CalculationIR {
    const values = new Map<string, ValueNode>();
    const operations = new Map<string, OperationNode>();

    let rootOperationId: string | null = null;

    steps.forEach((step, index) => {
      const opId = `op_${index}`;
      const valId = `val_${index}`;

      values.set(valId, { id: valId, value: step.result });

      operations.set(opId, {
        id: opId,
        type: step.type,
        name: step.name,
        operands: step.operands.map((_, i) => `val_${i}`), 
        result: valId
      });

      rootOperationId = opId;
    });

    return {
      values,
      operations,
      rootOperationId: rootOperationId!
    };
  }

}
