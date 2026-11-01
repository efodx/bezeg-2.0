/**
 * Triangle kernel: classification, notable points, radii, Euler line and nine-point circle for a triangle with integer
 * grid vertices (spec: triangle-geometry-lessons.md "Triangle and circle kernel"; ADR 0030 section 1, ADR 0021).
 * Pure TypeScript, no React, JSXGraph or board state. Predicates and centres see grid units only.
 *
 * Input. Every vertex is a `GridPoint` with integer coordinates and |c| <= GRID_COORD_LIMIT (2^25). Anything else
 * (non-integer, NaN, infinite, unsafe, out of range, not an object) throws RangeError from `assertGridPoint`; nothing is
 * approximated. Inside the range every exact result below is exact: arithmetic is BigInt or integer doubles whose
 * intermediate magnitudes stay below 2^53 (classification dots, `orient`).
 *
 * Result conventions (no `NaN` or infinity ever leaves this file):
 * - `Degenerate = {kind: 'degenerate'}` marks a result that does not exist for collinear or coincident vertices
 *   (`orient = 0`). Only `centroid` is defined for a degenerate triangle.
 * - Exact results carry `Rational` / `RationalPoint` values (`point`, `value`). Inexact doubles are labelled by
 *   `inexact: true` on the result object (`incentre`, `inradius`, `circumradius`); never compare them with `===`.
 * - `Position = 'inside' | 'on' | 'outside'` is the exact position of a point relative to the closed triangle, decided by
 *   `orient`-style signs of the point against the three edge lines. `on` means on the boundary (an edge or a vertex).
 *   For a degenerate triangle the only centre, the centroid, is `on` (it lies on the segment spanned by the vertices).
 *
 * Exported API (all take three `GridPoint`s `a, b, c` in any order):
 * - `classifyTriangle(a, b, c)`: `Degenerate | {kind: 'proper', shape: 'acute' | 'right' | 'obtuse'}`, exact by the signs
 *   of the three integer dot products at the vertices.
 * - `centroid(a, b, c)`: `{point, position}`, always defined.
 * - `circumcentre(a, b, c)`: `Degenerate | {kind: 'point', point: RationalPoint, position}`. The common denominator of
 *   both coordinates divides `2 * orientValue(a, b, c)`; this is the Voronoi vertex of the three points. `position` is
 *   `inside` iff the triangle is acute, `on` iff right (midpoint of the hypotenuse), `outside` iff obtuse.
 * - `orthocentre(a, b, c)`: same shape, `A + B + C - 2 O`.
 * - `circumradiusSquared(a, b, c)`: `Degenerate | {kind: 'value', value: Rational}`, exact `R^2`.
 * - `ninePointCircle(a, b, c)`: `Degenerate | {kind: 'circle', centre: RationalPoint, r2: Rational}`, centre `(O + H) / 2`,
 *   `r2 = R^2 / 4` (structurally a `Circle` in the sense of the circle kernel).
 * - `ninePoints(a, b, c)`: the nine named points (side midpoints, altitude feet, midpoints of `AH`, `BH`, `CH`), the
 *   nine-point circle and the exact count of distinct points.
 * - `eulerLine(a, b, c)`: `Degenerate | undefined | {kind: 'line', ...}`; `undefined` when `H = O` (equilateral, which
 *   cannot happen for lattice vertices). `eulerLineFromCentres(g, o, h)` is the same decision on given rational centres.
 * - `incentre`, `inradius` (`S / s`), `circumradius` (`abc / (4S)`): inexact doubles.
 * - `locate(a, b, c, p)`: the exact `Position` of any rational point `p` relative to a proper triangle (RangeError if
 *   degenerate).
 * - `countDistinctPoints(points)`: number of pairwise different rational points.
 */
import {assertGridPoint, type GridPoint} from './grid';
import {orientValue} from './predicates';
import {Rational, RationalPoint} from './rational';

export interface Degenerate {
    readonly kind: 'degenerate';
}

export type TriangleShape = 'acute' | 'right' | 'obtuse';
export type TriangleClassification = Degenerate | { readonly kind: 'proper'; readonly shape: TriangleShape };
export type Position = 'inside' | 'on' | 'outside';

export interface LocatedPoint {
    readonly kind: 'point';
    readonly point: RationalPoint;
    readonly position: Position;
}

/** `centroid` is defined for every triangle, degenerate ones included. */
export interface CentroidResult {
    readonly point: RationalPoint;
    readonly position: Position;
}

export type ExactCentre = Degenerate | LocatedPoint;
export type ExactValue = Degenerate | { readonly kind: 'value'; readonly value: Rational };

/** Squared-radius circle; structurally compatible with the circle kernel's `Circle`. */
export interface TriangleCircle {
    readonly centre: RationalPoint;
    readonly r2: Rational;
}

export type CircleResult = Degenerate | ({ readonly kind: 'circle' } & TriangleCircle);

export interface InexactPoint {
    readonly kind: 'point';
    readonly x: number;
    readonly y: number;
    /** Always true: the coordinates are doubles (side lengths are square roots). */
    readonly inexact: true;
    /** The incentre of a proper triangle is always strictly inside (exact fact, not a floating-point decision). */
    readonly position: 'inside';
}

export type InexactCentre = Degenerate | InexactPoint;
export type InexactScalar = Degenerate | { readonly kind: 'value'; readonly value: number; readonly inexact: true };

export interface EulerLine {
    readonly kind: 'line';
    readonly centroid: RationalPoint;
    readonly circumcentre: RationalPoint;
    readonly orthocentre: RationalPoint;
    /** `H - O`, nonzero: the exact direction of the line. */
    readonly direction: RationalPoint;
}

export interface NinePoints {
    readonly kind: 'points';
    /** Midpoints of `BC`, `CA`, `AB` (index i is the side opposite vertex i). */
    readonly midpoints: readonly [RationalPoint, RationalPoint, RationalPoint];
    /** Feet of the altitudes from `A`, `B`, `C` on the lines `BC`, `CA`, `AB`. */
    readonly feet: readonly [RationalPoint, RationalPoint, RationalPoint];
    /** Midpoints of `AH`, `BH`, `CH`. */
    readonly vertexMidpoints: readonly [RationalPoint, RationalPoint, RationalPoint];
    /** The nine points in the order midpoints, feet, vertexMidpoints. */
    readonly all: readonly RationalPoint[];
    readonly circle: TriangleCircle;
    /** Number of pairwise different points among the nine, decided exactly. */
    readonly distinctCount: number;
}

const DEGENERATE: Degenerate = Object.freeze({kind: 'degenerate'});

function checkVertices(a: GridPoint, b: GridPoint, c: GridPoint): number {
    assertGridPoint(a, 'a');
    assertGridPoint(b, 'b');
    assertGridPoint(c, 'c');
    return orientValue(a, b, c);
}

function big(value: number): bigint {
    return BigInt(value);
}

function sign(value: number): -1 | 0 | 1 {
    return value > 0 ? 1 : value < 0 ? -1 : 0;
}

/** Exact sign of the cross product `(v - u) x (p - u)` for a rational `p` and grid `u`, `v`. */
function sideSign(u: GridPoint, v: GridPoint, p: RationalPoint): -1 | 0 | 1 {
    const edge = RationalPoint.fromGrid(v).sub(RationalPoint.fromGrid(u));
    return edge.cross(p.sub(RationalPoint.fromGrid(u))).sign();
}

/**
 * Exact position of a rational point relative to the closed triangle `abc`, from its `orient` signs against the three
 * edge lines, normalised by the triangle's orientation. `outside` as soon as one sign is wrong, `inside` only if all
 * three are strictly right, otherwise `on` the boundary. Throws RangeError for a degenerate triangle (no interior).
 */
export function locate(a: GridPoint, b: GridPoint, c: GridPoint, p: RationalPoint): Position {
    const orientation = sign(checkVertices(a, b, c));
    if (orientation === 0) throw new RangeError('a degenerate triangle has no inside or outside');
    const signs = [sideSign(a, b, p), sideSign(b, c, p), sideSign(c, a, p)];
    const normalised = signs.map(s => s * orientation);
    if (normalised.some(s => s < 0)) return 'outside';
    return normalised.every(s => s > 0) ? 'inside' : 'on';
}

export function classifyTriangle(a: GridPoint, b: GridPoint, c: GridPoint): TriangleClassification {
    if (checkVertices(a, b, c) === 0) return DEGENERATE;
    // Components of the differences are at most 2^26, so each product is at most 2^52 and each dot at most 2^53: exact.
    const dot = (p: GridPoint, q: GridPoint, r: GridPoint) => (q.x - p.x) * (r.x - p.x) + (q.y - p.y) * (r.y - p.y);
    const dots = [dot(a, b, c), dot(b, c, a), dot(c, a, b)];
    if (dots.some(d => d < 0)) return {kind: 'proper', shape: 'obtuse'};
    if (dots.some(d => d === 0)) return {kind: 'proper', shape: 'right'};
    return {kind: 'proper', shape: 'acute'};
}

export function centroid(a: GridPoint, b: GridPoint, c: GridPoint): CentroidResult {
    checkVertices(a, b, c);
    const sum = RationalPoint.fromGrid(a).add(RationalPoint.fromGrid(b)).add(RationalPoint.fromGrid(c));
    const point = sum.scale(Rational.of(1, 3));
    return {point, position: orientValue(a, b, c) === 0 ? 'on' : locate(a, b, c, point)};
}

/** Circumcentre as a bare point, or `undefined` for a degenerate triangle. */
function circumcentrePoint(a: GridPoint, b: GridPoint, c: GridPoint): RationalPoint | undefined {
    const orientation = checkVertices(a, b, c);
    if (orientation === 0) return undefined;
    // Translate to `a`: with b' = b - a and c' = c - a, the centre is a + (cy' |b'|^2 - by' |c'|^2, bx' |c'|^2 - cx' |b'|^2) / D.
    const bx = big(b.x - a.x);
    const by = big(b.y - a.y);
    const cx = big(c.x - a.x);
    const cy = big(c.y - a.y);
    const denominator = 2n * big(orientation);
    const b2 = bx * bx + by * by;
    const c2 = cx * cx + cy * cy;
    const ux = Rational.fromBigInt(cy * b2 - by * c2, denominator);
    const uy = Rational.fromBigInt(bx * c2 - cx * b2, denominator);
    return new RationalPoint(Rational.fromInt(a.x).add(ux), Rational.fromInt(a.y).add(uy));
}

export function circumcentre(a: GridPoint, b: GridPoint, c: GridPoint): ExactCentre {
    const point = circumcentrePoint(a, b, c);
    return point === undefined ? DEGENERATE : {kind: 'point', point, position: locate(a, b, c, point)};
}

/** Orthocentre as a bare point, or `undefined` for a degenerate triangle. */
function orthocentrePoint(a: GridPoint, b: GridPoint, c: GridPoint): RationalPoint | undefined {
    const o = circumcentrePoint(a, b, c);
    if (o === undefined) return undefined;
    const sum = RationalPoint.fromGrid(a).add(RationalPoint.fromGrid(b)).add(RationalPoint.fromGrid(c));
    return sum.sub(o.scale(Rational.of(2)));
}

export function orthocentre(a: GridPoint, b: GridPoint, c: GridPoint): ExactCentre {
    const point = orthocentrePoint(a, b, c);
    return point === undefined ? DEGENERATE : {kind: 'point', point, position: locate(a, b, c, point)};
}

/** Exact squared circumradius `R^2 = |ab|^2 |bc|^2 |ca|^2 / (4 orient^2)`. */
function circumradiusSquaredValue(a: GridPoint, b: GridPoint, c: GridPoint): Rational | undefined {
    const orientation = checkVertices(a, b, c);
    if (orientation === 0) return undefined;
    const squared = (p: GridPoint, q: GridPoint) => big(q.x - p.x) ** 2n + big(q.y - p.y) ** 2n;
    const o = big(orientation);
    return Rational.fromBigInt(squared(a, b) * squared(b, c) * squared(c, a), 4n * o * o);
}

export function circumradiusSquared(a: GridPoint, b: GridPoint, c: GridPoint): ExactValue {
    const value = circumradiusSquaredValue(a, b, c);
    return value === undefined ? DEGENERATE : {kind: 'value', value};
}

export function ninePointCircle(a: GridPoint, b: GridPoint, c: GridPoint): CircleResult {
    const o = circumcentrePoint(a, b, c);
    const r2 = circumradiusSquaredValue(a, b, c);
    const h = orthocentrePoint(a, b, c);
    if (o === undefined || r2 === undefined || h === undefined) return DEGENERATE;
    return {kind: 'circle', centre: o.add(h).scale(Rational.of(1, 2)), r2: r2.mul(Rational.of(1, 4))};
}

/** Foot of the perpendicular from `p` on the line `uv` (`u != v`). */
function footOnLine(p: GridPoint, u: GridPoint, v: GridPoint): RationalPoint {
    const pu = RationalPoint.fromGrid(p).sub(RationalPoint.fromGrid(u));
    const uv = RationalPoint.fromGrid(v).sub(RationalPoint.fromGrid(u));
    return RationalPoint.fromGrid(u).add(uv.scale(pu.dot(uv).div(uv.dot(uv))));
}

export function countDistinctPoints(points: readonly RationalPoint[]): number {
    const seen = new Set<string>();
    for (const p of points) seen.add(`${p.x.format()};${p.y.format()}`);
    return seen.size;
}

export function ninePoints(a: GridPoint, b: GridPoint, c: GridPoint): Degenerate | NinePoints {
    const circle = ninePointCircle(a, b, c);
    const h = orthocentrePoint(a, b, c);
    if (circle.kind === 'degenerate' || h === undefined) return DEGENERATE;
    const half = Rational.of(1, 2);
    const [pa, pb, pc] = [RationalPoint.fromGrid(a), RationalPoint.fromGrid(b), RationalPoint.fromGrid(c)];
    const midpoints = [pb.add(pc).scale(half), pc.add(pa).scale(half), pa.add(pb).scale(half)] as const;
    const feet = [footOnLine(a, b, c), footOnLine(b, c, a), footOnLine(c, a, b)] as const;
    const vertexMidpoints = [pa.add(h).scale(half), pb.add(h).scale(half), pc.add(h).scale(half)] as const;
    const all = [...midpoints, ...feet, ...vertexMidpoints];
    return {
        kind: 'points', midpoints, feet, vertexMidpoints, all,
        circle: {centre: circle.centre, r2: circle.r2}, distinctCount: countDistinctPoints(all),
    };
}

/**
 * The Euler line of given centres: `undefined` when `H = O` (then also `G = O`, the equilateral case), otherwise the
 * line with exact direction `H - O`. Exposed separately so the `undefined` branch can be tested without a triangle.
 */
export function eulerLineFromCentres(g: RationalPoint, o: RationalPoint, h: RationalPoint): EulerLine | undefined {
    if (h.equals(o)) return undefined;
    return {kind: 'line', centroid: g, circumcentre: o, orthocentre: h, direction: h.sub(o)};
}

export function eulerLine(a: GridPoint, b: GridPoint, c: GridPoint): Degenerate | EulerLine | undefined {
    const o = circumcentrePoint(a, b, c);
    const h = orthocentrePoint(a, b, c);
    if (o === undefined || h === undefined) return DEGENERATE;
    return eulerLineFromCentres(centroid(a, b, c).point, o, h);
}

function sideLengths(a: GridPoint, b: GridPoint, c: GridPoint): { la: number, lb: number, lc: number } {
    // la is |bc|, opposite a. Differences are at most 2^26, so hypot is accurate to a few ulp.
    return {la: Math.hypot(c.x - b.x, c.y - b.y), lb: Math.hypot(a.x - c.x, a.y - c.y), lc: Math.hypot(b.x - a.x, b.y - a.y)};
}

/** Incentre `(aA + bB + cC) / (a + b + c)` in doubles (inexact: side lengths are square roots). */
export function incentre(a: GridPoint, b: GridPoint, c: GridPoint): InexactCentre {
    if (checkVertices(a, b, c) === 0) return DEGENERATE;
    const {la, lb, lc} = sideLengths(a, b, c);
    const perimeter = la + lb + lc;
    return {
        kind: 'point', inexact: true, position: 'inside',
        x: (la * a.x + lb * b.x + lc * c.x) / perimeter,
        y: (la * a.y + lb * b.y + lc * c.y) / perimeter,
    };
}

/** Inradius `S / s = |orient| / (a + b + c)` in doubles (inexact). */
export function inradius(a: GridPoint, b: GridPoint, c: GridPoint): InexactScalar {
    const orientation = checkVertices(a, b, c);
    if (orientation === 0) return DEGENERATE;
    const {la, lb, lc} = sideLengths(a, b, c);
    return {kind: 'value', inexact: true, value: Math.abs(orientation) / (la + lb + lc)};
}

/** Circumradius `abc / (4S) = abc / (2 |orient|)` in doubles (inexact); agrees with `sqrt(R^2)` to about 1e-15 relative. */
export function circumradius(a: GridPoint, b: GridPoint, c: GridPoint): InexactScalar {
    const orientation = checkVertices(a, b, c);
    if (orientation === 0) return DEGENERATE;
    const {la, lb, lc} = sideLengths(a, b, c);
    return {kind: 'value', inexact: true, value: (la * lb * lc) / (2 * Math.abs(orientation))};
}
