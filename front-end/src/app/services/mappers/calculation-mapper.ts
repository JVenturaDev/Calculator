import { Injectable } from '@angular/core';
import Complex from 'complex.js';
import { Step } from '../polish-services/polish-evaluator';


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

  isSerializedResult(v: any): v is string {
    return typeof v === 'string' && v.trim().startsWith('{') && v.includes('"type"');
  }


deserializeMaybe(value: any): number | Complex {
  if (value instanceof Complex) return value;
  if (typeof value === 'number') return value;

  if (typeof value === 'string') {
    try {
      const data = JSON.parse(value);
      if (data?.type === 'complex') return new Complex(data.re, data.im);
      if (data?.type === 'real') return data.value;
      if (data && typeof data === 'object' && 're' in data && 'im' in data) {
        return new Complex(data.re, data.im);
      }
    } catch {
      const n = Number(value);
      return Number.isNaN(n) ? (value as any) : n;
    }
  }

  if (value && typeof value === 'object') {
    if (value.type === 'complex') return new Complex(value.re, value.im);
    if (value.type === 'real') return value.value;

    if ('re' in value && 'im' in value) {
      return new Complex((value as any).re, (value as any).im);
    }
  }

  return value as any;
}

normalizeSteps(steps: any): Step[] {
  const arr = typeof steps === 'string' ? JSON.parse(steps) : steps;

  return (arr ?? []).map((s: any) => ({
    ...s,
    operands: (s.operands ?? []).map((o: any) => this.deserializeMaybe(o)),
    result: this.deserializeMaybe(s.result),
  })) as Step[];
}
}
