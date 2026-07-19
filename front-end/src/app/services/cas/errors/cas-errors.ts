export type CasErrorCode =
  | 'UNSUPPORTED_EXPRESSION'
  | 'UNSUPPORTED_OPERATION'
  | 'INVALID_VARIABLE'
  | 'DIVISION_BY_ZERO'
  | 'TOO_COMPLEX'
  | 'ITERATION_LIMIT'
  | 'UNSUPPORTED_POLYNOMIAL_DEGREE'
  | 'NOT_IMPLEMENTED';

export interface CasError {
  readonly code: CasErrorCode;
  readonly message: string;
  readonly detail?: string;
}

export function createCasError(
  code: CasErrorCode,
  message: string,
  detail?: string
): CasError {
  return { code, message, ...(detail ? { detail } : {}) };
}
