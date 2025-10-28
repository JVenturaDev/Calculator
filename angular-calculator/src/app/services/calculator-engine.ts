import { Injectable } from '@angular/core';
import {
  replaceFunction,
  evalExpresion,
} from '../lib/buttonFunctions';
import Complex from "complex.js";


export type AngleMode = 'RAD' | 'DEG' | 'GRAD';

@Injectable({
  providedIn: 'root',
})
export class CalculatorEngineService {
  constructor() {  }

  replaceFunction(expression: string, _mode?: AngleMode): string {
    return replaceFunction(expression as string);
  }

  evalExpresion(expression: string): number | Complex {
    try {
      return evalExpresion(expression); 
    } catch (err) {
      throw err;
    }
  }
}
