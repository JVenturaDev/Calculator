import { TestBed } from '@angular/core/testing';

import { CalculationMapper } from './calculation-mapper';

describe('CalculationMapper', () => {
  let service: CalculationMapper;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CalculationMapper);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
