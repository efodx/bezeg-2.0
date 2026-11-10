/** Interest models in doubles (computed). p is the rate per year as a fraction (0.05 for 5 %), t in years. */

export const E_APPROX_MAX_N = 1_000_000;

function finite(...values: number[]): void {
    for (const v of values) if (!Number.isFinite(v)) throw new RangeError('Inputs must be finite numbers.');
}

function parts(m: number): void {
    if (!Number.isInteger(m) || m < 1) throw new RangeError('The number of parts per year m must be a positive integer.');
}

/** P (1 + p t). */
export function simple(P: number, p: number, t: number): number {
    finite(P, p, t);
    return P * (1 + p * t);
}

/** P (1 + p)^t. */
export function compound(P: number, p: number, t: number): number {
    finite(P, p, t);
    return P * Math.pow(1 + p, t);
}

/** P (1 + p/m)^(m t), the relative rate p/m per part. */
export function relative(P: number, p: number, m: number, t: number): number {
    finite(P, p, t);
    parts(m);
    return P * Math.pow(1 + p / m, m * t);
}

/** (1 + p)^(1/m) - 1, the rate per part that reproduces the yearly growth. */
export function conformalRate(p: number, m: number): number {
    finite(p);
    parts(m);
    return Math.pow(1 + p, 1 / m) - 1;
}

/** (1 + 1/n)^n for an integer n in [1, 10^6]; larger n loses the double (n = 10^15 gives 3,035). */
export function eApprox(n: number): number {
    if (!Number.isInteger(n) || n < 1 || n > E_APPROX_MAX_N) {
        throw new RangeError(`n must be an integer from 1 to ${E_APPROX_MAX_N}.`);
    }
    return Math.pow(1 + 1 / n, n);
}
