import type { CasExpression, CasMetadata } from '../ast/cas-ast';
import type { CasError } from '../errors/cas-errors';

export interface CasSuccess<T> {
  readonly ok: true;
  readonly value: T;
  readonly metadata?: CasMetadata;
}

export interface CasFailure {
  readonly ok: false;
  readonly error: CasError;
}

export type CasResult<T = CasExpression> = CasSuccess<T> | CasFailure;

export function casSuccess<T>(
  value: T,
  metadata?: CasMetadata
): CasSuccess<T> {
  return {
    ok: true,
    value,
    ...(metadata ? { metadata } : {}),
  };
}

export function casFailure(error: CasError): CasFailure {
  return {
    ok: false,
    error,
  };
}
