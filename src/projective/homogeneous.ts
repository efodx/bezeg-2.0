/**
 * Exact homogeneous-coordinate kernel for the projective conics family (ADR 0033 section 1).
 *
 * Points and lines are `readonly [bigint, bigint, bigint]`, normalized by the gcd with a fixed sign (w positive, or for w = 0
 * the first non-zero entry positive, so a finite point keeps w > 0 and det3 agrees with `orient`), so equal objects compare equal. Every discrete outcome is decided in integers; doubles appear only
 * in the `view` of `toAffine`. The module has no React, JSXGraph or localization imports and does not import the
 * grid predicates (ADR 0033 section 5).
 *
 * `join` and `meet` can return the zero triple when their arguments coincide; that value means "undefined" and is
 * never produced by the constructors. Check `isZero` or use the typed statuses of `crossRatio` and `project`.
 */

export type Hom = readonly [bigint, bigint, bigint];

/** An exact fraction with a positive denominator, in lowest terms. */
export interface Fraction {
    readonly num: bigint;
    readonly den: bigint;
}

export type AffineResult =
    | { readonly kind: 'finite'; readonly x: Fraction; readonly y: Fraction; readonly view: { readonly x: number; readonly y: number } }
    | { readonly kind: 'ideal'; readonly direction: readonly [bigint, bigint] };

export type CrossRatioResult =
    | { readonly status: 'ok'; readonly value: Fraction; readonly usedLimit: boolean }
    | { readonly status: 'coincident' }
    | { readonly status: 'not-collinear' };

export type ProjectResult =
    | { readonly status: 'ok'; readonly image: Hom; readonly ideal: boolean }
    | { readonly status: 'centre-on-line' }
    | { readonly status: 'point-off-line' };

function abs(n: bigint): bigint {
    return n < 0n ? -n : n;
}

function gcd(a: bigint, b: bigint): bigint {
    a = abs(a);
    b = abs(b);
    while (b !== 0n) {
        [a, b] = [b, a % b];
    }
    return a;
}

/** Divide by the gcd and make w positive (first non-zero entry if w = 0). The zero triple is returned unchanged. */
export function normalize(h: Hom): Hom {
    const g = gcd(gcd(h[0], h[1]), h[2]);
    if (g === 0n) return [0n, 0n, 0n];
    const first = h[2] !== 0n ? h[2] : h[0] !== 0n ? h[0] : h[1];
    const s = first < 0n ? -g : g;
    return [h[0] / s, h[1] / s, h[2] / s];
}

function toBigInt(n: number | bigint, name: string): bigint {
    if (typeof n === 'bigint') return n;
    if (!Number.isSafeInteger(n)) throw new RangeError(`${name} must be a safe integer, got ${n}`);
    return BigInt(n);
}

/** A point or line from integer homogeneous coordinates. Rejects non-integers and the zero triple. */
export function hom(a: number | bigint, b: number | bigint, c: number | bigint): Hom {
    const h: Hom = [toBigInt(a, 'a'), toBigInt(b, 'b'), toBigInt(c, 'c')];
    if (h[0] === 0n && h[1] === 0n && h[2] === 0n) throw new RangeError('the zero triple is not a point or line');
    return normalize(h);
}

/** The affine point (x, y) with integer coordinates. */
export function point(x: number | bigint, y: number | bigint): Hom {
    return hom(x, y, 1);
}

/** The affine point (x, y) whose coordinates are multiples of 1/4; anything else is a RangeError. */
export function pointFromQuarters(x: number, y: number): Hom {
    const qx = x * 4;
    const qy = y * 4;
    if (!Number.isSafeInteger(qx) || !Number.isSafeInteger(qy)) {
        throw new RangeError(`coordinates must be multiples of 1/4, got (${x}, ${y})`);
    }
    return hom(qx, qy, 4);
}

export function isZero(h: Hom): boolean {
    return h[0] === 0n && h[1] === 0n && h[2] === 0n;
}

/** Cross product, normalized. Used by both `join` (two points -> line) and `meet` (two lines -> point). */
function cross(a: Hom, b: Hom): Hom {
    return normalize([
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]);
}

/** The line through two points; the zero triple if they coincide. */
export function join(p: Hom, q: Hom): Hom {
    return cross(p, q);
}

/** The point common to two lines; the zero triple if they coincide. */
export function meet(l: Hom, m: Hom): Hom {
    return cross(l, m);
}

export function det3(a: Hom, b: Hom, c: Hom): bigint {
    return (
        a[0] * (b[1] * c[2] - b[2] * c[1]) -
        a[1] * (b[0] * c[2] - b[2] * c[0]) +
        a[2] * (b[0] * c[1] - b[1] * c[0])
    );
}

/** True for a point at infinity (w = 0). */
export function isIdeal(p: Hom): boolean {
    return p[2] === 0n;
}

/** The line at infinity, [0, 0, 1]. */
export function lineAtInfinity(): Hom {
    return [0n, 0n, 1n];
}

export function collinear(a: Hom, b: Hom, c: Hom): boolean {
    return det3(a, b, c) === 0n;
}

export function concurrent(a: Hom, b: Hom, c: Hom): boolean {
    return det3(a, b, c) === 0n;
}

/** Projective equality of two nonzero triples. */
export function equal(a: Hom, b: Hom): boolean {
    return !isZero(a) && !isZero(b) && isZero(cross(a, b));
}

function fraction(num: bigint, den: bigint): Fraction {
    if (den === 0n) throw new RangeError('zero denominator');
    const g = gcd(num, den);
    const s = den < 0n ? -g : g;
    return {num: num / s, den: den / s};
}

function bitLength(n: bigint): number {
    return n === 0n ? 0 : abs(n).toString(2).length;
}

/**
 * Double view of an exact fraction. Numerator and denominator keep their top 64 bits each and the difference of the shifts
 * is applied as a power of two (in two halves, so neither factor overflows on its own). A value beyond the double range is
 * clamped to +-Number.MAX_VALUE, so the result is never NaN or Infinity.
 */
export function fractionToNumber(f: Fraction): number {
    const shiftNum = Math.max(0, bitLength(f.num) - 64);
    const shiftDen = Math.max(0, bitLength(f.den) - 64);
    const mantissa = Number(f.num >> BigInt(shiftNum)) / Number(f.den >> BigInt(shiftDen));
    const exponent = shiftNum - shiftDen;
    const half = Math.trunc(exponent / 2);
    const value = mantissa * 2 ** half * 2 ** (exponent - half);
    if (Number.isFinite(value)) return value;
    return mantissa < 0 ? -Number.MAX_VALUE : Number.MAX_VALUE;
}

/** Affine coordinates as exact fractions with a double view, or the direction of an ideal point. Never NaN. */
export function toAffine(p: Hom): AffineResult {
    if (isZero(p)) throw new RangeError('the zero triple is not a point');
    if (isIdeal(p)) return {kind: 'ideal', direction: [p[0], p[1]]};
    const x = fraction(p[0], p[2]);
    const y = fraction(p[1], p[2]);
    return {kind: 'finite', x, y, view: {x: fractionToNumber(x), y: fractionToNumber(y)}};
}

/** A line through all the (collinear) points, found from the first two distinct ones; zero if all coincide. */
function lineThrough(points: readonly Hom[]): Hom {
    for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
            const l = join(points[i], points[j]);
            if (!isZero(l)) return l;
        }
    }
    return [0n, 0n, 0n];
}

/** A reference point off the line l (one of the three unit points always works). */
function offLine(l: Hom): Hom {
    return l[0] !== 0n ? [1n, 0n, 0n] : l[1] !== 0n ? [0n, 1n, 0n] : [0n, 0n, 1n];
}

/**
 * Cross-ratio (A,B;C,D) = (C-A)(D-B) / ((C-B)(D-A)) of four collinear points, as the bracket quotient
 * [AC][BD] / ([BC][AD]) with [PQ] = det(P, Q, R) for a fixed reference point R off the line. Scaling a point cancels,
 * and an ideal point needs no special case: the quotient is the limiting formula, reported through `usedLimit`.
 * Coincident points (any pair) give status `coincident`; points not on one line give `not-collinear`.
 */
export function crossRatio(a: Hom, b: Hom, c: Hom, d: Hom): CrossRatioResult {
    const pts = [a, b, c, d];
    for (let i = 0; i < 4; i++) {
        for (let j = i + 1; j < 4; j++) {
            if (equal(pts[i], pts[j])) return {status: 'coincident'};
        }
    }
    const line = lineThrough(pts);
    if (isZero(line) || pts.some((p) => line[0] * p[0] + line[1] * p[1] + line[2] * p[2] !== 0n)) {
        return {status: 'not-collinear'};
    }
    const r = offLine(line);
    const br = (p: Hom, q: Hom) => det3(p, q, r);
    const num = br(a, c) * br(b, d);
    const den = br(b, c) * br(a, d);
    return {status: 'ok', value: fraction(num, den), usedLimit: pts.some(isIdeal)};
}

/** True when (A,B;C,D) = -1 exactly. */
export function isHarmonic(a: Hom, b: Hom, c: Hom, d: Hom): boolean {
    const r = crossRatio(a, b, c, d);
    return r.status === 'ok' && r.value.num === -r.value.den;
}

function onLine(l: Hom, p: Hom): boolean {
    return l[0] * p[0] + l[1] * p[1] + l[2] * p[2] === 0n;
}

/**
 * Central projection of p on line `from` through `centre` onto line `to`. A centre on either line, or p off `from`,
 * gives a typed status. The image may be an ideal point; nothing divides.
 */
export function project(centre: Hom, from: Hom, to: Hom, p: Hom): ProjectResult {
    if (onLine(from, centre) || onLine(to, centre)) return {status: 'centre-on-line'};
    if (!onLine(from, p)) return {status: 'point-off-line'};
    const image = meet(join(centre, p), to);
    return {status: 'ok', image, ideal: isIdeal(image)};
}
