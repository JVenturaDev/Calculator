import { binaryNode, functionCallNode, numberNode, symbolNode } from '../ast/cas-ast';
import { formatCasExpression } from '../format/cas-formatter';
import { CasParser } from '../parser/cas-parser';
import { differentiateCasExpression } from '../differentiate/cas-differentiator';
import { integrateCasExpression, integrateCasText } from './cas-integrator';
import {
  expectAntiderivative,
  expectEquivalentCasExpression,
  expectEquivalentExpression,
  expectIntegratesTo,
  expectIdempotent,
  expectNoForbiddenDecimal,
  expectNumericallyEquivalentExpressions,
} from '../testing/cas-test-helpers';

describe('integrateCasExpression', () => {
  const parser = new CasParser();

  it('integrates constants, variables and simple powers', () => {
    const cases: Array<[string, string]> = [
      ['5', '5 * x'],
      ['y', 'x * y'],
      ['x', 'x ^ 2 / 2'],
      ['x / 2', 'x ^ 2 / 4'],
      ['x ^ 2', 'x ^ 3 / 3'],
      ['x ^ 3', 'x ^ 4 / 4'],
      ['x ^ -2', '-1 / x'],
      ['1 / x', 'ln(abs(x))'],
      ['sqrt(x)', '2 * x * sqrt(x) / 3'],
    ];

    for (const [source, expected] of cases) {
      const parsed = parser.parse(source);
      expect(parsed.ok).withContext(source).toBeTrue();
      if (!parsed.ok) continue;

      const integrated = integrateCasExpression(parsed.value, 'x');
      expect(integrated.ok).withContext(source).toBeTrue();
      if (!integrated.ok) continue;

      expectEquivalentExpression(formatCasExpression(integrated.value), expected);
    }
  });

  it('integrates linear sums and constant factors', () => {
    const cases: Array<[string, string]> = [
      ['x ^ 2 + x', 'x ^ 3 / 3 + x ^ 2 / 2'],
      ['x ^ 2 - 3 * x', 'x ^ 3 / 3 - 3 * x ^ 2 / 2'],
      ['3 * x ^ 2', 'x ^ 3'],
      ['2 * sin(x)', '-2 * cos(x)'],
      ['y * x', 'x ^ 2 * y / 2'],
      ['2 * x * exp(x)', '2 * x * exp(x) - 2 * exp(x)'],
      ['3 * x * sin(x)', '-3 * x * cos(x) + 3 * sin(x)'],
      ['4 * x * cos(x)', '4 * x * sin(x) + 4 * cos(x)'],
    ];

    for (const [source, expected] of cases) {
      const parsed = parser.parse(source);
      expect(parsed.ok).withContext(source).toBeTrue();
      if (!parsed.ok) continue;

      const integrated = integrateCasExpression(parsed.value, 'x');
      expect(integrated.ok).withContext(source).toBeTrue();
      if (!integrated.ok) continue;

      expectEquivalentExpression(formatCasExpression(integrated.value), expected);
    }
  });

  it('keeps commuted products equivalent', () => {
    const cases: Array<[string, string]> = [
      ['exp(x) * x', 'x * exp(x) - exp(x)'],
      ['sin(x) * x', '-x * cos(x) + sin(x)'],
      ['cos(x) * x', 'x * sin(x) + cos(x)'],
    ];

    for (const [source, expected] of cases) {
      const parsed = parser.parse(source);
      expect(parsed.ok).withContext(source).toBeTrue();
      if (!parsed.ok) continue;

      const integrated = integrateCasExpression(parsed.value, 'x');
      expect(integrated.ok).withContext(source).toBeTrue();
      if (!integrated.ok) continue;

      expectEquivalentExpression(formatCasExpression(integrated.value), expected);
    }
  });

  it('integrates sin, cos and exp with simple linear chain rules', () => {
    const cases: Array<[string, string]> = [
      ['sin(x)', '-cos(x)'],
      ['cos(x)', 'sin(x)'],
      ['exp(x)', 'exp(x)'],
      ['sin(2 * x)', '-cos(2 * x) / 2'],
      ['cos(3 * x + 1)', 'sin(3 * x + 1) / 3'],
      ['exp(x) * x', 'x * exp(x) - exp(x)'],
      ['sin(x) * x', '-x * cos(x) + sin(x)'],
      ['cos(x) * x', 'x * sin(x) + cos(x)'],
      ['ln(x)', 'x * ln(x) - x'],
      ['tan(x)', '-ln(abs(cos(x)))'],
    ];

    for (const [source, expected] of cases) {
      const parsed = parser.parse(source);
      expect(parsed.ok).withContext(source).toBeTrue();
      if (!parsed.ok) continue;

      const integrated = integrateCasExpression(parsed.value, 'x');
      expect(integrated.ok).withContext(source).toBeTrue();
      if (!integrated.ok) continue;

      expectEquivalentExpression(formatCasExpression(integrated.value), expected);
    }
  });

  it('keeps the supported results consistent with differentiation', () => {
    const cases = [
      'x ^ 2',
      '3 * x ^ 2',
      'sin(x)',
      'cos(x)',
      'exp(x)',
      'x ^ 2 + x',
      'x * exp(x)',
      'x * sin(x)',
      'x * cos(x)',
    ];

    for (const source of cases) {
      const parsed = parser.parse(source);
      expect(parsed.ok).withContext(source).toBeTrue();
      if (!parsed.ok) continue;

      const integrated = integrateCasExpression(parsed.value, 'x');
      expect(integrated.ok).withContext(source).toBeTrue();
      if (!integrated.ok) continue;

      const differentiated = differentiateCasExpression(integrated.value, 'x');
      expect(differentiated.ok).withContext(source).toBeTrue();
      if (!differentiated.ok) continue;

      expectEquivalentCasExpression(differentiated.value, parsed.value, source);
    }
  });

  it('keeps new exact antiderivatives stable under repeated simplification', () => {
    for (const source of [
      '2 * x * sqrt(x) / 3',
      'ln(abs(x))',
      'x * ln(x) - x',
      'x * exp(x) - exp(x)',
      '-x * cos(x) + sin(x)',
      'x * sin(x) + cos(x)',
    ]) {
      expectIdempotent(source);
    }
  });

  it('validates logarithmic antiderivatives with domain-aware differentiation', () => {
    const cases: Array<[string, string, readonly number[]]> = [
      ['ln(abs(x))', '1 / x', [ -3, -2, -1, 1, 2, 3 ]],
      ['-ln(abs(cos(x)))', 'tan(x)', [ -2.5, -1.5, -0.75, 0.25, 0.75, 1.25 ]],
    ];

    for (const [source, expectedDerivative, samples] of cases) {
      const parsed = parser.parse(source);
      expect(parsed.ok).withContext(source).toBeTrue();
      if (!parsed.ok) continue;

      const differentiated = differentiateCasExpression(parsed.value, 'x');
      expect(differentiated.ok).withContext(source).toBeTrue();
      if (!differentiated.ok) continue;

      expectNumericallyEquivalentExpressions(
        formatCasExpression(differentiated.value),
        expectedDerivative,
        'x',
        samples
      );
    }
  });

  it('preserves exact antiderivatives under diff(integrate(f)) - f', () => {
    const cases = [
      'x',
      'x ^ 2',
      'x ^ 3',
      'x / 2',
      '3 * x ^ 2',
      'y * x',
      'sin(x)',
      'sin(2 * x)',
      'cos(3 * x)',
      'exp(2 * x)',
      'x ^ 2 + x',
      'sqrt(x)',
      'ln(x)',
      'x * exp(x)',
      'x * sin(x)',
      'x * cos(x)',
    ];

    for (const source of cases) {
      expectAntiderivative(source, 'x');
    }
  });

  it('reports unsupported integrals with typed metadata', () => {
    const parsed = parser.parse('factorial(x)');
    expect(parsed.ok).toBeTrue();
    if (!parsed.ok) return;

    const integrated = integrateCasExpression(parsed.value, 'x');
    expect(integrated).toEqual({
      ok: false,
      error: jasmine.objectContaining({
        code: 'CAS_UNSUPPORTED_INTEGRAL',
        functionName: 'factorial',
      }),
    });
  });

  it('keeps inputs immutable', () => {
    const expression = binaryNode(
      '+',
      functionCallNode('sin', [symbolNode('x')]),
      numberNode(2)
    );
    const snapshot = JSON.parse(JSON.stringify(expression));

    const integrated = integrateCasExpression(expression, 'x');
    expect(integrated.ok).toBeTrue();
    expect(expression).toEqual(snapshot);
  });

  it('supports text integration through the helper', () => {
    const result = integrateCasText('x ^ 2', 'x', parser);

    expect(result.ok).toBeTrue();
    if (!result.ok) return;

    expect(result.value.text).toBe('x ^ 3 / 3');
  });

  it('does not decimalize critical integral outputs', () => {
    const cases: Array<[string, string]> = [
      ['x', 'x ^ 2 / 2'],
      ['x ^ 2', 'x ^ 3 / 3'],
      ['x ^ 3', 'x ^ 4 / 4'],
      ['x / 2', 'x ^ 2 / 4'],
      ['1 / x', 'ln(abs(x))'],
      ['x ^ 2 + x', 'x ^ 3 / 3 + x ^ 2 / 2'],
      ['x ^ 2 - 3 * x', 'x ^ 3 / 3 - 3 * x ^ 2 / 2'],
      ['sqrt(x)', '2 * x * sqrt(x) / 3'],
      ['ln(x)', 'x * ln(x) - x'],
      ['x * exp(x)', 'x * exp(x) - exp(x)'],
      ['x * sin(x)', '-x * cos(x) + sin(x)'],
      ['x * cos(x)', 'x * sin(x) + cos(x)'],
    ];

    for (const [source, expected] of cases) {
      const parsed = parser.parse(source);
      expect(parsed.ok).withContext(source).toBeTrue();
      if (!parsed.ok) continue;

      const integrated = integrateCasExpression(parsed.value, 'x');
      expect(integrated.ok).withContext(source).toBeTrue();
      if (!integrated.ok) continue;

      const text = formatCasExpression(integrated.value);
      expectEquivalentExpression(text, expected);
      expectNoForbiddenDecimal(text);
    }
  });

  it('integrates rational powers exactly', () => {
    const cases: Array<[string, string]> = [
      ['x ^ (1 / 2)', '2 * x ^ (3 / 2) / 3'],
      ['x ^ (-1 / 2)', '2 * sqrt(x)'],
      ['x ^ (1 / 3)', '3 * x ^ (4 / 3) / 4'],
      ['x ^ -1', 'ln(abs(x))'],
    ];

    for (const [source, expected] of cases) {
      expectIntegratesTo(source, 'x', expected);
      expectAntiderivative(source, 'x');
      const parsed = parser.parse(source);
      if (!parsed.ok) continue;
      const integrated = integrateCasExpression(parsed.value, 'x');
      if (integrated.ok) expectNoForbiddenDecimal(formatCasExpression(integrated.value));
    }
  });

  it('integrates exact linear families', () => {
    const cases: Array<[string, string]> = [
      ['(2 * x + 1) ^ 2', '(2 * x + 1) ^ 3 / 6'],
      ['(3 * x - 2) ^ 3', '(3 * x - 2) ^ 4 / 12'],
      ['sqrt(2 * x + 1)', '(2 * x + 1) ^ (3 / 2) / 3'],
      ['1 / (2 * x + 1)', 'ln(abs(2 * x + 1)) / 2'],
      ['exp(2 * x + 1)', 'exp(2 * x + 1) / 2'],
      ['sin(3 * x - 1)', '-cos(3 * x - 1) / 3'],
      ['cos(4 * x + 2)', 'sin(4 * x + 2) / 4'],
      ['tan(2 * x)', '-ln(abs(cos(2 * x))) / 2'],
      ['ln(2 * x + 1)', '((2 * x + 1) * ln(2 * x + 1) - (2 * x + 1)) / 2'],
    ];

    for (const [source, expected] of cases) {
      expectIntegratesTo(source, 'x', expected);
      expectAntiderivative(source, 'x');
    }
  });

  it('extracts independent factors, preserves linearity and applies bounded structural patterns', () => {
    const cases: Array<[string, string]> = [
      ['a * b * sin(x)', '-a * b * cos(x)'],
      ['x ^ 2 + 2 * x + 1', 'x ^ 3 / 3 + x ^ 2 + x'],
      ['sin(x) + exp(x)', '-cos(x) + exp(x)'],
      ['x ^ 2 * exp(x)', 'exp(x) * (x ^ 2 - 2 * x + 2)'],
      ['2 * x * cos(x ^ 2)', 'sin(x ^ 2)'],
      ['4 * x * exp(x ^ 2)', '2 * exp(x ^ 2)'],
      ['2 * x / (x ^ 2 + 1)', 'ln(abs(x ^ 2 + 1))'],
      ['6 * x / (x ^ 2 + 1)', '3 * ln(abs(x ^ 2 + 1))'],
      ['3 * x ^ 2 / (x ^ 3 + 4)', 'ln(abs(x ^ 3 + 4))'],
    ];

    for (const [source, expected] of cases) {
      expectIntegratesTo(source, 'x', expected);
      expectAntiderivative(source, 'x');
    }
  });

  it('keeps the bounded by-parts dispatch mathematically valid', () => {
    for (const source of ['x * sin(x)', 'x * cos(x)', 'x ^ 2 * exp(x)']) {
      expectAntiderivative(source, 'x');
    }
  });

  it('integrates controlled exact rational families', () => {
    const cases = [
      '(x ^ 2 + 1) / x',
      '(x ^ 2 + 2) / x',
      '(x ^ 3 + x) / x',
      '(x ^ 2 + x + 1) / x',
      '(x ^ 2 + 3 * x + 2) / (x + 1)',
      '1 / (x * (x + 1))',
      '1 / ((x - 1) * (x + 1))',
      '(3 * x + 1) / (x * (x + 1))',
      '1 / (x + 1) ^ 2',
      'x / (x + 1) ^ 2',
      '1 / ((x + 1) * x)',
      '1 / ((x + 1) * (x - 1))',
    ];

    for (const source of cases) {
      expectAntiderivative(source, 'x');
      const parsed = parser.parse(source);
      if (!parsed.ok) continue;
      const integrated = integrateCasExpression(parsed.value, 'x');
      if (integrated.ok) expectNoForbiddenDecimal(formatCasExpression(integrated.value));
    }
  });

  it('reports unsupported integrals for cases outside the limited rules', () => {
    for (const source of [
      'x * ln(x)',
      'x ^ 2 * sin(x)',
      'x ^ 2 * cos(x)',
      'sin(x) * x ^ 2',
      'cos(x) * x ^ 2',
      'exp(x ^ 2)',
      'sin(x ^ 2)',
      '1 / (x ^ 2 + 1)',
      'x ^ x',
      'sqrt(x ^ 2 + 1)',
      '(x + 1) * cos(x ^ 2)',
      'x ^ 4 * exp(x)',
      'factorial(x)',
      '1 / (x ^ 2 + x + 1)',
      '1 / (x ^ 3 + 1)',
      '1 / (sin(x) + 1)',
      'x ^ x / (x + 1)',
      'exp(x) / (x + 1)',
      '1 / ((x ^ 2 + 1) * (x + 1))',
    ]) {
      const parsed = parser.parse(source);
      expect(parsed.ok).withContext(source).toBeTrue();
      if (!parsed.ok) continue;

      const integrated = integrateCasExpression(parsed.value, 'x');
      expect(integrated).toEqual({
        ok: false,
        error: jasmine.objectContaining({
          code: 'CAS_UNSUPPORTED_INTEGRAL',
        }),
      });
    }
  });
});
