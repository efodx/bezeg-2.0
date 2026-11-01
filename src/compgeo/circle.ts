/**
 * Circle kernel: circles, lines, power of a point, exact intersection decisions, the inscribed-angle helpers and the
 * exact inversion helper (spec: triangle-geometry-lessons.md "Triangle and circle kernel", T2, T4, T5; ADR 0030 sections 1-2).
 * Pure TypeScript, no React, JSXGraph or board state.
 *
 * Exactness. Circles carry the squared radius, so everything below that is a decision or an identity on rational input is
 * exact (`Rational` / `RationalPoint`): `powerOfPoint`, `lineValue`, the none / tangent / two classification of an
 * intersection, `thalesDot`, `circumcircle` and `invertExact`. Only intersection points, glider points and angles involve a
 * square root or a trigonometric function; they are doubles and are labelled `inexact: true` (or are plain numbers whose doc
 * says so). Never compare them with `===` and never show them as an equality.
 *
 * Exported API:
 * - `Circle = {centre: RationalPoint, r2: Rational}` (`r2 >= 0`, a point circle is allowed), `Line = {kind: 'line', a, b, c}`
 *   for `a x + b y = c` with `(a, b) != (0, 0)`, `GeneralizedCircle = Circle | Line` with guards `isLine` / `isCircle`.
 *   `Circle` has no `kind`, so the triangle kernel's `ninePointCircle` result is a `Circle` as it stands.
 * - `powerOfPoint(p, circle) = |p - centre|^2 - r2` and `lineValue(line, p) = a x + b y - c`, both exact.
 * - `lineThrough(p, q)`: the `Line` through two different rational points, else `Degenerate`.
 * - `intersectLineCircle(line, circle)`: `{kind: 'none'} | {kind: 'tangent', point, exact} | {kind: 'two', points}`, decided
 *   by the exact sign of `r2 (a^2 + b^2) - (a cx + b cy - c)^2`. `point(s)` are doubles; a tangent point is also rational, so
 *   it is returned exactly in `exact`. The two points are ordered along the direction `(-b, a)` of the line.
 * - `intersectCircles(c1, c2)`: the same classification, decided by the sign of `4 r1^2 r2^2 - (d^2 - r1^2 - r2^2)^2`
 *   (`d` is the distance of the centres); two points are ordered right then left of the directed line `c1 -> c2`. Concentric
 *   circles give `none`, or `{kind: 'coincident'}` when they are equal (infinitely many common points).
 * - `circumcircle(a, b, c)`: `Degenerate | {kind: 'circle', centre, r2}` of a grid triangle, from the triangle kernel.
 * - `circlePoint(circle, t)`: the glider `centre + r (cos t, sin t)`, a double (the only inexact input, ADR 0030 section 2).
 * - `angleBetween(vertex, p, q)`: unsigned angle at `vertex` in radians in `[0, pi]`, `undefined` when `p` or `q` coincides
 *   with `vertex` (the inscribed angle is not defined when the glider reaches a chord end). A double.
 * - `thalesDot(p, a, b) = (a - p) . (b - p)`, exact; zero exactly when the angle `a p b` is a right angle or `p` is `a` or `b`.
 * - `invertExact(p, centre, r2)`: `centre + r2 (p - centre) / |p - centre|^2`, exact for rational (so grid) input and
 *   `r2 > 0`; throws RangeError for `p = centre` (no image) and for `r2 <= 0`. Drawn images belong to
 *   `src/analysis/complexMobius.ts`.
 */
import {assertGridPoint, type GridPoint} from './grid';
import {Rational, RationalPoint} from './rational';
import {circumcentre, circumradiusSquared, type Degenerate} from './triangle';

export interface Circle {
    readonly centre: RationalPoint;
    /** Squared radius, nonnegative. */
    readonly r2: Rational;
}

/** The line `a x + b y = c`; `(a, b)` is a nonzero normal vector. */
export interface Line {
    readonly kind: 'line';
    readonly a: Rational;
    readonly b: Rational;
    readonly c: Rational;
}

export type GeneralizedCircle = Circle | Line;

/** A double point; the coordinates involve a square root or a trigonometric function. */
export interface InexactXY {
    readonly x: number;
    readonly y: number;
    readonly inexact: true;
}

/** Plain double coordinates, the input of the angle helpers. */
export interface XY {
    readonly x: number;
    readonly y: number;
}

export type LineCircleIntersection =
    | { readonly kind: 'none' }
    | { readonly kind: 'tangent'; readonly point: InexactXY; readonly exact: RationalPoint }
    | { readonly kind: 'two'; readonly points: readonly [InexactXY, InexactXY] };

export type CircleCircleIntersection = LineCircleIntersection | { readonly kind: 'coincident' };

export type CircumcircleResult = Degenerate | ({ readonly kind: 'circle' } & Circle);

const DEGENERATE: Degenerate = Object.freeze({kind: 'degenerate'});
const TWO = Rational.of(2);
const FOUR = Rational.of(4);

export function isCircle(shape: GeneralizedCircle): shape is Circle {
    return 'centre' in shape;
}

export function isLine(shape: GeneralizedCircle): shape is Line {
    return !('centre' in shape);
}

function assertCircle(circle: Circle): void {
    if (circle.r2.sign() < 0) throw new RangeError('the squared radius of a circle must not be negative');
}

function squaredNorm(v: RationalPoint): Rational {
    return v.dot(v);
}

/** Exact power `|p - centre|^2 - r2`: negative inside, zero on the circle, positive outside. */
export function powerOfPoint(p: RationalPoint, circle: Circle): Rational {
    return squaredNorm(p.sub(circle.centre)).sub(circle.r2);
}

/** Exact `a x + b y - c`: zero on the line, otherwise the sign tells the side. */
export function lineValue(line: Line, p: RationalPoint): Rational {
    return line.a.mul(p.x).add(line.b.mul(p.y)).sub(line.c);
}

/** The line through two rational points, `Degenerate` when they coincide. */
export function lineThrough(p: RationalPoint, q: RationalPoint): Line | Degenerate {
    if (p.equals(q)) return DEGENERATE;
    const a = q.y.sub(p.y);
    const b = p.x.sub(q.x);
    return {kind: 'line', a, b, c: a.mul(p.x).add(b.mul(p.y))};
}

function inexact(x: Rational, y: Rational, dx: number, dy: number, side: number): InexactXY {
    return {x: x.toNumber() + side * dx, y: y.toNumber() + side * dy, inexact: true};
}

/** Intersection of a line with a circle; the classification is exact. */
export function intersectLineCircle(line: Line, circle: Circle): LineCircleIntersection {
    assertCircle(circle);
    const n2 = line.a.mul(line.a).add(line.b.mul(line.b));
    if (n2.isZero()) throw new RangeError('a line needs a nonzero normal vector');
    const s = line.a.mul(circle.centre.x).add(line.b.mul(circle.centre.y)).sub(line.c);
    const discriminant = circle.r2.mul(n2).sub(s.mul(s));
    const k = s.div(n2);
    // Foot of the perpendicular from the centre: exact and rational.
    const foot = new RationalPoint(circle.centre.x.sub(k.mul(line.a)), circle.centre.y.sub(k.mul(line.b)));
    const sign = discriminant.sign();
    if (sign < 0) return {kind: 'none'};
    if (sign === 0) return {kind: 'tangent', point: inexact(foot.x, foot.y, 0, 0, 0), exact: foot};
    const half = Math.sqrt(discriminant.toNumber()) / n2.toNumber();
    const dx = -line.b.toNumber() * half;
    const dy = line.a.toNumber() * half;
    return {kind: 'two', points: [inexact(foot.x, foot.y, dx, dy, -1), inexact(foot.x, foot.y, dx, dy, 1)]};
}

/** Intersection of two circles; the classification is exact. */
export function intersectCircles(first: Circle, second: Circle): CircleCircleIntersection {
    assertCircle(first);
    assertCircle(second);
    const e = second.centre.sub(first.centre);
    const d2 = squaredNorm(e);
    if (d2.isZero()) return first.r2.equals(second.r2) ? {kind: 'coincident'} : {kind: 'none'};
    const k = d2.sub(first.r2).sub(second.r2);
    const discriminant = FOUR.mul(first.r2).mul(second.r2).sub(k.mul(k));
    const sign = discriminant.sign();
    if (sign < 0) return {kind: 'none'};
    const along = d2.add(first.r2).sub(second.r2).div(TWO.mul(d2));
    const mid = first.centre.add(e.scale(along));
    if (sign === 0) return {kind: 'tangent', point: inexact(mid.x, mid.y, 0, 0, 0), exact: mid};
    const half = Math.sqrt(discriminant.toNumber()) / (2 * d2.toNumber());
    const dx = -e.y.toNumber() * half;
    const dy = e.x.toNumber() * half;
    return {kind: 'two', points: [inexact(mid.x, mid.y, dx, dy, -1), inexact(mid.x, mid.y, dx, dy, 1)]};
}

/** Circumcircle of a grid triangle (exact centre and squared radius), `Degenerate` for collinear vertices. */
export function circumcircle(a: GridPoint, b: GridPoint, c: GridPoint): CircumcircleResult {
    assertGridPoint(a, 'a');
    assertGridPoint(b, 'b');
    assertGridPoint(c, 'c');
    const centre = circumcentre(a, b, c);
    const r2 = circumradiusSquared(a, b, c);
    if (centre.kind !== 'point' || r2.kind !== 'value') return DEGENERATE;
    return {kind: 'circle', centre: centre.point, r2: r2.value};
}

/** Glider point `centre + r (cos t, sin t)` for the parameter `t` in radians; a double. */
export function circlePoint(circle: Circle, t: number): InexactXY {
    assertCircle(circle);
    if (!Number.isFinite(t)) throw new RangeError('the glider parameter must be finite');
    const r = Math.sqrt(circle.r2.toNumber());
    return {x: circle.centre.x.toNumber() + r * Math.cos(t), y: circle.centre.y.toNumber() + r * Math.sin(t), inexact: true};
}

/**
 * Unsigned angle `p vertex q` in radians in `[0, pi]` (a double): `atan2(|cross|, dot)` of the two arms. `undefined` when an
 * arm has length zero, where the angle does not exist.
 */
export function angleBetween(vertex: XY, p: XY, q: XY): number | undefined {
    const ux = p.x - vertex.x;
    const uy = p.y - vertex.y;
    const vx = q.x - vertex.x;
    const vy = q.y - vertex.y;
    if ((ux === 0 && uy === 0) || (vx === 0 && vy === 0)) return undefined;
    return Math.atan2(Math.abs(ux * vy - uy * vx), ux * vx + uy * vy);
}

/** Exact dot product `(a - p) . (b - p)`: zero iff the angle `a p b` is right, or `p` is `a` or `b`. */
export function thalesDot(p: RationalPoint, a: RationalPoint, b: RationalPoint): Rational {
    return a.sub(p).dot(b.sub(p));
}

/** Exact inversion in the circle of centre `centre` and squared radius `r2 > 0`. Throws RangeError for `p = centre`. */
export function invertExact(p: RationalPoint, centre: RationalPoint, r2: Rational): RationalPoint {
    if (r2.sign() <= 0) throw new RangeError('the squared radius of inversion must be positive');
    const offset = p.sub(centre);
    const d2 = squaredNorm(offset);
    if (d2.isZero()) throw new RangeError('the centre of inversion has no image');
    return centre.add(offset.scale(r2.div(d2)));
}
