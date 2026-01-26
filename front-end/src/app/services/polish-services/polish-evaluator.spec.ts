import { TestBed } from '@angular/core/testing';

import { evaluator } from './polish-evaluator';

describe('PolishParser', () => {
  let service: evaluator;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(evaluator);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
