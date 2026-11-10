/** Binomial theorem coefficients, exact BigInt. Coefficient lists run from x^n down to x^0. */
import {assertCount, binomial} from './binomial';

export const MAX_SHIFT = 9;

/** Coefficients of (a+b)^n: C(n,k) for k = 0..n. */
export function expandBinomial(n: number): bigint[] {
    assertCount(n, 'n');
    return Array.from({length: n + 1}, (_, k) => binomial(n, k));
}

/** Coefficients of (x+c)^n for x^n..x^0: C(n,k) c^k at index k. */
export function expandShifted(n: number, c: number): bigint[] {
    assertCount(n, 'n');
    if (!Number.isInteger(c) || Math.abs(c) > MAX_SHIFT) {
        throw new RangeError(`c must be an integer with |c| <= ${MAX_SHIFT}, got ${c}`);
    }
    const bc = BigInt(c);
    return Array.from({length: n + 1}, (_, k) => binomial(n, k) * bc ** BigInt(k));
}
