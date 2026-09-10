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
import { buildExactDivision } from '../rational/cas-rational';
import { buildExactRationalExpression } from '../rational/cas-rational';
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
    const reciprocal = integrateReciprocalLike(denominator, variable, limits);
    if (!reciprocal.ok) return reciprocal;
    return casSuccess(attachIndependentFactor(
      buildExactRationalExpression(numeratorCoefficients[0]),
      reciprocal.value
    ));
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
