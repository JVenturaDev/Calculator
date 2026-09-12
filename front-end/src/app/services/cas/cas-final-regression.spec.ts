import { isStructurallyEqual, type CasExpression } from './ast/cas-ast';
import { formatCasExpression } from './format/cas-formatter';
import { createCasEngine } from './public-api';
import {
  expectAntiderivative,
  expectIdempotent,
  expectNoForbiddenDecimal,
} from './testing/cas-test-helpers';

describe('CAS final cross-subsystem regression', () => {
  const engine = createCasEngine();

  it('keeps supported antiderivative families semantically valid and exact', () => {
    const integrands = [
      'x ^ 5',
      'sqrt(x)',
      '1 / x',
      '1 / (2 * x + 1)',
      'sin(2 * x + 1)',
      'cos(3 * x - 2)',
      'tan(2 * x)',
      'exp(3 * x + 1)',
      'ln(x)',
      '2 * x / (x ^ 2 + 1)',
      '1 / (x * (x + 1) * (x + 2))',
      '1 / ((x + 1) * (x ^ 2 + 1))',
      '1 / (x ^ 2 + 1)',
      '1 / (x ^ 2 + 1) ^ 2',
      '1 / ((x ^ 2 + 1) * (x ^ 2 + 4))',
      '1 / ((x ^ 2 + 1) ^ 2 * (x ^ 2 + 4))',
      '1 / ((x ^ 2 + 1) ^ 2 * (x ^ 2 + 4) ^ 2)',
    ];

    for (const source of integrands) {
      expectAntiderivative(source, 'x');
      const integrated = engine.integrateText(source, 'x');
      expect(integrated.ok).withContext(source).toBeTrue();
      if (integrated.ok) expectNoForbiddenDecimal(integrated.value.text);
    }
  });

  it('terminates adversarial integrals with a typed unsupported error', () => {
    const unsupported = [
      'exp(x ^ 2)',
      'sin(x ^ 2)',
      'x ^ x',
      'sqrt(x ^ 2 + 1)',
      '1 / (x ^ 4 + 1)',
      '1 / (x ^ 3 + 1)',
      '1 / (x ^ 2 + x + 1) ^ 3',
      '1 / ((x ^ 2 + 1) ^ 3 * (x ^ 2 + 4))',
      '1 / ((x ^ 2 + 1) ^ 2 * (x ^ 2 + 4) ^ 3)',
      '1 / ((x ^ 2 + 1) ^ 2 * (x ^ 2 + 4) ^ 2 * (x ^ 2 + 9))',
      '1 / ((x + 1) * (x ^ 2 + 1) ^ 2 * (x ^ 2 + 4))',
    ];

    for (const source of unsupported) {
      const result = engine.integrateText(source, 'x');
      expect(result.ok).withContext(source).toBeFalse();
      if (!result.ok) {
        expect(result.error.code).withContext(source).toBe('CAS_UNSUPPORTED_INTEGRAL');
      }
    }
  });

  it('keeps canonical simplification idempotent without unsafe cancellation', () => {
    for (const source of [
      'x + x',
      'x * y + y * x',
      '-(x - y)',
      '1 / 2 * x + x / 2',
      'ln(abs(x))',
      'atan(x)',
      '-(-x)',
      '-(x + y)',
      'x + (-y)',
      '(-1) * x',
      '(-a) / (-b)',
    ]) {
      expectIdempotent(source);
    }

    for (const source of ['x / x', '0 / x', 'sqrt(x ^ 2)']) {
      const result = engine.simplifyText(source);
      expect(result.ok).withContext(source).toBeTrue();
      if (result.ok) expect(result.value.text).withContext(source).toBe(source);
    }
  });

  it('round-trips supported function syntax through parser and formatter', () => {
    for (const source of [
      'abs(x)',
      'sign(x)',
      'ln(x)',
      'exp(x)',
      'sqrt(x)',
      'cbrt(x)',
      'atan(x)',
      'sin(x)',
      'cos(x)',
      'tan(x)',
      'asin(x)',
      'acos(x)',
      'sinh(x)',
      'cosh(x)',
      'tanh(x)',
      '(2 * x + 1) / 8',
    ]) {
      const parsed = engine.parse(source);
      expect(parsed.ok).withContext(source).toBeTrue();
      if (!parsed.ok) continue;
      const rendered = formatCasExpression(parsed.value);
      const reparsed = engine.parse(rendered);
      expect(reparsed.ok).withContext(rendered).toBeTrue();
      if (reparsed.ok) {
        expect(isStructurallyEqual(reparsed.value, parsed.value)).withContext(source).toBeTrue();
      }
    }
  });

  it('keeps representative public operations interoperable and exact', () => {
    const derivative = engine.differentiateText('sin(x ^ 2)', 'x');
    expect(derivative.ok).toBeTrue();
    if (derivative.ok) expectNoForbiddenDecimal(derivative.value.text);

    const solved = engine.solveText('3 * x - 1 = 0', 'x');
    expect(solved.ok).toBeTrue();
    if (solved.ok) {
      expect(solved.kind).toBe('finite');
      expect(solved.text).toEqual(['1 / 3']);
    }

    const limit = engine.limitText('1 / x', 'x', '0', { direction: 'right' });
    expect(limit.ok).toBeTrue();
    if (limit.ok) expect(limit.value.text).toBe('+∞');

    const taylor = engine.taylorText('exp(x)', 'x', '0', 4);
    expect(taylor.ok).toBeTrue();
    if (taylor.ok) expectNoForbiddenDecimal(taylor.value.text);

    const convergence = engine.analyzeSeriesConvergenceText('1 / (1 - 2 * x)', 'x', '0');
    expect(convergence.ok).toBeTrue();
    if (convergence.ok) {
      expect(convergence.value.radius).toEqual({ kind: 'finite', value: '1 / 2' });
      expectNoForbiddenDecimal(convergence.value.text);
    }
  });

  it('handles a deterministic shallow expression corpus without invalid AST numbers', () => {
    const corpus = [
      '-3 + x',
      '(x + 2) * (x - 3)',
      '(x ^ 2 + 1) / (x + 1)',
      'sin(x + 1)',
      'cos(x ^ 2)',
      'exp(2 * x)',
      '(x ^ 3 - 1) / 3',
      'sin(x) * cos(x)',
      '(x + 1) / (x ^ 2 + 1)',
      '-(x ^ 2 + 2 * x + 1)',
    ];

    for (const source of corpus) {
      const parsed = engine.parse(source);
      expect(parsed.ok).withContext(source).toBeTrue();
      if (!parsed.ok) continue;
      const simplified = engine.simplify(parsed.value);
      expect(simplified.ok).withContext(source).toBeTrue();
      if (simplified.ok) expectFiniteAstNumbers(simplified.value, source);

      const differentiated = engine.differentiate(parsed.value, 'x');
      if (differentiated.ok) expectFiniteAstNumbers(differentiated.value, source);
      else expect(differentiated.error.code).withContext(source).toBeTruthy();

      const integrated = engine.integrate(parsed.value, 'x');
      if (integrated.ok) expectFiniteAstNumbers(integrated.value, source);
      else expect(integrated.error.code).withContext(source).toBeTruthy();
    }
  });

  it('terminates bounded sparse and stress polynomial cases', () => {
    for (const source of [
      '(x ^ 4 + 1) / (x ^ 2 + 1)',
      '(x ^ 5 + x) / (x ^ 2 + 1)',
      '(x ^ 6 + 1) / (x ^ 2 + 1) ^ 2',
    ]) {
      const parsed = engine.parse(source);
      expect(parsed.ok).withContext(source).toBeTrue();
      if (!parsed.ok) continue;
      const result = engine.integrate(parsed.value, 'x');
      if (result.ok) expectFiniteAstNumbers(result.value, source);
      else expect(result.error.code).withContext(source).toBe('CAS_UNSUPPORTED_INTEGRAL');
    }

    const polynomial = Array.from({ length: 20 }, (_, index) =>
      `${index + 1} * x ^ ${index}`
    ).join(' + ');
    const simplified = engine.simplifyText(polynomial);
    expect(simplified.ok).toBeTrue();
    if (simplified.ok) expectNoForbiddenDecimal(simplified.value.text);
  });
});

function expectFiniteAstNumbers(expression: CasExpression, context: string): void {
  switch (expression.kind) {
    case 'number':
      expect(Number.isFinite(expression.value)).withContext(context).toBeTrue();
      return;
    case 'symbol':
      return;
    case 'unary':
      expectFiniteAstNumbers(expression.operand, context);
      return;
    case 'binary':
    case 'equation':
      expectFiniteAstNumbers(expression.left, context);
      expectFiniteAstNumbers(expression.right, context);
      return;
    case 'function':
      expression.arguments.forEach(argument => expectFiniteAstNumbers(argument, context));
  }
}
