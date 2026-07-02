export function factorial(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error('El factorial solo acepta enteros no negativos');
  }

  let result = 1;
  for (let current = 2; current <= value; current++) {
    result *= current;
  }
  return result;
}

export const polishMath = {
  sec: (value: number) => 1 / Math.cos(value),
  cot: (value: number) => 1 / Math.tan(value),
  csc: (value: number) => 1 / Math.sin(value),
  asec: (value: number) => Math.acos(1 / value),
  acot: (value: number) => Math.atan(1 / value),
  acsc: (value: number) => Math.asin(1 / value),
  sech: (value: number) => 1 / Math.cosh(value),
  coth: (value: number) => 1 / Math.tanh(value),
  csch: (value: number) => 1 / Math.sinh(value),
  acoth: (value: number) => 0.5 * Math.log((value + 1) / (value - 1)),
  asech: (value: number) => Math.log((1 + Math.sqrt(1 - value * value)) / value),
  acsch: (value: number) =>
    Math.log(1 / value + Math.sqrt(1 + 1 / (value * value))),
  logxy: (value: number, base: number) => Math.log(value) / Math.log(base),
  scientificNotation: (coefficient: number, exponent: number) =>
    coefficient * Math.pow(10, exponent),
  mod: (value: number, divisor: number) => ((value % divisor) + divisor) % divisor,
  deg: (degrees: number, minutes: number, seconds: number) =>
    degrees + minutes / 60 + seconds / 3600,
  dms: (value: number) => {
    const degrees = Math.floor(value);
    const decimalMinutes = (value - degrees) * 60;
    const minutes = Math.floor(decimalMinutes);
    const seconds = (decimalMinutes - minutes) * 60;
    return degrees + minutes / 60 + seconds / 3600;
  },
};
