import { TestBed } from '@angular/core/testing';
import Complex from 'complex.js';

import { CalculationParserService } from './calculation-parser';
import type { Step } from '../polish-services/polish-evaluator';

describe('CalculationParserService', () => {
  let service: CalculationParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CalculationParserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('links distinct Complex instances with equal real and imaginary values', () => {
    const produced = new Complex(3, 4);
    const reconstructedOperand = new Complex(3, 4);
    const steps: Step[] = [
      {
        type: 'Operator',
        name: '+',
        operands: [1, new Complex(2, 4)],
        result: produced,
      },
      {
        type: 'Operator',
        name: '*',
        operands: [reconstructedOperand, 2],
        result: new Complex(6, 8),
      },
    ];

    expect(produced).not.toBe(reconstructedOperand);

    const ir = service.parse(steps);
    expect(ir.operations.get('op_1')?.operands[0]).toBe('val_0');
  });

  it('searches only previous operation results and prefers the latest equal value', () => {
    const steps: Step[] = [
      {
        type: 'Operator',
        name: '+',
        operands: [1, 1],
        result: new Complex(2, 0),
      },
      {
        type: 'Operator',
        name: '-',
        operands: [3, 1],
        result: new Complex(2, 0),
      },
      {
        type: 'Operator',
        name: '*',
        operands: [new Complex(2, 0), 4],
        result: new Complex(8, 0),
      },
    ];

    const ir = service.parse(steps);

    expect(ir.operations.get('op_2')?.operands[0]).toBe('val_1');
    expect(ir.operations.get('op_0')?.operands).toEqual([
      'val_input_0_0',
      'val_input_0_1',
    ]);
  });
});
