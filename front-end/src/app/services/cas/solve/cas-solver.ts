import {
  binaryNode,
  equationNode,
  functionCallNode,
  isStructurallyEqual,
  numberNode,
  unaryNode,
  type CasBinaryNode,
  type CasExpression,
} from '../ast/cas-ast';
import { createCasError } from '../errors/cas-errors';
import { DEFAULT_CAS_LIMITS, resolveCasLimits, type CasLimits } from '../limits/cas-limits';
import { casFailure, casSuccess, type CasFailure, type CasResult } from '../result/cas-result';
import { formatCasExpression } from '../format/cas-formatter';
import { simplifyCasExpression } from '../simplify/cas-simplifier';
import {
  fromPolynomial,
  normalizePolynomial,
  toPolynomial,
  type Polynomial,
  type PolynomialTerm,
} from '../polynomial/cas-polynomial';
import { validateCasVariable } from '../variable/cas-variable';
import { substituteCasExpression } from './cas-substitution';
import { reduceExactRationalExpression } from '../rational/cas-rational';
import type { CasOperationOptions } from '../differentiate/cas-differentiator';

export type CasSolutionKind = 'finite' | 'none' | 'infinite';

export interface CasSolveSuccess {
  readonly ok: true;
  readonly kind: CasSolutionKind;
  readonly variable: string;
  readonly normalizedEquation: CasExpression;
  readonly solutions: readonly CasExpression[];
  readonly text: readonly string[];
  readonly latex: readonly string[];
  readonly exact: boolean;
}

export type CasSolveResult = CasSolveSuccess | CasFailure;

interface UnivariateCoefficients {
  readonly degree: number;
  readonly coefficients: readonly CasExpression[];
}

export function solveCasExpression(
  equation: CasExpression,
  variable: string,
  options: CasOperationOptions = {}
): CasSolveResult {
  const normalizedVariable = validateCasVariable(variable);
  if (!normalizedVariable.ok) {
    return normalizedVariable;
  }

  const limits = resolveCasLimits(options.limits ?? DEFAULT_CAS_LIMITS);
  const normalizedEquation = normalizeEquation(equation, limits);
  if (!normalizedEquation.ok) {
    return normalizedEquation;
  }

  const polynomial = toPolynomial(normalizedEquation.value.normalizedExpression, {
    limits,
    maxExponent: 8,
    maxTerms: 256,
  });
  if (!polynomial.ok) {
    return polynomial;
  }

  const normalizedPolynomial = normalizePolynomial(polynomial.value);
  const coefficients = getUnivariateCoefficients(
    normalizedPolynomial,
    normalizedVariable.value
  );
  if (!coefficients.ok) {
    return coefficients;
  }

  switch (coefficients.value.degree) {
    case 0:
      return isZeroPolynomial(normalizedPolynomial)
        ? createSolveResult('infinite', normalizedVariable.value, normalizedEquation.value.normalizedEquation)
        : createSolveResult('none', normalizedVariable.value, normalizedEquation.value.normalizedEquation);
    case 1:
      return solveLinear(
        coefficients.value,
        normalizedVariable.value,
        normalizedEquation.value.normalizedEquation,
        limits
      );
    case 2:
      return solveQuadratic(
        coefficients.value,
        normalizedVariable.value,
        normalizedEquation.value.normalizedEquation,
        limits
      );
    default:
      return casFailure(
        createCasError(
          'UNSUPPORTED_POLYNOMIAL_DEGREE',
          'La ecuación sólo admite grado 0, 1 y 2.'
        )
      );
  }
}

export function solveCasText(
  source: string,
  variable: string,
  parser: { parse(source: string): CasResult<CasExpression> },
  options: CasOperationOptions = {}
): CasSolveResult {
  const parsed = parser.parse(source);
  if (!parsed.ok) {
    return parsed;
  }

  return solveCasExpression(parsed.value, variable, options);
}

function normalizeEquation(
  equation: CasExpression,
  limits: CasLimits
): CasResult<{
  readonly normalizedExpression: CasExpression;
  readonly normalizedEquation: CasExpression;
}> {
  const expression =
    equation.kind === 'equation'
      ? binaryNode('-', equation.left, equation.right)
      : equation;

  const simplified = simplifyCasExpression(expression, { limits });
  if (!simplified.ok) {
    return simplified;
  }

  const normalizedEquation = equationNode(simplified.value, numberNode(0));
  return casSuccess({
    normalizedExpression: simplified.value,
    normalizedEquation,
  });
}

function solveLinear(
  coefficients: UnivariateCoefficients,
  variable: string,
  normalizedEquation: CasExpression,
  limits: CasLimits
): CasSolveResult {
  const [constant, linear] = coefficients.coefficients;
  if (!linear || linear.kind !== 'number') {
    return casFailure(
      createCasError(
        'UNSUPPORTED_EXPRESSION',
        'La ecuación lineal requiere un coeficiente principal numérico.'
      )
    );
  }

  const candidate = normalizeExactSolution(
    buildExactDivision(unaryMinus(constant), linear.value)
  );

  return buildFiniteSolutionResult(
    variable,
    normalizedEquation,
    [candidate],
    limits
  );
}

function solveQuadratic(
  coefficients: UnivariateCoefficients,
  variable: string,
  normalizedEquation: CasExpression,
  limits: CasLimits
): CasSolveResult {
  const [constant, linear, quadratic] = coefficients.coefficients;
  if (
    !constant ||
    !linear ||
    !quadratic ||
    constant.kind !== 'number' ||
    linear.kind !== 'number' ||
    quadratic.kind !== 'number'
  ) {
    return casFailure(
      createCasError(
        'UNSUPPORTED_EXPRESSION',
        'La ecuación cuadrática requiere coeficientes numéricos.'
      )
    );
  }

  const c = constant.value;
  const b = linear.value;
  const a = quadratic.value;
  if (a === 0) {
    return casFailure(
      createCasError(
        'UNSUPPORTED_EXPRESSION',
        'El coeficiente principal de la ecuación cuadrática no puede ser cero.'
      )
    );
  }

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    return createSolveResult('none', variable, normalizedEquation);
  }

  const denominator = 2 * a;
  const negativeB = numberNode(-b);

  if (discriminant === 0) {
    return buildFiniteSolutionResult(
      variable,
      normalizedEquation,
      [normalizeExactSolution(buildExactDivision(negativeB, denominator))],
      limits
    );
  }

  const sqrtDiscriminant = exactSquareRoot(discriminant);
  if (!sqrtDiscriminant) {
    return casFailure(
      createCasError(
        'UNSUPPORTED_EXPRESSION',
        'La raíz cuadrática no puede representarse con exactitud.'
      )
    );
  }

  const minusNumerator = normalizeExactNode(
    binaryNode('+', negativeB, unaryNode('-', sqrtDiscriminant))
  );
  const plusNumerator = normalizeExactNode(
    binaryNode('+', negativeB, sqrtDiscriminant)
  );

  return buildFiniteSolutionResult(
    variable,
    normalizedEquation,
    [
      normalizeExactSolution(buildExactDivision(minusNumerator, denominator)),
      normalizeExactSolution(buildExactDivision(plusNumerator, denominator)),
    ],
    limits
  );
}

function buildFiniteSolutionResult(
  variable: string,
  normalizedEquation: CasExpression,
  candidates: readonly CasExpression[],
  limits: CasLimits
): CasSolveResult {
  const normalizedSolutions: CasExpression[] = [];

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeExactSolution(candidate);

    if (!isSolutionValid(normalizedEquation, variable, normalizedCandidate, limits)) {
      continue;
    }

    if (
      !normalizedSolutions.some(solution =>
        isStructurallyEqual(solution, normalizedCandidate)
      )
    ) {
      normalizedSolutions.push(normalizedCandidate);
    }
  }

  normalizedSolutions.sort(compareSolutions);

  if (normalizedSolutions.length === 0) {
    return createSolveResult('none', variable, normalizedEquation);
  }

  return {
    ok: true,
    kind: 'finite',
    variable,
    normalizedEquation,
    solutions: normalizedSolutions,
    text: normalizedSolutions.map(solution => formatCasExpression(solution)),
    latex: normalizedSolutions.map(solution => formatCasExpression(solution)),
    exact: true,
  };
}

function createSolveResult(
  kind: Exclude<CasSolutionKind, 'finite'>,
  variable: string,
  normalizedEquation: CasExpression
): CasSolveSuccess {
  return {
    ok: true,
    kind,
    variable,
    normalizedEquation,
    solutions: [],
    text: [],
    latex: [],
    exact: true,
  };
}

function getUnivariateCoefficients(
  polynomial: Polynomial,
  variable: string
): CasResult<UnivariateCoefficients> {
  const grouped = new Map<number, PolynomialTerm[]>();
  let degree = 0;

  for (const term of polynomial.terms) {
    const exponent = term.powers[variable] ?? 0;
    if (!Number.isInteger(exponent) || exponent < 0) {
      return casFailure(
        createCasError(
          'UNSUPPORTED_EXPRESSION',
          'La ecuación contiene potencias no soportadas.'
        )
      );
    }

    if (exponent > 2) {
      return casFailure(
        createCasError(
          'UNSUPPORTED_POLYNOMIAL_DEGREE',
          'La ecuación sólo admite grado 0, 1 y 2.'
        )
      );
    }

    degree = Math.max(degree, exponent);

    const strippedPowers: Record<string, number> = {};
    for (const [name, power] of Object.entries(term.powers)) {
      if (name !== variable && power !== 0) {
        strippedPowers[name] = power;
      }
    }

    const bucket = grouped.get(exponent) ?? [];
    bucket.push({
      coefficient: term.coefficient,
      powers: strippedPowers,
    });
    grouped.set(exponent, bucket);
  }

  const coefficients = Array.from({ length: degree + 1 }, (_, currentDegree) =>
    fromPolynomial({
      terms: grouped.get(currentDegree) ?? [],
    })
  );

  return casSuccess({
    degree,
    coefficients,
  });
}

function isSolutionValid(
  normalizedEquation: CasExpression,
  variable: string,
  candidate: CasExpression,
  limits: CasLimits
): boolean {
  const substituted = substituteCasExpression(normalizedEquation, variable, candidate);
  const simplified = simplifyCasExpression(substituted, { limits });
  if (!simplified.ok) {
    return false;
  }

  const polynomial = toPolynomial(simplified.value, {
    limits,
    maxExponent: 8,
    maxTerms: 256,
  });
  if (!polynomial.ok) {
    return true;
  }

  return isZeroPolynomial(normalizePolynomial(polynomial.value));
}

function isZeroPolynomial(polynomial: Polynomial): boolean {
  return polynomial.terms.length === 0
    || (polynomial.terms.length === 1 && polynomial.terms[0].coefficient === 0);
}

function compareSolutions(left: CasExpression, right: CasExpression): number {
  if (left.kind === 'number' && right.kind === 'number') {
    return left.value - right.value;
  }

  return formatCasExpression(left).localeCompare(formatCasExpression(right));
}

function unaryMinus(expression: CasExpression): CasExpression {
  if (expression.kind === 'number') {
    return numberNode(-expression.value);
  }

  if (expression.kind === 'unary' && expression.operator === '-') {
    return expression.operand;
  }

  if (expression.kind === 'binary' && expression.operator === '/') {
    return binaryNode('/', unaryMinus(expression.left), expression.right);
  }

  return unaryNode('-', expression);
}

function exactSquareRoot(value: number): CasExpression | null {
  if (!Number.isInteger(value) || value < 0) {
    return null;
  }

  if (value === 0) {
    return numberNode(0);
  }

  const factors = factorSquarePart(value);
  if (factors.perfectSquare === 1 && factors.remainder === 1) {
    return numberNode(1);
  }

  if (factors.remainder === 1) {
    return numberNode(factors.perfectSquare);
  }

  const root = functionCallNode('sqrt', [numberNode(factors.remainder)]);
  if (factors.perfectSquare === 1) {
    return root;
  }

  return binaryNode('*', numberNode(factors.perfectSquare), root);
}

function factorSquarePart(value: number): {
  readonly perfectSquare: number;
  readonly remainder: number;
} {
  let remainder = value;
  let perfectSquare = 1;

  for (let factor = 2; factor * factor <= remainder; factor++) {
    const square = factor * factor;
    while (remainder % square === 0) {
      perfectSquare *= factor;
      remainder /= square;
    }
  }

  return {
    perfectSquare,
    remainder,
  };
}

function buildExactDivision(
  numerator: CasExpression,
  denominator: number
): CasExpression {
  if (denominator === 1) {
    return numerator;
  }

  if (denominator === -1) {
    return unaryMinus(numerator);
  }

  const normalizedNumerator = normalizeExactNode(numerator);
  if (normalizedNumerator.kind === 'unary' && normalizedNumerator.operator === '-') {
    return unaryMinus(buildExactDivision(normalizedNumerator.operand, denominator));
  }

  if (normalizedNumerator.kind === 'number') {
    return reduceExactNumberFraction(normalizedNumerator.value, denominator);
  }

  const factors = collectMultiplicationFactors(normalizedNumerator);
  let numericFactor = 1;
  const nonNumericFactors: CasExpression[] = [];

  for (const factor of factors) {
    if (factor.kind === 'number') {
      numericFactor *= factor.value;
    } else {
      nonNumericFactors.push(factor);
    }
  }

  const normalizedDenominator = denominator < 0 ? -denominator : denominator;
  const normalizedFactor = denominator < 0 ? -numericFactor : numericFactor;

  if (
    Number.isInteger(normalizedFactor) &&
    Number.isInteger(normalizedDenominator)
  ) {
    const divisor = gcdOfIntegers(
      Math.abs(normalizedFactor),
      Math.abs(normalizedDenominator)
    );
    const reducedFactor = normalizedFactor / divisor;
    const reducedDenominator = normalizedDenominator / divisor;
    const rebuilt = buildSignedProduct(reducedFactor, nonNumericFactors);

    if (reducedDenominator === 1) {
      return rebuilt;
    }

    return binaryNode('/', rebuilt, numberNode(reducedDenominator));
  }

  return binaryNode('/', normalizedNumerator, numberNode(normalizedDenominator));
}

function normalizeExactSolution(expression: CasExpression): CasExpression {
  return normalizeExactNode(expression);
}

function normalizeExactNode(expression: CasExpression): CasExpression {
  switch (expression.kind) {
    case 'number':
      return numberNode(expression.value);
    case 'symbol':
      return expression;
    case 'unary': {
      const operand = normalizeExactNode(expression.operand);
      if (expression.operator === '+') {
        return operand;
      }

      if (operand.kind === 'number') {
        return numberNode(-operand.value);
      }

      if (operand.kind === 'unary' && operand.operator === '-') {
        return operand.operand;
      }

      return unaryNode('-', operand);
    }
    case 'binary': {
      const left = normalizeExactNode(expression.left);
      const right = normalizeExactNode(expression.right);
      const operator: CasBinaryNode['operator'] = expression.operator;

      switch (operator) {
        case '+':
          return combineAddition(left, right);
        case '-':
          return combineSubtraction(left, right);
        case '*':
          return combineMultiplication(left, right);
        case '/':
          return combineDivision(left, right);
        case '^':
          return combinePower(left, right);
        default: {
          const _exhaustive: never = operator;
          return _exhaustive;
        }
      }
    }
    case 'function':
      return functionCallNode(
        expression.name,
        expression.arguments.map(argument => normalizeExactNode(argument))
      );
    case 'equation':
      return equationNode(
        normalizeExactNode(expression.left),
        normalizeExactNode(expression.right)
      );
    default: {
      const _exhaustive: never = expression;
      return _exhaustive;
    }
  }
}

function combineAddition(left: CasExpression, right: CasExpression): CasExpression {
  if (isZeroExpression(left)) {
    return right;
  }

  if (isZeroExpression(right)) {
    return left;
  }

  if (left.kind === 'number' && right.kind === 'number') {
    return numberNode(left.value + right.value);
  }

  return binaryNode('+', left, right);
}

function combineSubtraction(left: CasExpression, right: CasExpression): CasExpression {
  if (isZeroExpression(right)) {
    return left;
  }

  if (isZeroExpression(left)) {
    return unaryMinus(right);
  }

  if (left.kind === 'number' && right.kind === 'number') {
    return numberNode(left.value - right.value);
  }

  return binaryNode('-', left, right);
}

function combineMultiplication(left: CasExpression, right: CasExpression): CasExpression {
  const factors = [...collectMultiplicationFactors(left), ...collectMultiplicationFactors(right)];
  let numericFactor = 1;
  const nonNumericFactors: CasExpression[] = [];

  for (const factor of factors) {
    if (factor.kind === 'number') {
      numericFactor *= factor.value;
    } else {
      nonNumericFactors.push(factor);
    }
  }

  if (numericFactor === 0) {
    return numberNode(0);
  }

  return buildSignedProduct(numericFactor, nonNumericFactors);
}

function combineDivision(left: CasExpression, right: CasExpression): CasExpression {
  if (isZeroExpression(left)) {
    return numberNode(0);
  }

  if (right.kind === 'number' && right.value === 1) {
    return left;
  }

  if (left.kind === 'number' && right.kind === 'number') {
    return reduceExactNumberFraction(left.value, right.value);
  }

  if (right.kind === 'number') {
    return buildExactDivision(left, right.value);
  }

  return binaryNode('/', left, right);
}

function combinePower(left: CasExpression, right: CasExpression): CasExpression {
  if (right.kind === 'number') {
    if (right.value === 0) {
      return numberNode(1);
    }

    if (right.value === 1) {
      return left;
    }
  }

  if (left.kind === 'number' && right.kind === 'number') {
    const powered = Math.pow(left.value, right.value);
    if (Number.isFinite(powered)) {
      return numberNode(powered);
    }
  }

  return binaryNode('^', left, right);
}

function reduceExactNumberFraction(numerator: number, denominator: number): CasExpression {
  return reduceExactRationalExpression(numerator, denominator);
}

function buildSignedProduct(
  numericFactor: number,
  factors: readonly CasExpression[]
): CasExpression {
  if (numericFactor === 0) {
    return numberNode(0);
  }

  if (factors.length === 0) {
    return numberNode(numericFactor);
  }

  if (numericFactor === 1) {
    return rebuildMultiplication(factors);
  }

  if (numericFactor === -1) {
    const product = rebuildMultiplication(factors);
    return product.kind === 'number' ? numberNode(-product.value) : unaryNode('-', product);
  }

  return rebuildMultiplication([numberNode(numericFactor), ...factors]);
}

function collectMultiplicationFactors(expression: CasExpression): CasExpression[] {
  if (expression.kind === 'binary' && expression.operator === '*') {
    return [
      ...collectMultiplicationFactors(expression.left),
      ...collectMultiplicationFactors(expression.right),
    ];
  }

  return [expression];
}

function rebuildMultiplication(items: readonly CasExpression[]): CasExpression {
  if (items.length === 0) {
    return numberNode(1);
  }

  const normalizedItems = sortMultiplicationFactors(items);

  if (normalizedItems.length === 1) {
    return normalizedItems[0];
  }

  return normalizedItems.slice(1).reduce(
    (left, right) => binaryNode('*', left, right),
    normalizedItems[0]
  );
}

function gcdOfIntegers(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);

  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }

  return a;
}

function isZeroExpression(expression: CasExpression): boolean {
  return expression.kind === 'number' && expression.value === 0;
}

function sortMultiplicationFactors(
  factors: readonly CasExpression[]
): CasExpression[] {
  return [...factors].sort((left, right) => {
    const leftRank = multiplicationFactorRank(left);
    const rightRank = multiplicationFactorRank(right);
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return formatCasExpression(left).localeCompare(formatCasExpression(right));
  });
}

function multiplicationFactorRank(expression: CasExpression): number {
  switch (expression.kind) {
    case 'number':
      return 0;
    case 'symbol':
      return 1;
    case 'unary':
      return 2;
    case 'function':
      return 3;
    case 'binary':
      return 4;
    case 'equation':
      return 5;
    default: {
      const _exhaustive: never = expression;
      return _exhaustive;
    }
  }
}
