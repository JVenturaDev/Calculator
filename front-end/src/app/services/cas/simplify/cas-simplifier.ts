import {
  binaryNode,
  equationNode,
  functionCallNode,
  isStructurallyEqual,
  measureCasExpression,
  numberNode,
  type CasBinaryNode,
  type CasExpression,
  type CasFunctionCallNode,
  type CasUnaryNode,
  unaryNode,
} from '../ast/cas-ast';
import { createCasError } from '../errors/cas-errors';
import { DEFAULT_CAS_LIMITS, resolveCasLimits, type CasLimits } from '../limits/cas-limits';
import { casFailure, casSuccess, type CasResult } from '../result/cas-result';
import { formatCasExpression } from '../format/cas-formatter';
import { toExpressionIfPolynomial } from '../polynomial/cas-polynomial';
import { reduceExactRationalExpression } from '../rational/cas-rational';

export interface CasSimplifyOptions {
  readonly limits?: Partial<CasLimits>;
}

export interface CasTextResult {
  readonly expression: CasExpression;
  readonly text: string;
  readonly latex: string;
}

export function simplifyCasExpression(
  expression: CasExpression,
  options: CasSimplifyOptions = {}
): CasResult<CasExpression> {
  const limits = resolveCasLimits(options.limits ?? DEFAULT_CAS_LIMITS);
  const initialComplexity = measureCasExpression(expression);
  if (!withinLimits(initialComplexity.depth, initialComplexity.nodeCount, limits)) {
    return casFailure(
      createCasError(
        'TOO_COMPLEX',
        'La expresión CAS supera el límite de complejidad.'
      )
    );
  }

  let current = expression;

  for (let iteration = 0; iteration < limits.maxIterations; iteration++) {
    const simplified = simplifyPass(current);
    if (!simplified.ok) {
      return simplified;
    }

    const next = simplified.value;
    const polynomialRoundTrip = toExpressionIfPolynomial(next, {
      limits,
      maxExponent: 8,
      maxTerms: 256,
    });
    if (polynomialRoundTrip.ok) {
      const canonical = polynomialRoundTrip.value;
      if (
        isStructurallyEqual(next, canonical) ||
        formatCasExpression(next) === formatCasExpression(canonical)
      ) {
        const complexity = measureCasExpression(canonical);
        if (!withinLimits(complexity.depth, complexity.nodeCount, limits)) {
          return casFailure(
            createCasError(
              'TOO_COMPLEX',
              'La expresiÃ³n CAS supera el lÃ­mite de complejidad.'
            )
          );
        }

        return casSuccess(canonical, {
          depth: complexity.depth,
          nodeCount: complexity.nodeCount,
          iterations: iteration + 1,
        });
      }

      if (!isStructurallyEqual(current, canonical)) {
        current = canonical;
        continue;
      }
    }

    const complexity = measureCasExpression(next);
    if (!withinLimits(complexity.depth, complexity.nodeCount, limits)) {
      return casFailure(
        createCasError(
          'TOO_COMPLEX',
          'La expresión CAS supera el límite de complejidad.'
        )
      );
    }

    if (
      isStructurallyEqual(current, next) ||
      formatCasExpression(current) === formatCasExpression(next)
    ) {
      return casSuccess(next, {
        depth: complexity.depth,
        nodeCount: complexity.nodeCount,
        iterations: iteration + 1,
      });
    }

    current = next;
  }

  return casFailure(
    createCasError(
      'ITERATION_LIMIT',
      'La simplificación CAS no convergió dentro del límite de iteraciones.'
    )
  );
}

export function simplifyCasText(
  source: string,
  parser: { parse(source: string): CasResult<CasExpression> },
  options: CasSimplifyOptions = {}
): CasResult<CasTextResult> {
  const parsed = parser.parse(source);
  if (!parsed.ok) {
    return parsed;
  }

  const simplified = simplifyCasExpression(parsed.value, options);
  if (!simplified.ok) {
    return simplified;
  }

  return casSuccess({
    expression: simplified.value,
    text: formatCasExpression(simplified.value),
    latex: formatCasExpression(simplified.value),
  }, simplified.metadata);
}

function simplifyPass(expression: CasExpression): CasResult<CasExpression> {
  switch (expression.kind) {
    case 'number':
    case 'symbol':
      return casSuccess(expression);
    case 'unary':
      return simplifyUnary(expression);
    case 'binary':
      return simplifyBinary(expression);
    case 'function':
      return simplifyFunction(expression);
    case 'equation':
      return simplifyEquation(expression);
    default: {
      const _exhaustive: never = expression;
      return _exhaustive;
    }
  }
}

function simplifyUnary(node: CasUnaryNode): CasResult<CasExpression> {
  const operandResult = simplifyPass(node.operand);
  if (!operandResult.ok) return operandResult;

  const operand = operandResult.value;

  if (node.operator === '+') {
    return casSuccess(operand);
  }

  if (operand.kind === 'number') {
    return createNumberResult(-operand.value);
  }

  if (operand.kind === 'unary' && operand.operator === '-') {
    return casSuccess(operand.operand);
  }

  return casSuccess(unaryNode('-', operand));
}

function simplifyBinary(node: CasBinaryNode): CasResult<CasExpression> {
  const leftResult = simplifyPass(node.left);
  if (!leftResult.ok) return leftResult;
  const rightResult = simplifyPass(node.right);
  if (!rightResult.ok) return rightResult;

  const left = leftResult.value;
  const right = rightResult.value;

  switch (node.operator) {
    case '+':
      return simplifyAddition(left, right);
    case '-':
      return simplifySubtraction(left, right);
    case '*':
      return simplifyMultiplication(left, right);
    case '/':
      return simplifyDivision(left, right);
    case '^':
      return simplifyPower(left, right);
    default: {
      const _exhaustive: never = node.operator;
      return _exhaustive;
    }
  }
}

function simplifyFunction(node: CasFunctionCallNode): CasResult<CasExpression> {
  const args: CasExpression[] = [];

  for (const argument of node.arguments) {
    const simplified = simplifyPass(argument);
    if (!simplified.ok) return simplified;
    args.push(simplified.value);
  }

  return casSuccess(functionCallNode(node.name, args));
}

function simplifyEquation(
  node: ReturnType<typeof equationNode>
): CasResult<CasExpression> {
  const left = simplifyPass(node.left);
  if (!left.ok) return left;
  const right = simplifyPass(node.right);
  if (!right.ok) return right;

  return casSuccess(equationNode(left.value, right.value));
}

function simplifyAddition(
  left: CasExpression,
  right: CasExpression
): CasResult<CasExpression> {
  const terms = collectTerms(left, '+');
  terms.push(...collectTerms(right, '+'));

  let numericTotal = 0;
  const symbolicTerms: CasExpression[] = [];

  for (const term of terms) {
    if (term.kind === 'number') {
      numericTotal += term.value;
    } else {
      symbolicTerms.push(term);
    }
  }

  const rebuilt: CasExpression[] = [...symbolicTerms];
  if (numericTotal !== 0 || rebuilt.length === 0) {
    rebuilt.push(numberNode(numericTotal));
  }

  const result = rebuildBinaryChain('+', rebuilt);
  if (!result.ok) return result;

  return casSuccess(canonicalizePolynomialExpression(result.value));
}

function simplifySubtraction(
  left: CasExpression,
  right: CasExpression
): CasResult<CasExpression> {
  if (right.kind === 'number' && right.value === 0) {
    return casSuccess(left);
  }

  if (left.kind === 'number' && right.kind === 'number') {
    return createNumberResult(left.value - right.value);
  }

  return casSuccess(canonicalizePolynomialExpression(binaryNode('-', left, right)));
}

function simplifyMultiplication(
  left: CasExpression,
  right: CasExpression
): CasResult<CasExpression> {
  const factors = collectTerms(left, '*');
  factors.push(...collectTerms(right, '*'));

  let numericProduct = 1;
  const symbolicFactors: CasExpression[] = [];

  for (const factor of factors) {
    if (factor.kind === 'number') {
      if (factor.value === 0) {
        return createNumberResult(0);
      }
      numericProduct *= factor.value;
    } else {
      symbolicFactors.push(factor);
    }
  }

  if (symbolicFactors.length === 0) {
    return createNumberResult(numericProduct);
  }

  const normalizedFactors = sortMultiplicationFactors(symbolicFactors);
  const symbolicProductResult = rebuildBinaryChain('*', normalizedFactors);
  if (!symbolicProductResult.ok) {
    return symbolicProductResult;
  }

  if (numericProduct === 1) {
    return casSuccess(symbolicProductResult.value);
  }

  return casSuccess(
    binaryNode('*', numberNode(numericProduct), symbolicProductResult.value)
  );
}

function simplifyDivision(
  left: CasExpression,
  right: CasExpression
): CasResult<CasExpression> {
  if (right.kind === 'number' && right.value === 0) {
    return casFailure(
      createCasError('DIVISION_BY_ZERO', 'No se puede dividir entre cero.')
    );
  }

  if (right.kind === 'number' && right.value === 1) {
    return casSuccess(left);
  }

  if (left.kind === 'number' && right.kind === 'number') {
    return createDivisionResult(left.value, right.value);
  }

  return casSuccess(binaryNode('/', left, right));
}

function simplifyPower(
  left: CasExpression,
  right: CasExpression
): CasResult<CasExpression> {
  if (right.kind === 'number' && right.value === 1) {
    return casSuccess(left);
  }

  if (left.kind === 'number' && left.value === 1) {
    return createNumberResult(1);
  }

  if (left.kind === 'number' && right.kind === 'number') {
    if (left.value === 0 && right.value === 0) {
      return casFailure(
        createCasError(
          'UNSUPPORTED_OPERATION',
          '0 ^ 0 es indeterminado en CAS.2.'
        )
      );
    }

    const powered = Math.pow(left.value, right.value);
    if (!Number.isFinite(powered)) {
      return casFailure(
        createCasError(
          'TOO_COMPLEX',
          'El resultado numérico de la potencia no es finito.'
        )
      );
    }

    return createNumberResult(powered);
  }

  return casSuccess(binaryNode('^', left, right));
}

function collectTerms(
  node: CasExpression,
  operator: '+' | '*'
): CasExpression[] {
  if (node.kind === 'binary' && node.operator === operator) {
    return [
      ...collectTerms(node.left, operator),
      ...collectTerms(node.right, operator),
    ];
  }

  return [node];
}

function rebuildBinaryChain(
  operator: '+' | '*',
  items: readonly CasExpression[]
): CasResult<CasExpression> {
  if (items.length === 0) {
    return operator === '+'
      ? createNumberResult(0)
      : createNumberResult(1);
  }

  if (items.length === 1) {
    return casSuccess(items[0]);
  }

  let current = items[0];
  for (let index = 1; index < items.length; index++) {
    current = binaryNode(operator, current, items[index]);
  }

  return casSuccess(current);
}

function withinLimits(
  depth: number,
  nodeCount: number,
  limits: CasLimits
): boolean {
  return depth <= limits.maxDepth && nodeCount <= limits.maxNodes;
}

function createNumberResult(value: number): CasResult<CasExpression> {
  if (!Number.isFinite(value)) {
    return casFailure(
      createCasError('TOO_COMPLEX', 'El resultado numérico no es finito.')
    );
  }

  return casSuccess(numberNode(value));
}

function createDivisionResult(
  numerator: number,
  denominator: number
): CasResult<CasExpression> {
  if (denominator === 0) {
    return casFailure(
      createCasError('DIVISION_BY_ZERO', 'No se puede dividir entre cero.')
    );
  }

  const result = numerator / denominator;
  if (!Number.isFinite(result)) {
    return casFailure(
      createCasError('TOO_COMPLEX', 'El resultado numérico no es finito.')
    );
  }

  return casSuccess(reduceExactRationalExpression(numerator, denominator));
}

function canonicalizePolynomialExpression(
  expression: CasExpression
): CasExpression {
  const polynomial = toExpressionIfPolynomial(expression);
  if (polynomial.ok) {
    return polynomial.value;
  }

  return expression;
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
