import { Tokenizer, type Token } from '../../polish-services/tokenizer';
import {
  binaryNode,
  equationNode,
  functionCallNode,
  numberNode,
  symbolNode,
  unaryNode,
  type CasExpression,
} from '../ast/cas-ast';
import { createCasError, type CasErrorCode } from '../errors/cas-errors';
import { casFailure, casSuccess, type CasResult } from '../result/cas-result';

type ParseOutcome = CasResult<CasExpression>;

export class CasParser {
  private readonly tokenizer = new Tokenizer();
  private tokens: readonly Token[] = [];
  private index = 0;

  parse(source: string): ParseOutcome {
    const trimmed = source.trim();

    if (!trimmed) {
      return casFailure(
        createCasError(
          'UNSUPPORTED_EXPRESSION',
          'La expresión CAS no puede estar vacía.'
        )
      );
    }

    const equation = splitTopLevelEquation(trimmed);
    if (equation) {
      const left = this.parseSegment(equation.left);
      if (!left.ok) return left;
      const right = this.parseSegment(equation.right);
      if (!right.ok) return right;
      return casSuccess(equationNode(left.value, right.value));
    }

    return this.parseSegment(trimmed);
  }

  private parseSegment(source: string): ParseOutcome {
    this.tokens = this.tokenizer.tokenize(source);
    this.index = 0;

    if (this.tokens.length === 0) {
      return casFailure(
        createCasError(
          'UNSUPPORTED_EXPRESSION',
          'No se encontraron tokens CAS válidos.'
        )
      );
    }

    const expression = this.parseAdditive();
    if (!expression.ok) {
      return expression;
    }

    if (!this.isAtEnd()) {
      return this.fail(
        'UNSUPPORTED_EXPRESSION',
        'La expresión CAS contiene sintaxis no soportada.'
      );
    }

    return expression;
  }

  private parseAdditive(): ParseOutcome {
    let left = this.parseMultiplicative();
    if (!left.ok) return left;

    while (this.peekOperator('+') || this.peekOperator('-')) {
      const operator = this.consume().value as '+' | '-';
      const right = this.parseMultiplicative();
      if (!right.ok) return right;
      left = casSuccess(binaryNode(operator, left.value, right.value));
    }

    return left;
  }

  private parseMultiplicative(): ParseOutcome {
    let left = this.parsePower();
    if (!left.ok) return left;

    while (this.peekOperator('*') || this.peekOperator('/')) {
      const operator = this.consume().value as '*' | '/';
      const right = this.parsePower();
      if (!right.ok) return right;
      left = casSuccess(binaryNode(operator, left.value, right.value));
    }

    return left;
  }

  private parsePower(): ParseOutcome {
    const base = this.parseUnary();
    if (!base.ok) return base;

    if (this.peekOperator('^')) {
      this.consume();
      const exponent = this.parseUnary();
      if (!exponent.ok) return exponent;
      return casSuccess(binaryNode('^', base.value, exponent.value));
    }

    return base;
  }

  private parseUnary(): ParseOutcome {
    if (this.peekOperator('+') || this.peekOperator('-')) {
      const operator = this.consume().value as '+' | '-';
      const operand = this.parseUnary();
      if (!operand.ok) return operand;
      return operator === '+'
        ? operand
        : casSuccess(unaryNode('-', operand.value));
    }

    return this.parsePrimary();
  }

  private parsePrimary(): ParseOutcome {
    const token = this.peek();
    if (!token) {
      return this.fail(
        'UNSUPPORTED_EXPRESSION',
        'La expresión CAS terminó inesperadamente.'
      );
    }

    if (token.type === 'number') {
      this.consume();
      return casSuccess(numberNode(Number(token.value)));
    }

    if (token.type === 'variable') {
      this.consume();
      return casSuccess(symbolNode(token.value));
    }

    if (token.type === 'function') {
      return this.parseFunctionCall();
    }

    if (token.type === 'paren' && token.value === '(') {
      this.consume();
      const expression = this.parseAdditive();
      if (!expression.ok) return expression;

      if (!this.peekParen(')')) {
        return this.fail(
          'UNSUPPORTED_EXPRESSION',
          'Falta el paréntesis de cierre.'
        );
      }

      this.consume();
      return expression;
    }

    if (token.type === 'comma') {
      return this.fail(
        'UNSUPPORTED_EXPRESSION',
        'La coma sólo es válida dentro de llamadas a funciones.'
      );
    }

    return this.fail(
      'UNSUPPORTED_EXPRESSION',
      `Token CAS no soportado: ${token.value}`
    );
  }

  private parseFunctionCall(): ParseOutcome {
    const name = this.consume().value;

    if (!this.peekParen('(')) {
      return this.fail(
        'UNSUPPORTED_EXPRESSION',
        `La función ${name} necesita paréntesis.`
      );
    }

    this.consume();

    const args: CasExpression[] = [];
    if (this.peekParen(')')) {
      this.consume();
      return casSuccess(functionCallNode(name, args));
    }

    while (true) {
      const argument = this.parseAdditive();
      if (!argument.ok) return argument;
      args.push(argument.value);

      if (this.peekParen(')')) {
        this.consume();
        break;
      }

      if (!this.peekComma()) {
        return this.fail(
          'UNSUPPORTED_EXPRESSION',
          `La llamada a ${name} tiene sintaxis inválida.`
        );
      }

      this.consume();
    }

    return casSuccess(functionCallNode(name, args));
  }

  private peek(): Token | null {
    return this.tokens[this.index] ?? null;
  }

  private peekOperator(operator: string): boolean {
    return this.peek()?.type === 'operator' && this.peek()?.value === operator;
  }

  private peekParen(value: '(' | ')'): boolean {
    return this.peek()?.type === 'paren' && this.peek()?.value === value;
  }

  private peekComma(): boolean {
    return this.peek()?.type === 'comma';
  }

  private consume(): Token {
    const token = this.tokens[this.index];
    this.index += 1;
    return token;
  }

  private isAtEnd(): boolean {
    return this.index >= this.tokens.length;
  }

  private fail(code: CasErrorCode, message: string): ParseOutcome {
    return casFailure(createCasError(code, message));
  }
}

export function parseCasExpression(source: string): ParseOutcome {
  return new CasParser().parse(source);
}

function splitTopLevelEquation(
  source: string
): { readonly left: string; readonly right: string } | null {
  let depth = 0;
  let splitIndex = -1;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];

    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
      if (depth < 0) {
        return null;
      }
    } else if (char === '=') {
      if (depth !== 0) {
        return null;
      }
      if (splitIndex !== -1) {
        return null;
      }
      splitIndex = i;
    }
  }

  if (depth !== 0 || splitIndex === -1) {
    return null;
  }

  const left = source.slice(0, splitIndex).trim();
  const right = source.slice(splitIndex + 1).trim();

  if (!left || !right) {
    return null;
  }

  return { left, right };
}
