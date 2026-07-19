import {
  type CasBinaryNode,
  type CasExpression,
  type CasFunctionCallNode,
  type CasUnaryNode,
} from '../ast/cas-ast';

const PRECEDENCE = {
  equation: 0,
  add: 1,
  multiply: 2,
  power: 3,
  unary: 4,
  atom: 5,
} as const;

export function formatCasExpression(expression: CasExpression): string {
  return formatNode(expression, PRECEDENCE.equation);
}

function formatNode(node: CasExpression, parentPrecedence: number): string {
  const currentPrecedence = precedenceOf(node);
  const rendered = renderNode(node);
  return currentPrecedence < parentPrecedence ? `(${rendered})` : rendered;
}

function renderNode(node: CasExpression): string {
  switch (node.kind) {
    case 'number':
      return normalizeNumberText(node.value);
    case 'symbol':
      return node.name;
    case 'unary':
      return formatUnary(node);
    case 'binary':
      return formatBinary(node);
    case 'function':
      return formatFunction(node);
    case 'equation':
      return `${formatNode(node.left, PRECEDENCE.equation)} = ${formatNode(
        node.right,
        PRECEDENCE.equation
      )}`;
    default: {
      const _exhaustive: never = node;
      return _exhaustive;
    }
  }
}

function formatUnary(node: CasUnaryNode): string {
  const operand = formatNode(node.operand, PRECEDENCE.unary);
  return node.operator === '+' ? `+${operand}` : `-${operand}`;
}

function formatBinary(node: CasBinaryNode): string {
  const precedence = precedenceOf(node);
  const left = formatOperand(node.left, precedence, 'left', node.operator);
  const right = formatOperand(node.right, precedence, 'right', node.operator);
  return `${left} ${node.operator} ${right}`;
}

function formatFunction(node: CasFunctionCallNode): string {
  return `${node.name}(${node.arguments
    .map(argument => formatNode(argument, PRECEDENCE.equation))
    .join(', ')})`;
}

function formatOperand(
  operand: CasExpression,
  parentPrecedence: number,
  side: 'left' | 'right',
  operator: CasBinaryNode['operator']
): string {
  const childPrecedence = precedenceOf(operand);
  const rendered = renderNode(operand);

  if (shouldParenthesize(operand, parentPrecedence, childPrecedence, side, operator)) {
    return `(${rendered})`;
  }

  return rendered;
}

function shouldParenthesize(
  operand: CasExpression,
  parentPrecedence: number,
  childPrecedence: number,
  side: 'left' | 'right',
  operator: CasBinaryNode['operator']
): boolean {
  if (childPrecedence > parentPrecedence) {
    return false;
  }

  if (childPrecedence < parentPrecedence) {
    return true;
  }

  if (operand.kind === 'binary') {
    if (operator === '^') {
      return side === 'left';
    }

    if (operator === '-' || operator === '/') {
      return side === 'right';
    }
  }

  return false;
}

function precedenceOf(node: CasExpression): number {
  switch (node.kind) {
    case 'equation':
      return PRECEDENCE.equation;
    case 'binary':
      switch (node.operator) {
        case '+':
        case '-':
          return PRECEDENCE.add;
        case '*':
        case '/':
          return PRECEDENCE.multiply;
        case '^':
          return PRECEDENCE.power;
      }
      break;
    case 'unary':
      return PRECEDENCE.unary;
    case 'function':
    case 'number':
    case 'symbol':
      return PRECEDENCE.atom;
  }

  return PRECEDENCE.atom;
}

function normalizeNumberText(value: number): string {
  return Object.is(value, -0) ? '0' : String(value);
}
