import Complex from 'complex.js';
import { PolishCalculationEngine } from './polish-calculation-engine';
import { PreprocessModule } from '../polish-services/preprocess-module';
import { Tokenizer } from '../polish-services/tokenizer';
import { parser } from '../polish-services/polish-notation-parser-service';
import { evaluator } from '../polish-services/polish-evaluator';

describe('PolishCalculationEngine', () => {
  let engine: PolishCalculationEngine;

  beforeEach(() => {
    const tokenizer = new Tokenizer();
    engine = new PolishCalculationEngine(
      new PreprocessModule(),
      tokenizer,
      new parser(),
      new evaluator()
    );
  });

  it('keeps evaluate output raw and simplified', () => {
    expect(engine.evaluate('2+3')).toBe(5);
  });

  it('keeps complex results as Complex instances', () => {
    const result = engine.evaluate('sqrt(-4)');

    expect(result).toBeInstanceOf(Complex);
    expect((result as Complex).im).toBeCloseTo(2);
  });

  it('supports unary minus with exact numeric and complex operands', () => {
    const cases: Array<[string, number | Complex]> = [
      ['-2', -2],
      ['2 * -3', -6],
      ['1 + -2', -1],
      ['-(2 + 3)', -5],
    ];

    for (const [source, expected] of cases) {
      expect(engine.evaluate(source)).toEqual(expected);
    }

    const complex = engine.evaluate('sqrt(-1)');
    expect(complex).toBeInstanceOf(Complex);
    if (complex instanceof Complex) {
      expect(complex.re).toBeCloseTo(0);
      expect(complex.im).toBeCloseTo(1);
    }
  });

  it('keeps variables and angle modes from the Calculator contract', () => {
    expect(engine.evaluate('2x+1', { variables: { x: 3 } })).toBe(7);
    expect(engine.evaluate('sin(90)', { angleMode: 'DEG' })).toBeCloseTo(1);
  });

  it('supports unary exp without changing two-argument scientific notation', () => {
    expect(engine.evaluate('exp(0)')).toBe(1);
    expect(engine.evaluate('2 + exp(0)')).toBe(3);
    expect(engine.evaluate('exp(2, 3)')).toBe(2000);
  });

  it('evaluates the exponential surface expression with x and y variables', () => {
    const result = engine.evaluate(
      'exp(-0.08*(x^2+y^2))*cos(2*sqrt(x^2+y^2))',
      { variables: { x: 0, y: 0 } }
    );

    expect(result).toBeCloseTo(1);
  });
});
