import { Injectable } from '@angular/core';
import { Complex } from 'complex.js';
import { Token } from './tokenizer';
import {factorial } from '../../lib/buttonFunctions';
@Injectable({
  providedIn: 'root'
})

export class evaluator {
  constructor() {
  }
  public evaluatePostFix(tokens: Token[], variables: Record<string, number> = {}): number | Complex {
    const stack: (number | Complex)[] = [];
    const unaryOps = new Set(['!', 'u-']);
    const toReal = (val: number | Complex): Complex => {
      if (val instanceof Complex) return val;
      return new Complex(val);
    };
    for (const token of tokens) {
      // number if  
      if (token.type === 'number') {
        stack.push(Number(token.value));
      }
      // var if
      else if (token.type === 'variable') {
        if (token.value === 'π') stack.push(Math.PI);
        else if (token.value === 'e') stack.push(Math.E);
        else if (variables && Object.prototype.hasOwnProperty.call(variables, token.value)) {
          stack.push(variables[token.value]);
        } else {
          throw new Error(`Variable no definida: ${token.value}`);
        }
      }
      // operator if
      else if (token.type === 'operator') {
        if (unaryOps.has(token.value)) {
          const a = stack.pop();
          if (a === undefined) throw new Error('Error: operandos insuficientes');
          stack.push(this.applyOperation(token.value, a));
        } else {
          const b = stack.pop();
          const a = stack.pop();
          if (a === undefined || b === undefined)
            throw new Error('Error: operandos insuficientes');
          stack.push(this.applyOperation(token.value, a, b));
        }
      }

      // function if
      else if (token.type === 'function') {
        const a = stack.pop();
        if (a === undefined) throw new Error(`Argumento faltante para ${token.value}`);

        switch (token.value) {
          // Funciones trigonométricas
          case 'sin': stack.push(Math.sin(toReal(a).re)); break;
          case 'cos': stack.push(Math.cos(toReal(a).re)); break;
          case 'tan': stack.push(Math.tan(toReal(a).re)); break;
          case 'asin': stack.push(Math.asin(toReal(a).re)); break;
          case 'acos': stack.push(Math.acos(toReal(a).re)); break;
          case 'atan': stack.push(Math.atan(toReal(a).re)); break;
          case 'asec': stack.push(Math.asec(toReal(a).re)); break;
          case 'acsc': stack.push(Math.acsc(toReal(a).re)); break;
          case 'acot': stack.push(Math.acot(toReal(a).re)); break;
          case 'sinh': stack.push(Math.sinh(toReal(a).re)); break;
          case 'cosh': stack.push(Math.cosh(toReal(a).re)); break;
          case 'tanh': stack.push(Math.tanh(toReal(a).re)); break;
          case 'sech': stack.push(Math.sech(toReal(a).re)); break;
          case 'csch': stack.push(Math.csch(toReal(a).re)); break;
          case 'coth': stack.push(Math.coth(toReal(a).re)); break;
          case 'asinh': stack.push(Math.asinh(toReal(a).re)); break;
          case 'acosh': stack.push(Math.acosh(toReal(a).re)); break;
          case 'atanh': stack.push(Math.atanh(toReal(a).re)); break;
          case 'asech': stack.push(Math.asech(toReal(a).re)); break;
          case 'acsch': stack.push(Math.acsch(toReal(a).re)); break;
          case 'acoth': stack.push(Math.acoth(toReal(a).re)); break;

          // Funciones matemáticas

          case 'ln': stack.push(Math.log(toReal(a).re)); break;
          case 'log': stack.push(Math.log10(toReal(a).re)); break;
          case 'sqrt': stack.push(toReal(a).sqrt()); break;
          case 'cbrt': stack.push(toReal(a).pow(new Complex(1 / 3))); break;
          case 'abs': stack.push(Math.abs(toReal(a).re)); break;
          case '%': stack.push(toReal(a).re * 0.01); break;

          // Funciones de varios argumentos
          case 'logxy': {
            const y = stack.pop();
            if (y === undefined) throw new Error("Argumento faltante para logxy");
            stack.push(Math.logxy(toReal(y).re, toReal(a).re));
            break;
          }
          case 'exp': {
            const b = stack.pop();
            if (b === undefined) throw new Error("Argumento faltante para exp");
            stack.push(Math.EXPT(toReal(b).re, toReal(a).re));
            break;
          }
          case 'yroot': {
            const y = stack.pop();
            if (y === undefined) throw new Error("Argumento faltante para yroot");
            stack.push(Math.pow(toReal(y).re, 1 / toReal(a).re));
            break;
          }
          case 'deg': {
            const s = stack.pop();
            const m = stack.pop();
            const g = stack.pop();
            if (g === undefined || m === undefined || s === undefined)
              throw new Error("Argumento faltante para DEG");
            stack.push(Math.DEG(toReal(g).re, toReal(m).re, toReal(s).re));
            break;
          }
          case 'mod': {
            const b = stack.pop();
            if (b === undefined) throw new Error("Argumento faltante para mod");
            stack.push(Math.mod(toReal(b).re, toReal(a).re));
            break;
          }
          case 'dms':
            stack.push(Math.DMS(toReal(a).re));
            break;

          default:
            throw new Error(`Función desconocida: ${token.value}`);
        }
      }
    }

    if (stack.length !== 1)
      throw new Error('Error: expresión mal formada');

    return stack[0];
  }
  private applyOperation(op: string, a: number | Complex, b?: number | Complex): number | Complex {
    const A = a instanceof Complex ? a : new Complex(a);
    const B = b instanceof Complex ? b : b !== undefined ? new Complex(b) : undefined;

    switch (op) {
      // operadores binarios
      case '+': return A.add(B!);
      case '-': return A.sub(B!);
      case '*': return A.mul(B!);
      case '/': return A.div(B!);
      case '^': return A.pow(B!);

      // operador unario factorial
      case '!':
        if (a instanceof Complex) throw new Error("No se puede calcular factorial de un número complejo");
        return factorial(a);

      // comparadores
      case '<':
      case '>':
      case '≤':
      case '≥':
      case '=':
      case '==':
      case '⩵':
      case '≠':
        if (a instanceof Complex || b instanceof Complex)
          throw new Error("No se pueden comparar números complejos");
        switch (op) {
          case '<': return a < b! ? 1 : 0;
          case '>': return a > b! ? 1 : 0;
          case '≤': return a <= b! ? 1 : 0;
          case '≥': return a >= b! ? 1 : 0;
          case '=':
          case '==':
          case '⩵': return a === b! ? 1 : 0;
          case '≠': return a !== b! ? 1 : 0;
        }

      default:
        throw new Error(`Operador desconocido: ${op}`);
    }
  }

}