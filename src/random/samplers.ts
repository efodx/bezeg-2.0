// Integer samplers over uint32 draws (ADR 0049 section 2). No double decides anything.
import type { Uint32Source } from './pcg32';

export interface Sample<T> {
  value: T;
  /** Number of uint32 draws consumed. */
  draws: number;
}

const TWO32 = 4294967296;

/** Threshold round(p * 2^32) for p = percent / 100, computed in exact integers (halves round up). */
export function bernoulliThreshold(percent: number): number {
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
    throw new RangeError('percent must be an integer from 0 to 100');
  }
  const n = percent * TWO32 + 50; // below 2^39, exact
  return (n - (n % 100)) / 100;
}

/** True with probability percent/100: `next < round(p * 2^32)`. */
export function bernoulli(rng: Uint32Source, percent: number): Sample<boolean> {
  const threshold = bernoulliThreshold(percent);
  return { value: rng.next() < threshold, draws: 1 };
}

/** Unbiased integer in 0 ... m-1 (Lemire 2019): multiply-shift, rejecting the lowest 2^32 mod m low words. */
export function below(rng: Uint32Source, m: number): Sample<number> {
  if (!Number.isInteger(m) || m < 1 || m > TWO32) throw new RangeError('m must be an integer from 1 to 2^32');
  const bm = BigInt(m);
  let product = BigInt(rng.next()) * bm;
  let draws = 1;
  if ((product & 0xffffffffn) < bm) {
    const reject = (4294967296n - bm) % bm; // 2^32 mod m
    while ((product & 0xffffffffn) < reject) {
      product = BigInt(rng.next()) * bm;
      draws += 1;
    }
  }
  return { value: Number(product >> 32n), draws };
}

/** Point (x, y) with uint32 coordinates lies in the quarter disc: x^2 + y^2 < 2^64. Two draws. */
export function insideQuarterDisc(rng: Uint32Source): Sample<boolean> {
  const x = BigInt(rng.next());
  const y = BigInt(rng.next());
  return { value: x * x + y * y < 1n << 64n, draws: 2 };
}

/** Random-walk step, +1 or -1, from the top bit of one draw. */
export function walkStep(rng: Uint32Source): Sample<1 | -1> {
  return { value: rng.next() >>> 31 === 1 ? 1 : -1, draws: 1 };
}
