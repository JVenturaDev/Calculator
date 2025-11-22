import { Injectable } from '@angular/core';
import { Token, Tokenizer } from './tokenizer';
@Injectable({
  providedIn: 'root'
})
export class parser {
  constructor(private tokenizer: Tokenizer) { }
  public testPostfix(expression: string): void {
    const tokens = this.tokenizer.tokenize(expression);
    console.log('Tokens:', tokens);
    const postfix = this.toPostFix(tokens);
    console.log('Postfija:', postfix.map(t => t.value).join(''));

  }

  public toPostFix(tokens: Token[]): Token[] {
    const output: Token[] = [];
    const opStack: Token[] = [];
    const precedence: Record<string, number> = {
      '!': 5,
      '^': 4,
      '*': 3,
      '/': 3,
      '-': 2,
      '+': 2,
    };
    const rigthassociative: Record<string, boolean> = {
      '!': true,
      '^': true,
      '*': false,
      '/': false,
      '+': false,
      '-': false
    }
    for (const token of tokens) {
      if (token.type === 'number' || token.type === 'variable') {
        output.push(token);
      } else if (token.type === 'function') {
        opStack.push(token);
      } else if (token.type === 'operator') {
        while (opStack.length > 0 && opStack[opStack.length - 1].type === 'operator' &&
          (
            (precedence[opStack[opStack.length - 1].value] > precedence[token.value]) ||
            (precedence[opStack[opStack.length - 1].value] === precedence[token.value] && !rigthassociative[token.value])
          )
        ) {
          output.push(opStack.pop()!)
        }
        opStack.push(token);
      } else if (token.type === 'paren') {
        if (token.value === '(') {
          opStack.push(token);
        } else if (token.value == ')') {
          while (opStack.length > 0 && opStack[opStack.length - 1].value !== '(') {
            output.push(opStack.pop()!);
          }
          opStack.pop();
          if (opStack.length > 0 && opStack[opStack.length - 1].type === 'function') {
            output.push(opStack.pop()!);
          }
        }
      }
    }
    while (opStack.length > 0) {
      const op = opStack.pop()!;
      if (op.value === '(' || op.value === ')') {
        throw new Error('Paréntesis desbalanceados');
      }
      output.push(op);
    }
    return output;
  }
}
