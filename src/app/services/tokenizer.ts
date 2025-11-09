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
  preprocessExpression(expr: string): string {
    let output = expr;
    output = output
      .replace(/(\d)([a-zA-Z])/g, '$1*$2')
      .replace(/([a-zA-Z])(\d)/g, '$1*$2')
    output = output
      .replace(/\bacoth\(/g, 'acoth(')
      .replace(/\bacsch\(/g, 'acsch(')
      .replace(/\basech\(/g, 'asech(')
      .replace(/\basin\(/g, 'asin(')
      .replace(/\bacos\(/g, 'acos(')
      .replace(/\batan\(/g, 'atan(')
      .replace(/\basec\(/g, 'asec(')
      .replace(/\bacsc\(/g, 'acsc(')
      .replace(/\bacot\(/g, 'acot(');

    output = output
      .replace(/\basinh\(/g, 'asinh(')
      .replace(/\bacosh\(/g, 'acosh(')
      .replace(/\batanh\(/g, 'atanh(');

    output = output
      .replace(/\bcoth\(/g, 'coth(')
      .replace(/\bcsch\(/g, 'csch(')
      .replace(/\bsech\(/g, 'sech(')
      .replace(/\bsinh\(/g, 'sinh(')
      .replace(/\bcosh\(/g, 'cosh(')
      .replace(/\btanh\(/g, 'tanh(')
      .replace(/\bsec\(/g, 'sec(')
      .replace(/\bcot\(/g, 'cot(')
      .replace(/\bcsc\(/g, 'csc(')
      .replace(/\bsin\(/g, 'sin(')
      .replace(/\bcos\(/g, 'cos(')
      .replace(/\btan\(/g, 'tan(');


    output = output
      .replace(/\be\^\(/g, 'exp(')
      .replace(/\bxylog\(/g, 'logxy(')
      .replace(/\bln\(/g, 'ln(')
      .replace(/\blog\(/g, 'log(');

    output = output
      .replace(/²√(-?\d+(\.\d+)?)/g, 'sqrt($1)')
      .replace(/∛(-?\d+(\.\d+)?)/g, 'cbrt($1)')
      .replace(/(\d+(\.\d+)?)²/g, '($1**2)')
      .replace(/(\d+(\.\d+)?)³/g, '($1**3)')
      .replace(/2\^x/g, '(2**')
      .replace(/10\^/g, '(10**')
      .replace(/yroot\(/g, 'yroot(')
      .replace(/pow\(/g, 'pow(');

    output = output
      .replace(/\|x\|\(/g, 'abs(')
      .replace(/⌊x⌋\(/g, 'floor(')
      .replace(/⌈x⌉\(/g, 'ceil(');

    output = output
      .replace(/\bπ\b/g, 'π')
      .replace(/\be\b/g, 'e');

    output = output.replace(/-(\d+(\.\d+)?)/g, '(-$1)');

    const openParens = (output.match(/\(/g) || []).length;
    const closeParens = (output.match(/\)/g) || []).length;
    const missing = openParens - closeParens;
    if (missing > 0) output += ')'.repeat(missing);

    return output;
  }


  tokenize(expression: string): Token[] {
    const tokens: Token[] = [];
    let current = '';
    let lastToken: Token | null = null;

    for (let i = 0; i < expression.length; i++) {
      const char = expression[i];
      const next = expression[i + 1];

      if (this.operators.includes(char)) {
        if (char === '-' && (!lastToken || lastToken.type === 'operator' || lastToken.value === '(')) {
          current += char;
          continue;
        }
        if (current) {
          tokens.push(this.createToken(current));
          lastToken = tokens[tokens.length - 1];
          current = '';
        }
        tokens.push({ type: 'operator', value: char });
        lastToken = tokens[tokens.length - 1];
      }

      else if (/[<>⩵≠≤≥]/.test(char)) {
        if (current) {
          tokens.push(this.createToken(current));
          current = '';
        }
        let op = char;
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
        if (current && /[a-zA-Zπ]/.test(current[current.length - 1])) {
          tokens.push(this.createToken(current));
          tokens.push({ type: 'operator', value: '*' });
          current = '';
        }
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
          tokens.push(this.createToken(current));
          lastToken = tokens[tokens.length - 1];
          current = '';
        }
        tokens.push({ type: 'paren', value: char });
        lastToken = tokens[tokens.length - 1];
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
        if (
          (cur.type === 'number' && (next.type === 'variable' || next.type === 'function' ||
            (next.type === 'paren' && next.value === '('))) ||
          (cur.type === 'variable' && (next.type === 'number' || next.type === 'function' ||
            (next.type === 'paren' && next.value === '('))) ||
          (cur.type === 'paren' && cur.value === ')' && (next.type === 'variable' ||
            next.type === 'number' || (next.type === 'paren' && next.value === '(')))
        ) {
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
