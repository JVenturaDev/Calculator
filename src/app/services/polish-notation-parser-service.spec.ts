import { TestBed } from '@angular/core/testing';

import { PolishNotationParserService } from './polish-notation-parser-service';

describe('PolishNotationParserService', () => {
  let service: PolishNotationParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PolishNotationParserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
