export interface CasLimits {
  readonly maxDepth: number;
  readonly maxNodes: number;
  readonly maxIterations: number;
}

export const DEFAULT_CAS_LIMITS: CasLimits = {
  maxDepth: 128,
  maxNodes: 10_000,
  maxIterations: 100,
};

export function resolveCasLimits(
  limits: Partial<CasLimits> | undefined
): CasLimits {
  return {
    maxDepth: limits?.maxDepth ?? DEFAULT_CAS_LIMITS.maxDepth,
    maxNodes: limits?.maxNodes ?? DEFAULT_CAS_LIMITS.maxNodes,
    maxIterations: limits?.maxIterations ?? DEFAULT_CAS_LIMITS.maxIterations,
  };
}
