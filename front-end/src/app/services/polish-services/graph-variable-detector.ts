import { Tokenizer, type Token } from './tokenizer';

export interface GraphVariableUsage {
  readonly hasX: boolean;
  readonly hasY: boolean;
  readonly variables: Record<string, number>;
}

export function detectGraphVariables(
  expressionOrTokens: string | readonly Token[],
  tokenizer?: Tokenizer
): GraphVariableUsage {
  const tokens = typeof expressionOrTokens === 'string'
    ? tokenizer?.tokenize(expressionOrTokens) ?? []
    : expressionOrTokens;
  const hasX = tokens.some(token => token.type === 'variable' && token.value === 'x');
  const hasY = tokens.some(token => token.type === 'variable' && token.value === 'y');

  const variables: Record<string, number> = {};
  if (hasX) variables['x'] = 0;
  if (hasY) variables['y'] = 0;

  return { hasX, hasY, variables };
}
