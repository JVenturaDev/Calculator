import {
  type CasBinaryNode,
  type CasExpression,
  type CasFunctionCallNode,
} from '../ast/cas-ast';
import { parseCasExpression } from '../parser/cas-parser';

const PRECEDENCE = {
  equation: 0,
  add: 1,
  multiply: 2,
  power: 3,
  unary: 4,
  atom: 5,
} as const;

const FUNCTION_NAMES: Readonly<Record<string, string>> = {
  ln: '\\ln',
  log: '\\log',
  sin: '\\sin',
  cos: '\\cos',
  tan: '\\tan',
  asin: '\\arcsin',
  acos: '\\arccos',
  atan: '\\arctan',
  exp: '\\exp',
};

interface RenderedTerm {
  readonly sign: 1 | -1;
  readonly latex: string;
}

interface ProductParts {
  numerator: number;
  denominator: number;
  readonly factors: CasExpression[];
}

export function formatCasExpressionAsLatex(expression: CasExpression): string {
  return joinTerms(collectAdditiveTerms(expression));
}

export function formatCasTextAsLatex(source: string): string | null {
  const parsed = parseCasExpression(source);
  if (!parsed.ok) return null;

  try {
    return formatCasExpressionAsLatex(parsed.value);
  } catch {
    return null;
  }
}

function renderNode(
  node: CasExpression,
  parentPrecedence: number = PRECEDENCE.equation
): string {
  const precedence = precedenceOf(node);
  let rendered: string;

  switch (node.kind) {
    case 'number':
      rendered = normalizeNumber(node.value);
      break;
    case 'symbol':
      rendered = renderSymbol(node.name);
      break;
    case 'unary': {
      const operand = renderNode(node.operand, PRECEDENCE.unary);
      rendered = `${node.operator}${operand}`;
      break;
    }
    case 'binary':
      rendered = renderBinary(node);
      break;
    case 'function':
      rendered = renderFunction(node);
      break;
    case 'equation':
      rendered = `${renderNode(node.left)} = ${renderNode(node.right)}`;
      break;
    default: {
      const exhaustive: never = node;
      return exhaustive;
    }
  }

  return precedence < parentPrecedence ? `\\left(${rendered}\\right)` : rendered;
}

function renderBinary(node: CasBinaryNode): string {
  switch (node.operator) {
    case '+':
    case '-':
      return joinTerms(collectAdditiveTerms(node));
    case '*':
      return renderProduct(decomposeProduct(node));
    case '/':
      if (shouldDecomposeSignedProduct(node)) {
        return renderProduct(decomposeProduct(node));
      }
      return `\\frac{${renderNode(node.left)}}{${renderNode(node.right)}}`;
    case '^':
      return `${renderPowerBase(node.left)}^{${renderNode(node.right)}}`;
  }
}

function renderPowerBase(base: CasExpression): string {
  if (base.kind === 'number' || base.kind === 'symbol' || base.kind === 'function') {
    return renderNode(base);
  }
  return `\\left(${renderNode(base)}\\right)`;
}

function renderFunction(node: CasFunctionCallNode): string {
  if (node.arguments.length !== 1) {
    throw new Error(`Unsupported CAS function arity: ${node.name}`);
  }

  const argument = renderNode(node.arguments[0]);
  if (node.name === 'abs') return `\\left|${argument}\\right|`;
  if (node.name === 'sqrt') return `\\sqrt{${argument}}`;

  const functionName = FUNCTION_NAMES[node.name];
  if (!functionName) {
    throw new Error(`Unsupported CAS display function: ${node.name}`);
  }

  if (
    (node.name === 'ln' || node.name === 'log') &&
    node.arguments[0].kind === 'function' &&
    node.arguments[0].name === 'abs'
  ) {
    return `${functionName}${renderFunction(node.arguments[0])}`;
  }

  return `${functionName}\\left(${argument}\\right)`;
}

function collectAdditiveTerms(expression: CasExpression): RenderedTerm[] {
  const terms: RenderedTerm[] = [];
  appendAdditiveTerms(expression, 1, terms);
  return terms;
}

function appendAdditiveTerms(
  node: CasExpression,
  sign: 1 | -1,
  terms: RenderedTerm[]
): void {
  if (node.kind === 'binary' && (node.operator === '+' || node.operator === '-')) {
    appendAdditiveTerms(node.left, sign, terms);
    appendAdditiveTerms(node.right, node.operator === '+' ? sign : invertSign(sign), terms);
    return;
  }

  const rendered = renderSignedTerm(node);
  terms.push({ sign: rendered.sign === sign ? 1 : -1, latex: rendered.latex });
}

function renderSignedTerm(node: CasExpression): RenderedTerm {
  if (node.kind === 'unary' && node.operator === '-') {
    const nested = renderSignedTerm(node.operand);
    return { sign: invertSign(nested.sign), latex: nested.latex };
  }

  if (node.kind === 'number' && node.value < 0) {
    return { sign: -1, latex: normalizeNumber(Math.abs(node.value)) };
  }

  if (node.kind === 'binary' && shouldDecomposeSignedProduct(node)) {
    const parts = decomposeProduct(node);
    const sign: 1 | -1 = parts.numerator < 0 ? -1 : 1;
    parts.numerator = Math.abs(parts.numerator);
    return { sign, latex: renderProduct(parts) };
  }

  return { sign: 1, latex: renderNode(node) };
}

function shouldDecomposeSignedProduct(node: CasBinaryNode): boolean {
  return node.operator === '*' ||
    (node.operator === '/' && node.left.kind === 'binary' && node.left.operator === '*');
}

function decomposeProduct(expression: CasExpression): ProductParts {
  const parts: ProductParts = { numerator: 1, denominator: 1, factors: [] };
  appendProduct(expression, parts);
  reduceCoefficient(parts);
  return parts;
}

function appendProduct(node: CasExpression, parts: ProductParts): void {
  if (node.kind === 'unary' && node.operator === '-') {
    parts.numerator *= -1;
    appendProduct(node.operand, parts);
    return;
  }

  if (node.kind === 'number' && Number.isInteger(node.value)) {
    parts.numerator *= node.value;
    return;
  }

  if (node.kind === 'binary' && node.operator === '*') {
    appendProduct(node.left, parts);
    appendProduct(node.right, parts);
    return;
  }

  if (node.kind === 'binary' && node.operator === '/') {
    const divisor = integerValue(node.right);
    if (divisor !== null && divisor !== 0) {
      appendProduct(node.left, parts);
      parts.denominator *= divisor;
      return;
    }
  }

  parts.factors.push(node);
}

function renderProduct(parts: ProductParts): string {
  if (parts.numerator === 0) return '0';

  const factors = parts.factors
    .map(factor => renderNode(factor, PRECEDENCE.multiply))
    .join('\\,');
  const coefficient = renderCoefficient(parts.numerator, parts.denominator, !!factors);

  return coefficient && factors ? `${coefficient}\\,${factors}` : coefficient || factors || '1';
}

function renderCoefficient(numerator: number, denominator: number, hasFactors: boolean): string {
  if (denominator === 1) {
    if (hasFactors && numerator === 1) return '';
    if (hasFactors && numerator === -1) return '-';
    return normalizeNumber(numerator);
  }

  const sign = numerator < 0 ? '-' : '';
  return `${sign}\\frac{${Math.abs(numerator)}}{${denominator}}`;
}

function reduceCoefficient(parts: ProductParts): void {
  if (parts.denominator < 0) {
    parts.numerator *= -1;
    parts.denominator *= -1;
  }

  const divisor = greatestCommonDivisor(Math.abs(parts.numerator), parts.denominator);
  parts.numerator /= divisor;
  parts.denominator /= divisor;
}

function integerValue(node: CasExpression): number | null {
  if (node.kind === 'number' && Number.isInteger(node.value)) return node.value;
  if (
    node.kind === 'unary' &&
    node.operator === '-' &&
    node.operand.kind === 'number' &&
    Number.isInteger(node.operand.value)
  ) {
    return -node.operand.value;
  }
  return null;
}

function joinTerms(terms: readonly RenderedTerm[]): string {
  return terms.map((term, index) => formatInlineTerm(term, index)).join(' ');
}

function formatInlineTerm(term: RenderedTerm, index: number): string {
  if (index === 0) return term.sign < 0 ? `-${term.latex}` : term.latex;
  return `${term.sign < 0 ? '-' : '+'} ${term.latex}`;
}

function renderSymbol(name: string): string {
  if (name === 'pi' || name === 'π') return '\\pi';
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Unsupported CAS display symbol: ${name}`);
  }
  return name.length === 1 ? name : `\\mathrm{${name.replace(/_/g, '\\_')}}`;
}

function precedenceOf(node: CasExpression): number {
  if (node.kind === 'equation') return PRECEDENCE.equation;
  if (node.kind === 'unary') return PRECEDENCE.unary;
  if (node.kind !== 'binary') return PRECEDENCE.atom;

  if (node.operator === '+' || node.operator === '-') return PRECEDENCE.add;
  if (node.operator === '*' || node.operator === '/') return PRECEDENCE.multiply;
  return PRECEDENCE.power;
}

function normalizeNumber(value: number): string {
  return Object.is(value, -0) ? '0' : String(value);
}

function invertSign(sign: 1 | -1): 1 | -1 {
  return sign === 1 ? -1 : 1;
}

function greatestCommonDivisor(left: number, right: number): number {
  let a = left;
  let b = right;
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}
