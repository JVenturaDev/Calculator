import { parseCasExpression } from '../parser/cas-parser';
import {
  formatCasExpressionAsLatex,
  formatCasTextAsLatex,
} from './cas-latex-formatter';

describe('CAS LaTeX formatter', () => {
  const format = (source: string): string => {
    const parsed = parseCasExpression(source);
    if (!parsed.ok) throw new Error(parsed.error.message);
    return formatCasExpressionAsLatex(parsed.value);
  };

  it('formats atoms, sums, subtraction and products', () => {
    expect(format('5')).toBe('5');
    expect(format('x')).toBe('x');
    expect(format('x + 2')).toBe('x + 2');
    expect(format('x - 2')).toBe('x - 2');
    expect(format('2 * x')).toBe('2\\,x');
  });

  it('formats fractions, powers and nested parentheses with preserved precedence', () => {
    expect(format('1 / (x + 1)')).toBe('\\frac{1}{x + 1}');
    expect(format('x ^ 2')).toBe('x^{2}');
    expect(format('(x + 1) * y')).toBe('\\left(x + 1\\right)\\,y');
    expect(format('(x + 1) ^ 2')).toBe('\\left(x + 1\\right)^{2}');
    expect(format('x = 2')).toBe('x = 2');
  });

  it('formats supported elementary functions', () => {
    expect(format('abs(x)')).toBe('\\left|x\\right|');
    expect(format('sqrt(x)')).toBe('\\sqrt{x}');
    expect(format('ln(x)')).toBe('\\ln\\left(x\\right)');
    expect(format('log(x)')).toBe('\\log\\left(x\\right)');
    expect(format('sin(x)')).toBe('\\sin\\left(x\\right)');
    expect(format('cos(x)')).toBe('\\cos\\left(x\\right)');
    expect(format('tan(x)')).toBe('\\tan\\left(x\\right)');
    expect(format('asin(x)')).toBe('\\arcsin\\left(x\\right)');
    expect(format('acos(x)')).toBe('\\arccos\\left(x\\right)');
    expect(format('atan(x)')).toBe('\\arctan\\left(x\\right)');
    expect(format('exp(x)')).toBe('\\exp\\left(x\\right)');
  });

  it('renders exact rational coefficients naturally without changing the source AST', () => {
    expect(format('sin(x) * 1 / 2')).toBe('\\frac{1}{2}\\,\\sin\\left(x\\right)');
    expect(format('sin(x) * -1 / 4')).toBe('-\\frac{1}{4}\\,\\sin\\left(x\\right)');
    expect(format('2 * x * 1 / 2')).toBe('x');
  });

  it('formats the reported integral as one continuous mathematical expression', () => {
    const canonical =
      'ln(abs(x + 1)) * 1 / 2 + ln(abs(x ^ 2 + 1)) * -1 / 4 + atan(2 * x * 1 / 2) * 1 / 2';

    const latex = format(canonical);

    expect(latex).toContain('\\frac{1}{2}\\,\\ln\\left|x + 1\\right|');
    expect(latex).toContain('- \\frac{1}{4}\\,\\ln\\left|x^{2} + 1\\right|');
    expect(latex).toContain('+ \\frac{1}{2}\\,\\arctan\\left(x\\right)');
    expect(latex).not.toContain('\\begin{aligned}');
    expect(latex).not.toContain('\\\\');
  });

  it('renders unknown identifiers followed by parentheses as implicit multiplication', () => {
    const latex = formatCasTextAsLatex('foo(x)');

    expect(latex).not.toBeNull();
    expect(latex).toContain('\\mathrm{foo}');
    expect(latex).toContain('x');
  });

  it('returns null for expressions that cannot be parsed so the UI can fall back', () => {
    expect(formatCasTextAsLatex('x +')).toBeNull();
  });
});
