import {
  areExactRationalExpressionsEquivalentOnCommonDomain,
  expectAntiderivativeCandidate,
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

  it('accepts primitives that differ only by an integration constant', () => {
    const integrand = parser.parse('x');
    const canonicalPrimitive = parser.parse('x ^ 2 / 2');
    const shiftedPrimitive = parser.parse('x ^ 2 / 2 + 7');
    expect(integrand.ok).toBeTrue();
    expect(canonicalPrimitive.ok).toBeTrue();
    expect(shiftedPrimitive.ok).toBeTrue();
    if (!integrand.ok || !canonicalPrimitive.ok || !shiftedPrimitive.ok) return;

    expectAntiderivativeCandidate(integrand.value, canonicalPrimitive.value, 'x');
    expectAntiderivativeCandidate(integrand.value, shiftedPrimitive.value, 'x');
  });

  it('proves exact rational equality on the common denominator domain', () => {
    const equivalentPairs: Array<[string, string]> = [
      ['x + 1 / x', '(x ^ 2 + 1) / x'],
      ['x + 2 / x', '(x ^ 2 + 2) / x'],
      ['x ^ 2 + 1', '(x ^ 3 + x) / x'],
      ['x + 1 + 1 / x', '(x ^ 2 + x + 1) / x'],
      ['x + sign(x) / abs(x)', '(x ^ 2 + 1) / x'],
      ['x + 2 * sign(x) / abs(x)', '(x ^ 2 + 2) / x'],
      ['sign(x) / abs(x)', '1 / x'],
      ['2 * sign(x) / abs(x)', '2 / x'],
      ['3 * sign(x) / abs(x)', '3 / x'],
    ];
    for (const [left, right] of equivalentPairs) {
      const parsedLeft = parser.parse(left);
      const parsedRight = parser.parse(right);
      expect(parsedLeft.ok).toBeTrue();
      expect(parsedRight.ok).toBeTrue();
      if (!parsedLeft.ok || !parsedRight.ok) continue;
      expect(areExactRationalExpressionsEquivalentOnCommonDomain(parsedLeft.value, parsedRight.value))
        .withContext(`${left} ~= ${right}`)
        .toBeTrue();
    }

    const invalidLeft = parser.parse('x + 1 / x');
    const invalidRight = parser.parse('(x ^ 2 + 2) / x');
    expect(invalidLeft.ok).toBeTrue();
    expect(invalidRight.ok).toBeTrue();
    if (!invalidLeft.ok || !invalidRight.ok) return;
    expect(areExactRationalExpressionsEquivalentOnCommonDomain(invalidLeft.value, invalidRight.value)).toBeFalse();

    const secondInvalidLeft = parser.parse('x ^ 2 + 1');
    const secondInvalidRight = parser.parse('(x ^ 3 + 2 * x) / x');
    expect(secondInvalidLeft.ok).toBeTrue();
    expect(secondInvalidRight.ok).toBeTrue();
    if (!secondInvalidLeft.ok || !secondInvalidRight.ok) return;
    expect(areExactRationalExpressionsEquivalentOnCommonDomain(secondInvalidLeft.value, secondInvalidRight.value)).toBeFalse();

    for (const [left, right] of [
      ['2 * sign(x) / abs(x)', '3 / x'],
      ['2 * sign(x) / abs(x + 1)', '2 / x'],
      ['2 * sign(x + 1) / abs(x)', '2 / x'],
    ]) {
      const parsedLeft = parser.parse(left);
      const parsedRight = parser.parse(right);
      expect(parsedLeft.ok).toBeTrue();
      expect(parsedRight.ok).toBeTrue();
      if (!parsedLeft.ok || !parsedRight.ok) continue;
      expect(areExactRationalExpressionsEquivalentOnCommonDomain(parsedLeft.value, parsedRight.value))
        .withContext(`${left} !~= ${right}`)
        .toBeFalse();
    }
  });

  it('uses rational equivalence when validating an explicit antiderivative', () => {
    const cases: Array<[string, string]> = [
      ['(x ^ 2 + 1) / x', 'x ^ 2 / 2 + ln(abs(x))'],
      ['(x ^ 3 + x) / x', 'x ^ 3 / 3 + x'],
    ];
    for (const [source, candidate] of cases) {
      const integrand = parser.parse(source);
      const primitive = parser.parse(candidate);
      expect(integrand.ok).toBeTrue();
      expect(primitive.ok).toBeTrue();
      if (!integrand.ok || !primitive.ok) continue;
      expectAntiderivativeCandidate(integrand.value, primitive.value, 'x', source);
    }
  });
});
