import {
  binaryNode,
  equationNode,
  functionCallNode,
  isStructurallyEqual,
  measureCasExpression,
  numberNode,
  symbolNode,
  unaryNode,
} from './cas-ast';

describe('CAS AST', () => {
  it('creates immutable-looking nodes with validation', () => {
    expect(numberNode(2)).toEqual({ kind: 'number', value: 2 });
    expect(symbolNode('x')).toEqual({ kind: 'symbol', name: 'x' });
    expect(unaryNode('-', symbolNode('x'))).toEqual({
      kind: 'unary',
      operator: '-',
      operand: symbolNode('x'),
    });
    expect(binaryNode('+', numberNode(1), numberNode(2))).toEqual({
      kind: 'binary',
      operator: '+',
      left: numberNode(1),
      right: numberNode(2),
    });
    expect(functionCallNode('sin', [symbolNode('x')])).toEqual({
      kind: 'function',
      name: 'sin',
      arguments: [symbolNode('x')],
    });
    expect(equationNode(symbolNode('x'), numberNode(2))).toEqual({
      kind: 'equation',
      left: symbolNode('x'),
      right: numberNode(2),
    });
  });

  it('rejects invalid factory inputs', () => {
    expect(() => numberNode(Number.NaN)).toThrowError();
    expect(() => symbolNode('')).toThrowError();
    expect(() => unaryNode('+', symbolNode('x'))).not.toThrow();
    expect(() => binaryNode('+', symbolNode('x'), symbolNode('y'))).not.toThrow();
  });

  it('compares structure recursively', () => {
    const left = binaryNode('+', symbolNode('x'), numberNode(2));
    const right = binaryNode('+', symbolNode('x'), numberNode(2));
    const different = binaryNode('+', numberNode(2), symbolNode('x'));

    expect(isStructurallyEqual(left, right)).toBeTrue();
    expect(isStructurallyEqual(left, different)).toBeFalse();
  });

  it('measures depth and node count', () => {
    const expression = binaryNode(
      '*',
      binaryNode('+', symbolNode('x'), numberNode(2)),
      unaryNode('-', symbolNode('y'))
    );

    expect(measureCasExpression(expression)).toEqual({
      depth: 3,
      nodeCount: 6,
    });
  });
});
