import {describe, expect, it} from 'vitest';
import {Rational, RationalPoint} from '../rational';
import {compareEventPositions, compareSurdHeights} from './eventOrder';

const R = (n: number, d = 1) => Rational.of(n, d);
const P = (xn: number, xd: number, yn: number, yd: number) => new RationalPoint(R(xn, xd), R(yn, yd));

/** Spec C2: the 13 event positions in processing order (decreasing y, ties by increasing x). */
const C2_ORDER: readonly RationalPoint[] = [
    P(2, 1, 5, 1), P(4, 1, 5, 1), P(0, 1, 4, 1), P(6, 1, 4, 1),
    P(33, 20, 29, 10), P(87, 20, 29, 10), P(3, 1, 2, 1),
    P(21, 16, 7, 8), P(75, 16, 7, 8),
    P(0, 1, 0, 1), P(6, 1, 0, 1), P(1, 1, -1, 1), P(5, 1, -1, 1),
];

/** Deterministic Fisher-Yates shuffle (LCG), so a failure is reproducible. */
function shuffled<T>(items: readonly T[], seed: number): T[] {
    const out = [...items];
    let s = seed;
    for (let i = out.length - 1; i > 0; i--) {
        s = (s * 1103515245 + 12345) % 2147483648;
        const j = s % (i + 1);
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

const label = (p: RationalPoint) => `${p.x.format()},${p.y.format()}`;

describe('compareEventPositions (spec C2)', () => {
    it('sorts the 13 shuffled C2 events into the spec order, ties included', () => {
        for (const seed of [1, 2, 3, 7, 42]) {
            const sorted = shuffled(C2_ORDER, seed).sort(compareEventPositions);
            expect(sorted.map(label)).toEqual(C2_ORDER.map(label));
        }
    });

    it('orders the simultaneous-y pairs by increasing x and is antisymmetric', () => {
        expect(compareEventPositions(P(33, 20, 29, 10), P(87, 20, 29, 10))).toBe(-1);
        expect(compareEventPositions(P(75, 16, 7, 8), P(21, 16, 7, 8))).toBe(1);
        expect(compareEventPositions(P(21, 16, 7, 8), P(21, 16, 7, 8))).toBe(0);
        expect(compareEventPositions(P(5, 1, 1, 1), P(0, 1, 0, 1))).toBe(-1); // higher first
    });

    it('is exact where doubles collide: 1/3 versus a rational just below it', () => {
        const a = new RationalPoint(R(0), Rational.fromBigInt(1n, 3n));
        const b = new RationalPoint(R(0), Rational.fromBigInt(10n ** 30n - 3n, 3n * 10n ** 30n));
        expect(a.y.toNumber()).toBe(b.y.toNumber());
        expect(compareEventPositions(a, b)).toBe(-1); // a is higher, processed first
    });
});

// --- high-precision reference, independent of the implementation (scaled BigInt integer square roots) ---

const SCALE = 10n ** 40n;

function isqrt(n: bigint): bigint {
    if (n < 2n) return n;
    let x = 1n << BigInt(Math.ceil(n.toString(2).length / 2));
    for (;;) {
        const y = (x + n / x) >> 1n;
        if (y >= x) return x;
        x = y;
    }
}

/** (q - sqrt(r)) * SCALE, up to a rounding error of a few units: q and sqrt are floored. */
function scaledHeight(q: Rational, r: Rational): bigint {
    const sqrtScaled = isqrt((r.num * SCALE * SCALE) / r.den);
    const qScaled = (q.num * SCALE) / q.den;
    return qScaled - sqrtScaled;
}

/** Reference sign, or null when the scaled heights are within rounding distance (a true tie). */
function referenceSign(q1: Rational, r1: Rational, q2: Rational, r2: Rational): -1 | 1 | null {
    const diff = scaledHeight(q1, r1) - scaledHeight(q2, r2);
    if (diff > 4n) return 1;
    if (diff < -4n) return -1;
    return null;
}

function lcg(seed: number): () => number {
    let s = seed;
    return () => {
        s = (s * 1103515245 + 12345) % 2147483648;
        return s;
    };
}

describe('compareSurdHeights (spec C5)', () => {
    it('finds the two true circle events of C5 equal and lower than site D', () => {
        const q = R(1);
        const r = R(65, 4);
        expect(compareSurdHeights(q, r, q, r)).toBe(0);
        expect(compareSurdHeights(q, r, R(-3), R(0))).toBe(-1); // 1 - sqrt(65)/2 = -3.0311 < -3
        expect(compareSurdHeights(R(-3), R(0), q, r)).toBe(1);
        expect(compareSurdHeights(R(-5), R(0), q, r)).toBe(-1); // the cancelled event at y = -5 is lower still
    });

    it('decides equal heights that differ in representation', () => {
        expect(compareSurdHeights(R(1, 2), R(0), R(1), R(1, 4))).toBe(0); // 1/2 = 1 - 1/2
        expect(compareSurdHeights(R(0), R(8), R(1), R(2))).toBe(-1); // -2 sqrt2 < 1 - sqrt2
    });

    it('rejects negative radicands', () => {
        expect(() => compareSurdHeights(R(0), R(-1), R(0), R(1))).toThrow(RangeError);
        expect(() => compareSurdHeights(R(0), R(1), R(0), R(-1, 4))).toThrow(RangeError);
    });

    it('handles perfect squares, zero radicands and sign changes', () => {
        expect(compareSurdHeights(R(5), R(4), R(3), R(0))).toBe(0); // 3 = 3
        expect(compareSurdHeights(R(5), R(4), R(2), R(0))).toBe(1); // 3 > 2
        expect(compareSurdHeights(R(0), R(0), R(0), R(1))).toBe(1); // 0 > -1
        expect(compareSurdHeights(R(-10), R(0), R(0), R(1))).toBe(-1); // -10 < -1
        expect(compareSurdHeights(R(0), R(1), R(-10), R(0))).toBe(1);
        expect(compareSurdHeights(R(-10), R(1), R(0), R(0))).toBe(-1);
        // u = d + sqrt(r2) < 0 although its square exceeds r1: the sign must be checked before squaring.
        expect(compareSurdHeights(R(-10), R(1), R(0), R(0))).toBe(-1);
        expect(compareSurdHeights(R(-10), R(0), R(0), R(1))).toBe(-1);
        expect(compareSurdHeights(R(0), R(0), R(10), R(1))).toBe(-1);
    });

    it('decides near-equal heights (difference < 1e-12) correctly', () => {
        // -sqrt2 versus 14142135623731/1e13 - sqrt8, which is -sqrt2 plus an offset of about 4.9e-14.
        const q2 = Rational.fromBigInt(14142135623731n, 10n ** 13n);
        expect(compareSurdHeights(R(0), R(2), q2, R(8))).toBe(-1);
        expect(compareSurdHeights(q2, R(8), R(0), R(2))).toBe(1);
        expect(referenceSign(R(0), R(2), q2, R(8))).toBe(-1);
        const q3 = Rational.fromBigInt(14142135623730n, 10n ** 13n); // below sqrt2 by about 9.5e-14
        expect(compareSurdHeights(R(0), R(2), q3, R(8))).toBe(1);
        expect(referenceSign(R(0), R(2), q3, R(8))).toBe(1);
        // Radicands 1e-13 apart: heights -sqrt(2) and -sqrt(2 + 1e-13) differ by about 3.5e-14.
        const r2 = Rational.fromBigInt(2n * 10n ** 13n + 1n, 10n ** 13n);
        expect(compareSurdHeights(R(0), R(2), R(0), r2)).toBe(1);
        expect(compareSurdHeights(R(0), r2, R(0), R(2))).toBe(-1);
        expect(referenceSign(R(0), R(2), R(0), r2)).toBe(1);
    });

    it('agrees with the BigInt reference on random rational pairs', () => {
        const next = lcg(20261101);
        let decided = 0;
        for (let i = 0; i < 4000; i++) {
            const q1 = R((next() % 4001) - 2000, 1 + (next() % 50));
            const q2 = R((next() % 4001) - 2000, 1 + (next() % 50));
            const r1 = R(next() % (i % 3 === 0 ? 8 : 3001), 1 + (next() % 50));
            const r2 = R(next() % (i % 3 === 1 ? 8 : 3001), 1 + (next() % 50));
            const expected = referenceSign(q1, r1, q2, r2);
            if (expected === null) continue;
            decided++;
            const message = `${q1.format()} ${r1.format()} ${q2.format()} ${r2.format()}`;
            expect(compareSurdHeights(q1, r1, q2, r2), message).toBe(expected);
            expect(compareSurdHeights(q2, r2, q1, r1), message).toBe(-expected);
        }
        expect(decided).toBeGreaterThan(3500);
    });

    it('agrees with the reference on tiny perturbations of equal heights', () => {
        const next = lcg(77);
        for (let i = 0; i < 300; i++) {
            const q = R((next() % 201) - 100, 1 + (next() % 9));
            const r = R(next() % 500, 1 + (next() % 9));
            const eps = Rational.fromBigInt(BigInt(1 + (next() % 7)), 10n ** 13n);
            expect(compareSurdHeights(q, r, q, r)).toBe(0);
            expect(compareSurdHeights(q.add(eps), r, q, r)).toBe(1);
            expect(compareSurdHeights(q, r, q.add(eps), r)).toBe(-1);
            const expected = referenceSign(q, r, q, r.add(eps));
            if (expected !== null) expect(compareSurdHeights(q, r, q, r.add(eps))).toBe(expected);
        }
    });
});
