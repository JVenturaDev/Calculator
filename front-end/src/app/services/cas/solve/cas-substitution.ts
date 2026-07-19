import {
  binaryNode,
  equationNode,
  functionCallNode,
  type CasExpression,
} from '../ast/cas-ast';

export function substituteCasExpression(
  expression: CasExpression,
  variable: string,
  replacement: CasExpression
): CasExpression {
  switch (expression.kind) {
    case 'number':
      return expression;
    case 'symbol':
      return expression.name === variable ? replacement : expression;
    case 'unary':
      return {
        kind: 'unary',
        operator: expression.operator,
        operand: substituteCasExpression(expression.operand, variable, replacement),
      };
    case 'binary':
      return binaryNode(
        expression.operator,
        substituteCasExpression(expression.left, variable, replacement),
        substituteCasExpression(expression.right, variable, replacement)
      );
    case 'function':
      return functionCallNode(
        expression.name,
        expression.arguments.map(argument =>
          substituteCasExpression(argument, variable, replacement)
        )
      );
    case 'equation':
      return equationNode(
        substituteCasExpression(expression.left, variable, replacement),
        substituteCasExpression(expression.right, variable, replacement)
      );
    default: {
      const _exhaustive: never = expression;
      return _exhaustive;
    }
  }
}

export function containsVariable(
  expression: CasExpression,
  variable: string
): boolean {
  switch (expression.kind) {
    case 'number':
      return false;
    case 'symbol':
      return expression.name === variable;
    case 'unary':
      return containsVariable(expression.operand, variable);
    case 'binary':
      return (
        containsVariable(expression.left, variable) ||
        containsVariable(expression.right, variable)
      );
    case 'function':
      return expression.arguments.some(argument =>
        containsVariable(argument, variable)
      );
    case 'equation':
      return (
        containsVariable(expression.left, variable) ||
        containsVariable(expression.right, variable)
      );
    default: {
      const _exhaustive: never = expression;
      return _exhaustive;
    }
  }
}

export function isNumericNode(expression: CasExpression): expression is { kind: 'number'; value: number } {
  return expression.kind === 'number';
}
