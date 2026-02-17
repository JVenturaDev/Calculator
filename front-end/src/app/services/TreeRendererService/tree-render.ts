import { Injectable } from '@angular/core';
import { CalculationIR } from '../calculation/calculation-ir';
import { CalculationParserService } from '../calculation/calculation-parser';
export interface TreeNode {
  label: string;
  children: TreeNode[];
}

@Injectable({ providedIn: 'root' })
export class TreeRendererService {

  constructor(private parser: CalculationParserService) { }

  buildTree(ir: CalculationIR): TreeNode {

    const rootOp = ir.operations.get(ir.rootOperationId!)!;
    const resultValue = ir.values.get(rootOp.result)!;

    return {
      label: this.parser.formatValue(resultValue.value),
      children: [
        this.buildFromOperation(ir.rootOperationId!, ir)
      ]
    };
  }

  private buildFromOperation(opId: string, ir: CalculationIR): TreeNode {
    const op = ir.operations.get(opId)!;

    const children: TreeNode[] = op.operands.map(operandId => {
      const producingOp = this.findOperationProducingValue(operandId, ir);

      if (producingOp) {
        return this.buildFromOperation(producingOp.id, ir);
      }

      const value = ir.values.get(operandId)!;


      return {

        label: this.parser.formatValue(value.value),
        children: []
      };
    });
    return {

      label: op.name,
      children
    };
  }

  private findOperationProducingValue(valueId: string, ir: CalculationIR) {
    for (const op of ir.operations.values()) {
      if (op.result === valueId) return op;

    }
    return null;
  }
}
