import { Injectable } from '@angular/core';

export interface Token {
  type: 'number' | 'operator' | 'variable' | 'function' | 'paren';
  value: string;
}

@Injectable({
  providedIn: 'root'
})
export class Tokenizer {
  private readonly operators = '+-*/^%!';
  private readonly functions = [
    'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
    'asec', 'acsc', 'acot',
    'sinh', 'cosh', 'tanh',
    'sech', 'csch', 'coth',
    'asinh', 'acosh', 'atanh',
    'asech', 'acsch', 'acoth',
    'ln', 'log', 'sqrt', 'cbrt', 'abs', 'exp', 'yroot',
    'logxy', 'mod', 'deg', 'dms', 'fact'
  ];

  tokenize(expression: string): Token[] {
    const tokens: Token[] = [];
    let current = '';
    let lastToken: Token | null = null;

    for (let i = 0; i < expression.length; i++) {
      const char = expression[i];

      if (this.operators.includes(char)) {
        if (char === '-' &&
          (!lastToken || lastToken.type === 'operator' || lastToken.value === '(')) {
          current += char;
          continue;
        }

        if (current) {
          const token = this.createToken(current);
          tokens.push(token);
          lastToken = token;
          current = '';
        }

        const token: Token = { type: 'operator', value: char };
        tokens.push(token);
        lastToken = token;
      }
      else if (/[<>⩵≠≤≥]/.test(char)) {
        if (current) {
          tokens.push(this.createToken(current));
          current = '';
        }

        let op = char;
        const next = expression[i + 1];
        if ((char === '<' || char === '>') && next === '=') {
          op += '=';
          i++;
        } else if (char === '=' && next === '=') {
          op = '==';
          i++;
        }

        tokens.push({ type: 'operator', value: op });
      }

      else if (/[0-9.]/.test(char)) {
        current += char;
      }
      else if (/[a-zA-Zπ]/.test(char)) {
        if (current && !isNaN(Number(current))) {
          tokens.push(this.createToken(current));
          tokens.push({ type: 'operator', value: '*' }); 
          current = '';
        }
        current += char;
      }
      else if (char === '(' || char === ')') {
        if (current) {
          const token = this.createToken(current);
          tokens.push(token);
          lastToken = token;
          current = '';
        }
        const token: Token = { type: 'paren', value: char };
        tokens.push(token);
        lastToken = token;
      }

      else if (char === ' ') continue;
    }

    if (current) {
      const token = this.createToken(current);
      tokens.push(token);
    }

    const finalTokens: Token[] = [];
    for (let i = 0; i < tokens.length; i++) {
      finalTokens.push(tokens[i]);
      if (i < tokens.length - 1) {
        const cur = tokens[i];
        const next = tokens[i + 1];
        if ((cur.type === 'number' && (next.type === 'variable' || next.type === 'function')) ||
          (cur.type === 'paren' && cur.value === ')' && (next.type === 'variable' || next.type === 'function' || (next.type === 'paren' && next.value === '(')))) {
          finalTokens.push({ type: 'operator', value: '*' });
        }
      }
    }

    return finalTokens;
  }


  private createToken(str: string): Token {
    if (!isNaN(Number(str))) {
      return { type: 'number', value: str };
    }
    if (str === 'π' || str.toLowerCase() === 'pi') {
      return { type: 'number', value: String(Math.PI) };
    }
    if (this.functions.includes(str)) {
      return { type: 'function', value: str };
    }
    return { type: 'variable', value: str };
  }
}
