import {
  binaryNode,
  equationNode,
  functionCallNode,
  measureCasExpression,
  numberNode,
  type CasBinaryNode,
  type CasExpression,
  type CasFunctionCallNode,
  type CasUnaryNode,
} from '../ast/cas-ast';
import { createCasError } from '../errors/cas-errors';
import { DEFAULT_CAS_LIMITS, resolveCasLimits, type CasLimits } from '../limits/cas-limits';
import { casFailure, casSuccess, type CasResult } from '../result/cas-result';
import { formatCasExpression } from '../format/cas-formatter';
import { simplifyCasExpression, type CasTextResult } from '../simplify/cas-simplifier';
import { normalizeCasVariableName, validateCasVariable } from '../variable/cas-variable';

export interface CasOperationOptions {
  readonly limits?: Partial<CasLimits>;
}

export function differentiateCasExpression(
  expression: CasExpression,
  variable: string,
  options: CasOperationOptions = {}
): CasResult<CasExpression> {
  const normalizedVariable = validateCasVariable(variable);
  if (!normalizedVariable.ok) {
    return normalizedVariable;
  }

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

  if (!dependsOnCasExpression(expression, normalizedVariable.value)) {
    return casSuccess(numberNode(0), {
      depth: 1,
      nodeCount: 1,
      iterations: 1,
    });
  }

  const differentiated = differentiateNode(
    expression,
    normalizedVariable.value,
    limits
  );
  if (!differentiated.ok) {
    return differentiated;
  }

  const differentiatedComplexity = measureCasExpression(differentiated.value);
  if (
    !withinLimits(
      differentiatedComplexity.depth,
      differentiatedComplexity.nodeCount,
      limits
    )
  ) {
    return casFailure(
      createCasError(
        'TOO_COMPLEX',
        'La derivada CAS supera el límite de complejidad.'
      )
    );
  }

  return simplifyCasExpression(differentiated.value, { limits });
}

export function differentiateCasText(
  source: string,
  variable: string,
  parser: { parse(source: string): CasResult<CasExpression> },
  options: CasOperationOptions = {}
): CasResult<CasTextResult> {
  const parsed = parser.parse(source);
  if (!parsed.ok) {
    return parsed;
  }

  const differentiated = differentiateCasExpression(parsed.value, variable, options);
  if (!differentiated.ok) {
    return differentiated;
  }

  return casSuccess(
    {
      expression: differentiated.value,
      text: formatCasExpression(differentiated.value),
      latex: formatCasExpression(differentiated.value),
    },
    differentiated.metadata
  );
}

export function dependsOnCasExpression(
  expression: CasExpression,
  variable: string
): boolean {
  const normalizedVariable = normalizeVariableName(variable);
  if (!normalizedVariable) {
    return false;
  }

  return dependsOnNode(expression, normalizedVariable);
}

function differentiateNode(
  node: CasExpression,
  variable: string,
  limits: CasLimits
): CasResult<CasExpression> {
  switch (node.kind) {
    case 'number':
      return casSuccess(numberNode(0));
    case 'symbol':
      return casSuccess(numberNode(node.name === variable ? 1 : 0));
    case 'unary':
      return differentiateUnary(node, variable, limits);
    case 'binary':
      return differentiateBinary(node, variable, limits);
    case 'function':
      return differentiateFunction(node, variable, limits);
    case 'equation':
      return differentiateEquation(node, variable, limits);
    default: {
      const _exhaustive: never = node;
      return _exhaustive;
    }
  }
}

function differentiateUnary(
  node: CasUnaryNode,
  variable: string,
  limits: CasLimits
): CasResult<CasExpression> {
  const derivative = differentiateNode(node.operand, variable, limits);
  if (!derivative.ok) {
    return derivative;
  }

  if (node.operator === '+') {
    return derivative;
  }

  return casSuccess(multiplyChain([numberNode(-1), derivative.value]));
}

function differentiateBinary(
  node: CasBinaryNode,
  variable: string,
  limits: CasLimits
): CasResult<CasExpression> {
  const leftDerivative = differentiateNode(node.left, variable, limits);
  if (!leftDerivative.ok) {
    return leftDerivative;
  }

  const rightDerivative = differentiateNode(node.right, variable, limits);
  if (!rightDerivative.ok) {
    return rightDerivative;
  }

  switch (node.operator) {
    case '+':
      return casSuccess(
        binaryNode('+', leftDerivative.value, rightDerivative.value)
      );
    case '-':
      return casSuccess(
        binaryNode('-', leftDerivative.value, rightDerivative.value)
      );
    case '*':
      return casSuccess(
        binaryNode(
          '+',
          multiplyChain([leftDerivative.value, node.right]),
          multiplyChain([node.left, rightDerivative.value])
        )
      );
    case '/': {
      const numerator = binaryNode(
        '-',
        multiplyChain([leftDerivative.value, node.right]),
        multiplyChain([node.left, rightDerivative.value])
      );
      const denominator = binaryNode('^', node.right, numberNode(2));
      return casSuccess(binaryNode('/', numerator, denominator));
    }
    case '^':
      return differentiatePower(node, leftDerivative.value);
    default: {
      const _exhaustive: never = node.operator;
      return _exhaustive;
    }
  }
}

function differentiatePower(
  node: CasBinaryNode,
  baseDerivative: CasExpression
): CasResult<CasExpression> {
  if (node.right.kind !== 'number') {
    return casFailure(
      createCasError(
        'UNSUPPORTED_EXPRESSION',
        'La regla general de potencias no está soportada.'
      )
    );
  }

  if (!Number.isInteger(node.right.value) || node.right.value < 0) {
    return casFailure(
      createCasError(
        'UNSUPPORTED_EXPRESSION',
        'Los exponentes simbólicos deben ser enteros no negativos.'
      )
    );
  }

  if (node.right.value === 0) {
    return casSuccess(numberNode(0));
  }

  if (node.right.value === 1) {
    return casSuccess(baseDerivative);
  }

  return casSuccess(
    multiplyChain([
      numberNode(node.right.value),
      binaryNode('^', node.left, numberNode(node.right.value - 1)),
      baseDerivative,
    ])
  );
}

function differentiateFunction(
  node: CasFunctionCallNode,
  variable: string,
  limits: CasLimits
): CasResult<CasExpression> {
  if (node.arguments.length === 0) {
    return casSuccess(numberNode(0));
  }

  if (node.name === 'pow') {
    return differentiatePowerFunction(node, variable, limits);
  }

  if (node.arguments.length !== 1) {
    return casFailure(
      createCasError(
        'UNSUPPORTED_OPERATION',
        `La función ${node.name} no está soportada simbólicamente.`
      )
    );
  }

  const argument = node.arguments[0];
  const argumentDerivative = differentiateNode(argument, variable, limits);
  if (!argumentDerivative.ok) {
    return argumentDerivative;
  }

  switch (node.name) {
    case 'sin':
      return casSuccess(
        multiplyChain([
          argumentDerivative.value,
          functionCallNode('cos', [argument]),
        ])
      );
    case 'cos':
      return casSuccess(
        multiplyChain([
          numberNode(-1),
          argumentDerivative.value,
          functionCallNode('sin', [argument]),
        ])
      );
    case 'tan':
      return casSuccess(
        binaryNode(
          '/',
          argumentDerivative.value,
          binaryNode(
            '^',
            functionCallNode('cos', [argument]),
            numberNode(2)
          )
        )
      );
    case 'ln':
    case 'log':
      return casSuccess(binaryNode('/', argumentDerivative.value, argument));
    case 'exp':
    case 'expe':
      return casSuccess(
        multiplyChain([
          argumentDerivative.value,
          functionCallNode(node.name, [argument]),
        ])
      );
    case 'sqrt':
      return casSuccess(
        binaryNode(
          '/',
          argumentDerivative.value,
          multiplyChain([
            numberNode(2),
            functionCallNode('sqrt', [argument]),
          ])
        )
      );
    default:
      return casFailure(
        createCasError(
          'UNSUPPORTED_OPERATION',
          `La función ${node.name} no está soportada simbólicamente.`
        )
      );
  }
}

function differentiatePowerFunction(
  node: CasFunctionCallNode,
  variable: string,
  limits: CasLimits
): CasResult<CasExpression> {
  if (node.arguments.length !== 2) {
    return casFailure(
      createCasError(
        'UNSUPPORTED_OPERATION',
        'pow requiere dos argumentos para derivación simbólica.'
      )
    );
  }

  const [base, exponent] = node.arguments;
  if (
    exponent.kind !== 'number' ||
    !Number.isInteger(exponent.value) ||
    exponent.value < 0
  ) {
    return casFailure(
      createCasError(
        'UNSUPPORTED_EXPRESSION',
        'pow sólo admite exponentes enteros no negativos.'
      )
    );
  }

  const baseDerivative = differentiateNode(base, variable, limits);
  if (!baseDerivative.ok) {
    return baseDerivative;
  }

  if (exponent.value === 0) {
    return casSuccess(numberNode(0));
  }

  if (exponent.value === 1) {
    return casSuccess(baseDerivative.value);
  }

  return casSuccess(
    multiplyChain([
      numberNode(exponent.value),
      binaryNode('^', base, numberNode(exponent.value - 1)),
      baseDerivative.value,
    ])
  );
}

function differentiateEquation(
  node: CasExpression & { readonly kind: 'equation' },
  variable: string,
  limits: CasLimits
): CasResult<CasExpression> {
  const left = differentiateNode(node.left, variable, limits);
  if (!left.ok) return left;

  const right = differentiateNode(node.right, variable, limits);
  if (!right.ok) return right;

  return casSuccess(equationNode(left.value, right.value));
}

function multiplyChain(items: readonly CasExpression[]): CasExpression {
  if (items.length === 0) {
    return numberNode(1);
  }

  if (items.length === 1) {
    return items[0];
  }

  return items.slice(1).reduce(
    (left, right) => binaryNode('*', left, right),
    items[0]
  );
}

function normalizeVariableName(variable: string): string | null {
  return normalizeCasVariableName(variable);
}

function dependsOnNode(expression: CasExpression, variable: string): boolean {
  switch (expression.kind) {
    case 'number':
      return false;
    case 'symbol':
      return expression.name === variable;
    case 'unary':
      return dependsOnNode(expression.operand, variable);
    case 'binary':
      return (
        dependsOnNode(expression.left, variable) ||
        dependsOnNode(expression.right, variable)
      );
    case 'function':
      return expression.arguments.some(argument =>
        dependsOnNode(argument, variable)
      );
    case 'equation':
      return (
        dependsOnNode(expression.left, variable) ||
        dependsOnNode(expression.right, variable)
      );
    default: {
      const _exhaustive: never = expression;
      return _exhaustive;
    }
  }
}

function withinLimits(
  depth: number,
  nodeCount: number,
  limits: CasLimits
): boolean {
  return depth <= limits.maxDepth && nodeCount <= limits.maxNodes;
}
