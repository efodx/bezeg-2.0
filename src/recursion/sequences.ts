/**
 * Arithmetic and geometric sequences, terms indexed from 1: a_n = a_1 + (n-1) d and a_n = a_1 q^(n-1).
 * Integer (bigint) inputs are exact; number inputs are doubles.
 */

export const SEQUENCE_MAX_N = 200;

function checkN(n: number): void {
    if (!Number.isInteger(n) || n < 1 || n > SEQUENCE_MAX_N) throw new RangeError(`n must be an integer from 1 to ${SEQUENCE_MAX_N}.`);
}

export function arithmetic(a1: bigint, d: bigint, n: number): bigint;
export function arithmetic(a1: number, d: number, n: number): number;
export function arithmetic(a1: bigint | number, d: bigint | number, n: number): bigint | number {
    checkN(n);
    if (typeof a1 === 'bigint' && typeof d === 'bigint') return a1 + BigInt(n - 1) * d;
    return Number(a1) + (n - 1) * Number(d);
}

export function geometric(a1: bigint, q: bigint, n: number): bigint;
export function geometric(a1: number, q: number, n: number): number;
export function geometric(a1: bigint | number, q: bigint | number, n: number): bigint | number {
    checkN(n);
    if (typeof a1 === 'bigint' && typeof q === 'bigint') return a1 * q ** BigInt(n - 1);
    return Number(a1) * Math.pow(Number(q), n - 1);
}

/** S_n = a_1 + ... + a_n; `r` is d for arithmetic and q for geometric. */
export function partialSum(kind: 'arithmetic' | 'geometric', a1: bigint, r: bigint, n: number): bigint;
export function partialSum(kind: 'arithmetic' | 'geometric', a1: number, r: number, n: number): number;
export function partialSum(kind: 'arithmetic' | 'geometric', a1: bigint | number, r: bigint | number, n: number): bigint | number {
    checkN(n);
    if (typeof a1 === 'bigint' && typeof r === 'bigint') {
        const count = BigInt(n);
        if (kind === 'arithmetic') return count * (2n * a1 + (count - 1n) * r) / 2n;
        return r === 1n ? count * a1 : a1 * (r ** count - 1n) / (r - 1n);
    }
    const first = Number(a1);
    const step = Number(r);
    if (kind === 'arithmetic') return n * (2 * first + (n - 1) * step) / 2;
    return step === 1 ? n * first : first * (1 - Math.pow(step, n)) / (1 - step);
}

/** The limit a_1/(1 - q) of the geometric series, a statement about the closed form. Throws RangeError unless |q| < 1. */
export function geometricLimit(a1: number, q: number): number {
    if (!Number.isFinite(a1) || !Number.isFinite(q) || Math.abs(q) >= 1) throw new RangeError('The series converges only for |q| < 1.');
    return a1 / (1 - q);
}
