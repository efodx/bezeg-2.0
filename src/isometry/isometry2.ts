/**
 * Isometry and similarity kernel (spec: isometries-lessons.md "Isometry kernel" items 1-4 and 7; ADR 0047 section 2).
 * Pure TypeScript on top of `rational.ts`, `grid.ts` and `circle.ts`; no React, JSXGraph or board state.
 *
 * - `AffineMap2 = {a, b, c, d, tx, ty}` of `Rational`: `(x, y) -> (a x + b y + tx, c x + d y + ty)`. `compose(B, A)` is
 *   first `A`, then `B`. `apply`, `inverse` (a singular map is invalid input and throws a RangeError), `identityMap`,
 *   `determinant`, `toMat2` (the double linear part, for drawing and oracles only).
 * - Constructors `reflection(p, q)` (p != q), `translation`, `rotationAbout(centre, cos, sin)` (exact unit pair) and
 *   `dilation(centre, k)` (k != 0). Points are integer grid points and are rejected with a RangeError otherwise.
 * - `classifyIsometry(m)`: `notIsometry | identity | translation | rotation | reflection | glide`. Every decision is an exact
 *   rational test (no epsilon). Centres, axes and glide vectors are exact; the rotation angle is a double (`atan2`) and is
 *   labelled `angleComputed: true`.
 * - `similarity(m)`: `notSimilarity | similarity`, with the exact ratio `lambda2`, the exact `lambda` when it is rational,
 *   the orientation, `detIMinusA` and the exact fixed point (`'none'` when `det(I - A) = 0`).
 */
import {assertGridPoint, type GridPoint} from '../compgeo/grid';
import {lineThrough, type Line} from '../compgeo/circle';
import {Rational, RationalPoint} from '../compgeo/rational';

const ZERO = Rational.ZERO;
const ONE = Rational.ONE;
const TWO = Rational.of(2);

export interface AffineMap2 {
    readonly a: Rational;
    readonly b: Rational;
    readonly c: Rational;
    readonly d: Rational;
    readonly tx: Rational;
    readonly ty: Rational;
}

export type IsometryClass =
    | { readonly kind: 'notIsometry' }
    | { readonly kind: 'identity' }
    | { readonly kind: 'translation'; readonly vector: RationalPoint }
    | {
    readonly kind: 'rotation';
    readonly centre: RationalPoint;
    /** `atan2(c, a)` in radians, a computed double. */
    readonly angle: number;
    readonly angleComputed: true;
}
    | { readonly kind: 'reflection'; readonly axis: Line }
    | { readonly kind: 'glide'; readonly axis: Line; readonly vector: RationalPoint };

export type SimilarityResult =
    | { readonly kind: 'notSimilarity' }
    | {
    readonly kind: 'similarity';
    /** Exact ratio of areas, `a^2 + c^2`. */
    readonly lambda2: Rational;
    /** Exact ratio of lengths when `lambda2` is a rational square, else `undefined`. */
    readonly lambda: Rational | undefined;
    readonly orientation: 1 | -1;
    /** `det(I - A)`. */
    readonly detIMinusA: Rational;
    readonly fixedPoint: RationalPoint | 'none';
};

export function affineMap(a: Rational, b: Rational, c: Rational, d: Rational, tx: Rational, ty: Rational): AffineMap2 {
    return {a, b, c, d, tx, ty};
}

export const identityMap: AffineMap2 = affineMap(ONE, ZERO, ZERO, ONE, ZERO, ZERO);

export const determinant = (m: AffineMap2): Rational => m.a.mul(m.d).sub(m.b.mul(m.c));

export function mapsEqual(m: AffineMap2, n: AffineMap2): boolean {
    return m.a.equals(n.a) && m.b.equals(n.b) && m.c.equals(n.c) && m.d.equals(n.d) && m.tx.equals(n.tx) && m.ty.equals(n.ty);
}

/** The linear part as a double matrix (for drawing and oracles; not for decisions). */
export function toMat2(m: AffineMap2): readonly [readonly [number, number], readonly [number, number]] {
    return [[m.a.toNumber(), m.b.toNumber()], [m.c.toNumber(), m.d.toNumber()]];
}

export function apply(m: AffineMap2, p: RationalPoint): RationalPoint {
    return new RationalPoint(m.a.mul(p.x).add(m.b.mul(p.y)).add(m.tx), m.c.mul(p.x).add(m.d.mul(p.y)).add(m.ty));
}

/** First `inner`, then `outer`. */
export function compose(outer: AffineMap2, inner: AffineMap2): AffineMap2 {
    return {
        a: outer.a.mul(inner.a).add(outer.b.mul(inner.c)),
        b: outer.a.mul(inner.b).add(outer.b.mul(inner.d)),
        c: outer.c.mul(inner.a).add(outer.d.mul(inner.c)),
        d: outer.c.mul(inner.b).add(outer.d.mul(inner.d)),
        tx: outer.a.mul(inner.tx).add(outer.b.mul(inner.ty)).add(outer.tx),
        ty: outer.c.mul(inner.tx).add(outer.d.mul(inner.ty)).add(outer.ty),
    };
}

export function inverse(m: AffineMap2): AffineMap2 {
    const det = determinant(m);
    if (det.isZero()) throw new RangeError('a singular map (ad - bc = 0) has no inverse');
    const a = m.d.div(det);
    const b = m.b.neg().div(det);
    const c = m.c.neg().div(det);
    const d = m.a.div(det);
    return {a, b, c, d, tx: a.mul(m.tx).add(b.mul(m.ty)).neg(), ty: c.mul(m.tx).add(d.mul(m.ty)).neg()};
}

const point = (p: GridPoint, name: string): RationalPoint => {
    assertGridPoint(p, name);
    return RationalPoint.fromGrid(p);
};

/** The linear part `L` together with the translation that fixes `centre`: `x -> L (x - centre) + centre`. */
function aboutCentre(a: Rational, b: Rational, c: Rational, d: Rational, centre: RationalPoint): AffineMap2 {
    return {
        a, b, c, d,
        tx: centre.x.sub(a.mul(centre.x).add(b.mul(centre.y))),
        ty: centre.y.sub(c.mul(centre.x).add(d.mul(centre.y))),
    };
}

/** Reflection in the line through two different grid points. */
export function reflection(p: GridPoint, q: GridPoint): AffineMap2 {
    const P = point(p, 'p');
    const Q = point(q, 'q');
    if (P.equals(Q)) throw new RangeError('a mirror needs two different points');
    const w = Q.sub(P);
    const ww = w.dot(w);
    const diag = w.x.mul(w.x).sub(w.y.mul(w.y)).div(ww);
    const off = TWO.mul(w.x).mul(w.y).div(ww);
    return aboutCentre(diag, off, off, diag.neg(), P);
}

export function translation(vector: GridPoint): AffineMap2 {
    const v = point(vector, 'vector');
    return {...identityMap, tx: v.x, ty: v.y};
}

/** Rotation about a grid centre by the angle with the given exact unit pair. */
export function rotationAbout(centre: GridPoint, cos: Rational, sin: Rational): AffineMap2 {
    if (!cos.mul(cos).add(sin.mul(sin)).equals(ONE)) throw new RangeError('cos^2 + sin^2 must equal 1');
    return aboutCentre(cos, sin.neg(), sin, cos, point(centre, 'centre'));
}

/** Central dilation with a grid centre and a non-zero rational ratio. */
export function dilation(centre: GridPoint, k: Rational): AffineMap2 {
    if (k.isZero()) throw new RangeError('the ratio of a dilation must not be zero');
    return aboutCentre(k, ZERO, ZERO, k, point(centre, 'centre'));
}

/** Exact test `A^T A = I`. */
export function isOrthogonal(m: AffineMap2): boolean {
    return m.a.mul(m.a).add(m.c.mul(m.c)).equals(ONE)
        && m.b.mul(m.b).add(m.d.mul(m.d)).equals(ONE)
        && m.a.mul(m.b).add(m.c.mul(m.d)).isZero();
}

export function classifyIsometry(m: AffineMap2): IsometryClass {
    if (!isOrthogonal(m)) return {kind: 'notIsometry'};
    const t = new RationalPoint(m.tx, m.ty);
    if (determinant(m).sign() > 0) {
        if (m.a.equals(ONE) && m.c.isZero()) { // A = I
            return t.x.isZero() && t.y.isZero() ? {kind: 'identity'} : {kind: 'translation', vector: t};
        }
        const det = ONE.sub(m.a).mul(ONE.sub(m.d)).sub(m.b.mul(m.c)); // 2 - tr A, non-zero when A != I
        const centre = new RationalPoint(
            ONE.sub(m.d).mul(m.tx).add(m.b.mul(m.ty)).div(det),
            m.c.mul(m.tx).add(ONE.sub(m.a).mul(m.ty)).div(det),
        );
        return {kind: 'rotation', centre, angle: Math.atan2(m.c.toNumber(), m.a.toNumber()), angleComputed: true};
    }
    let w = new RationalPoint(ONE.add(m.a), m.c);
    if (w.x.isZero() && w.y.isZero()) w = new RationalPoint(m.b, ONE.sub(m.a)); // a = -1, c = 0: vertical axis
    const ww = w.dot(w);
    const tw = t.dot(w);
    const glide = w.scale(tw.div(ww));
    const base = t.sub(glide).scale(ONE.div(TWO)); // a point of the axis
    const axis = lineThrough(base, base.add(w));
    if (axis.kind !== 'line') throw new Error('unreachable: the axis direction is non-zero');
    return tw.isZero() ? {kind: 'reflection', axis} : {kind: 'glide', axis, vector: glide};
}

/** Exact square root of a non-negative rational when it is a rational square. */
function rationalSqrt(r: Rational): Rational | undefined {
    const root = (n: bigint): bigint | undefined => {
        if (n < 2n) return n;
        let x = 1n << BigInt((n.toString(2).length + 1) >> 1);
        for (;;) {
            const y = (x + n / x) >> 1n;
            if (y >= x) break;
            x = y;
        }
        return x * x === n ? x : undefined;
    };
    const num = root(r.num);
    const den = root(r.den);
    return num === undefined || den === undefined ? undefined : Rational.fromBigInt(num, den);
}

export function similarity(m: AffineMap2): SimilarityResult {
    const lambda2 = m.a.mul(m.a).add(m.c.mul(m.c));
    const sameNorm = lambda2.equals(m.b.mul(m.b).add(m.d.mul(m.d)));
    if (lambda2.isZero() || !sameNorm || !m.a.mul(m.b).add(m.c.mul(m.d)).isZero()) return {kind: 'notSimilarity'};
    const detIMinusA = ONE.sub(m.a).mul(ONE.sub(m.d)).sub(m.b.mul(m.c));
    const fixedPoint = detIMinusA.isZero()
        ? 'none' as const
        : new RationalPoint(
            ONE.sub(m.d).mul(m.tx).add(m.b.mul(m.ty)).div(detIMinusA),
            m.c.mul(m.tx).add(ONE.sub(m.a).mul(m.ty)).div(detIMinusA),
        );
    return {
        kind: 'similarity',
        lambda2,
        lambda: rationalSqrt(lambda2),
        orientation: determinant(m).sign() > 0 ? 1 : -1,
        detIMinusA,
        fixedPoint,
    };
}
