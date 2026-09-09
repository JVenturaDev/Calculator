import {
  binaryNode,
  numberNode,
  unaryNode,
  type CasExpression,
} from '../ast/cas-ast';

export type CasNegativeExtraction =
  | { readonly negative: false }
  | { readonly negative: true; readonly magnitude: CasExpression };

export function extractNegativeCasExpression(
  expression: CasExpression
): CasNegativeExtraction {
  if (expression.kind === 'number' && expression.value < 0) {
    return { negative: true, magnitude: numberNode(-expression.value) };
  }

  if (expression.kind === 'unary' && expression.operator === '-') {
    return { negative: true, magnitude: expression.operand };
  }

  if (
    expression.kind === 'binary' &&
    expression.operator === '/' &&
    expression.left.kind === 'number' &&
    expression.left.value < 0
  ) {
    return {
      negative: true,
      magnitude: binaryNode('/', numberNode(-expression.left.value), expression.right),
    };
  }

  if (expression.kind === 'binary' && expression.operator === '*') {
    const factors = collectFactors(expression);
    const negativeIndex = factors.findIndex(
      factor => factor.kind === 'number' && factor.value < 0
    );
    if (negativeIndex !== -1) {
      const magnitudeFactors = factors.map((factor, index) =>
        index === negativeIndex && factor.kind === 'number'
          ? numberNode(-factor.value)
          : factor
      );
      return {
        negative: true,
        magnitude: rebuildProduct(magnitudeFactors),
      };
    }
  }

  return { negative: false };
}

export function buildCanonicalNegativeCasExpression(
  magnitude: CasExpression
): CasExpression {
  if (magnitude.kind === 'number') {
    return numberNode(-magnitude.value);
  }

  if (
    magnitude.kind === 'binary' &&
    magnitude.operator === '/' &&
    magnitude.left.kind === 'number'
  ) {
    return binaryNode('/', numberNode(-magnitude.left.value), magnitude.right);
  }

  return unaryNode('-', magnitude);
}

function collectFactors(expression: CasExpression): CasExpression[] {
  if (expression.kind === 'binary' && expression.operator === '*') {
    return [...collectFactors(expression.left), ...collectFactors(expression.right)];
  }

  return [expression];
}

function rebuildProduct(factors: readonly CasExpression[]): CasExpression {
  if (factors.length === 1) {
    return factors[0];
  }

  return factors.slice(1).reduce((product, factor) => binaryNode('*', product, factor), factors[0]);
}
