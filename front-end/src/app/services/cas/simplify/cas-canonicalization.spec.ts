import { formatCasExpression } from '../format/cas-formatter';
import { CasParser } from '../parser/cas-parser';
import {
  expectIdempotent,
  expectNoForbiddenDecimal,
  expectSimplifiesTo,
} from '../testing/cas-test-helpers';
import { simplifyCasExpression } from './cas-simplifier';

describe('CAS canonicalization', () => {
  const cases: ReadonlyArray<readonly [string, string]> = [
    ['x + -2', 'x - 2'],
    ['x + -2 * y', 'x - 2 * y'],
    ['x + -(y)', 'x - y'],
    ['x - -2', 'x + 2'],
    ['x - -y', 'x + y'],
    ['x + -1 / 2', 'x - 1 / 2'],
    ['x - -1 / 2', 'x + 1 / 2'],
    ['1 * x', 'x'],
    ['x * 1', 'x'],
    ['-1 * x', '-x'],
    ['x * -1', '-x'],
    ['-(-x)', 'x'],
    ['1 + x', 'x + 1'],
    ['3 * x + x ^ 2', 'x ^ 2 + 3 * x'],
    ['x ^ 2 + -2 * x + 1', 'x ^ 2 - 2 * x + 1'],
    ['-(4 * a * c) + b ^ 2', 'b ^ 2 - 4 * a * c'],
    ['-b + d', 'd - b'],
    ['y * x', 'x * y'],
  ];

  for (const [source, expected] of cases) {
    it(`normalizes ${source}`, () => {
      expectSimplifiesTo(source, expected);
      expectIdempotent(source);
    });
  }

  it('preserves exact rational output', () => {
    const parser = new CasParser();

    for (const source of ['1 / 2', '2 * x / 3', 'x ^ 2 / 4', '-1 / 2']) {
      const parsed = parser.parse(source);
      expect(parsed.ok).withContext(source).toBeTrue();
      if (!parsed.ok) continue;

      const simplified = simplifyCasExpression(parsed.value);
      expect(simplified.ok).withContext(source).toBeTrue();
      if (!simplified.ok) continue;

      expectNoForbiddenDecimal(formatCasExpression(simplified.value));
      expectIdempotent(source);
    }
  });
});
