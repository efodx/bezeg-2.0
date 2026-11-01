/**
 * Exact sweep-event order (ADR 0035). A downward sweep processes higher events first: decreasing y, then increasing x.
 * Every decision is a sign test on Rational/BigInt values; no square root is ever evaluated. Pure TypeScript.
 */
import {Rational, RationalPoint} from '../rational';

/**
 * Orders event positions in processing order: -1 when `p` is processed before `q`, 1 when after, 0 when equal.
 * Decreasing y, ties by increasing x.
 */
export function compareEventPositions(p: RationalPoint, q: RationalPoint): -1 | 0 | 1 {
    const byY = q.y.compare(p.y);
    return byY !== 0 ? byY : p.x.compare(q.x);
}

/** Sign of a + b*sqrt(r) for rationals a, b and r >= 0, by comparing a^2 with b^2 r only when the signs differ. */
function signOfSurdSum(a: Rational, b: Rational, r: Rational): -1 | 0 | 1 {
    const sa = a.sign();
    const sb = r.isZero() ? 0 : b.sign();
    if (sb === 0) return sa;
    if (sa === 0 || sa === sb) return sb;
    const byMagnitude = b.mul(b).mul(r).compare(a.mul(a)); // sign of |b sqrt r| - |a|
    return sb > 0 ? byMagnitude : (-byMagnitude as -1 | 0 | 1);
}

/**
 * Compares the heights q1 - sqrt(r1) and q2 - sqrt(r2) (rational q, r >= 0): -1 when the first is lower, 1 when
 * higher, 0 when equal. Throws a RangeError when r1 or r2 is negative. With d = q1 - q2 the sign of the difference
 * is the sign of d + sqrt(r2) - sqrt(r1): decide u = d + sqrt(r2) first, and square only when u > 0 (so both sides
 * of u > sqrt(r1) are non-negative).
 */
export function compareSurdHeights(q1: Rational, r1: Rational, q2: Rational, r2: Rational): -1 | 0 | 1 {
    if (r1.sign() < 0 || r2.sign() < 0) throw new RangeError('compareSurdHeights requires r >= 0');
    const d = q1.sub(q2);
    const su = signOfSurdSum(d, Rational.ONE, r2);
    if (su < 0) return -1; // u < 0 <= sqrt(r1)
    if (su === 0) return r1.isZero() ? 0 : -1; // u = 0: the difference is -sqrt(r1)
    // u > 0: u > sqrt(r1) iff u^2 > r1, and u^2 - r1 = (d^2 + r2 - r1) + 2 d sqrt(r2).
    return signOfSurdSum(d.mul(d).add(r2).sub(r1), d.add(d), r2);
}
