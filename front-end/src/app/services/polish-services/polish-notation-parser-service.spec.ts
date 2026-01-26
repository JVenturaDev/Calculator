import { TestBed } from '@angular/core/testing';

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
});
