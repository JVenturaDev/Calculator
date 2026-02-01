import { Injectable } from '@angular/core';
import Complex from 'complex.js';

@Injectable({
  providedIn: 'root'
})
export class CalculationMapper {

 serializeResult(result: number | Complex): string {
    if (result instanceof Complex) {
      return JSON.stringify({
        type: 'complex',
        re: result.re,
        im: result.im
      });
    }

    return JSON.stringify({
      type: 'real',
      value: result
    });
  }

  deserializeResult(json: string): number | Complex {
    const data = JSON.parse(json);

    if (data.type === 'complex') {
      return new Complex(data.re, data.im);
    }

    return data.value;
  }
}
