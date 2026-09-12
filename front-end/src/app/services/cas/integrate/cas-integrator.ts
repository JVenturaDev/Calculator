import {
  binaryNode,
  functionCallNode,
  numberNode,
  symbolNode,
  unaryNode,
  type CasBinaryNode,
  type CasExpression,
  type CasFunctionCallNode,
  type CasUnaryNode,
} from '../ast/cas-ast';
import { createCasError } from '../errors/cas-errors';
import { DEFAULT_CAS_LIMITS, resolveCasLimits, type CasLimits } from '../limits/cas-limits';
import { casFailure, casSuccess, type CasResult } from '../result/cas-result';
import { simplifyCasExpression, type CasTextResult } from '../simplify/cas-simplifier';
import {
  approximateRationalValue,
  buildExactDivision,
  buildExactRationalExpression,
  reduceExactRationalExpression,
} from '../rational/cas-rational';
import { toPolynomial } from '../polynomial/cas-polynomial';
import { validateCasVariable } from '../variable/cas-variable';
import { dependsOnCasExpression, differentiateCasExpression, type CasOperationOptions } from '../differentiate/cas-differentiator';
import { formatCasExpression } from '../format/cas-formatter';

const SUPPORTED_INTEGRAL_FUNCTIONS = new Set([
  'sin',
  'cos',
  'exp',
  'expe',
  'sqrt',
  'ln',
  'tan',
]);

export function integrateCasExpression(
  expression: CasExpression,
  variable: string,
  options: CasOperationOptions = {}
): CasResult<CasExpression> {
  const normalizedVariable = validateCasVariable(variable);
  if (!normalizedVariable.ok) {
    return normalizedVariable;
  }

  const limits = resolveCasLimits(options.limits ?? DEFAULT_CAS_LIMITS);
  const simplified = simplifyCasExpression(expression, { limits });
  if (!simplified.ok) {
    return simplified;
  }

  const integrated = integrateNode(simplified.value, normalizedVariable.value, limits);
  if (!integrated.ok) {
    return integrated;
  }

  return simplifyCasExpression(integrated.value, { limits });
}

export function integrateCasText(
  source: string,
  variable: string,
  parser: { parse(source: string): CasResult<CasExpression> },
  options: CasOperationOptions = {}
): CasResult<CasTextResult> {
  const parsed = parser.parse(source);
  if (!parsed.ok) {
    return parsed;
  }

  const integrated = integrateCasExpression(parsed.value, variable, options);
  if (!integrated.ok) {
    return integrated;
  }

  return casSuccess(
    {
      expression: integrated.value,
      text: formatCasExpression(integrated.value),
      latex: formatCasExpression(integrated.value),
    },
    integrated.metadata
  );
}

function integrateNode(
  node: CasExpression,
  variable: string,
  limits: CasLimits
): CasResult<CasExpression> {
  if (!dependsOnCasExpression(node, variable)) {
    return casSuccess(binaryNode('*', cloneCasExpression(node), symbolNode(variable)));
  }

  switch (node.kind) {
    case 'number':
      return casSuccess(binaryNode('*', numberNode(node.value), symbolNode(variable)));
    case 'symbol':
      return integrateSymbol(node, variable);
    case 'unary':
      return integrateUnary(node, variable, limits);
    case 'binary':
      return integrateBinary(node, variable, limits);
    case 'function':
      return integrateFunction(node, variable, limits);
    case 'equation':
      return unsupportedIntegralError();
    default: {
      const _exhaustive: never = node;
      return _exhaustive;
    }
  }
}

function integrateSymbol(
  node: { readonly kind: 'symbol'; readonly name: string },
  variable: string
): CasResult<CasExpression> {
  if (node.name === variable) {
    return casSuccess(
      binaryNode(
        '/',
        binaryNode('^', symbolNode(variable), numberNode(2)),
        numberNode(2)
      )
    );
  }

  return casSuccess(binaryNode('*', symbolNode(node.name), symbolNode(variable)));
}

function integrateUnary(
  node: CasUnaryNode,
  variable: string,
  limits: CasLimits
): CasResult<CasExpression> {
  const integrated = integrateNode(node.operand, variable, limits);
  if (!integrated.ok) {
    return integrated;
  }

  if (node.operator === '+') {
    return integrated;
  }

  return casSuccess(unaryNode('-', integrated.value));
}

function integrateBinary(
  node: CasBinaryNode,
  variable: string,
  limits: CasLimits
): CasResult<CasExpression> {
  const leftDepends = dependsOnCasExpression(node.left, variable);
  const rightDepends = dependsOnCasExpression(node.right, variable);

  switch (node.operator) {
    case '+': {
      const left = integrateNode(node.left, variable, limits);
      if (!left.ok) return left;
      const right = integrateNode(node.right, variable, limits);
      if (!right.ok) return right;
      return casSuccess(binaryNode('+', left.value, right.value));
    }
    case '-': {
      const left = integrateNode(node.left, variable, limits);
      if (!left.ok) return left;
      const right = integrateNode(node.right, variable, limits);
      if (!right.ok) return right;
      return casSuccess(binaryNode('-', left.value, right.value));
    }
    case '*':
      return integrateProduct(node.left, node.right, leftDepends, rightDepends, variable, limits);
    case '/':
      return integrateDivision(node.left, node.right, leftDepends, rightDepends, variable, limits);
    case '^':
      return integratePowerNode(node.left, node.right, variable);
    default: {
      const _exhaustive: never = node.operator;
      return _exhaustive;
    }
  }
}

function integrateProduct(
  left: CasExpression,
  right: CasExpression,
  leftDepends: boolean,
  rightDepends: boolean,
  variable: string,
  limits: CasLimits
): CasResult<CasExpression> {
  if (!leftDepends && !rightDepends) {
    return casSuccess(binaryNode('*', cloneCasExpression(left), symbolNode(variable)));
  }

  const byPartsIntegration = tryIntegrateByPartsProduct(left, right, variable);
  if (byPartsIntegration.ok) {
    return byPartsIntegration;
  }

  const substitutionIntegration = tryIntegrateProportionalProduct(left, right, variable, limits);
  if (substitutionIntegration.ok) {
    return substitutionIntegration;
  }

  if (!leftDepends && isNumericExpression(left)) {
    const rightIntegration = integrateNode(right, variable, limits);
    if (!rightIntegration.ok) {
      return rightIntegration;
    }

    return casSuccess(
      scaleExpressionByInteger(rightIntegration.value, left.value)
    );
  }

  if (!rightDepends && isNumericExpression(right)) {
    const leftIntegration = integrateNode(left, variable, limits);
    if (!leftIntegration.ok) {
      return leftIntegration;
    }

    return casSuccess(
      scaleExpressionByInteger(leftIntegration.value, right.value)
    );
  }

  if (!leftDepends) {
    const rightIntegration = integrateNode(right, variable, limits);
    if (!rightIntegration.ok) {
      return rightIntegration;
    }

    return casSuccess(
      attachIndependentFactor(cloneCasExpression(left), rightIntegration.value)
    );
  }

  if (!rightDepends) {
    const leftIntegration = integrateNode(left, variable, limits);
    if (!leftIntegration.ok) {
      return leftIntegration;
    }

    return casSuccess(
      attachIndependentFactor(cloneCasExpression(right), leftIntegration.value)
    );
  }

  return unsupportedIntegralError();
}

function tryIntegrateByPartsProduct(
  left: CasExpression,
  right: CasExpression,
  variable: string
): CasResult<CasExpression> {
  const factors = collectMultiplicationFactors(binaryNode('*', left, right));
  let numericFactor = 1;
  const independentFactors: CasExpression[] = [];
  let variablePower = 0;
  let matchedFunction: CasFunctionCallNode | null = null;

  for (const factor of factors) {
    if (factor.kind === 'number') {
      numericFactor *= factor.value;
      continue;
    }

    if (!dependsOnCasExpression(factor, variable)) {
      independentFactors.push(cloneCasExpression(factor));
      continue;
    }

    const degree = readVariablePower(factor, variable);
    if (degree !== null) {
      variablePower += degree;
      continue;
    }

    if (isSupportedByPartsFunction(factor, variable)) {
      matchedFunction = factor;
      continue;
    }

    return unsupportedIntegralError();
  }

  if (!matchedFunction || variablePower < 1 || variablePower > 2) {
    return unsupportedIntegralError();
  }

  const coreIntegration = integrateByPartsFunction(matchedFunction.name, variablePower, variable);
  if (!coreIntegration.ok) {
    return coreIntegration;
  }

  let integrated = coreIntegration.value;
  if (numericFactor !== 1) {
    integrated = scaleExpressionByInteger(integrated, numericFactor);
  }

  for (const factor of independentFactors) {
    integrated = attachIndependentFactor(factor, integrated);
  }

  return casSuccess(integrated);
}

function integrateDivision(
  numerator: CasExpression,
  denominator: CasExpression,
  numeratorDepends: boolean,
  denominatorDepends: boolean,
  variable: string,
  limits: CasLimits
): CasResult<CasExpression> {
  if (!numeratorDepends && !denominatorDepends) {
    return casSuccess(binaryNode('*', cloneCasExpression(numerator), symbolNode(variable)));
  }

  if (numeratorDepends && !denominatorDepends) {
    const numeratorIntegration = integrateNode(numerator, variable, limits);
    if (!numeratorIntegration.ok) {
      return numeratorIntegration;
    }

    return casSuccess(
      divideExpressionByConstant(
        numeratorIntegration.value,
        denominator
      )
    );
  }

  if (!numeratorDepends) {
    const reciprocal = integrateReciprocalLike(denominator, variable, limits);
    if (reciprocal.ok) {
      if (isNumericExpression(numerator)) {
        return casSuccess(attachIndependentFactor(
          buildExactRationalExpression(numerator.value),
          reciprocal.value
        ));
      }

      return casSuccess(binaryNode('*', cloneCasExpression(numerator), reciprocal.value));
    }
  }

  const rationalIntegration = tryIntegrateControlledRational(
    numerator,
    denominator,
    variable,
    limits
  );
  if (rationalIntegration.ok) {
    return rationalIntegration;
  }

  // Restricted f'(x) / f(x): only an exact integer proportional factor.
  const denominatorDerivative = differentiateCasExpression(denominator, variable, { limits });
  if (denominatorDerivative.ok) {
    const ratio = extractExactProportionalRatio([numerator], denominatorDerivative.value);
    if (ratio !== null) {
      return casSuccess(scaleExpressionByInteger(
        functionCallNode('ln', [functionCallNode('abs', [cloneCasExpression(denominator)])]),
        ratio
      ));
    }
  }

  return unsupportedIntegralError();
}

interface NumericLinearFactor {
  readonly coefficient: number;
  readonly constant: number;
  readonly expression: CasExpression;
}

/** Deliberately small exact rational integration surface: numeric univariate inputs only. */
function tryIntegrateControlledRational(
  numerator: CasExpression,
  denominator: CasExpression,
  variable: string,
  limits: CasLimits
): CasResult<CasExpression> {
  const numeratorCoefficients = readUnivariatePolynomial(numerator, variable);
  const denominatorCoefficients = readUnivariatePolynomial(denominator, variable);
  if (!numeratorCoefficients || !denominatorCoefficients || denominatorCoefficients.length === 0) {
    return unsupportedIntegralError();
  }

  if (numeratorCoefficients.length >= denominatorCoefficients.length) {
    const division = divideCoefficientPolynomials(numeratorCoefficients, denominatorCoefficients);
    if (!division) return unsupportedIntegralError();
    const quotient = integrateCoefficientPolynomial(division.quotient, variable);
    if (division.remainder.length === 0) return casSuccess(quotient);
    const remainder = integrateProperRational(
      division.remainder,
      denominator,
      denominatorCoefficients,
      variable,
      limits
    );
    if (!remainder.ok) return remainder;
    return casSuccess(binaryNode('+', quotient, remainder.value));
  }

  return integrateProperRational(
    numeratorCoefficients,
    denominator,
    denominatorCoefficients,
    variable,
    limits
  );
}

function integrateProperRational(
  numeratorCoefficients: readonly number[],
  denominator: CasExpression,
  denominatorCoefficients: readonly number[],
  variable: string,
  limits: CasLimits
): CasResult<CasExpression> {
  if (numeratorCoefficients.length === 1 && denominatorCoefficients.length === 2) {
    const numerator = numberToExactRational(numeratorCoefficients[0]);
    const slope = numberToExactRational(denominatorCoefficients[1]);
    return numerator && slope
      ? integrateExactScaledReciprocalLinear(denominator, slope, numerator)
      : unsupportedIntegralError();
  }

  const squaredQuadratic = tryIntegrateSquaredIrreducibleQuadratic(
    numeratorCoefficients,
    denominator,
    variable
  );
  if (squaredQuadratic) return squaredQuadratic;

  const twoQuadratics = tryIntegrateTwoIrreducibleQuadratics(
    numeratorCoefficients,
    denominator,
    variable
  );
  if (twoQuadratics) return twoQuadratics;

  const repeatedAndDistinctQuadratics = tryIntegrateSquaredAndDistinctIrreducibleQuadratics(
    numeratorCoefficients,
    denominator,
    variable
  );
  if (repeatedAndDistinctQuadratics) return repeatedAndDistinctQuadratics;

  const twoSquaredQuadratics = tryIntegrateTwoSquaredIrreducibleQuadratics(
    numeratorCoefficients,
    denominator,
    variable
  );
  if (twoSquaredQuadratics) return twoSquaredQuadratics;

  const mixedLinearSquaredQuadratic = tryIntegrateLinearTimesSquaredIrreducibleQuadratic(
    numeratorCoefficients,
    denominator,
    variable
  );
  if (mixedLinearSquaredQuadratic) return mixedLinearSquaredQuadratic;

  const quadratic = analyzeIrreducibleQuadratic(denominatorCoefficients);
  if (quadratic) {
    return integrateLinearOverIrreducibleQuadratic(
      numeratorCoefficients,
      denominator,
      quadratic,
      variable
    );
  }

  const mixedLinearQuadratic = tryIntegrateLinearTimesIrreducibleQuadratic(
    numeratorCoefficients,
    denominator,
    variable
  );
  if (mixedLinearQuadratic) return mixedLinearQuadratic;

  const expandedFactors = extractThreeExplicitLinearFactors(denominator, variable);
  if (expandedFactors) {
    const decomposition = solveThreeFactorDecomposition(
      numeratorCoefficients,
      expandedFactors
    );
    if (!decomposition) return unsupportedIntegralError();
    return integrateExactDecomposedRational(decomposition, variable, limits);
  }

  const factors = extractExplicitLinearDenominator(denominator, variable);
  if (!factors || numeratorCoefficients.length > 2) return unsupportedIntegralError();

  const [first, second] = factors;
  const numeratorLinear = {
    constant: numeratorCoefficients[0] ?? 0,
    coefficient: numeratorCoefficients[1] ?? 0,
  };

  if (sameLinearFactor(first, second)) {
    const a = numeratorLinear.coefficient / first.coefficient;
    const b = numeratorLinear.constant - a * first.constant;
    return integrateDecomposedRational([
      { coefficient: a, denominator: first.expression },
      { coefficient: b, denominator: binaryNode('^', cloneCasExpression(first.expression), numberNode(2)) },
    ], variable, limits);
  }

  const determinant = first.constant * second.coefficient - first.coefficient * second.constant;
  if (determinant === 0) return unsupportedIntegralError();
  const a = (numeratorLinear.coefficient * first.constant - first.coefficient * numeratorLinear.constant) / determinant;
  const b = (second.coefficient * numeratorLinear.constant - numeratorLinear.coefficient * second.constant) / determinant;
  return integrateDecomposedRational([
    { coefficient: a, denominator: first.expression },
    { coefficient: b, denominator: second.expression },
  ], variable, limits);
}

interface ExactRational {
  readonly numerator: bigint;
  readonly denominator: bigint;
}

interface LinearFactorGroup {
  readonly factor: NumericLinearFactor;
  readonly normalizedConstant: ExactRational;
  readonly multiplicity: number;
}

interface ExplicitLinearFactorization {
  readonly groups: readonly LinearFactorGroup[];
  readonly scale: ExactRational;
}

interface ExactRationalTerm {
  readonly coefficient: ExactRational;
  readonly denominator: CasExpression;
}

interface IrreducibleQuadratic {
  readonly a: ExactRational;
  readonly b: ExactRational;
  readonly c: ExactRational;
  readonly squareRootDiscriminantMagnitude: ExactRational;
}

function tryIntegrateSquaredIrreducibleQuadratic(
  numeratorCoefficients: readonly number[],
  denominator: CasExpression,
  variable: string
): CasResult<CasExpression> | null {
  if (
    denominator.kind !== 'binary' ||
    denominator.operator !== '^' ||
    denominator.right.kind !== 'number' ||
    denominator.right.value !== 2
  ) {
    return null;
  }
  if (numeratorCoefficients.length > 3) return unsupportedIntegralError();

  const baseCoefficients = readUnivariatePolynomial(denominator.left, variable);
  if (!baseCoefficients) return null;
  const quadratic = analyzeIrreducibleQuadratic(baseCoefficients);
  if (!quadratic) return null;
  const numerator = numbersToExactPolynomial(numeratorCoefficients);
  if (!numerator) return unsupportedIntegralError();

  return integrateExactNumeratorOverSquaredQuadratic(
    numerator,
    denominator.left,
    quadratic,
    variable
  );
}

function tryIntegrateTwoIrreducibleQuadratics(
  numeratorCoefficients: readonly number[],
  denominator: CasExpression,
  variable: string
): CasResult<CasExpression> | null {
  if (numeratorCoefficients.length > 4) return null;
  const factors = collectMultiplicationFactors(denominator);
  if (factors.length !== 2) return null;

  const firstCoefficients = readUnivariatePolynomial(factors[0], variable);
  const secondCoefficients = readUnivariatePolynomial(factors[1], variable);
  if (!firstCoefficients || !secondCoefficients) return null;
  const firstQuadratic = analyzeIrreducibleQuadratic(firstCoefficients);
  const secondQuadratic = analyzeIrreducibleQuadratic(secondCoefficients);
  if (!firstQuadratic || !secondQuadratic) return null;
  const firstExact = numbersToExactPolynomial(firstCoefficients);
  const secondExact = numbersToExactPolynomial(secondCoefficients);
  const numerator = numbersToExactPolynomial(numeratorCoefficients);
  if (!firstExact || !secondExact || !numerator) return unsupportedIntegralError();

  const proportionalScale = exactPolynomialScale(firstExact, secondExact);
  if (proportionalScale) {
    const adjustedNumerator: ExactRational[] = [];
    for (const coefficient of numerator) {
      const adjusted = divideExact(coefficient, proportionalScale);
      if (!adjusted) return unsupportedIntegralError();
      adjustedNumerator.push(adjusted);
    }
    return integrateExactNumeratorOverSquaredQuadratic(
      adjustedNumerator,
      factors[0],
      firstQuadratic,
      variable
    );
  }

  const xPolynomial = [exactRational(0n), exactRational(1n)];
  const columns = [
    multiplyExactPolynomials(xPolynomial, secondExact),
    secondExact,
    multiplyExactPolynomials(xPolynomial, firstExact),
    firstExact,
  ];
  const matrix = Array.from({ length: 4 }, (_, degree) => [
    ...columns.map(column => column[degree] ?? exactRational(0n)),
    numerator[degree] ?? exactRational(0n),
  ]);
  const coefficients = solveExactLinearSystem(matrix);
  if (!coefficients) return unsupportedIntegralError();
  const firstTerm = integrateExactLinearOverIrreducibleQuadratic(
    [coefficients[1], coefficients[0]],
    factors[0],
    firstQuadratic,
    variable
  );
  if (!firstTerm.ok) return firstTerm;
  const secondTerm = integrateExactLinearOverIrreducibleQuadratic(
    [coefficients[3], coefficients[2]],
    factors[1],
    secondQuadratic,
    variable
  );
  if (!secondTerm.ok) return secondTerm;
  return casSuccess(binaryNode('+', firstTerm.value, secondTerm.value));
}

function exactPolynomialScale(
  reference: readonly ExactRational[],
  candidate: readonly ExactRational[]
): ExactRational | null {
  if (reference.length !== candidate.length || reference.length === 0) return null;
  const leading = reference[reference.length - 1];
  const candidateLeading = candidate[candidate.length - 1];
  const scale = divideExact(candidateLeading, leading);
  if (!scale || scale.numerator === 0n) return null;
  for (let index = 0; index < reference.length; index++) {
    if (!equalExact(candidate[index], multiplyExact(reference[index], scale))) {
      return null;
    }
  }
  return scale;
}

interface SquaredAndDistinctQuadratics {
  readonly repeatedExpression: CasExpression;
  readonly repeatedCoefficients: readonly ExactRational[];
  readonly repeatedQuadratic: IrreducibleQuadratic;
  readonly distinctExpression: CasExpression;
  readonly distinctCoefficients: readonly ExactRational[];
  readonly distinctQuadratic: IrreducibleQuadratic;
  readonly denominatorScale: ExactRational;
}

function tryIntegrateSquaredAndDistinctIrreducibleQuadratics(
  numeratorCoefficients: readonly number[],
  denominator: CasExpression,
  variable: string
): CasResult<CasExpression> | null {
  if (numeratorCoefficients.length > 6) return null;
  const factorization = extractSquaredAndDistinctQuadratics(denominator, variable);
  if (!factorization) return null;
  const rawNumerator = numbersToExactPolynomial(numeratorCoefficients);
  if (!rawNumerator) return unsupportedIntegralError();
  const numerator: ExactRational[] = [];
  for (const coefficient of rawNumerator) {
    const adjusted = divideExact(coefficient, factorization.denominatorScale);
    if (!adjusted) return unsupportedIntegralError();
    numerator.push(adjusted);
  }

  const repeated = factorization.repeatedCoefficients;
  const distinct = factorization.distinctCoefficients;
  const repeatedSquared = multiplyExactPolynomials(repeated, repeated);
  const repeatedDistinct = multiplyExactPolynomials(repeated, distinct);
  const xPolynomial = [exactRational(0n), exactRational(1n)];
  const columns = [
    multiplyExactPolynomials(xPolynomial, repeatedDistinct),
    repeatedDistinct,
    multiplyExactPolynomials(xPolynomial, distinct),
    distinct,
    multiplyExactPolynomials(xPolynomial, repeatedSquared),
    repeatedSquared,
  ];
  const matrix = Array.from({ length: 6 }, (_, degree) => [
    ...columns.map(column => column[degree] ?? exactRational(0n)),
    numerator[degree] ?? exactRational(0n),
  ]);
  const coefficients = solveExactLinearSystem(matrix);
  if (!coefficients) return unsupportedIntegralError();

  const repeatedTerm = integrateExactLinearOverIrreducibleQuadratic(
    [coefficients[1], coefficients[0]],
    factorization.repeatedExpression,
    factorization.repeatedQuadratic,
    variable
  );
  if (!repeatedTerm.ok) return repeatedTerm;
  const repeatedSquaredTerm = integrateExactNumeratorOverSquaredQuadratic(
    [coefficients[3], coefficients[2]],
    factorization.repeatedExpression,
    factorization.repeatedQuadratic,
    variable
  );
  if (!repeatedSquaredTerm.ok) return repeatedSquaredTerm;
  const distinctTerm = integrateExactLinearOverIrreducibleQuadratic(
    [coefficients[5], coefficients[4]],
    factorization.distinctExpression,
    factorization.distinctQuadratic,
    variable
  );
  if (!distinctTerm.ok) return distinctTerm;
  return casSuccess(binaryNode(
    '+',
    binaryNode('+', repeatedTerm.value, repeatedSquaredTerm.value),
    distinctTerm.value
  ));
}

function extractSquaredAndDistinctQuadratics(
  denominator: CasExpression,
  variable: string
): SquaredAndDistinctQuadratics | null {
  const factors = collectMultiplicationFactors(denominator);
  if (factors.length === 2) {
    const powerIndex = factors.findIndex(factor =>
      factor.kind === 'binary' &&
      factor.operator === '^' &&
      factor.right.kind === 'number' &&
      factor.right.value === 2
    );
    if (powerIndex === -1) return null;
    const power = factors[powerIndex];
    if (power.kind !== 'binary') return null;
    const distinctExpression = factors[1 - powerIndex];
    const repeatedData = readIrreducibleQuadraticFactor(power.left, variable);
    const distinctData = readIrreducibleQuadraticFactor(distinctExpression, variable);
    if (!repeatedData || !distinctData) return null;
    if (exactPolynomialScale(repeatedData.coefficients, distinctData.coefficients)) return null;
    return {
      repeatedExpression: power.left,
      repeatedCoefficients: repeatedData.coefficients,
      repeatedQuadratic: repeatedData.quadratic,
      distinctExpression,
      distinctCoefficients: distinctData.coefficients,
      distinctQuadratic: distinctData.quadratic,
      denominatorScale: exactRational(1n),
    };
  }

  if (factors.length !== 3) return null;
  const data = factors.map(factor => readIrreducibleQuadraticFactor(factor, variable));
  if (data.some(value => value === null)) return null;
  const quadratics = data as Array<{
    coefficients: readonly ExactRational[];
    quadratic: IrreducibleQuadratic;
  }>;
  let repeatedPair: readonly [number, number] | null = null;
  let repeatedScale: ExactRational | null = null;
  for (let left = 0; left < 2; left++) {
    for (let right = left + 1; right < 3; right++) {
      const scale = exactPolynomialScale(
        quadratics[left].coefficients,
        quadratics[right].coefficients
      );
      if (!scale) continue;
      if (repeatedPair) return null;
      repeatedPair = [left, right];
      repeatedScale = scale;
    }
  }
  if (!repeatedPair || !repeatedScale) return null;
  const distinctIndex = [0, 1, 2].find(index => !repeatedPair?.includes(index));
  if (distinctIndex === undefined) return null;
  const repeatedIndex = repeatedPair[0];
  if (exactPolynomialScale(
    quadratics[repeatedIndex].coefficients,
    quadratics[distinctIndex].coefficients
  )) {
    return null;
  }
  return {
    repeatedExpression: factors[repeatedIndex],
    repeatedCoefficients: quadratics[repeatedIndex].coefficients,
    repeatedQuadratic: quadratics[repeatedIndex].quadratic,
    distinctExpression: factors[distinctIndex],
    distinctCoefficients: quadratics[distinctIndex].coefficients,
    distinctQuadratic: quadratics[distinctIndex].quadratic,
    denominatorScale: repeatedScale,
  };
}

function readIrreducibleQuadraticFactor(
  expression: CasExpression,
  variable: string
): { coefficients: readonly ExactRational[]; quadratic: IrreducibleQuadratic } | null {
  const coefficients = readUnivariatePolynomial(expression, variable);
  if (!coefficients) return null;
  const quadratic = analyzeIrreducibleQuadratic(coefficients);
  const exact = numbersToExactPolynomial(coefficients);
  return quadratic && exact ? { coefficients: exact, quadratic } : null;
}

interface RepeatedQuadraticFactor {
  readonly expression: CasExpression;
  readonly coefficients: readonly ExactRational[];
  readonly quadratic: IrreducibleQuadratic;
}

interface TwoSquaredQuadratics {
  readonly first: RepeatedQuadraticFactor;
  readonly second: RepeatedQuadraticFactor;
  readonly denominatorScale: ExactRational;
}

function tryIntegrateTwoSquaredIrreducibleQuadratics(
  numeratorCoefficients: readonly number[],
  denominator: CasExpression,
  variable: string
): CasResult<CasExpression> | null {
  if (numeratorCoefficients.length > 8) return null;
  const factorization = extractTwoSquaredIrreducibleQuadratics(denominator, variable);
  if (!factorization) return null;
  const rawNumerator = numbersToExactPolynomial(numeratorCoefficients);
  if (!rawNumerator) return unsupportedIntegralError();
  const numerator: ExactRational[] = [];
  for (const coefficient of rawNumerator) {
    const adjusted = divideExact(coefficient, factorization.denominatorScale);
    if (!adjusted) return unsupportedIntegralError();
    numerator.push(adjusted);
  }

  const first = factorization.first.coefficients;
  const second = factorization.second.coefficients;
  const firstSquared = multiplyExactPolynomials(first, first);
  const secondSquared = multiplyExactPolynomials(second, second);
  const firstSecondSquared = multiplyExactPolynomials(first, secondSquared);
  const secondFirstSquared = multiplyExactPolynomials(second, firstSquared);
  const xPolynomial = [exactRational(0n), exactRational(1n)];
  const columns = [
    multiplyExactPolynomials(xPolynomial, firstSecondSquared),
    firstSecondSquared,
    multiplyExactPolynomials(xPolynomial, secondSquared),
    secondSquared,
    multiplyExactPolynomials(xPolynomial, secondFirstSquared),
    secondFirstSquared,
    multiplyExactPolynomials(xPolynomial, firstSquared),
    firstSquared,
  ];
  const matrix = Array.from({ length: 8 }, (_, degree) => [
    ...columns.map(column => column[degree] ?? exactRational(0n)),
    numerator[degree] ?? exactRational(0n),
  ]);
  const coefficients = solveExactLinearSystem(matrix);
  if (!coefficients) return unsupportedIntegralError();

  const firstTerm = integrateExactLinearOverIrreducibleQuadratic(
    [coefficients[1], coefficients[0]],
    factorization.first.expression,
    factorization.first.quadratic,
    variable
  );
  if (!firstTerm.ok) return firstTerm;
  const firstSquaredTerm = integrateExactNumeratorOverSquaredQuadratic(
    [coefficients[3], coefficients[2]],
    factorization.first.expression,
    factorization.first.quadratic,
    variable
  );
  if (!firstSquaredTerm.ok) return firstSquaredTerm;
  const secondTerm = integrateExactLinearOverIrreducibleQuadratic(
    [coefficients[5], coefficients[4]],
    factorization.second.expression,
    factorization.second.quadratic,
    variable
  );
  if (!secondTerm.ok) return secondTerm;
  const secondSquaredTerm = integrateExactNumeratorOverSquaredQuadratic(
    [coefficients[7], coefficients[6]],
    factorization.second.expression,
    factorization.second.quadratic,
    variable
  );
  if (!secondSquaredTerm.ok) return secondSquaredTerm;
  return casSuccess(binaryNode(
    '+',
    binaryNode('+', firstTerm.value, firstSquaredTerm.value),
    binaryNode('+', secondTerm.value, secondSquaredTerm.value)
  ));
}

function extractTwoSquaredIrreducibleQuadratics(
  denominator: CasExpression,
  variable: string
): TwoSquaredQuadratics | null {
  const expandedFactors: Array<{
    expression: CasExpression;
    coefficients: readonly ExactRational[];
    quadratic: IrreducibleQuadratic;
  }> = [];
  for (const factor of collectMultiplicationFactors(denominator)) {
    if (
      factor.kind === 'binary' &&
      factor.operator === '^' &&
      factor.right.kind === 'number' &&
      factor.right.value === 2
    ) {
      const data = readIrreducibleQuadraticFactor(factor.left, variable);
      if (!data) return null;
      expandedFactors.push(
        { expression: factor.left, ...data },
        { expression: factor.left, ...data }
      );
      continue;
    }
    const data = readIrreducibleQuadraticFactor(factor, variable);
    if (!data) return null;
    expandedFactors.push({ expression: factor, ...data });
  }
  if (expandedFactors.length !== 4) return null;

  const groups: Array<{
    representative: RepeatedQuadraticFactor;
    multiplicity: number;
  }> = [];
  let denominatorScale = exactRational(1n);
  for (const factor of expandedFactors) {
    const group = groups.find(candidate =>
      exactPolynomialScale(candidate.representative.coefficients, factor.coefficients) !== null
    );
    if (!group) {
      groups.push({
        representative: {
          expression: factor.expression,
          coefficients: factor.coefficients,
          quadratic: factor.quadratic,
        },
        multiplicity: 1,
      });
      continue;
    }
    const scale = exactPolynomialScale(group.representative.coefficients, factor.coefficients);
    if (!scale) return null;
    denominatorScale = multiplyExact(denominatorScale, scale);
    group.multiplicity++;
  }

  if (
    groups.length !== 2 ||
    groups[0].multiplicity !== 2 ||
    groups[1].multiplicity !== 2
  ) {
    return null;
  }
  return {
    first: groups[0].representative,
    second: groups[1].representative,
    denominatorScale,
  };
}

function integrateExactNumeratorOverSquaredQuadratic(
  numerator: readonly ExactRational[],
  quadraticExpression: CasExpression,
  quadratic: IrreducibleQuadratic,
  variable: string
): CasResult<CasExpression> {
  if (numerator.length > 3) return unsupportedIntegralError();

  const quadraticCoefficient = numerator[2] ?? exactRational(0n);
  const linearCoefficient = numerator[1] ?? exactRational(0n);
  const constantCoefficient = numerator[0] ?? exactRational(0n);
  const quotientCoefficient = divideExact(quadraticCoefficient, quadratic.a);
  if (!quotientCoefficient) return unsupportedIntegralError();
  const derivativeCoefficient = divideExact(
    subtractExact(
      linearCoefficient,
      multiplyExact(quotientCoefficient, quadratic.b)
    ),
    multiplyExact(exactRational(2n), quadratic.a)
  );
  if (!derivativeCoefficient) return unsupportedIntegralError();
  const squaredReciprocalCoefficient = subtractExact(
    subtractExact(
      constantCoefficient,
      multiplyExact(quotientCoefficient, quadratic.c)
    ),
    multiplyExact(derivativeCoefficient, quadratic.b)
  );

  let result: CasExpression | null = null;
  if (quotientCoefficient.numerator !== 0n) {
    const integratedReciprocal = integrateExactLinearOverIrreducibleQuadratic(
      [quotientCoefficient],
      quadraticExpression,
      quadratic,
      variable
    );
    if (!integratedReciprocal.ok) return integratedReciprocal;
    result = integratedReciprocal.value;
  }

  if (derivativeCoefficient.numerator !== 0n) {
    const reciprocal = binaryNode('/', numberNode(1), cloneCasExpression(quadraticExpression));
    const term = multiplyExpressionByExact(
      reciprocal,
      exactRational(-derivativeCoefficient.numerator, derivativeCoefficient.denominator)
    );
    if (!term) return unsupportedIntegralError();
    result = result === null ? term : binaryNode('+', result, term);
  }

  if (squaredReciprocalCoefficient.numerator !== 0n) {
    const baseIntegral = integrateBaseSquaredIrreducibleQuadratic(
      quadraticExpression,
      quadratic,
      variable
    );
    if (!baseIntegral.ok) return baseIntegral;
    const term = multiplyExpressionByExact(
      baseIntegral.value,
      squaredReciprocalCoefficient
    );
    if (!term) return unsupportedIntegralError();
    result = result === null ? term : binaryNode('+', result, term);
  }

  return casSuccess(result ?? numberNode(0));
}

interface LinearTimesSquaredQuadratic {
  readonly linearExpression: CasExpression;
  readonly linearCoefficients: readonly ExactRational[];
  readonly quadraticExpression: CasExpression;
  readonly quadraticCoefficients: readonly ExactRational[];
  readonly quadratic: IrreducibleQuadratic;
}

function tryIntegrateLinearTimesSquaredIrreducibleQuadratic(
  numeratorCoefficients: readonly number[],
  denominator: CasExpression,
  variable: string
): CasResult<CasExpression> | null {
  if (numeratorCoefficients.length > 5) return null;
  const factorization = extractLinearTimesSquaredQuadratic(denominator, variable);
  if (!factorization) return null;
  const numerator = numbersToExactPolynomial(numeratorCoefficients);
  if (!numerator) return unsupportedIntegralError();

  const linear = factorization.linearCoefficients;
  const quadratic = factorization.quadraticCoefficients;
  const quadraticSquared = multiplyExactPolynomials(quadratic, quadratic);
  const linearQuadratic = multiplyExactPolynomials(linear, quadratic);
  const xLinearQuadratic = multiplyExactPolynomials(
    [exactRational(0n), exactRational(1n)],
    linearQuadratic
  );
  const xLinear = multiplyExactPolynomials(
    [exactRational(0n), exactRational(1n)],
    linear
  );
  const columns = [
    quadraticSquared,
    xLinearQuadratic,
    linearQuadratic,
    xLinear,
    linear,
  ];
  const matrix = Array.from({ length: 5 }, (_, degree) => [
    ...columns.map(column => column[degree] ?? exactRational(0n)),
    numerator[degree] ?? exactRational(0n),
  ]);
  const coefficients = solveExactLinearSystem(matrix);
  if (!coefficients) return unsupportedIntegralError();

  const linearTermResult = integrateExactScaledReciprocalLinear(
    factorization.linearExpression,
    factorization.linearCoefficients[1] ?? exactRational(0n),
    coefficients[0]
  );
  if (!linearTermResult.ok) return linearTermResult;
  const quadraticTerm = integrateExactLinearOverIrreducibleQuadratic(
    [coefficients[2], coefficients[1]],
    factorization.quadraticExpression,
    factorization.quadratic,
    variable
  );
  if (!quadraticTerm.ok) return quadraticTerm;
  const squaredQuadraticTerm = integrateExactNumeratorOverSquaredQuadratic(
    [coefficients[4], coefficients[3]],
    factorization.quadraticExpression,
    factorization.quadratic,
    variable
  );
  if (!squaredQuadraticTerm.ok) return squaredQuadraticTerm;
  return casSuccess(binaryNode(
    '+',
    binaryNode('+', linearTermResult.value, quadraticTerm.value),
    squaredQuadraticTerm.value
  ));
}

function integrateExactScaledReciprocalLinear(
  linearExpression: CasExpression,
  slope: ExactRational,
  coefficient: ExactRational
): CasResult<CasExpression> {
  const combinedCoefficient = divideExact(coefficient, slope);
  if (!combinedCoefficient) return unsupportedIntegralError();
  const logarithm = functionCallNode('ln', [
    functionCallNode('abs', [cloneCasExpression(linearExpression)]),
  ]);
  const result = multiplyExpressionByExact(logarithm, combinedCoefficient);
  return result ? casSuccess(result) : unsupportedIntegralError();
}

function extractLinearTimesSquaredQuadratic(
  denominator: CasExpression,
  variable: string
): LinearTimesSquaredQuadratic | null {
  const factors = collectMultiplicationFactors(denominator);
  let linearExpression: CasExpression | null = null;
  let linearCoefficients: readonly ExactRational[] | null = null;
  let quadraticExpression: CasExpression | null = null;
  let quadraticCoefficients: readonly ExactRational[] | null = null;
  let quadratic: IrreducibleQuadratic | null = null;

  const acceptLinear = (expression: CasExpression): boolean => {
    const coefficients = readUnivariatePolynomial(expression, variable);
    if (!coefficients || coefficients.length !== 2 || linearExpression) return false;
    const exact = numbersToExactPolynomial(coefficients);
    if (!exact) return false;
    linearExpression = expression;
    linearCoefficients = exact;
    return true;
  };
  const acceptQuadratic = (expression: CasExpression): boolean => {
    const coefficients = readUnivariatePolynomial(expression, variable);
    if (!coefficients) return false;
    const analyzed = analyzeIrreducibleQuadratic(coefficients);
    const exact = numbersToExactPolynomial(coefficients);
    if (!analyzed || !exact || quadraticExpression) return false;
    quadraticExpression = expression;
    quadraticCoefficients = exact;
    quadratic = analyzed;
    return true;
  };

  if (factors.length === 2) {
    const powerIndex = factors.findIndex(factor =>
      factor.kind === 'binary' &&
      factor.operator === '^' &&
      factor.right.kind === 'number' &&
      factor.right.value === 2
    );
    if (powerIndex === -1) return null;
    const power = factors[powerIndex];
    if (power.kind !== 'binary') return null;
    const other = factors[1 - powerIndex];
    if (!acceptLinear(other) || !acceptQuadratic(power.left)) return null;
  } else if (factors.length === 3) {
    const linearIndex = factors.findIndex(factor => {
      const coefficients = readUnivariatePolynomial(factor, variable);
      return coefficients?.length === 2;
    });
    if (linearIndex === -1 || !acceptLinear(factors[linearIndex])) return null;
    const quadratics = factors.filter((_, index) => index !== linearIndex);
    const firstCoefficients = readUnivariatePolynomial(quadratics[0], variable);
    const secondCoefficients = readUnivariatePolynomial(quadratics[1], variable);
    const firstExact = firstCoefficients && numbersToExactPolynomial(firstCoefficients);
    const secondExact = secondCoefficients && numbersToExactPolynomial(secondCoefficients);
    if (!firstExact || !secondExact || !equalExactPolynomials(firstExact, secondExact)) return null;
    if (!acceptQuadratic(quadratics[0])) return null;
  } else {
    return null;
  }

  return linearExpression && linearCoefficients && quadraticExpression && quadraticCoefficients && quadratic
    ? { linearExpression, linearCoefficients, quadraticExpression, quadraticCoefficients, quadratic }
    : null;
}

function integrateBaseSquaredIrreducibleQuadratic(
  quadraticExpression: CasExpression,
  quadratic: IrreducibleQuadratic,
  variable: string
): CasResult<CasExpression> {
  const discriminantMagnitude = multiplyExact(
    quadratic.squareRootDiscriminantMagnitude,
    quadratic.squareRootDiscriminantMagnitude
  );
  const derivative = buildExactLinearExpression(
    multiplyExact(exactRational(2n), quadratic.a),
    quadratic.b,
    variable
  );
  const inverseMagnitude = divideExact(exactRational(1n), discriminantMagnitude);
  if (!derivative || !inverseMagnitude) return unsupportedIntegralError();
  const rationalTerm = multiplyExpressionByExact(
    binaryNode('/', derivative, cloneCasExpression(quadraticExpression)),
    inverseMagnitude
  );
  if (!rationalTerm) return unsupportedIntegralError();

  const reciprocalIntegral = integrateExactLinearOverIrreducibleQuadratic(
    [exactRational(1n)],
    quadraticExpression,
    quadratic,
    variable
  );
  if (!reciprocalIntegral.ok) return reciprocalIntegral;
  const atanTerm = multiplyExpressionByExact(
    reciprocalIntegral.value,
    divideExact(
      multiplyExact(exactRational(2n), quadratic.a),
      discriminantMagnitude
    ) ?? exactRational(0n)
  );
  if (!atanTerm) return unsupportedIntegralError();
  return casSuccess(binaryNode('+', rationalTerm, atanTerm));
}

function analyzeIrreducibleQuadratic(
  coefficients: readonly number[]
): IrreducibleQuadratic | null {
  if (coefficients.length !== 3) return null;
  const c = numberToExactRational(coefficients[0] ?? 0);
  const b = numberToExactRational(coefficients[1] ?? 0);
  const a = numberToExactRational(coefficients[2] ?? 0);
  if (!a || !b || !c || a.numerator === 0n) return null;
  const fourAC = multiplyExact(exactRational(4n), multiplyExact(a, c));
  const magnitude = subtractExact(fourAC, multiplyExact(b, b));
  if (magnitude.numerator <= 0n) return null;
  const squareRootDiscriminantMagnitude = exactSquareRoot(magnitude);
  return squareRootDiscriminantMagnitude
    ? { a, b, c, squareRootDiscriminantMagnitude }
    : null;
}

function integrateLinearOverIrreducibleQuadratic(
  numeratorCoefficients: readonly number[],
  denominator: CasExpression,
  quadratic: IrreducibleQuadratic,
  variable: string
): CasResult<CasExpression> {
  if (numeratorCoefficients.length > 2) return unsupportedIntegralError();
  const numerator = numbersToExactPolynomial(numeratorCoefficients);
  if (!numerator) return unsupportedIntegralError();
  return integrateExactLinearOverIrreducibleQuadratic(
    numerator,
    denominator,
    quadratic,
    variable
  );
}

function integrateExactLinearOverIrreducibleQuadratic(
  numerator: readonly ExactRational[],
  denominator: CasExpression,
  quadratic: IrreducibleQuadratic,
  variable: string
): CasResult<CasExpression> {
  const constant = numerator[0] ?? exactRational(0n);
  const linear = numerator[1] ?? exactRational(0n);
  const twiceA = multiplyExact(exactRational(2n), quadratic.a);
  const logarithmCoefficient = divideExact(linear, twiceA);
  if (!logarithmCoefficient) return unsupportedIntegralError();
  const residual = subtractExact(
    constant,
    multiplyExact(logarithmCoefficient, quadratic.b)
  );
  const atanCoefficient = divideExact(
    multiplyExact(exactRational(2n), residual),
    quadratic.squareRootDiscriminantMagnitude
  );
  if (!atanCoefficient) return unsupportedIntegralError();

  let result: CasExpression | null = null;
  if (logarithmCoefficient.numerator !== 0n) {
    const logarithm = functionCallNode('ln', [
      functionCallNode('abs', [cloneCasExpression(denominator)]),
    ]);
    const term = multiplyExpressionByExact(logarithm, logarithmCoefficient);
    if (!term) return unsupportedIntegralError();
    result = term;
  }

  if (atanCoefficient.numerator !== 0n) {
    const argumentNumerator = buildExactLinearExpression(
      twiceA,
      quadratic.b,
      variable
    );
    const inverseRoot = divideExact(
      exactRational(1n),
      quadratic.squareRootDiscriminantMagnitude
    );
    if (!argumentNumerator || !inverseRoot) return unsupportedIntegralError();
    const argument = multiplyExpressionByExact(argumentNumerator, inverseRoot);
    if (!argument) return unsupportedIntegralError();
    const term = multiplyExpressionByExact(
      functionCallNode('atan', [argument]),
      atanCoefficient
    );
    if (!term) return unsupportedIntegralError();
    result = result === null ? term : binaryNode('+', result, term);
  }

  return casSuccess(result ?? numberNode(0));
}

function tryIntegrateLinearTimesIrreducibleQuadratic(
  numeratorCoefficients: readonly number[],
  denominator: CasExpression,
  variable: string
): CasResult<CasExpression> | null {
  if (numeratorCoefficients.length > 3) return null;
  const factors = collectMultiplicationFactors(denominator);
  if (factors.length !== 2) return null;

  let linearExpression: CasExpression | null = null;
  let linearCoefficients: readonly ExactRational[] | null = null;
  let quadraticExpression: CasExpression | null = null;
  let quadraticCoefficients: readonly number[] | null = null;
  let quadratic: IrreducibleQuadratic | null = null;

  for (const factor of factors) {
    const coefficients = readUnivariatePolynomial(factor, variable);
    if (!coefficients) return null;
    if (coefficients.length === 2 && !linearExpression) {
      linearExpression = factor;
      linearCoefficients = numbersToExactPolynomial(coefficients);
      continue;
    }
    const analyzed = analyzeIrreducibleQuadratic(coefficients);
    if (analyzed && !quadraticExpression) {
      quadraticExpression = factor;
      quadraticCoefficients = coefficients;
      quadratic = analyzed;
      continue;
    }
    return null;
  }

  if (!linearExpression || !linearCoefficients || !quadraticExpression || !quadraticCoefficients || !quadratic) {
    return null;
  }
  const exactQuadratic = numbersToExactPolynomial(quadraticCoefficients);
  const numerator = numbersToExactPolynomial(numeratorCoefficients);
  if (!exactQuadratic || !numerator) return unsupportedIntegralError();
  const matrix = Array.from({ length: 3 }, (_, degree) => [
    exactQuadratic[degree] ?? exactRational(0n),
    degree === 0 ? exactRational(0n) : linearCoefficients[degree - 1] ?? exactRational(0n),
    linearCoefficients[degree] ?? exactRational(0n),
    numerator[degree] ?? exactRational(0n),
  ]);
  const coefficients = solveExactLinearSystem(matrix);
  if (!coefficients) return unsupportedIntegralError();

  const linearTermResult = integrateExactScaledReciprocalLinear(
    linearExpression,
    linearCoefficients[1] ?? exactRational(0n),
    coefficients[0]
  );
  if (!linearTermResult.ok) return linearTermResult;
  const quadraticTerm = integrateExactLinearOverIrreducibleQuadratic(
    [coefficients[2], coefficients[1]],
    quadraticExpression,
    quadratic,
    variable
  );
  if (!quadraticTerm.ok) return quadraticTerm;
  return casSuccess(binaryNode('+', linearTermResult.value, quadraticTerm.value));
}

function extractThreeExplicitLinearFactors(
  expression: CasExpression,
  variable: string
): ExplicitLinearFactorization | null {
  const rawFactors = collectMultiplicationFactors(expression);
  const factors: Array<{
    factor: NumericLinearFactor;
    normalizedConstant: ExactRational;
    scale: ExactRational;
  }> = [];

  for (const rawFactor of rawFactors) {
    if (
      rawFactor.kind === 'binary' &&
      rawFactor.operator === '^' &&
      rawFactor.right.kind === 'number' &&
      rawFactor.right.value === 2
    ) {
      const factor = normalizeLinearFactor(rawFactor.left, variable);
      if (!factor) return null;
      factors.push(factor, factor);
      continue;
    }

    const factor = normalizeLinearFactor(rawFactor, variable);
    if (!factor) return null;
    factors.push(factor);
  }

  if (factors.length !== 3) return null;

  const groups: LinearFactorGroup[] = [];
  for (const factor of factors) {
    const index = groups.findIndex(group =>
      equalExact(group.normalizedConstant, factor.normalizedConstant)
    );
    if (index === -1) {
      groups.push({
        factor: factor.factor,
        normalizedConstant: factor.normalizedConstant,
        multiplicity: 1,
      });
    } else {
      const group = groups[index];
      groups[index] = { ...group, multiplicity: group.multiplicity + 1 };
    }
  }

  const multiplicities = groups.map(group => group.multiplicity).sort((left, right) => right - left);
  const supportedShape =
    (groups.length === 3 && multiplicities.every(value => value === 1)) ||
    (groups.length === 2 && multiplicities[0] === 2 && multiplicities[1] === 1);
  if (!supportedShape) return null;
  return {
    groups,
    scale: factors.reduce(
      (scale, factor) => multiplyExact(scale, factor.scale),
      exactRational(1n)
    ),
  };
}

function normalizeLinearFactor(
  expression: CasExpression,
  variable: string
): { factor: NumericLinearFactor; normalizedConstant: ExactRational; scale: ExactRational } | null {
  const original = readNumericLinearFactor(expression, variable);
  if (!original) return null;
  const coefficient = numberToExactRational(original.coefficient);
  const constant = numberToExactRational(original.constant);
  if (!coefficient || !constant || coefficient.numerator === 0n) return null;
  const normalizedConstant = divideExact(constant, coefficient);
  if (!normalizedConstant) return null;
  const constantExpression = exactRationalToExpression(normalizedConstant);
  if (!constantExpression) return null;
  return {
    factor: {
      coefficient: 1,
      constant: Number(normalizedConstant.numerator) / Number(normalizedConstant.denominator),
      expression: normalizedConstant.numerator === 0n
        ? symbolNode(variable)
        : binaryNode('+', symbolNode(variable), constantExpression),
    },
    normalizedConstant,
    scale: coefficient,
  };
}

function solveThreeFactorDecomposition(
  numeratorCoefficients: readonly number[],
  factorization: ExplicitLinearFactorization
): readonly ExactRationalTerm[] | null {
  if (numeratorCoefficients.length > 3) return null;

  const originalNumerator = numbersToExactPolynomial(numeratorCoefficients);
  if (!originalNumerator || factorization.scale.numerator === 0n) return null;
  const numerator: ExactRational[] = [];
  for (const coefficient of originalNumerator) {
    const scaled = divideExact(coefficient, factorization.scale);
    if (!scaled) return null;
    numerator.push(scaled);
  }
  const groups = factorization.groups;

  const terms: Array<{ denominator: CasExpression; basis: readonly ExactRational[] }> = [];
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    const group = groups[groupIndex];
    for (let power = 1; power <= group.multiplicity; power++) {
      let basis: readonly ExactRational[] = [exactRational(1n)];
      for (let candidateIndex = 0; candidateIndex < groups.length; candidateIndex++) {
        const candidate = groups[candidateIndex];
        const remainingPower = candidate.multiplicity - (candidateIndex === groupIndex ? power : 0);
        const factorPolynomial = linearFactorToExactPolynomial(candidate.factor);
        if (!factorPolynomial) return null;
        for (let count = 0; count < remainingPower; count++) {
          basis = multiplyExactPolynomials(basis, factorPolynomial);
        }
      }
      terms.push({
        denominator: power === 1
          ? cloneCasExpression(group.factor.expression)
          : binaryNode('^', cloneCasExpression(group.factor.expression), numberNode(power)),
        basis,
      });
    }
  }

  if (terms.length !== 3) return null;
  const matrix = Array.from({ length: 3 }, (_, degree) => [
    ...terms.map(term => term.basis[degree] ?? exactRational(0n)),
    numerator[degree] ?? exactRational(0n),
  ]);
  const coefficients = solveExactLinearSystem(matrix);
  if (!coefficients) return null;
  return terms.map((term, index) => ({
    coefficient: coefficients[index],
    denominator: term.denominator,
  }));
}

function integrateExactDecomposedRational(
  terms: readonly ExactRationalTerm[],
  variable: string,
  limits: CasLimits
): CasResult<CasExpression> {
  let result: CasExpression | null = null;
  for (const term of terms) {
    if (term.coefficient.numerator === 0n) continue;
    const baseIntegration = term.denominator.kind === 'binary' &&
      term.denominator.operator === '^' &&
      term.denominator.right.kind === 'number'
      ? integratePowerNode(
          term.denominator.left,
          numberNode(-term.denominator.right.value),
          variable
        )
      : integrateReciprocalLike(term.denominator, variable, limits);
    if (!baseIntegration.ok) return baseIntegration;
    if (
      term.coefficient.numerator > BigInt(Number.MAX_SAFE_INTEGER) ||
      term.coefficient.numerator < BigInt(Number.MIN_SAFE_INTEGER) ||
      term.coefficient.denominator > BigInt(Number.MAX_SAFE_INTEGER)
    ) {
      return unsupportedIntegralError();
    }
    const coefficient = reduceExactRationalExpression(
      Number(term.coefficient.numerator),
      Number(term.coefficient.denominator)
    );
    const integrated = attachIndependentFactor(coefficient, baseIntegration.value);
    result = result === null ? integrated : binaryNode('+', result, integrated);
  }
  return casSuccess(result ?? numberNode(0));
}

function numbersToExactPolynomial(values: readonly number[]): readonly ExactRational[] | null {
  const result: ExactRational[] = [];
  for (const value of values) {
    const rational = numberToExactRational(value);
    if (!rational) return null;
    result.push(rational);
  }
  return result;
}

function linearFactorToExactPolynomial(factor: NumericLinearFactor): readonly ExactRational[] | null {
  const constant = numberToExactRational(factor.constant);
  const coefficient = numberToExactRational(factor.coefficient);
  return constant && coefficient ? [constant, coefficient] : null;
}

function numberToExactRational(value: number): ExactRational | null {
  const approximation = approximateRationalValue(value);
  if (!approximation || !Number.isSafeInteger(approximation.numerator) || !Number.isSafeInteger(approximation.denominator)) {
    return null;
  }
  return exactRational(BigInt(approximation.numerator), BigInt(approximation.denominator));
}

function exactRationalToExpression(value: ExactRational): CasExpression | null {
  if (
    value.numerator > BigInt(Number.MAX_SAFE_INTEGER) ||
    value.numerator < BigInt(Number.MIN_SAFE_INTEGER) ||
    value.denominator > BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    return null;
  }
  return reduceExactRationalExpression(Number(value.numerator), Number(value.denominator));
}

function multiplyExpressionByExact(
  expression: CasExpression,
  coefficient: ExactRational
): CasExpression | null {
  if (coefficient.numerator === 0n) return numberNode(0);
  if (coefficient.numerator === coefficient.denominator) return expression;
  if (coefficient.numerator === -coefficient.denominator) return unaryNode('-', expression);
  const factor = exactRationalToExpression(coefficient);
  return factor ? attachIndependentFactor(factor, expression) : null;
}

function buildExactLinearExpression(
  coefficient: ExactRational,
  constant: ExactRational,
  variable: string
): CasExpression | null {
  const linear = multiplyExpressionByExact(symbolNode(variable), coefficient);
  const constantExpression = exactRationalToExpression(constant);
  if (!linear || !constantExpression) return null;
  if (constant.numerator === 0n) return linear;
  return binaryNode('+', linear, constantExpression);
}

function exactSquareRoot(value: ExactRational): ExactRational | null {
  if (value.numerator < 0n) return null;
  const numerator = integerSquareRoot(value.numerator);
  const denominator = integerSquareRoot(value.denominator);
  return numerator * numerator === value.numerator && denominator * denominator === value.denominator
    ? exactRational(numerator, denominator)
    : null;
}

function integerSquareRoot(value: bigint): bigint {
  if (value < 2n) return value;
  let root = value;
  let candidate = (root + 1n) / 2n;
  while (candidate < root) {
    root = candidate;
    candidate = (root + value / root) / 2n;
  }
  return root;
}

function equalExact(left: ExactRational, right: ExactRational): boolean {
  return left.numerator === right.numerator && left.denominator === right.denominator;
}

function equalExactPolynomials(
  left: readonly ExactRational[],
  right: readonly ExactRational[]
): boolean {
  const size = Math.max(left.length, right.length);
  for (let index = 0; index < size; index++) {
    if (!equalExact(
      left[index] ?? exactRational(0n),
      right[index] ?? exactRational(0n)
    )) {
      return false;
    }
  }
  return true;
}

function exactRational(numerator: bigint, denominator = 1n): ExactRational {
  if (denominator === 0n) return { numerator, denominator };
  if (numerator === 0n) return { numerator: 0n, denominator: 1n };
  const sign = denominator < 0n ? -1n : 1n;
  const divisor = greatestCommonDivisor(numerator < 0n ? -numerator : numerator, denominator < 0n ? -denominator : denominator);
  return {
    numerator: sign * numerator / divisor,
    denominator: sign * denominator / divisor,
  };
}

function greatestCommonDivisor(left: bigint, right: bigint): bigint {
  let a = left;
  let b = right;
  while (b !== 0n) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a === 0n ? 1n : a;
}

function addExact(left: ExactRational, right: ExactRational): ExactRational {
  return exactRational(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator
  );
}

function subtractExact(left: ExactRational, right: ExactRational): ExactRational {
  return exactRational(
    left.numerator * right.denominator - right.numerator * left.denominator,
    left.denominator * right.denominator
  );
}

function multiplyExact(left: ExactRational, right: ExactRational): ExactRational {
  return exactRational(left.numerator * right.numerator, left.denominator * right.denominator);
}

function divideExact(left: ExactRational, right: ExactRational): ExactRational | null {
  return right.numerator === 0n
    ? null
    : exactRational(left.numerator * right.denominator, left.denominator * right.numerator);
}

function multiplyExactPolynomials(
  left: readonly ExactRational[],
  right: readonly ExactRational[]
): readonly ExactRational[] {
  const result = Array.from(
    { length: left.length + right.length - 1 },
    () => exactRational(0n)
  );
  left.forEach((leftCoefficient, leftDegree) => {
    right.forEach((rightCoefficient, rightDegree) => {
      const degree = leftDegree + rightDegree;
      result[degree] = addExact(result[degree], multiplyExact(leftCoefficient, rightCoefficient));
    });
  });
  return result;
}

function solveExactLinearSystem(matrix: readonly (readonly ExactRational[])[]): readonly ExactRational[] | null {
  const size = matrix.length;
  const rows = matrix.map(row => row.map(value => exactRational(value.numerator, value.denominator)));
  for (let column = 0; column < size; column++) {
    const pivotIndex = rows.findIndex((row, index) => index >= column && row[column].numerator !== 0n);
    if (pivotIndex === -1) return null;
    [rows[column], rows[pivotIndex]] = [rows[pivotIndex], rows[column]];
    const pivot = rows[column][column];
    for (let index = column; index <= size; index++) {
      const value = divideExact(rows[column][index], pivot);
      if (!value) return null;
      rows[column][index] = value;
    }
    for (let rowIndex = 0; rowIndex < size; rowIndex++) {
      if (rowIndex === column) continue;
      const factor = rows[rowIndex][column];
      if (factor.numerator === 0n) continue;
      for (let index = column; index <= size; index++) {
        rows[rowIndex][index] = subtractExact(
          rows[rowIndex][index],
          multiplyExact(factor, rows[column][index])
        );
      }
    }
  }
  return rows.map(row => row[size]);
}

function integrateCoefficientPolynomial(
  coefficients: readonly number[],
  variable: string
): CasExpression {
  let result: CasExpression | null = null;
  coefficients.forEach((coefficient, exponent) => {
    if (coefficient === 0) return;
    const term = integrateVariablePower(exponent, variable, coefficient);
    result = result === null ? term : binaryNode('+', result, term);
  });
  return result ?? numberNode(0);
}

function integrateDecomposedRational(
  terms: readonly { readonly coefficient: number; readonly denominator: CasExpression }[],
  variable: string,
  limits: CasLimits
): CasResult<CasExpression> {
  let result: CasExpression | null = null;
  for (const term of terms) {
    if (!Number.isFinite(term.coefficient)) return unsupportedIntegralError();
    if (term.coefficient === 0) continue;
    const baseIntegration = term.denominator.kind === 'binary' &&
      term.denominator.operator === '^' &&
      term.denominator.right.kind === 'number'
      ? integratePowerNode(
          term.denominator.left,
          numberNode(-term.denominator.right.value),
          variable
        )
      : integrateReciprocalLike(term.denominator, variable, limits);
    if (!baseIntegration.ok) return baseIntegration;
    const integrated = casSuccess(
      attachIndependentFactor(buildExactRationalExpression(term.coefficient), baseIntegration.value)
    );
    if (!integrated.ok) return integrated;
    result = result === null ? integrated.value : binaryNode('+', result, integrated.value);
  }
  return result === null ? casSuccess(numberNode(0)) : casSuccess(result);
}

function extractExplicitLinearDenominator(expression: CasExpression, variable: string): readonly [NumericLinearFactor, NumericLinearFactor] | null {
  if (expression.kind === 'binary' && expression.operator === '*') {
    const factors = collectMultiplicationFactors(expression);
    if (factors.length !== 2) return null;
    const first = readNumericLinearFactor(factors[0], variable);
    const second = readNumericLinearFactor(factors[1], variable);
    return first && second ? [first, second] : null;
  }
  if (expression.kind === 'binary' && expression.operator === '^' && expression.right.kind === 'number' && expression.right.value === 2) {
    const factor = readNumericLinearFactor(expression.left, variable);
    return factor ? [factor, factor] : null;
  }
  return null;
}

function readNumericLinearFactor(expression: CasExpression, variable: string): NumericLinearFactor | null {
  const coefficients = readUnivariatePolynomial(expression, variable);
  if (!coefficients || coefficients.length !== 2 || coefficients[1] === 0) return null;
  return { coefficient: coefficients[1], constant: coefficients[0] ?? 0, expression: cloneCasExpression(expression) };
}

function sameLinearFactor(left: NumericLinearFactor, right: NumericLinearFactor): boolean {
  return left.coefficient === right.coefficient && left.constant === right.constant;
}

function readUnivariatePolynomial(expression: CasExpression, variable: string): number[] | null {
  const polynomial = toPolynomial(expression);
  if (!polynomial.ok) return null;
  const coefficients: number[] = [];
  for (const term of polynomial.value.terms) {
    const names = Object.keys(term.powers);
    if (names.some(name => name !== variable)) return null;
    const degree = term.powers[variable] ?? 0;
    if (!Number.isInteger(degree) || degree < 0) return null;
    coefficients[degree] = (coefficients[degree] ?? 0) + term.coefficient;
  }
  return normalizeCoefficientPolynomial(coefficients);
}

function divideCoefficientPolynomials(numerator: readonly number[], denominator: readonly number[]): { quotient: number[]; remainder: number[] } | null {
  const divisor = normalizeCoefficientPolynomial([...denominator]);
  if (!divisor || divisor.length === 0 || divisor[divisor.length - 1] === 0) return null;
  const remainder = normalizeCoefficientPolynomial([...numerator]);
  if (!remainder) return null;
  const quotient: number[] = [];
  while (remainder.length >= divisor.length) {
    const previousDegree = remainder.length - 1;
    const degree = remainder.length - divisor.length;
    const coefficient = remainder[remainder.length - 1] / divisor[divisor.length - 1];
    if (!Number.isFinite(coefficient)) return null;
    quotient[degree] = coefficient;
    for (let index = 0; index < divisor.length; index++) {
      remainder[index + degree] = (remainder[index + degree] ?? 0) - coefficient * (divisor[index] ?? 0);
    }
    if (!normalizeCoefficientPolynomial(remainder)) return null;
    if (remainder.length === 0) break;
    if (remainder.length - 1 >= previousDegree) {
      return null;
    }
  }
  const normalizedQuotient = normalizeCoefficientPolynomial(quotient);
  const normalizedRemainder = normalizeCoefficientPolynomial(remainder);
  if (!normalizedQuotient || !normalizedRemainder) return null;
  return { quotient: normalizedQuotient, remainder: normalizedRemainder };
}

function normalizeCoefficientPolynomial(coefficients: number[]): number[] | null {
  for (let index = 0; index < coefficients.length; index++) {
    const coefficient = coefficients[index] ?? 0;
    if (!Number.isFinite(coefficient)) return null;
    coefficients[index] = coefficient;
  }
  while (coefficients.length > 0 && coefficients[coefficients.length - 1] === 0) coefficients.pop();
  return coefficients;
}

function integrateReciprocalLike(
  denominator: CasExpression,
  variable: string,
  limits: CasLimits
): CasResult<CasExpression> {
  if (denominator.kind === 'symbol' && denominator.name === variable) {
    return casSuccess(
      functionCallNode('ln', [functionCallNode('abs', [symbolNode(variable)])])
    );
  }

  if (
    denominator.kind === 'binary' &&
    denominator.operator === '^' &&
    denominator.left.kind === 'symbol' &&
    denominator.left.name === variable &&
    denominator.right.kind === 'number' &&
    Number.isInteger(denominator.right.value) &&
    denominator.right.value > 1
  ) {
    return casSuccess(
      integrateVariablePower(
        -denominator.right.value,
        variable,
        1
      )
    );
  }

  const derivative = differentiateCasExpression(denominator, variable, { limits });
  if (!derivative.ok) {
    return derivative.error.code === 'CAS_UNSUPPORTED_DERIVATIVE'
      ? unsupportedIntegralError(derivative.error.functionName)
      : derivative;
  }

  const derivativeValue = readConstantNumericValue(derivative.value);
  if (derivativeValue === null || derivativeValue === 0) {
    return unsupportedIntegralError();
  }

  const absDenominator = functionCallNode('abs', [cloneCasExpression(denominator)]);
  const logTerm = functionCallNode('ln', [absDenominator]);
  return casSuccess(divideExpressionBySignedInteger(logTerm, derivativeValue));
}

function integratePowerNode(
  base: CasExpression,
  exponent: CasExpression,
  variable: string
): CasResult<CasExpression> {
  const rationalExponent = readExactRational(exponent);
  if (!rationalExponent) {
    return unsupportedIntegralError();
  }

  const linear = extractNumericLinearArgument(base, variable);
  if (!linear) {
    return unsupportedIntegralError();
  }

  if (rationalExponent.numerator === -rationalExponent.denominator) {
    return casSuccess(buildExactDivision(
      functionCallNode('ln', [functionCallNode('abs', [cloneCasExpression(base)])]),
      linear.coefficient
    ));
  }

  if (linear.coefficient === 1 && isVariableSymbol(base, variable) && rationalExponent.denominator === 1) {
    return casSuccess(integrateVariablePower(rationalExponent.numerator, variable, 1));
  }

  const nextNumerator = rationalExponent.numerator + rationalExponent.denominator;
  const nextExponent = buildExactDivision(numberNode(nextNumerator), rationalExponent.denominator);
  const power = binaryNode('^', cloneCasExpression(base), nextExponent);
  return casSuccess(buildExactDivision(
    rationalExponent.denominator === 1
      ? power
      : binaryNode('*', numberNode(rationalExponent.denominator), power),
    linear.coefficient * nextNumerator
  ));
}

function integrateFunction(
  node: CasFunctionCallNode,
  variable: string,
  limits: CasLimits
): CasResult<CasExpression> {
  if (!SUPPORTED_INTEGRAL_FUNCTIONS.has(node.name)) {
    return unsupportedIntegralError(node.name);
  }

  if (node.arguments.length !== 1) {
    return unsupportedIntegralError(node.name);
  }

  const argument = node.arguments[0];

  if (node.name === 'sqrt') {
    const linear = extractNumericLinearArgument(argument, variable);
    if (!linear) {
      return unsupportedIntegralError(node.name);
    }

    const numerator = binaryNode(
      '*',
      numberNode(2),
      binaryNode('*', cloneCasExpression(argument), functionCallNode('sqrt', [cloneCasExpression(argument)]))
    );
    return casSuccess(buildExactDivision(numerator, 3 * linear.coefficient));
  }

  if (node.name === 'ln') {
    const linear = extractNumericLinearArgument(argument, variable);
    if (!linear) {
      return unsupportedIntegralError(node.name);
    }

    return casSuccess(buildExactDivision(
      binaryNode('-',
        binaryNode('*', cloneCasExpression(argument), functionCallNode('ln', [cloneCasExpression(argument)])),
        cloneCasExpression(argument)
      ),
      linear.coefficient
    ));
  }

  if (node.name === 'tan') {
    const linear = extractNumericLinearArgument(argument, variable);
    if (!linear) {
      return unsupportedIntegralError(node.name);
    }
    return casSuccess(buildExactDivision(
      unaryNode(
        '-',
        functionCallNode('ln', [
          functionCallNode('abs', [
            functionCallNode('cos', [cloneCasExpression(argument)]),
          ]),
        ])
      ),
      linear.coefficient
    ));
  }

  const derivative = differentiateCasExpression(argument, variable, { limits });
  if (!derivative.ok) {
    return derivative.error.code === 'CAS_UNSUPPORTED_DERIVATIVE'
      ? unsupportedIntegralError(derivative.error.functionName ?? node.name)
      : derivative;
  }

  const derivativeValue = readConstantNumericValue(derivative.value);
  if (derivativeValue === null || derivativeValue === 0) {
    return unsupportedIntegralError(node.name);
  }

  switch (node.name) {
    case 'sin':
      return casSuccess(
        derivativeValue > 0
          ? binaryNode(
              '/',
              unaryNode('-', functionCallNode('cos', [cloneCasExpression(argument)])),
              numberNode(derivativeValue)
            )
          : binaryNode(
              '/',
              functionCallNode('cos', [cloneCasExpression(argument)]),
              numberNode(Math.abs(derivativeValue))
            )
      );
    case 'cos':
      return casSuccess(
        derivativeValue > 0
          ? binaryNode(
              '/',
              functionCallNode('sin', [cloneCasExpression(argument)]),
              numberNode(derivativeValue)
            )
          : binaryNode(
              '/',
              unaryNode('-', functionCallNode('sin', [cloneCasExpression(argument)])),
              numberNode(Math.abs(derivativeValue))
            )
      );
    case 'exp':
    case 'expe':
      return casSuccess(
        derivativeValue > 0
          ? binaryNode(
              '/',
              functionCallNode(node.name, [cloneCasExpression(argument)]),
              numberNode(derivativeValue)
            )
          : binaryNode(
              '/',
              unaryNode('-', functionCallNode(node.name, [cloneCasExpression(argument)])),
              numberNode(Math.abs(derivativeValue))
            )
      );
    default:
      return unsupportedIntegralError(node.name);
  }
}

function integrateByPartsFunction(
  functionName: string,
  degree: number,
  variable: string
): CasResult<CasExpression> {
  const variableSymbol = symbolNode(variable);
  const functionArgument = symbolNode(variable);
  const functionExpression = functionCallNode(functionName, [functionArgument]);

  switch (functionName) {
    case 'exp':
    case 'expe':
      if (degree === 2) {
        return casSuccess(binaryNode('*', functionExpression,
          binaryNode('+', binaryNode('-', binaryNode('^', variableSymbol, numberNode(2)), binaryNode('*', numberNode(2), symbolNode(variable))), numberNode(2))));
      }
      return casSuccess(
        binaryNode(
          '-',
          binaryNode('*', variableSymbol, functionExpression),
          functionCallNode(functionName, [symbolNode(variable)])
        )
      );
    case 'sin':
      if (degree !== 1) {
        return unsupportedIntegralError(functionName);
      }
      return casSuccess(
        binaryNode(
          '+',
          unaryNode(
            '-',
            binaryNode(
              '*',
              variableSymbol,
              functionCallNode('cos', [symbolNode(variable)])
            )
          ),
          functionCallNode('sin', [symbolNode(variable)])
        )
      );
    case 'cos':
      if (degree !== 1) {
        return unsupportedIntegralError(functionName);
      }
      return casSuccess(
        binaryNode(
          '+',
          binaryNode(
            '*',
            variableSymbol,
            functionCallNode('sin', [symbolNode(variable)])
          ),
          functionCallNode('cos', [symbolNode(variable)])
        )
      );
    default:
      return unsupportedIntegralError(functionName);
  }
}

/** Restricted structural u-substitution: c * f'(x) * F(f(x)). */
function tryIntegrateProportionalProduct(
  left: CasExpression,
  right: CasExpression,
  variable: string,
  limits: CasLimits
): CasResult<CasExpression> {
  const factors = collectMultiplicationFactors(binaryNode('*', left, right));
  for (let index = 0; index < factors.length; index++) {
    const outer = factors[index];
    if (outer.kind !== 'function' || outer.arguments.length !== 1 || !['sin', 'cos', 'exp', 'expe'].includes(outer.name)) {
      continue;
    }
    const inner = outer.arguments[0];
    const derivative = differentiateCasExpression(inner, variable, { limits });
    if (!derivative.ok) continue;
    const remaining = factors.filter((_, candidateIndex) => candidateIndex !== index);
    const ratio = extractExactProportionalRatio(remaining, derivative.value);
    if (ratio === null) continue;

    const primitive = outer.name === 'sin'
      ? unaryNode('-', functionCallNode('cos', [cloneCasExpression(inner)]))
      : outer.name === 'cos'
        ? functionCallNode('sin', [cloneCasExpression(inner)])
        : functionCallNode(outer.name, [cloneCasExpression(inner)]);
    return casSuccess(scaleExpressionByInteger(primitive, ratio));
  }
  return unsupportedIntegralError();
}

function extractExactProportionalRatio(factors: readonly CasExpression[], derivative: CasExpression): number | null {
  const actual = factors.reduce<CasExpression | null>((result, factor) => result ? binaryNode('*', result, factor) : factor, null);
  if (!actual) return null;
  const actualParts = extractNumericCoefficient(actual);
  const derivativeParts = extractNumericCoefficient(derivative);
  if (!structurallySameAfterSimplification(actualParts.core, derivativeParts.core)) return null;
  if (derivativeParts.coefficient === 0) return null;
  const ratio = actualParts.coefficient / derivativeParts.coefficient;
  return Number.isInteger(ratio) ? ratio : null;
}

function extractNumericCoefficient(expression: CasExpression): { coefficient: number; core: CasExpression } {
  const factors = collectMultiplicationFactors(expression);
  let coefficient = 1;
  const remaining: CasExpression[] = [];
  for (const factor of factors) {
    if (factor.kind === 'number') coefficient *= factor.value;
    else remaining.push(cloneCasExpression(factor));
  }
  return { coefficient, core: remaining.length === 0 ? numberNode(1) : remaining.reduce((left, right) => binaryNode('*', left, right)) };
}

function structurallySameAfterSimplification(left: CasExpression, right: CasExpression): boolean {
  const simplifiedLeft = simplifyCasExpression(left);
  const simplifiedRight = simplifyCasExpression(right);
  return simplifiedLeft.ok && simplifiedRight.ok && formatCasExpression(simplifiedLeft.value) === formatCasExpression(simplifiedRight.value);
}

function extractNumericLinearArgument(expression: CasExpression, variable: string): { coefficient: number } | null {
  const derivative = differentiateCasExpression(expression, variable);
  if (!derivative.ok) return null;
  const coefficient = readConstantNumericValue(derivative.value);
  return coefficient === null || coefficient === 0 ? null : { coefficient };
}

function readExactRational(expression: CasExpression): { numerator: number; denominator: number } | null {
  if (expression.kind === 'number' && Number.isInteger(expression.value)) return { numerator: expression.value, denominator: 1 };
  if (expression.kind === 'unary' && expression.operator === '-') {
    const value = readExactRational(expression.operand);
    return value ? { numerator: -value.numerator, denominator: value.denominator } : null;
  }
  if (expression.kind === 'binary' && expression.operator === '/' && expression.left.kind === 'number' && expression.right.kind === 'number' && Number.isInteger(expression.left.value) && Number.isInteger(expression.right.value) && expression.right.value !== 0) {
    return { numerator: expression.left.value, denominator: expression.right.value };
  }
  return null;
}

function readVariablePower(expression: CasExpression, variable: string): number | null {
  if (isVariableSymbol(expression, variable)) return 1;
  if (expression.kind === 'binary' && expression.operator === '^' && isVariableSymbol(expression.left, variable) && expression.right.kind === 'number' && Number.isInteger(expression.right.value)) return expression.right.value;
  return null;
}

function integrateVariablePower(
  exponent: number,
  variable: string,
  coefficient: number
): CasExpression {
  if (coefficient === 0) {
    return numberNode(0);
  }

  if (exponent === -1) {
    const absVariable = functionCallNode('abs', [symbolNode(variable)]);
    const logarithm = functionCallNode('ln', [absVariable]);
    if (coefficient === 1) {
      return logarithm;
    }

    if (coefficient === -1) {
      return unaryNode('-', logarithm);
    }

    return binaryNode('*', numberNode(coefficient), logarithm);
  }

  const nextExponent = exponent + 1;
  if (nextExponent === 0) {
    return numberNode(coefficient);
  }

  const power =
    nextExponent === 1
      ? symbolNode(variable)
      : binaryNode('^', symbolNode(variable), numberNode(nextExponent));

  if (exponent < -1) {
    const denominatorPower = Math.abs(nextExponent);
    const denominator =
      denominatorPower === 1
        ? symbolNode(variable)
        : binaryNode(
            '*',
            numberNode(denominatorPower),
            binaryNode('^', symbolNode(variable), numberNode(denominatorPower))
          );

    return binaryNode('/', numberNode(-coefficient), denominator);
  }

  if (coefficient === 1) {
    return buildExactDivision(power, nextExponent);
  }

  if (coefficient === -1) {
    return unaryNode('-', buildExactDivision(power, nextExponent));
  }

  return buildExactDivision(
    binaryNode('*', numberNode(coefficient), power),
    nextExponent
  );
}

function divideExpressionByConstant(
  expression: CasExpression,
  divisor: CasExpression
): CasExpression {
  if (divisor.kind === 'number') {
    if (divisor.value === 1) {
      return expression;
    }

    if (divisor.value === -1) {
      return unaryNode('-', expression);
    }

    if (expression.kind === 'number') {
      return buildExactDivision(numberNode(expression.value), divisor.value);
    }

    if (expression.kind === 'binary' && expression.operator === '/' && expression.right.kind === 'number') {
      return buildExactDivision(
        cloneCasExpression(expression.left),
        expression.right.value * divisor.value
      );
    }
  }

  return binaryNode('/', expression, cloneCasExpression(divisor));
}

function divideExpressionBySignedInteger(
  expression: CasExpression,
  denominator: number
): CasExpression {
  return buildExactDivision(expression, denominator);
}

function attachIndependentFactor(
  factor: CasExpression,
  integrated: CasExpression
): CasExpression {
  if (integrated.kind === 'binary' && integrated.operator === '/' && integrated.right.kind === 'number') {
    return buildExactDivision(
      binaryNode('*', factor, cloneCasExpression(integrated.left)),
      integrated.right.value
    );
  }

  if (integrated.kind === 'unary' && integrated.operator === '-') {
    return unaryNode('-', attachIndependentFactor(factor, integrated.operand));
  }

  return binaryNode('*', factor, integrated);
}

function readConstantNumericValue(expression: CasExpression): number | null {
  switch (expression.kind) {
    case 'number':
      return expression.value;
    case 'unary': {
      const operand = readConstantNumericValue(expression.operand);
      if (operand === null) {
        return null;
      }

      return expression.operator === '-' ? -operand : operand;
    }
    case 'binary': {
      const left = readConstantNumericValue(expression.left);
      const right = readConstantNumericValue(expression.right);
      if (left === null || right === null) {
        return null;
      }

      switch (expression.operator) {
        case '+':
          return left + right;
        case '-':
          return left - right;
        case '*':
          return left * right;
        case '/':
          return right === 0 ? null : left / right;
        case '^':
          return Math.pow(left, right);
        default:
          return null;
      }
    }
    default:
      return null;
  }
}

function collectMultiplicationFactors(expression: CasExpression): CasExpression[] {
  if (expression.kind === 'unary' && expression.operator === '-') {
    return [numberNode(-1), ...collectMultiplicationFactors(expression.operand)];
  }

  if (expression.kind === 'binary' && expression.operator === '*') {
    return [
      ...collectMultiplicationFactors(expression.left),
      ...collectMultiplicationFactors(expression.right),
    ];
  }

  return [expression];
}

function isVariableSymbol(
  expression: CasExpression,
  variable: string
): expression is { readonly kind: 'symbol'; readonly name: string } {
  return expression.kind === 'symbol' && expression.name === variable;
}

function isSupportedByPartsFunction(
  expression: CasExpression,
  variable: string
): expression is CasFunctionCallNode {
  return (
    expression.kind === 'function' &&
    expression.arguments.length === 1 &&
    isVariableSymbol(expression.arguments[0], variable) &&
    (expression.name === 'exp' ||
      expression.name === 'expe' ||
      expression.name === 'sin' ||
      expression.name === 'cos')
  );
}

function scaleExpressionByInteger(
  expression: CasExpression,
  factor: number
): CasExpression {
  if (factor === 0) {
    return numberNode(0);
  }

  if (factor === 1) {
    return cloneCasExpression(expression);
  }

  if (factor === -1) {
    return unaryNode('-', cloneCasExpression(expression));
  }

  switch (expression.kind) {
    case 'number':
      return numberNode(expression.value * factor);
    case 'symbol':
      return binaryNode('*', numberNode(factor), symbolNode(expression.name));
    case 'unary':
      return expression.operator === '+'
        ? scaleExpressionByInteger(expression.operand, factor)
        : unaryNode('-', scaleExpressionByInteger(expression.operand, factor));
    case 'binary':
      switch (expression.operator) {
        case '+':
          return binaryNode(
            '+',
            scaleExpressionByInteger(expression.left, factor),
            scaleExpressionByInteger(expression.right, factor)
          );
        case '-':
          return binaryNode(
            '-',
            scaleExpressionByInteger(expression.left, factor),
            scaleExpressionByInteger(expression.right, factor)
          );
        case '*':
          if (expression.left.kind === 'number') {
            return binaryNode('*', numberNode(expression.left.value * factor), cloneCasExpression(expression.right));
          }

          if (expression.right.kind === 'number') {
            return binaryNode('*', numberNode(expression.right.value * factor), cloneCasExpression(expression.left));
          }

          return binaryNode('*', numberNode(factor), cloneCasExpression(expression));
        case '/':
          if (expression.right.kind === 'number') {
            return binaryNode(
              '/',
              scaleExpressionByInteger(expression.left, factor),
              numberNode(expression.right.value)
            );
          }

          return binaryNode('*', numberNode(factor), cloneCasExpression(expression));
        case '^':
          return binaryNode('*', numberNode(factor), cloneCasExpression(expression));
      }
      break;
    case 'function':
      return binaryNode('*', numberNode(factor), cloneCasExpression(expression));
    case 'equation':
      return binaryNode('*', numberNode(factor), cloneCasExpression(expression));
    default: {
      const _exhaustive: never = expression;
      return _exhaustive;
    }
  }
}

function isNumericExpression(expression: CasExpression): expression is { readonly kind: 'number'; readonly value: number } {
  return expression.kind === 'number';
}

function cloneCasExpression(expression: CasExpression): CasExpression {
  switch (expression.kind) {
    case 'number':
      return numberNode(expression.value);
    case 'symbol':
      return symbolNode(expression.name);
    case 'unary':
      return unaryNode(expression.operator, cloneCasExpression(expression.operand));
    case 'binary':
      return binaryNode(
        expression.operator,
        cloneCasExpression(expression.left),
        cloneCasExpression(expression.right)
      );
    case 'function':
      return functionCallNode(
        expression.name,
        expression.arguments.map(argument => cloneCasExpression(argument))
      );
    case 'equation':
      return {
        kind: 'equation',
        left: cloneCasExpression(expression.left),
        right: cloneCasExpression(expression.right),
      };
    default: {
      const _exhaustive: never = expression;
      return _exhaustive;
    }
  }
}

function unsupportedIntegralError(functionName?: string): CasResult<CasExpression> {
  return casFailure(
    createCasError(
      'CAS_UNSUPPORTED_INTEGRAL',
      functionName
        ? `La función ${functionName} no está soportada simbólicamente en integrales.`
        : 'Esta integral todavía no está soportada.',
      undefined,
      functionName
    )
  );
}
