import { TestBed } from '@angular/core/testing';

import { Tokenizer } from './tokenizer';
import { parser } from './polish-notation-parser-service';

describe('PolishNotationParserService', () => {
  let service: parser;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(parser);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('converts unary minus tokens when they are explicitly emitted', () => {
    const tokenizer = new Tokenizer();

    expect(
      service.toPostFix(tokenizer.tokenize('-2', { unaryOperators: true })).map(token => token.value)
    ).toEqual(['2', 'u-']);

    expect(
      service.toPostFix(tokenizer.tokenize('2 * -3', { unaryOperators: true })).map(token => token.value)
    ).toEqual(['2', '3', 'u-', '*']);
  });
});
