import { Injectable } from '@angular/core';
import Complex from 'complex.js';
import {
  CalculationEngine,
  CalculationOptions,
} from './calculation-engine.contract';
import { PreprocessModule } from '../polish-services/preprocess-module';
import { Tokenizer } from '../polish-services/tokenizer';
import { parser } from '../polish-services/polish-notation-parser-service';
import { evaluator } from '../polish-services/polish-evaluator';
import { EvaluateOptionsResolver } from '../polish-services/evaluate-options-resolver';
import { ResultNormalizer } from '../polish-services/result-normalizer';

@Injectable({ providedIn: 'root' })
export class PolishCalculationEngine implements CalculationEngine {
  private readonly optionsResolver = new EvaluateOptionsResolver();
  private readonly resultNormalizer = new ResultNormalizer();

  constructor(
    private readonly preprocess: PreprocessModule,
    private readonly tokenizer: Tokenizer,
    private readonly parserService: parser,
    private readonly polishEvaluator: evaluator
  ) {}

  evaluate(expression: string, options: CalculationOptions = {}): number | Complex {
    const resolvedOptions = this.optionsResolver.resolve({
      variables: options.variables ?? {},
      steps: false,
      normalize: false,
      stackSnapshots: false,
    });
    const normalized = this.normalize(expression);
    const tokens = this.tokenizer.tokenize(normalized);
    const postfix = this.parserService.toPostFix(tokens);
    const result = this.polishEvaluator.evaluatePostFix(
      postfix,
      resolvedOptions.variables,
      resolvedOptions.steps,
      options.angleMode ?? 'RAD',
      resolvedOptions.stackSnapshots
    );

    const value = typeof result === 'object' && 'result' in result
      ? result.result
      : result;

    return this.resultNormalizer.simplify(value);
  }

  private normalize(expression: string): string {
    const normalizedAliases = expression
      .replace(/\be\^\(/g, 'expe(')
      .replace(/\bMOD\(/g, 'mod(')
      .replace(/2\^x/g, '2^')
      .replace(/10\^/g, '__TEN_POWER__')
      .replace(/(-?\d+(?:\.\d+)?)→dms/g, 'dms($1)')
      .replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)→deg/g, 'deg($1,$2,$3)');

    return this.preprocess
      .preprocessExpression(normalizedAliases)
      .replaceAll('__TEN_POWER__', '10^')
      .replaceAll('**', '^');
  }
}
