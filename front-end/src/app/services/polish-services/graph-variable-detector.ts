import { inject, Injectable } from '@angular/core';

import { Tokenizer, type Token } from './tokenizer';

export interface GraphVariables {
  readonly hasX: boolean;
  readonly hasY: boolean;
}

export interface GraphVariableUsage {
  readonly hasX: boolean;
  readonly hasY: boolean;
  readonly variables: Record<string, number>;
}

@Injectable({ providedIn: 'root' })
export class GraphVariableDetectorService {
  private readonly tokenizer = inject(Tokenizer);

  detect(expressionOrTokens: string | readonly Token[]): GraphVariables {
    const usage = detectGraphVariables(expressionOrTokens, this.tokenizer);
    return {
      hasX: usage.hasX,
      hasY: usage.hasY,
    };
  }
}

export function detectGraphVariables(
  expressionOrTokens: string | readonly Token[],
  tokenizer?: Tokenizer
): GraphVariableUsage {
  try {
    const tokens = normalizeTokens(expressionOrTokens, tokenizer);
    const hasX = tokens.some(token => token.type === 'variable' && token.value === 'x');
    const hasY = tokens.some(token => token.type === 'variable' && token.value === 'y');

    const variables: Record<string, number> = {};
    if (hasX) variables['x'] = 0;
    if (hasY) variables['y'] = 0;

    return { hasX, hasY, variables };
  } catch {
    return { hasX: false, hasY: false, variables: {} };
  }
}

function normalizeTokens(
  expressionOrTokens: string | readonly Token[],
  tokenizer?: Tokenizer
): readonly Token[] {
  if (Array.isArray(expressionOrTokens)) {
    return expressionOrTokens;
  }

  if (!tokenizer) {
    return [];
  }

  return typeof expressionOrTokens === 'string'
    ? tokenizer.tokenize(expressionOrTokens)
    : [];
}
