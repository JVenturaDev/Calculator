import type Complex from 'complex.js';

const REAL_COMPLEX_TOLERANCE = Number.EPSILON * 128;

export function isEffectivelyRealGraphValue(value: Complex): boolean {
  return (
    Number.isFinite(value.re) &&
    Number.isFinite(value.im) &&
    Math.abs(value.im) <=
      REAL_COMPLEX_TOLERANCE * Math.max(1, Math.abs(value.re))
  );
}
