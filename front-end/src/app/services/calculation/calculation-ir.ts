import Complex from "complex.js";
export type ValueId = string;
export type OperationId = string;

export interface ValueNode {
  id: ValueId;
  value: number | Complex;
  label?: string;
}

export interface OperationNode {
  id: OperationId;
  type: "Operator" | "Function";
  name: string;
  operands: ValueId[];
  result: ValueId;    
}

export interface CalculationIR {
  values: Map<ValueId, ValueNode>;
  operations: Map<OperationId, OperationNode>;
  rootOperationId: OperationId;
}
