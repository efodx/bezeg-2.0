/**
 * Line kernel for the analytic-lines lessons (docs/specs/analytic-lines-lessons.md, ADR 0046 section 2-3).
 *
 * Free of React, JSXGraph, localization and graph state. A `Line` is `a x + b y = c` (from `circle.ts`).
 * - `normalizeLine(line)`: integer coefficients, gcd 1, first nonzero of (a, b) positive; equal lines give equal triples.
 * - `explicitForm(line)`: `{k, n}` or `{vertical: true, x0}`; `interceptForm(line)`: `{m, n}` or `undefined`.
 * - `parallel`, `perpendicular`, `sameLine`: exact tests on the coefficients, no tolerance, no slopes.
 * - `project`, `footOfPerpendicular`, `distanceSquared`: exact `Rational`; `distance` is a computed double.
 * - `angleBetweenDirections`, `angleBetweenLines`: exact dot and cross, acute angle `atan2(|cross|, |dot|)` as a double.
 * - `intersectLines`: `point` (Cramer's rule, exact), `parallel` or `same`.
 */
import {type Line} from './circle';
import {Rational, RationalPoint} from './rational';

export type ExplicitForm =
    | { readonly vertical: false; readonly k: Rational; readonly n: Rational }
    | { readonly vertical: true; readonly x0: Rational };

/** Axis intercepts: the line meets the x axis at `(m, 0)` and the y axis at `(0, n)`. */
export interface InterceptForm {
    readonly m: Rational;
    readonly n: Rational;
}

export interface DirectionAngle {
    /** Exact dot product of the directions. */
    readonly dot: Rational;
    /** Exact cross product of the directions (signed). */
    readonly cross: Rational;
    /** Acute angle in radians in [0, pi/2], `atan2(|cross|, |dot|)`. */
    readonly radians: number;
}

export type LinesIntersection =
    | { readonly kind: 'point'; readonly point: RationalPoint }
    | { readonly kind: 'parallel' }
    | { readonly kind: 'same' };

function bigGcd(x: bigint, y: bigint): bigint {
    let a = x < 0n ? -x : x;
    let b = y < 0n ? -y : y;
    while (b !== 0n) [a, b] = [b, a % b];
    return a;
}

function assertLine(line: Line): void {
    if (line.a.isZero() && line.b.isZero()) throw new RangeError('a line needs a nonzero normal vector');
}

/** Scales to coprime integer coefficients with the first nonzero of (a, b) positive. */
export function normalizeLine(line: Line): Line {
    assertLine(line);
    const dens = [line.a.den, line.b.den, line.c.den];
    const lcm = dens.reduce((acc, d) => (acc / bigGcd(acc, d)) * d, 1n);
    let a = line.a.num * (lcm / line.a.den);
    let b = line.b.num * (lcm / line.b.den);
    let c = line.c.num * (lcm / line.c.den);
    const g = bigGcd(bigGcd(a, b), c);
    a /= g;
    b /= g;
    c /= g;
    if (a < 0n || (a === 0n && b < 0n)) {
        a = -a;
        b = -b;
        c = -c;
    }
    return {kind: 'line', a: Rational.fromBigInt(a), b: Rational.fromBigInt(b), c: Rational.fromBigInt(c)};
}

/** `y = k x + n`, or the vertical line `x = x0` when `b = 0`. Never divides by zero. */
export function explicitForm(line: Line): ExplicitForm {
    assertLine(line);
    if (line.b.isZero()) return {vertical: true, x0: line.c.div(line.a)};
    return {vertical: false, k: line.a.div(line.b).neg(), n: line.c.div(line.b)};
}

/** `x/m + y/n = 1`; `undefined` when an intercept is missing or both are 0 (through the origin). */
export function interceptForm(line: Line): InterceptForm | undefined {
    assertLine(line);
    if (line.a.isZero() || line.b.isZero() || line.c.isZero()) return undefined;
    return {m: line.c.div(line.a), n: line.c.div(line.b)};
}

function det(l1: Line, l2: Line): Rational {
    return l1.a.mul(l2.b).sub(l2.a.mul(l1.b));
}

/** Exact `a1 b2 - a2 b1 = 0`. A line is parallel to itself. */
export function parallel(l1: Line, l2: Line): boolean {
    return det(l1, l2).isZero();
}

/** Exact `a1 a2 + b1 b2 = 0`. */
export function perpendicular(l1: Line, l2: Line): boolean {
    return l1.a.mul(l2.a).add(l1.b.mul(l2.b)).isZero();
}

/** Exact: the triples are proportional. */
export function sameLine(l1: Line, l2: Line): boolean {
    return det(l1, l2).isZero()
        && l1.a.mul(l2.c).sub(l2.a.mul(l1.c)).isZero()
        && l1.c.mul(l2.b).sub(l2.c.mul(l1.b)).isZero();
}

/** Exact projection `(v.w / w.w) w` of `v` on `onto`. */
export function project(v: RationalPoint, onto: RationalPoint): RationalPoint {
    const ww = onto.dot(onto);
    if (ww.isZero()) throw new RangeError('cannot project onto the zero vector');
    return onto.scale(v.dot(onto).div(ww));
}

/** Exact `a px + b py - c` and `a^2 + b^2` of a line. */
function valueAndNorm2(line: Line, p: RationalPoint): { value: Rational; n2: Rational } {
    assertLine(line);
    const value = line.a.mul(p.x).add(line.b.mul(p.y)).sub(line.c);
    return {value, n2: line.a.mul(line.a).add(line.b.mul(line.b))};
}

/** Exact foot `p - (a px + b py - c) / (a^2 + b^2) (a, b)`. */
export function footOfPerpendicular(line: Line, p: RationalPoint): RationalPoint {
    const {value, n2} = valueAndNorm2(line, p);
    const t = value.div(n2);
    return new RationalPoint(p.x.sub(t.mul(line.a)), p.y.sub(t.mul(line.b)));
}

/** Exact squared distance `(a px + b py - c)^2 / (a^2 + b^2)`. */
export function distanceSquared(line: Line, p: RationalPoint): Rational {
    const {value, n2} = valueAndNorm2(line, p);
    return value.mul(value).div(n2);
}

/** Computed double; decide "on the line" with `distanceSquared(...).isZero()`, never with this. */
export function distance(line: Line, p: RationalPoint): number {
    return Math.sqrt(distanceSquared(line, p).toNumber());
}

/** Acute angle between two direction vectors; dot and cross are exact. */
export function angleBetweenDirections(u: RationalPoint, v: RationalPoint): DirectionAngle {
    if (u.dot(u).isZero() || v.dot(v).isZero()) throw new RangeError('a direction must be nonzero');
    const dot = u.dot(v);
    const cross = u.cross(v);
    const abs = (r: Rational) => (r.sign() < 0 ? r.neg() : r).toNumber();
    return {dot, cross, radians: Math.atan2(abs(cross), abs(dot))};
}

/** Direction vector `(-b, a)` of a line. */
export function lineDirection(line: Line): RationalPoint {
    return new RationalPoint(line.b.neg(), line.a);
}

/** Acute angle between two lines through their directions. */
export function angleBetweenLines(l1: Line, l2: Line): DirectionAngle {
    assertLine(l1);
    assertLine(l2);
    return angleBetweenDirections(lineDirection(l1), lineDirection(l2));
}

/** Cramer's rule: exact point, or `parallel` (distinct) or `same`. */
export function intersectLines(l1: Line, l2: Line): LinesIntersection {
    assertLine(l1);
    assertLine(l2);
    const d = det(l1, l2);
    if (d.isZero()) return {kind: sameLine(l1, l2) ? 'same' : 'parallel'};
    const x = l1.c.mul(l2.b).sub(l2.c.mul(l1.b)).div(d);
    const y = l1.a.mul(l2.c).sub(l2.a.mul(l1.c)).div(d);
    return {kind: 'point', point: new RationalPoint(x, y)};
}
