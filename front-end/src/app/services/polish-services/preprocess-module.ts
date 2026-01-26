import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PreprocessModule {
  preprocessExpression(expr: string): string {
    let output = expr;
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
      .replace(/\be\b/g, 'e')

    const openParens = (output.match(/\(/g) || []).length;
    const closeParens = (output.match(/\)/g) || []).length;

    if (openParens > closeParens) {
      throw new Error("Paréntesis incorrectos");
    }

    if (closeParens > openParens) {
      throw new Error("Paréntesis incorrectos");
    }


    return output;
  }

}
