import {
  binaryNode,
  functionCallNode,
  numberNode,
  symbolNode,
  type CasExpression,
} from '../ast/cas-ast';
import {
  coefficientOf,
  degree,
  degreeIn,
  fromPolynomial,
  normalizePolynomial,
  termKey,
  toPolynomial,
} from './cas-polynomial';
import { formatCasExpression } from '../format/cas-formatter';

describe('CAS polynomial conversion', () => {
  it('recognizes constants, monomials and polynomial sums', () => {
    const cases: Array<[string, string]> = [
      ['2', '2'],
      ['x', 'x'],
      ['-x', '-x'],
      ['2 * x', '2 * x'],
      ['3 * x ^ 2', '3 * x ^ 2'],
      ['x * y', 'x * y'],
      ['2 * x ^ 2 * y', '2 * x ^ 2 * y'],
      ['x + 2', 'x + 2'],
      ['x ^ 2 + 2 * x + 1', 'x ^ 2 + 2 * x + 1'],
    ];

    for (const [source, expected] of cases) {
      const result = toPolynomial(parse(source));
      expect(result.ok).withContext(source).toBeTrue();
      if (!result.ok) continue;

      const back = fromPolynomial(result.value);
      expect(formatCasExpression(back)).withContext(source).toBe(expected);
    }
  });

  it('normalizes monomial keys independently of order', () => {
    const left = toPolynomial(parse('x * y'));
    const right = toPolynomial(parse('y * x'));
    expect(left.ok).toBeTrue();
    expect(right.ok).toBeTrue();
    if (!left.ok || !right.ok) return;

    expect(left.value.terms[0].powers).toEqual(right.value.terms[0].powers);
    expect(termKey(left.value.terms[0].powers)).toBe('x*y');
  });

  it('computes degree and coefficients', () => {
    const polynomial = normalizePolynomial({
      terms: [
        { coefficient: 3, powers: { x: 2 } },
        { coefficient: 5, powers: { x: 1, y: 1 } },
        { coefficient: 1, powers: {} },
      ],
    });

    expect(degree(polynomial)).toBe(2);
    expect(degreeIn(polynomial, 'x')).toBe(2);
    expect(degreeIn(polynomial, 'y')).toBe(1);
    expect(coefficientOf(polynomial, { x: 2 })).toBe(3);
    expect(coefficientOf(polynomial, { x: 1, y: 1 })).toBe(5);
  });

  it('rejects non-polynomial expressions', () => {
    for (const source of ['sin(x)', 'x ^ -1', 'x ^ y', '1 / x', 'sqrt(x)', 'x / y']) {
      const result = toPolynomial(parse(source));
      expect(result.ok).withContext(source).toBeFalse();
      if (result.ok) {
        fail(source);
      } else {
        expect(result.error.code).toBe('UNSUPPORTED_EXPRESSION');
      }
    }
  });

  it('keeps input immutable', () => {
    const expression = parse('x ^ 2 + 2 * x + 1');
    const snapshot = JSON.parse(JSON.stringify(expression));

    const result = toPolynomial(expression);
    expect(result.ok).toBeTrue();
    expect(expression).toEqual(snapshot);
  });
});

function parse(source: string): CasExpression {
  if (source === '2') return numberNode(2);
  if (source === 'x') return symbolNode('x');
  if (source === '-x') return binaryNode('*', numberNode(-1), symbolNode('x'));
  if (source === '2 * x') return binaryNode('*', numberNode(2), symbolNode('x'));
  if (source === '3 * x ^ 2') return binaryNode('*', numberNode(3), binaryNode('^', symbolNode('x'), numberNode(2)));
  if (source === 'x * y') return binaryNode('*', symbolNode('x'), symbolNode('y'));
  if (source === 'y * x') return binaryNode('*', symbolNode('y'), symbolNode('x'));
  if (source === '2 * x ^ 2 * y') {
    return binaryNode(
      '*',
      binaryNode('*', numberNode(2), binaryNode('^', symbolNode('x'), numberNode(2))),
      symbolNode('y')
    );
  }
  if (source === 'x + 2') return binaryNode('+', symbolNode('x'), numberNode(2));
  if (source === 'x ^ 2 + 2 * x + 1') {
    return binaryNode(
      '+',
      binaryNode('+', binaryNode('^', symbolNode('x'), numberNode(2)), binaryNode('*', numberNode(2), symbolNode('x'))),
      numberNode(1)
    );
  }
  if (source === 'sin(x)') return functionCallNode('sin', [symbolNode('x')]);
  if (source === 'x ^ -1') return binaryNode('^', symbolNode('x'), numberNode(-1));
  if (source === 'x ^ y') return binaryNode('^', symbolNode('x'), symbolNode('y'));
  if (source === '1 / x') return binaryNode('/', numberNode(1), symbolNode('x'));
  if (source === 'sqrt(x)') return functionCallNode('sqrt', [symbolNode('x')]);
  if (source === 'x / y') return binaryNode('/', symbolNode('x'), symbolNode('y'));
  throw new Error(`Unhandled fixture: ${source}`);
}
