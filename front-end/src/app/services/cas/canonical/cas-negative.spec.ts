import { binaryNode, numberNode, symbolNode, unaryNode } from '../ast/cas-ast';
import { formatCasExpression } from '../format/cas-formatter';
import {
  buildCanonicalNegativeCasExpression,
  extractNegativeCasExpression,
} from './cas-negative';

describe('extractNegativeCasExpression', () => {
  const cases = [
    [numberNode(-2), '2'],
    [unaryNode('-', symbolNode('x')), 'x'],
    [binaryNode('/', numberNode(-1), numberNode(2)), '1 / 2'],
    [unaryNode('-', binaryNode('/', numberNode(1), numberNode(2))), '1 / 2'],
    [binaryNode('*', numberNode(-2), symbolNode('y')), '2 * y'],
  ] as const;

  for (const [source, expectedMagnitude] of cases) {
    it(`extracts ${formatCasExpression(source)}`, () => {
      const extracted = extractNegativeCasExpression(source);
      expect(extracted.negative).toBeTrue();
      if (!extracted.negative) return;

      expect(formatCasExpression(extracted.magnitude)).toBe(expectedMagnitude);
    });
  }

  it('leaves positive numbers and products unchanged', () => {
    for (const source of [numberNode(2), binaryNode('*', numberNode(2), symbolNode('y'))]) {
      expect(extractNegativeCasExpression(source)).toEqual({ negative: false });
    }
  });

  it('keeps negative rational values as negative numerators', () => {
    expect(
      formatCasExpression(
        buildCanonicalNegativeCasExpression(binaryNode('/', numberNode(1), numberNode(2)))
      )
    ).toBe('-1 / 2');
  });
});
