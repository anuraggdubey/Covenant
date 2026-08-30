/**
 * Fixed-point decimal arithmetic over BigInt.
 *
 * Money never touches a float in this repo. A 0.01 drift in a max-loss
 * calculation would falsify COV-02, and "the invariant held to within
 * floating-point tolerance" is not a claim we can make to a judge.
 *
 * Internal scale is 6 decimal places. Comparisons happen on the scaled
 * BigInt, so display rounding can never change an invariant outcome.
 */

const SCALE = 6;
const SCALE_FACTOR = 1_000_000n;

const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

/** Parse a decimal string into scaled BigInt units. Throws on anything ambiguous. */
export function parse(value: string): bigint {
  const trimmed = value.trim();
  if (!DECIMAL_PATTERN.test(trimmed)) {
    throw new Error(`money.parse: not a decimal string: ${JSON.stringify(value)}`);
  }

  const negative = trimmed.startsWith("-");
  const body = negative ? trimmed.slice(1) : trimmed;
  const [whole, fraction = ""] = body.split(".");

  if (fraction.length > SCALE) {
    throw new Error(`money.parse: more than ${SCALE} decimal places: ${value}`);
  }

  const scaled = BigInt(whole) * SCALE_FACTOR + BigInt(fraction.padEnd(SCALE, "0"));
  return negative ? -scaled : scaled;
}

/** Format scaled units back to a decimal string, rounding half away from zero. */
export function format(value: bigint, decimalPlaces = 2): string {
  if (decimalPlaces < 0 || decimalPlaces > SCALE) {
    throw new Error(`money.format: decimalPlaces must be 0..${SCALE}`);
  }

  const negative = value < 0n;
  const magnitude = negative ? -value : value;

  const divisor = 10n ** BigInt(SCALE - decimalPlaces);
  const quotient = magnitude / divisor;
  const remainder = magnitude % divisor;
  const rounded = remainder * 2n >= divisor ? quotient + 1n : quotient;

  const unit = 10n ** BigInt(decimalPlaces);
  const whole = rounded / unit;
  const sign = negative && rounded !== 0n ? "-" : "";

  if (decimalPlaces === 0) return `${sign}${whole}`;
  return `${sign}${whole}.${(rounded % unit).toString().padStart(decimalPlaces, "0")}`;
}

export function fromNumber(value: number): bigint {
  if (!Number.isFinite(value)) throw new Error(`money.fromNumber: non-finite ${value}`);
  return parse(value.toFixed(SCALE));
}

export const ZERO = 0n;

export function add(a: bigint, b: bigint): bigint {
  return a + b;
}

export function sub(a: bigint, b: bigint): bigint {
  return a - b;
}

export function mul(a: bigint, b: bigint): bigint {
  return (a * b) / SCALE_FACTOR;
}

export function mulInt(a: bigint, n: number): bigint {
  if (!Number.isInteger(n)) throw new Error(`money.mulInt: ${n} is not an integer`);
  return a * BigInt(n);
}

export function abs(a: bigint): bigint {
  return a < 0n ? -a : a;
}

export function lt(a: bigint, b: bigint): boolean {
  return a < b;
}

export function lte(a: bigint, b: bigint): boolean {
  return a <= b;
}

export function gt(a: bigint, b: bigint): boolean {
  return a > b;
}

export function gte(a: bigint, b: bigint): boolean {
  return a >= b;
}

/** `percent` is expressed as a percentage: pctOf(equity, 0.6) is 0.6% of equity. */
export function pctOf(value: bigint, percent: number): bigint {
  return mul(value, fromNumber(percent)) / 100n;
}

export function sum(values: bigint[]): bigint {
  return values.reduce((total, value) => total + value, 0n);
}

/** True when `value` is inside [min, max] inclusive. Used for permit price bands. */
export function withinBand(value: bigint, min: bigint, max: bigint): boolean {
  return value >= min && value <= max;
}
