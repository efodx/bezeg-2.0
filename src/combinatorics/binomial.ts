/**
 * Counting kernel (docs/specs/combinatorics-lessons.md, ADR 0048 section 1-2).
 * Free of React, JSXGraph, localization and graph state. Every count is a `bigint`, never a double.
 * Inputs are integers; non-integers, negatives, k > n and n > MAX_N throw `RangeError`.
 * - `binomial(n, k)`: multiplicative product with exact division at every step (not a quotient of factorials).
 * - `variationsWithRepetition(n, k) = n^k` accepts any k in [0, MAX_N] (repetition makes k > n meaningful).
 * - `permutationsWithRepetition(counts)`: multinomial, the counts summing to at most MAX_N.
 */
export const MAX_N = 200;

export function assertCount(value: number, name: string, max: number = MAX_N): void {
    if (!Number.isInteger(value) || value < 0 || value > max) {
        throw new RangeError(`${name} must be an integer in [0, ${max}], got ${value}`);
    }
}

function assertNK(n: number, k: number): void {
    assertCount(n, 'n');
    assertCount(k, 'k');
    if (k > n) throw new RangeError(`k must not exceed n, got n=${n}, k=${k}`);
}

export function factorial(n: number): bigint {
    assertCount(n, 'n');
    let result = 1n;
    for (let i = 2; i <= n; i++) result *= BigInt(i);
    return result;
}

export function binomial(n: number, k: number): bigint {
    assertNK(n, k);
    const m = Math.min(k, n - k);
    let result = 1n;
    for (let i = 1; i <= m; i++) {
        // After step i, result = C(n - m + i, i); the division is exact.
        result = (result * BigInt(n - m + i)) / BigInt(i);
    }
    return result;
}

/** Ordered choices of k distinct items from n: n (n-1) ... (n-k+1). */
export function variations(n: number, k: number): bigint {
    assertNK(n, k);
    let result = 1n;
    for (let i = 0; i < k; i++) result *= BigInt(n - i);
    return result;
}

export function variationsWithRepetition(n: number, k: number): bigint {
    assertCount(n, 'n');
    assertCount(k, 'k');
    return BigInt(n) ** BigInt(k);
}

/** Multinomial (c1 + ... + cm)! / (c1! ... cm!) as a product of binomials. */
export function permutationsWithRepetition(counts: readonly number[]): bigint {
    let total = 0;
    let result = 1n;
    for (const c of counts) {
        assertCount(c, 'count');
        total += c;
        if (total > MAX_N) throw new RangeError(`counts must sum to at most ${MAX_N}`);
        result *= binomial(total, c);
    }
    return result;
}
