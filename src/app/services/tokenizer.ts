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

      // 🔹 Operadores
      if (this.operators.includes(char)) {
        // Manejar signo negativo como parte del número
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

      else if (char.match(/[0-9.]/)) {
        current += char;
      }

      else if (char.match(/[a-zA-Z]/)) {
        if (current) {
          if (current.match(/[0-9]$/)) {
            tokens.push({ type: 'number', value: current });
            tokens.push({ type: 'operator', value: '*' });
            current = '';
          } else {
            tokens.push(this.createToken(current));
            current = '';
          }
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

      // 🔹 Ignorar espacios
      else if (char === ' ') {
        continue;
      }
    }

    // Último token pendiente
    if (current) {
      const token = this.createToken(current);
      tokens.push(token);
    }

    return tokens;
  }

  private createToken(str: string): Token {
    if (!isNaN(Number(str))) {
      return { type: 'number', value: str };
    }
    if (this.functions.includes(str)) {
      return { type: 'function', value: str };
    }
    return { type: 'variable', value: str };
  }
}
