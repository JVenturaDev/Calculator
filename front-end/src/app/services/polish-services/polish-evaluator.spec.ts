import { TestBed } from '@angular/core/testing';

import { evaluator } from './polish-evaluator';
import { Tokenizer } from './tokenizer';
import { parser } from './polish-notation-parser-service';

describe('PolishParser', () => {
  let service: evaluator;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(evaluator);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('keeps stack snapshots disabled for existing low-level consumers', () => {
    const tokenizer = new Tokenizer();
    const parserService = new parser();
    const postfix = parserService.toPostFix(tokenizer.tokenize('2+3'));
    const evaluation = service.evaluatePostFix(postfix, {}, true);

    if (typeof evaluation !== 'object' || !('steps' in evaluation)) {
      fail('Expected evaluation steps');
      return;
    }

    expect(evaluation.steps[0].stackBefore).toBeUndefined();
    expect(evaluation.steps[0].stackAfter).toBeUndefined();
  });

  it('includes stack snapshots only when explicitly requested', () => {
    const tokenizer = new Tokenizer();
    const parserService = new parser();
    const postfix = parserService.toPostFix(tokenizer.tokenize('2+3'));
    const evaluation = service.evaluatePostFix(postfix, {}, true, 'RAD', true);

    if (typeof evaluation !== 'object' || !('steps' in evaluation)) {
      fail('Expected evaluation steps');
      return;
    }

    expect(evaluation.steps[0].stackBefore).toEqual([2, 3]);
    expect(evaluation.steps[0].stackAfter?.[0].toString()).toBe('5');
  });
});
