import {describe, expect, it} from 'vitest';
import {binomialPmf} from '../analysis/distributions';
import {
    binomial, factorial, MAX_N, permutationsWithRepetition, variations, variationsWithRepetition,
} from './binomial';

/** Seeded deterministic generator (mulberry32). */
function rng(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Explicit enumeration of ordered selections of k from n, with or without repetition. */
function countSelections(n: number, k: number, repeat: boolean): number {
    let total = 0;
    const used = new Array<boolean>(n).fill(false);
    const go = (depth: number): void => {
        if (depth === k) { total++; return; }
        for (let i = 0; i < n; i++) {
            if (!repeat && used[i]) continue;
            used[i] = true;
            go(depth + 1);
            used[i] = false;
        }
    };
    go(0);
    return total;
}

function countMultiset(counts: number[]): number {
    const len = counts.reduce((x, y) => x + y, 0);
    const left = [...counts];
    let total = 0;
    const go = (depth: number): void => {
        if (depth === len) { total++; return; }
        for (let i = 0; i < left.length; i++) {
            if (left[i] === 0) continue;
            left[i]--;
            go(depth + 1);
            left[i]++;
        }
    };
    go(0);
    return total;
}

describe('counts are bigint and exact', () => {
    it('returns bigint everywhere', () => {
        expect(typeof factorial(5)).toBe('bigint');
        expect(typeof binomial(5, 2)).toBe('bigint');
        expect(typeof variations(5, 2)).toBe('bigint');
        expect(typeof variationsWithRepetition(5, 2)).toBe('bigint');
        expect(typeof permutationsWithRepetition([2, 1])).toBe('bigint');
    });

    it('handles edge values', () => {
        expect(factorial(0)).toBe(1n);
        for (const n of [0, 1, 7, 60, 200]) {
            expect(binomial(n, 0)).toBe(1n);
            expect(binomial(n, n)).toBe(1n);
        }
        expect(factorial(20)).toBe(2432902008176640000n);
        expect(binomial(200, 100)).toBe(factorial(200) / (factorial(100) * factorial(100)));
        expect(binomial(60, 30)).toBe(118264581564861424n);
    });

    it('rejects invalid input with RangeError', () => {
        const bad = [() => factorial(-1), () => factorial(1.5), () => factorial(201), () => factorial(NaN),
            () => binomial(3, 4), () => binomial(201, 1), () => binomial(-1, 0), () => binomial(5, 1.5),
            () => variations(3, 4), () => variations(5, -1), () => variationsWithRepetition(201, 1),
            () => variationsWithRepetition(2, 201), () => variationsWithRepetition(2, -1),
            () => permutationsWithRepetition([1, -1]), () => permutationsWithRepetition([100, 101]),
            () => permutationsWithRepetition([1.5])];
        for (const f of bad) expect(f).toThrow(RangeError);
        expect(MAX_N).toBe(200);
    });

    it('matches explicit enumeration for n, k <= 7', () => {
        for (let n = 0; n <= 7; n++) {
            for (let k = 0; k <= n; k++) {
                expect(variations(n, k)).toBe(BigInt(countSelections(n, k, false)));
                expect(binomial(n, k)).toBe(BigInt(countSelections(n, k, false)) / factorial(k));
            }
            for (let k = 0; k <= 7; k++) {
                expect(variationsWithRepetition(n, k)).toBe(BigInt(countSelections(n, k, true)));
            }
        }
        for (const counts of [[3, 2], [1, 1, 1, 1], [2, 2, 2], [4, 0, 3], [5], []]) {
            expect(permutationsWithRepetition(counts)).toBe(BigInt(countMultiset(counts)));
        }
    });

    it('reproduces the CB2 numbers', () => {
        expect(factorial(5)).toBe(120n);
        expect(variations(6, 3)).toBe(120n);
        expect(variationsWithRepetition(6, 3)).toBe(216n);
        expect(binomial(6, 3)).toBe(20n);
        expect(variations(6, 3) / factorial(3)).toBe(20n);
        expect(permutationsWithRepetition([1, 4, 4, 2])).toBe(34650n);
        expect(factorial(11) / (factorial(4) * factorial(4) * factorial(2))).toBe(34650n);
    });

    it('satisfies the factorial identity on seeded random pairs', () => {
        const next = rng(20261110);
        for (let i = 0; i < 200; i++) {
            const n = Math.floor(next() * (MAX_N + 1));
            const k = Math.floor(next() * (n + 1));
            expect(binomial(n, k) * factorial(k) * factorial(n - k)).toBe(factorial(n));
            expect(binomial(n, k)).toBe(binomial(n, n - k));
        }
    });
});

describe('double binomialPmf against the exact ratio', () => {
    // Scope: n <= 60 and p in {1/2, 1/4, 1/10} only (exact BigInt ratios need rational p).
    // Observed maximum relative error 7.46e-14 in Node (V8); binomialPmf goes through exp/log,
    // so the stated bound leaves about 2.7x headroom for libm differences between engines.
    const BOUND = 2e-13;

    it('stays within the bound and reports the maximum', () => {
        let max = 0;
        for (let n = 1; n <= 60; n++) {
            for (const [num, den] of [[1, 2], [1, 4], [1, 10]]) {
                const p = num / den;
                for (let k = 0; k <= n; k++) {
                    // exact C(n,k) num^k (den-num)^(n-k) / den^n as a BigInt ratio, scaled then converted once
                    const top = binomial(n, k) * BigInt(num) ** BigInt(k) * BigInt(den - num) ** BigInt(n - k);
                    const bottom = BigInt(den) ** BigInt(n);
                    const digits = 120;
                    const exact = Number((top * 10n ** BigInt(digits)) / bottom) / 10 ** digits;
                    const rel = Math.abs(binomialPmf(n, p, k) - exact) / exact;
                    if (rel > max) max = rel;
                }
            }
        }

        expect(max).toBeLessThan(BOUND);
    });
});
