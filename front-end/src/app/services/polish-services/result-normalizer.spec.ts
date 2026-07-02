import Complex from 'complex.js';
import { ResultNormalizer } from './result-normalizer';

describe('ResultNormalizer', () => {
  const normalizer = new ResultNormalizer();

  it('normalizes real and complex values', () => {
    expect(normalizer.normalize(5)).toEqual({
      type: 'real',
      value: 5,
      display: '5',
    });
    expect(normalizer.normalize(new Complex(0, 2))).toEqual({
      type: 'complex',
      re: 0,
      im: 2,
      display: '2i',
    });
  });

  it('simplifies complex values with no imaginary part', () => {
    expect(normalizer.simplify(new Complex(4, 0))).toBe(4);
  });

  it('preserves optional stack snapshots when normalizing steps', () => {
    const step = normalizer.normalizeStep({
      type: 'Operator',
      name: '+',
      operands: [2, 3],
      result: 5,
      stackBefore: [2, 3],
      stackAfter: [5],
    });

    expect(step.stackBefore?.map(value => value.display)).toEqual(['2', '3']);
    expect(step.stackAfter?.map(value => value.display)).toEqual(['5']);
  });
});
