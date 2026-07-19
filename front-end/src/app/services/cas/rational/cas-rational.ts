import { binaryNode, numberNode, type CasExpression } from '../ast/cas-ast';

export function reduceExactRationalExpression(
  numerator: number,
  denominator: number
): CasExpression {
  if (denominator === 0) {
    return binaryNode('/', numberNode(numerator), numberNode(denominator));
  }

  if (numerator === 0) {
    return numberNode(0);
  }

  const normalizedDenominator = denominator < 0 ? -denominator : denominator;
  const normalizedNumerator = denominator < 0 ? -numerator : numerator;

  if (Number.isInteger(normalizedNumerator) && Number.isInteger(normalizedDenominator)) {
    const divisor = gcdOfIntegers(
      Math.abs(normalizedNumerator),
      Math.abs(normalizedDenominator)
    );
    const reducedNumerator = normalizedNumerator / divisor;
    const reducedDenominator = normalizedDenominator / divisor;

    if (reducedDenominator === 1) {
      return numberNode(reducedNumerator);
    }

    return binaryNode(
      '/',
      numberNode(reducedNumerator),
      numberNode(reducedDenominator)
    );
  }

  const quotient = normalizedNumerator / normalizedDenominator;
  if (Number.isFinite(quotient) && Number.isInteger(quotient)) {
    return numberNode(quotient);
  }

  return binaryNode(
    '/',
    numberNode(normalizedNumerator),
    numberNode(normalizedDenominator)
  );
}

export function gcdOfIntegers(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);

  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }

  return a;
}
