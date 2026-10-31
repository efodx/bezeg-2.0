/**
 * The rational quadratic Bezier arc of a conic between two of its points (spec K4; ADR 0033 sections 1 and 3).
 *
 * For a smooth conic and two finite points P0, P2 on it, the middle control point P1 is the pole of the chord P0P2 (the
 * meeting point of the end tangents) and the end weights are 1. In coordinates relative to the triangle P0 P1 P2 the
 * conic is b1^2 = 4 w^2 b0 b2, so a third conic point T = b0 P0 + b1 P1 + b2 P2 (with the Pi scaled to w = 1) gives
 * w^2 = b1^2 / (4 b0 b2) as an exact fraction. Everything discrete is decided in BigInt; doubles appear only in the
 * drawing views (`controlPoints`, `weight`, Farin points, shoulder, denominator zeros).
 *
 * Typed statuses instead of arithmetic on degenerate input: when P1 is ideal (parallel end tangents) or an end is ideal,
 * the arc cannot be one finite quadratic piece and the result is `split-needed`, returned before P1 is used in any way.
 */
import {det3, equal, fractionToNumber, isIdeal, isZero, join, type Fraction, type Hom} from './homogeneous';
import {isqrt, isSmooth, onConic, pole, type Conic} from './conic';

export interface ArcPoint {
    readonly x: number;
    readonly y: number;
}

export type RationalArcInvalidReason =
    | 'zero-triple'
    | 'degenerate-conic'
    | 'not-on-conic'
    | 'coincident-ends'
    | 'third-not-distinct';

export type RationalArcResult =
    | {
          readonly status: 'ok';
          /** P0, P1, P2 as exact finite homogeneous triples (P1 is the pole of the chord). */
          readonly points: readonly [Hom, Hom, Hom];
          /** The same points as doubles, ready for a rational Bezier evaluator with `weights`. */
          readonly controlPoints: readonly [ArcPoint, ArcPoint, ArcPoint];
          /** w^2 exactly (> 0, lowest terms). */
          readonly weightSquared: Fraction;
          /** w when w^2 is the square of a rational, else null. */
          readonly weightExact: Fraction | null;
          /** w > 0 as a double. */
          readonly weight: number;
          /** [1, w, 1]. */
          readonly weights: readonly [number, number, number];
          /** (P0 + w P1) / (1 + w) and (w P1 + P2) / (w + 1). */
          readonly farinPoints: readonly [ArcPoint, ArcPoint];
          /** The curve point at t = 1/2, the midpoint of the Farin points. */
          readonly shoulder: ArcPoint;
          /** Real zeros of the denominator (1-t)^2 + 2 w t (1-t) + t^2: two for w > 1, none otherwise. */
          readonly denominatorZeros: readonly number[];
      }
    | {readonly status: 'split-needed'; readonly reason: 'parallel-tangents' | 'ideal-end'}
    /** The third point lies on the complementary arc (outside the triangle P0 P1 P2); that arc needs weight -w. */
    | {readonly status: 'complementary-arc'}
    /** w^2 < 0: the ends lie on different branches of a hyperbola and no real weight exists. */
    | {readonly status: 'no-real-weight'}
    | {readonly status: 'invalid'; readonly reason: RationalArcInvalidReason};

function gcd(a: bigint, b: bigint): bigint {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    while (b !== 0n) [a, b] = [b, a % b];
    return a;
}

function reduce(num: bigint, den: bigint): Fraction {
    const g = gcd(num, den);
    const s = den < 0n ? -g : g;
    return {num: num / s, den: den / s};
}

function exactRoot(f: Fraction): Fraction | null {
    const n = isqrt(f.num);
    const d = isqrt(f.den);
    return n * n === f.num && d * d === f.den ? {num: n, den: d} : null;
}

function view(p: Hom): ArcPoint {
    // Callers pass finite points only (z > 0 after normalization).
    return {x: fractionToNumber({num: p[0], den: p[2]}), y: fractionToNumber({num: p[1], den: p[2]})};
}

function lerp(a: ArcPoint, b: ArcPoint, s: number, t: number): ArcPoint {
    return {x: (s * a.x + t * b.x) / (s + t), y: (s * a.y + t * b.y) / (s + t)};
}

/** The rational quadratic arc of conic `c` from `a` to `b`, with the weight fixed by the conic point `third`. */
export function rationalArc(c: Conic, a: Hom, b: Hom, third: Hom): RationalArcResult {
    if (isZero(a) || isZero(b) || isZero(third)) return {status: 'invalid', reason: 'zero-triple'};
    if (!isSmooth(c)) return {status: 'invalid', reason: 'degenerate-conic'};
    if (!onConic(c, a) || !onConic(c, b)) return {status: 'invalid', reason: 'not-on-conic'};
    if (equal(a, b)) return {status: 'invalid', reason: 'coincident-ends'};
    if (isIdeal(a) || isIdeal(b)) return {status: 'split-needed', reason: 'ideal-end'};

    const p1 = pole(c, join(a, b));
    // A smooth conic always has a pole; the guard keeps the type honest.
    if (p1.status !== 'ok') return {status: 'invalid', reason: 'degenerate-conic'};
    if (isIdeal(p1.point)) return {status: 'split-needed', reason: 'parallel-tangents'};

    if (!onConic(c, third)) return {status: 'invalid', reason: 'not-on-conic'};
    if (equal(third, a) || equal(third, b)) return {status: 'invalid', reason: 'third-not-distinct'};

    // third = sum of bi * Qi with Qi = Pi / z_i (weight-1 affine points): Cramer gives bi up to a common factor.
    const [P0, P1, P2] = [a, p1.point, b];
    const b0 = det3(third, P1, P2) * P0[2];
    const b1 = det3(P0, third, P2) * P1[2];
    const b2 = det3(P0, P1, third) * P2[2];
    const den = 4n * b0 * b2;
    // b0 = 0 or b2 = 0 would put third on a tangent line, hence on P0 or P2 (excluded above).
    if (den < 0n) return {status: 'no-real-weight'};
    const sameSide = (b0 > 0n) === (b1 > 0n) && (b2 > 0n) === (b1 > 0n);
    if (!sameSide) return {status: 'complementary-arc'};

    const weightSquared = reduce(b1 * b1, den);
    const weight = Math.sqrt(fractionToNumber(weightSquared));
    const controlPoints = [view(P0), view(P1), view(P2)] as const;
    const farinPoints = [
        lerp(controlPoints[0], controlPoints[1], 1, weight),
        lerp(controlPoints[1], controlPoints[2], weight, 1),
    ] as const;
    // Denominator (2 - 2w) t^2 + (2w - 2) t + 1 = 0 has discriminant 4 (w^2 - 1); roots 1/2 +- (w + 1) / (2 sqrt(w^2 - 1)).
    const denominatorZeros: number[] = [];
    if (weightSquared.num > weightSquared.den) {
        const root = Math.sqrt(fractionToNumber({num: weightSquared.num - weightSquared.den, den: weightSquared.den}));
        if (root > 0) {
            const r = (weight + 1) / (2 * root);
            denominatorZeros.push(0.5 - r, 0.5 + r);
        }
    }
    return {
        status: 'ok',
        points: [P0, P1, P2],
        controlPoints,
        weightSquared,
        weightExact: exactRoot(weightSquared),
        weight,
        weights: [1, weight, 1],
        farinPoints,
        shoulder: lerp(farinPoints[0], farinPoints[1], 1, 1),
        denominatorZeros,
    };
}
