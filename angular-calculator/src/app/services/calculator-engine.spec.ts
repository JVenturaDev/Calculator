// src/app/services/calculator-engine.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { CalculatorEngineService } from './calculator-engine';
import * as lib from '../lib/buttonFunctions';

describe('CalculatorEngineService', () => {
  let service: CalculatorEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CalculatorEngineService],
    });
    service = TestBed.inject(CalculatorEngineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('processAndEval should call parentesisMulti, replaceFunction and evalExpresion in order and return result', () => {
    const expr = '2+2';
    const withMult = '2+2';   
    const replaced = '2+2';       
    const evalResult = '4';       

    const spyPar = spyOn(lib as any, 'parentesisMulti').and.returnValue(withMult);
    const spyRep = spyOn(lib as any, 'replaceFunction').and.returnValue(replaced);
    const spyEval = spyOn(lib as any, 'evalExpresion').and.returnValue(evalResult);

   

    expect(spyPar).toHaveBeenCalledWith(expr);
    expect(spyRep).toHaveBeenCalledWith(withMult);
    expect(spyEval).toHaveBeenCalledWith(replaced);
    expect(expr).toBe(evalResult);
  });

  // it('calcularInverso should delegate to calcularInversoFromExpression and return its value', () => {
  //   const input = '5';
  //   const expected = '0.2';
  //   const spy = spyOn(lib as any, 'calcularInversoFromExpression').and.returnValue(expected);

  //   const out = service.calcularInverso(input);

  //   expect(spy).toHaveBeenCalledWith(input);
  //   expect(out).toBe(expected);
  // });

  // it('invertirUltimoNumero should delegate to invertirUltimoNumeroFromExpression and return its value', () => {
  //   const input = '12+34';
  //   const expected = '12+-34';
  //   const spy = spyOn(lib as any, 'invertirUltimoNumeroFromExpression').and.returnValue(expected);

  //   const out = service.invertirUltimoNumero(input);

  //   expect(spy).toHaveBeenCalledWith(input);
  //   expect(out).toBe(expected);
  // });
});
