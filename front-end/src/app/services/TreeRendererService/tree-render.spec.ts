import { TestBed } from '@angular/core/testing';
import Complex from 'complex.js';

import { CalculationParserService } from '../calculation/calculation-parser';
import { CalculationMapper } from '../mappers/calculation-mapper';
import { BookRenderer } from '../book-renderer-service/book-renderer';
import { evaluator, type Step } from '../polish-services/polish-evaluator';
import { parser } from '../polish-services/polish-notation-parser-service';
import { Tokenizer } from '../polish-services/tokenizer';
import { TreeNode, TreeRendererService } from './tree-render';

describe('TreeRendererService', () => {
  let service: TreeRendererService;
  let calculationParser: CalculationParserService;
  let tokenizer: Tokenizer;
  let polishParser: parser;
  let polishEvaluator: evaluator;
  let mapper: CalculationMapper;
  let bookRenderer: BookRenderer;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TreeRendererService);
    calculationParser = TestBed.inject(CalculationParserService);
    tokenizer = TestBed.inject(Tokenizer);
    polishParser = TestBed.inject(parser);
    polishEvaluator = TestBed.inject(evaluator);
    mapper = TestBed.inject(CalculationMapper);
    bookRenderer = TestBed.inject(BookRenderer);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('renders all six operations and fourteen nodes for the reported expression', () => {
    const steps = evaluateSteps('16+67-28^66*8/45*π');
    const reconstructedSteps = mapper.normalizeSteps(
      JSON.parse(JSON.stringify(steps))
    );
    const tree = service.buildTree(calculationParser.parse(reconstructedSteps));
    const labels = collectLabels(tree);
    const operatorLabels = labels.filter(label =>
      ['+', '^', '*', '/', '-'].includes(label)
    );

    expect(reconstructedSteps.length).toBe(6);
    expect(bookRenderer.convertToBookSteps(reconstructedSteps).length).toBe(6);
    expect(calculationParser.parse(reconstructedSteps).operations.size).toBe(6);
    expect(labels.length).toBe(14);
    expect(operatorLabels).toEqual(['-', '+', '*', '/', '*', '^']);
  });

  it('builds the same tree before and after step serialization', () => {
    const steps = evaluateSteps('16+67-28^66*8/45*π');
    const reconstructedSteps = mapper.normalizeSteps(
      JSON.parse(JSON.stringify(steps))
    );

    const before = service.buildTree(calculationParser.parse(steps));
    const after = service.buildTree(
      calculationParser.parse(reconstructedSteps)
    );

    expect(after).toEqual(before);
  });

  function evaluateSteps(expression: string): Step[] {
    const tokens = tokenizer.tokenize(expression);
    const postfix = polishParser.toPostFix(tokens);
    const evaluation = polishEvaluator.evaluatePostFix(postfix, {}, true);

    expect(typeof evaluation).toBe('object');
    expect(evaluation).not.toBeInstanceOf(Complex);
    return (evaluation as { result: number | Complex; steps: Step[] }).steps;
  }

  function collectLabels(node: TreeNode): string[] {
    return [
      node.label,
      ...node.children.flatMap(child => collectLabels(child)),
    ];
  }
});
