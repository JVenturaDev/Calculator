import { binaryNode, isStructurallyEqual, numberNode, unaryNode, type CasExpression } from '../ast/cas-ast';
import { formatCasExpression } from '../format/cas-formatter';
import { CasParser } from '../parser/cas-parser';
import { createCasEngine } from '../public-api';
import { simplifyCasExpression } from '../simplify/cas-simplifier';
import { toPolynomial } from '../polynomial/cas-polynomial';

const parser = new CasParser();
const engine = createCasEngine();

const NUMERIC_SAMPLE_CONTEXTS: readonly Readonly<Record<string, number>>[] = [
  { a: 2, b: 3, c: 5, d: 7, x: 1, y: 4 },
  { a: -3, b: 5, c: 2, d: -7, x: -2, y: 6 },
  { a: 4, b: -2, c: -5, d: 3, x: 3, y: -4 },
  { a: 7, b: 11, c: -2, d: 5, x: -1, y: 2 },
  { a: -5, b: 13, c: 3, d: -11, x: 2, y: -3 },
];

export function expectSimplifiesTo(source: string, expected: string): void {
  const parsed = parser.parse(source);
  expect(parsed.ok).withContext(source).toBeTrue();
  if (!parsed.ok) return;

  const simplified = simplifyCasExpression(parsed.value);
  expect(simplified.ok).withContext(source).toBeTrue();
  if (!simplified.ok) return;

  expect(formatCasExpression(simplified.value)).withContext(source).toBe(expected);
}

export function expectEquivalentExpression(actual: string, expected: string): void {
  const parsedActual = parser.parse(actual);
  const parsedExpected = parser.parse(expected);
  expect(parsedActual.ok).withContext(actual).toBeTrue();
  expect(parsedExpected.ok).withContext(expected).toBeTrue();
  if (!parsedActual.ok || !parsedExpected.ok) return;

  expectEquivalentCasExpression(parsedActual.value, parsedExpected.value, `${actual} ~= ${expected}`);
}

export function expectEquivalentCasExpression(
  actual: CasExpression,
  expected: CasExpression,
  context = `${formatCasExpression(actual)} ~= ${formatCasExpression(expected)}`
): void {
  const simplifiedActual = simplifyCasExpression(actual);
  const simplifiedExpected = simplifyCasExpression(expected);
  if (!simplifiedActual.ok || !simplifiedExpected.ok) {
    if (areExactRationalExpressionsEquivalentOnCommonDomain(actual, expected)) {
      expect(true).withContext(context).toBeTrue();
      return;
    }
    expect(simplifiedActual.ok).withContext(context).toBeTrue();
    expect(simplifiedExpected.ok).withContext(context).toBeTrue();
    return;
  }

  if (isStructurallyEqual(simplifiedActual.value, simplifiedExpected.value)) {
    expect(true).withContext(context).toBeTrue();
    return;
  }

  if (areExactRationalExpressionsEquivalentOnCommonDomain(
    actual,
    expected
  ) || areExactRationalExpressionsEquivalentOnCommonDomain(
    simplifiedActual.value,
    simplifiedExpected.value
  )) {
    expect(true).withContext(context).toBeTrue();
    return;
  }

  const difference = simplifyCasExpression(
    binaryNode('-', simplifiedActual.value, simplifiedExpected.value)
  );
  expect(difference.ok).withContext(context).toBeTrue();
  if (!difference.ok) return;

  if (formatCasExpression(difference.value) === '0') {
    expect(true).withContext(context).toBeTrue();
    return;
  }

  expectNumericallyEquivalentExpressions(
    formatCasExpression(simplifiedActual.value),
    formatCasExpression(simplifiedExpected.value),
    collectFreeSymbolNames(simplifiedActual.value, simplifiedExpected.value)
  );
}

/**
 * Test-only rational equivalence. It proves equality by cross multiplication
 * on the common denominator domain; it deliberately does not cancel anything
 * in production ASTs or make a claim at excluded points.
 */
export function areExactRationalExpressionsEquivalentOnCommonDomain(
  left: CasExpression,
  right: CasExpression
): boolean {
  const leftRational = toTestRationalExpression(left);
  const rightRational = toTestRationalExpression(right);
  if (!leftRational || !rightRational) return false;

  const crossDifference = binaryNode(
    '-',
    binaryNode('*', leftRational.numerator, rightRational.denominator),
    binaryNode('*', rightRational.numerator, leftRational.denominator)
  );
  const polynomial = toPolynomial(crossDifference);
  if (polynomial.ok) {
    return polynomial.value.terms.every(term => term.coefficient === 0);
  }
  const simplified = simplifyCasExpression(crossDifference);
  return simplified.ok && formatCasExpression(simplified.value) === '0';
}

interface TestRationalExpression {
  readonly numerator: CasExpression;
  readonly denominator: CasExpression;
}

function toTestRationalExpression(expression: CasExpression): TestRationalExpression | null {
  switch (expression.kind) {
    case 'number':
    case 'symbol':
      return { numerator: expression, denominator: numberNode(1) };
    case 'unary': {
      const operand = toTestRationalExpression(expression.operand);
      if (!operand) return null;
      return expression.operator === '+'
        ? operand
        : { numerator: unaryNode('-', operand.numerator), denominator: operand.denominator };
    }
    case 'function':
      return null;
    case 'equation':
      return null;
    case 'binary': {
      const signAbsRatio = extractTestSignAbsRatio(expression);
      if (signAbsRatio) return signAbsRatio;
      const left = toTestRationalExpression(expression.left);
      const right = toTestRationalExpression(expression.right);
      if (!left || !right) return null;
      switch (expression.operator) {
        case '+':
          return {
            numerator: binaryNode('+', binaryNode('*', left.numerator, right.denominator), binaryNode('*', right.numerator, left.denominator)),
            denominator: binaryNode('*', left.denominator, right.denominator),
          };
        case '-':
          return {
            numerator: binaryNode('-', binaryNode('*', left.numerator, right.denominator), binaryNode('*', right.numerator, left.denominator)),
            denominator: binaryNode('*', left.denominator, right.denominator),
          };
        case '*':
          return { numerator: binaryNode('*', left.numerator, right.numerator), denominator: binaryNode('*', left.denominator, right.denominator) };
        case '/':
          return { numerator: binaryNode('*', left.numerator, right.denominator), denominator: binaryNode('*', left.denominator, right.numerator) };
        case '^': {
          if (expression.right.kind !== 'number' || !Number.isInteger(expression.right.value)) return null;
          const exponent = expression.right.value;
          if (exponent < 0) {
            return { numerator: binaryNode('^', left.denominator, numberNode(-exponent)), denominator: binaryNode('^', left.numerator, numberNode(-exponent)) };
          }
          return { numerator: binaryNode('^', left.numerator, numberNode(exponent)), denominator: binaryNode('^', left.denominator, numberNode(exponent)) };
        }
      }
    }
  }
}

function extractTestSignAbsRatio(expression: CasExpression): TestRationalExpression | null {
  const factors = flattenTestMultiplicativeDivision(expression);
  if (!factors) return null;

  const signIndex = factors.numerator.findIndex(isUnarySignFunction);
  if (signIndex === -1) return null;
  const sign = factors.numerator[signIndex];
  if (!isUnarySignFunction(sign)) return null;
  const absIndex = factors.denominator.findIndex(candidate =>
    isUnaryAbsFunction(candidate) && isStructurallyEqual(sign.arguments[0], candidate.arguments[0])
  );
  if (absIndex === -1) return null;

  const numerator = factors.numerator.filter((_, index) => index !== signIndex);
  const denominator = factors.denominator.filter((_, index) => index !== absIndex);
  denominator.unshift(sign.arguments[0]);
  return {
    numerator: buildTestProduct(numerator),
    denominator: buildTestProduct(denominator),
  };
}

function flattenTestMultiplicativeDivision(expression: CasExpression): {
  numerator: CasExpression[];
  denominator: CasExpression[];
} | null {
  if (expression.kind !== 'binary' || !['*', '/'].includes(expression.operator)) return null;
  const result = { numerator: [] as CasExpression[], denominator: [] as CasExpression[] };
  const collect = (node: CasExpression, inverted: boolean): void => {
    if (node.kind === 'binary' && node.operator === '*') {
      collect(node.left, inverted);
      collect(node.right, inverted);
      return;
    }
    if (node.kind === 'binary' && node.operator === '/') {
      collect(node.left, inverted);
      collect(node.right, !inverted);
      return;
    }
    (inverted ? result.denominator : result.numerator).push(node);
  };
  collect(expression, false);
  return result;
}

function isUnarySignFunction(expression: CasExpression): expression is CasExpression & {
  readonly kind: 'function';
  readonly arguments: readonly CasExpression[];
} {
  return expression.kind === 'function' && expression.name === 'sign' && expression.arguments.length === 1;
}

function isUnaryAbsFunction(expression: CasExpression): expression is CasExpression & {
  readonly kind: 'function';
  readonly arguments: readonly CasExpression[];
} {
  return expression.kind === 'function' && expression.name === 'abs' && expression.arguments.length === 1;
}

function buildTestProduct(factors: readonly CasExpression[]): CasExpression {
  if (factors.length === 0) {
    return numberNode(1);
  }
  return factors.slice(1).reduce((left, right) => binaryNode('*', left, right), factors[0]);
}

export function expectEquationSatisfied(
  equation: CasExpression,
  context = formatCasExpression(equation)
): void {
  const simplified = simplifyCasExpression(equation);
  expect(simplified.ok).withContext(context).toBeTrue();
  if (!simplified.ok) return;

  if (simplified.value.kind === 'equation') {
    const left = simplifyCasExpression(simplified.value.left);
    const right = simplifyCasExpression(simplified.value.right);
    expect(left.ok).withContext(context).toBeTrue();
    expect(right.ok).withContext(context).toBeTrue();
    if (!left.ok || !right.ok) return;

    expectEquivalentCasExpression(left.value, right.value, context);
    return;
  }

  expectEquivalentCasExpression(simplified.value, numberNode(0), context);
}

export function expectDifferentiatesTo(
  source: string,
  variable: string,
  expected: string
): void {
  const parsed = parser.parse(source);
  expect(parsed.ok).withContext(source).toBeTrue();
  if (!parsed.ok) return;

  const differentiated = engine.differentiate(parsed.value, variable);
  expect(differentiated.ok).withContext(source).toBeTrue();
  if (!differentiated.ok) return;

  const expectedExpression = parser.parse(expected);
  expect(expectedExpression.ok).withContext(expected).toBeTrue();
  if (!expectedExpression.ok) return;

  expectEquivalentCasExpression(differentiated.value, expectedExpression.value, source);
}

export function expectIntegratesTo(
  source: string,
  variable: string,
  expected: string
): void {
  const parsed = parser.parse(source);
  expect(parsed.ok).withContext(source).toBeTrue();
  if (!parsed.ok) return;

  const integrated = engine.integrate(parsed.value, variable);
  expect(integrated.ok).withContext(source).toBeTrue();
  if (!integrated.ok) return;

  const expectedExpression = parser.parse(expected);
  expect(expectedExpression.ok).withContext(expected).toBeTrue();
  if (!expectedExpression.ok) return;

  // Indefinite integrals are defined up to an additive constant.  Their
  // contract is therefore derivative equivalence, not function equality.
  expectAntiderivativeCandidate(parsed.value, integrated.value, variable, source);
  expectAntiderivativeCandidate(parsed.value, expectedExpression.value, variable, expected);
}

export function expectSolvesTo(
  source: string,
  variable: string,
  expected: readonly string[]
): void {
  const parsed = parser.parse(source);
  expect(parsed.ok).withContext(source).toBeTrue();
  if (!parsed.ok) return;

  const solved = engine.solve(parsed.value, variable);
  expect(solved.ok).withContext(source).toBeTrue();
  if (!solved.ok) return;

  expect(solved.kind).withContext(source).toBe('finite');
  expect(solved.text.length).withContext(source).toBe(expected.length);

  const unmatched = [...solved.text];
  for (const expectedSolution of expected) {
    const index = unmatched.findIndex(actualSolution =>
      areCasExpressionsEquivalent(actualSolution, expectedSolution)
    );
    expect(index)
      .withContext(`${source}: missing solution equivalent to ${expectedSolution} in ${solved.text.join(', ')}`)
      .not.toBe(-1);
    if (index !== -1) {
      unmatched.splice(index, 1);
    }
  }
}

export function expectIdempotent(source: string): void {
  const parsed = parser.parse(source);
  expect(parsed.ok).withContext(source).toBeTrue();
  if (!parsed.ok) return;

  const once = simplifyCasExpression(parsed.value);
  expect(once.ok).withContext(source).toBeTrue();
  if (!once.ok) return;

  const twice = simplifyCasExpression(once.value);
  expect(twice.ok).withContext(source).toBeTrue();
  if (!twice.ok) return;

  expect(twice.value).withContext(source).toEqual(once.value);
}

export function expectExactFraction(source: string, expected: string): void {
  const parsed = parser.parse(source);
  expect(parsed.ok).withContext(source).toBeTrue();
  if (!parsed.ok) return;

  expect(formatCasExpression(parsed.value)).withContext(source).toBe(expected);
}

export function expectAntiderivative(
  integrand: string,
  variable: string
): void {
  const parsed = parser.parse(integrand);
  expect(parsed.ok).withContext(integrand).toBeTrue();
  if (!parsed.ok) return;

  const integrated = engine.integrate(parsed.value, variable);
  expect(integrated.ok).withContext(integrand).toBeTrue();
  if (!integrated.ok) return;

  expectAntiderivativeCandidate(parsed.value, integrated.value, variable, integrand);
}

/** Validates an explicit candidate primitive; additive constants are allowed. */
export function expectAntiderivativeCandidate(
  integrand: CasExpression,
  candidate: CasExpression,
  variable: string,
  context = formatCasExpression(integrand)
): void {
  const differentiated = engine.differentiate(candidate, variable);
  expect(differentiated.ok).withContext(context).toBeTrue();
  if (!differentiated.ok) return;

  const simplifiedDerivative = simplifyCasExpression(differentiated.value);
  const rationalRaw = areExactRationalExpressionsEquivalentOnCommonDomain(
    differentiated.value,
    integrand
  );
  const rationalSimplified = simplifiedDerivative.ok &&
    areExactRationalExpressionsEquivalentOnCommonDomain(simplifiedDerivative.value, integrand);
  if (rationalRaw) {
    expect(true).withContext(context).toBeTrue();
    return;
  }

  const diagnostic = [
    `source=${formatCasExpression(integrand)}`,
    `primitive=${formatCasExpression(candidate)}`,
    `rawDerivative=${formatCasExpression(differentiated.value)}`,
    `simplifiedDerivative=${simplifiedDerivative.ok ? formatCasExpression(simplifiedDerivative.value) : '<simplify-failed>'}`,
    `rationalRaw=${rationalRaw}`,
    `rationalSimplified=${rationalSimplified}`,
    `semanticRaw=${describeTestSemanticRelation(differentiated.value, integrand)}`,
    `semanticSimplified=${simplifiedDerivative.ok ? describeTestSemanticRelation(simplifiedDerivative.value, integrand) : 'simplify-failed'}`,
  ].join('; ');

  expectEquivalentCasExpression(
    differentiated.value,
    integrand,
    `${context}; ${diagnostic}`
  );
}

function describeTestSemanticRelation(actual: CasExpression, expected: CasExpression): string {
  const simplifiedActual = simplifyCasExpression(actual);
  const simplifiedExpected = simplifyCasExpression(expected);
  if (!simplifiedActual.ok || !simplifiedExpected.ok) return 'simplify-failed';
  if (isStructurallyEqual(simplifiedActual.value, simplifiedExpected.value)) return 'structural';
  const difference = simplifyCasExpression(binaryNode('-', simplifiedActual.value, simplifiedExpected.value));
  return difference.ok && formatCasExpression(difference.value) === '0' ? 'difference-zero' : 'not-proven';
}

export function expectNoForbiddenDecimal(source: string): void {
  expect(source).not.toContain('0.5');
  expect(source).not.toContain('0.25');
  expect(source).not.toContain('0.3333333333333333');
  expect(source).not.toContain('0.6666666666666666');
}

export function expectNumericallyEquivalentExpressions(
  left: string,
  right: string,
  variablesOrVariable: readonly string[] | string = ['x'],
  samples: readonly number[] = [ -3, -2, -1, 1, 2, 3 ]
): void {
  const parsedLeft = parser.parse(left);
  const parsedRight = parser.parse(right);
  expect(parsedLeft.ok).withContext(left).toBeTrue();
  expect(parsedRight.ok).withContext(right).toBeTrue();
  if (!parsedLeft.ok || !parsedRight.ok) return;

  const variables = Array.isArray(variablesOrVariable)
    ? variablesOrVariable
    : [variablesOrVariable];
  const contexts = buildNumericSampleContexts(variables, samples);
  let validSamples = 0;

  for (const values of contexts) {
    const leftValue = evaluateCasExpression(parsedLeft.value, values);
    const rightValue = evaluateCasExpression(parsedRight.value, values);
    if (leftValue === null || rightValue === null) {
      continue;
    }

    validSamples += 1;
    expect(leftValue)
      .withContext(`${left} ~= ${right} @ ${formatSampleContext(values)}`)
      .toBeCloseTo(rightValue, 9);
  }

  expect(validSamples)
    .withContext(`${left} ~= ${right}: expected at least three valid numeric samples`)
    .toBeGreaterThanOrEqual(3);
}

export function areCasExpressionsEquivalent(actual: string, expected: string): boolean {
  const parsedActual = parser.parse(actual);
  const parsedExpected = parser.parse(expected);
  if (!parsedActual.ok || !parsedExpected.ok) {
    return false;
  }

  const simplifiedActual = simplifyCasExpression(parsedActual.value);
  const simplifiedExpected = simplifyCasExpression(parsedExpected.value);
  if (!simplifiedActual.ok || !simplifiedExpected.ok) {
    return false;
  }

  if (isStructurallyEqual(simplifiedActual.value, simplifiedExpected.value)) {
    return true;
  }

  const difference = simplifyCasExpression(
    binaryNode('-', simplifiedActual.value, simplifiedExpected.value)
  );
  if (difference.ok && formatCasExpression(difference.value) === '0') {
    return true;
  }

  return areNumericallyEquivalentCasExpressions(simplifiedActual.value, simplifiedExpected.value);
}

function areNumericallyEquivalentCasExpressions(
  left: CasExpression,
  right: CasExpression
): boolean {
  const variables = collectFreeSymbolNames(left, right);
  const contexts = buildNumericSampleContexts(variables);
  let validSamples = 0;

  for (const values of contexts) {
    const leftValue = evaluateCasExpression(left, values);
    const rightValue = evaluateCasExpression(right, values);
    if (leftValue === null || rightValue === null) {
      continue;
    }

    if (Math.abs(leftValue - rightValue) > 1e-9) {
      return false;
    }

    validSamples += 1;
  }

  return validSamples >= 3;
}

function collectFreeSymbolNames(...expressions: readonly CasExpression[]): string[] {
  const names = new Set<string>();
  for (const expression of expressions) {
    collectSymbolNames(expression, names);
  }
  names.delete('pi');
  names.delete('π');
  names.delete('Ï€');
  names.delete('e');

  return [...names].sort();
}

function collectSymbolNames(expression: CasExpression, names: Set<string>): void {
  switch (expression.kind) {
    case 'number':
      return;
    case 'symbol':
      names.add(expression.name);
      return;
    case 'unary':
      collectSymbolNames(expression.operand, names);
      return;
    case 'binary':
    case 'equation':
      collectSymbolNames(expression.left, names);
      collectSymbolNames(expression.right, names);
      return;
    case 'function':
      for (const argument of expression.arguments) {
        collectSymbolNames(argument, names);
      }
      return;
    default: {
      const _exhaustive: never = expression;
      return _exhaustive;
    }
  }
}

function buildNumericSampleContexts(
  variables: readonly string[],
  legacySamples: readonly number[] = []
): readonly Readonly<Record<string, number>>[] {
  if (variables.length === 1 && legacySamples.length > 0) {
    return legacySamples.map(value => ({ [variables[0]]: value }));
  }

  if (variables.length === 0) {
    return NUMERIC_SAMPLE_CONTEXTS;
  }

  return NUMERIC_SAMPLE_CONTEXTS.map((baseContext, index) => {
    const context: Record<string, number> = { ...baseContext };
    for (const variable of variables) {
      context[variable] ??= index + 2;
    }

    return context;
  });
}

function evaluateCasExpression(
  expression: CasExpression,
  variables: Readonly<Record<string, number>>
): number | null {
  switch (expression.kind) {
    case 'number':
      return expression.value;
    case 'symbol':
      return evaluateSymbol(expression.name, variables);
    case 'unary': {
      const operand = evaluateCasExpression(expression.operand, variables);
      if (operand === null) return null;
      return expression.operator === '+' ? operand : -operand;
    }
    case 'binary': {
      const left = evaluateCasExpression(expression.left, variables);
      const right = evaluateCasExpression(expression.right, variables);
      if (left === null || right === null) return null;

      switch (expression.operator) {
        case '+':
          return finiteOrNull(left + right);
        case '-':
          return finiteOrNull(left - right);
        case '*':
          return finiteOrNull(left * right);
        case '/':
          return Math.abs(right) < 1e-12 ? null : finiteOrNull(left / right);
        case '^':
          return finiteOrNull(Math.pow(left, right));
      }
    }
    case 'function': {
      const args = expression.arguments.map(argument =>
        evaluateCasExpression(argument, variables)
      );
      if (args.some(value => value === null)) {
        return null;
      }

      return evaluateNumericFunction(expression.name, args as readonly number[]);
    }
    case 'equation':
      return null;
    default: {
      const _exhaustive: never = expression;
      return _exhaustive;
    }
  }
}

function evaluateSymbol(
  name: string,
  variables: Readonly<Record<string, number>>
): number | null {
  if (name in variables) {
    return variables[name];
  }

  switch (name) {
    case 'pi':
    case 'π':
    case 'Ï€':
      return Math.PI;
    case 'e':
      return Math.E;
    default:
      return null;
  }
}

function evaluateNumericFunction(
  name: string,
  values: readonly number[]
): number | null {
  if (values.length !== 1) {
    return null;
  }

  const value = values[0];
  switch (name) {
    case 'sin':
      return finiteOrNull(Math.sin(value));
    case 'cos':
      return finiteOrNull(Math.cos(value));
    case 'tan':
      return Math.abs(Math.cos(value)) < 1e-12 ? null : finiteOrNull(Math.tan(value));
    case 'exp':
    case 'expe':
      return finiteOrNull(Math.exp(value));
    case 'sqrt':
      return value < 0 ? null : finiteOrNull(Math.sqrt(value));
    case 'abs':
      return finiteOrNull(Math.abs(value));
    case 'sign':
      return finiteOrNull(Math.sign(value));
    case 'ln':
    case 'log':
      return value <= 0 ? null : finiteOrNull(Math.log(value));
    case 'cbrt':
      return finiteOrNull(Math.cbrt(value));
    default:
      return null;
  }
}

function finiteOrNull(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

function formatSampleContext(values: Readonly<Record<string, number>>): string {
  return Object.entries(values)
    .map(([name, value]) => `${name}=${value}`)
    .join(', ');
}
