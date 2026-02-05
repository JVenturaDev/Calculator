import { TestBed } from '@angular/core/testing';

import { CalculationParserService } from './calculation-parser';

describe('CalculationParserService', () => {
  let service: CalculationParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CalculationParserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
