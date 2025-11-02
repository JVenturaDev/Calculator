import { TestBed } from '@angular/core/testing';

import { Tokenizer } from './tokenizer';

describe('Tokenizer', () => {
  let service: Tokenizer;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Tokenizer);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
