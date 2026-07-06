import { TestBed } from '@angular/core/testing';
import Complex from 'complex.js';

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

  it('normalizes plain complex objects in operands and results', () => {
    const steps = service.normalizeSteps([
      {
        type: 'Operator',
        name: '+',
        operands: [{ re: Math.PI, im: 0 }, 1],
        result: { re: Math.PI + 1, im: 0 },
      },
    ]);

    expect(steps[0].operands[0]).toBeInstanceOf(Complex);
    expect(steps[0].result).toBeInstanceOf(Complex);
    expect((steps[0].operands[0] as Complex).re).toBeCloseTo(Math.PI);
    expect((steps[0].result as Complex).re).toBeCloseTo(Math.PI + 1);
  });

  it('normalizes optional stack snapshots', () => {
    const steps = service.normalizeSteps([
      {
        type: 'Operator',
        name: '*',
        operands: [2, 3],
        result: 6,
        stackBefore: [{ re: 2, im: 1 }, 3],
        stackAfter: [{ type: 'complex', re: 6, im: 2 }],
      },
    ]);

    expect(steps[0].stackBefore?.[0]).toBeInstanceOf(Complex);
    expect(steps[0].stackAfter?.[0]).toBeInstanceOf(Complex);
  });
});
