import {
  expectEquationSatisfied,
  expectEquivalentExpression,
} from './cas-test-helpers';
import { CasParser } from '../parser/cas-parser';
import { substituteCasExpression } from '../solve/cas-substitution';

describe('CAS test helpers', () => {
  const parser = new CasParser();

  it('accepts equivalent symbolic formats without requiring identical strings', () => {
    expectEquivalentExpression('-(2 * cos(x))', '-2 * cos(x)');
    expectEquivalentExpression('-(x * cos(x)) + sin(x)', '-x * cos(x) + sin(x)');
    expectEquivalentExpression('4 * sin(2 * x) / 4', 'sin(2 * x)');
    expectEquivalentExpression('9 * cos(3 * x) / 9', 'cos(3 * x)');
  });

  it('accepts equivalent elementary constants through numeric fallback', () => {
    expectEquivalentExpression('1', 'exp(0)');
    expectEquivalentExpression('0', 'sin(0)');
    expectEquivalentExpression('1', 'cos(0)');
    expectEquivalentExpression('-1', '-cos(0)');
    expectEquivalentExpression('sqrt(2) ^ 2', '2');
  });

  it('accepts substituted equations that simplify to true identities', () => {
    const parsed = parser.parse('x ^ 2 - 2 = 0');
    const solution = parser.parse('sqrt(2)');
    expect(parsed.ok).toBeTrue();
    expect(solution.ok).toBeTrue();
    if (!parsed.ok || !solution.ok) return;

    expectEquationSatisfied(
      substituteCasExpression(parsed.value, 'x', solution.value),
      'sqrt(2) satisfies x ^ 2 - 2 = 0'
    );
  });
});
