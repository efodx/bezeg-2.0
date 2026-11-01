/**
 * Simson kernel: the feet of the perpendiculars from a point to the three side lines of a triangle, their exact collinearity
 * test and the glider-mode (double) pedal area with its named tolerance (spec: triangle-geometry-lessons.md T4;
 * ADR 0030 section 2). Pure TypeScript.
 *
 * Exact mode (grid or rational `P`, grid triangle): `feet` and `pedalOrient` are exact rationals; collinearity of the feet
 * is `pedalOrient = 0`, with no tolerance. Glider mode (`P` from `gliderPoint`, a double): `pedalAreaInexact` is a double, and
 * its status uses `SIMSON_GLIDER_TOLERANCE`. A tolerance is never an equality: the status says "within", not "exactly".
 *
 * Exported API (triangle vertices `a, b, c` are `GridPoint`s, validated like the triangle kernel; a collinear or coincident
 * triple gives the typed `Degenerate`, never `NaN`):
 * - `feet(p, a, b, c)`: `{kind: 'feet', feet: [f_a, f_b, f_c], coincident, distinctCount}`. `f_a` is the foot on the LINE `bc`,
 *   `f_b` on `ca`, `f_c` on `ab` (lines, not segments, so a foot may lie outside its side). `coincident` lists the index pairs
 *   of equal feet (a vertex `p` gives one pair), `distinctCount` is 1, 2 or 3.
 * - `pedalOrient(p, a, b, c)`: `Degenerate | {kind: 'value', value}`, the exact determinant `(f_b - f_a) x (f_c - f_a)`,
 *   i.e. twice the signed area of the foot triangle. Zero exactly when the feet are collinear (or coincide).
 * - `SIMSON_GLIDER_TOLERANCE = 1e-9`: the bound on `|pedal area| / S`, with `S` the triangle's area, below which a glider
 *   reading is called collinear.
 * - `gliderPoint(a, b, c, t, epsilon = 0)`: the double point `{kind: 'point', x, y, inexact: true}` at `O + R (1 + epsilon) (cos t, sin t)` (angle `t` in radians,
 *   relative radial offset `epsilon`), `Degenerate` for a degenerate triangle.
 * - `pedalAreaInexact(p, a, b, c)`: `{kind: 'area', area, relative, collinear, inexact: true}` where `area` is the absolute
 *   area of the foot triangle computed in doubles, `relative = area / S` and `collinear = relative <= SIMSON_GLIDER_TOLERANCE`.
 */
import {assertGridPoint, type GridPoint} from './grid';
import {circumcircle, type XY, type InexactXY} from './circle';
import {orientValue} from './predicates';
import {Rational, RationalPoint} from './rational';
import {countDistinctPoints, type Degenerate, type ExactValue} from './triangle';

/** Relative to the triangle's area: a glider pedal area `<= SIMSON_GLIDER_TOLERANCE * S` reads as collinear. */
export const SIMSON_GLIDER_TOLERANCE = 1e-9;

type Index = 0 | 1 | 2;

export interface Feet {
    readonly kind: 'feet';
    /** Feet on the lines `bc`, `ca`, `ab` (index i is the side opposite vertex i). */
    readonly feet: readonly [RationalPoint, RationalPoint, RationalPoint];
    /** Index pairs `[i, j]`, `i < j`, of equal feet. */
    readonly coincident: readonly (readonly [Index, Index])[];
    readonly distinctCount: number;
}

export type FeetResult = Degenerate | Feet;

export interface PedalArea {
    readonly kind: 'area';
    /** Absolute area of the foot triangle (doubles). */
    readonly area: number;
    /** `area / S`. */
    readonly relative: number;
    /** `relative <= SIMSON_GLIDER_TOLERANCE`: collinear within the tolerance, not exactly. */
    readonly collinear: boolean;
    readonly inexact: true;
}

export type PedalAreaResult = Degenerate | PedalArea;
export interface GliderPoint extends InexactXY {
    readonly kind: 'point';
}

export type GliderPointResult = Degenerate | GliderPoint;

const DEGENERATE: Degenerate = Object.freeze({kind: 'degenerate'});

function checkTriangle(a: GridPoint, b: GridPoint, c: GridPoint): number {
    assertGridPoint(a, 'a');
    assertGridPoint(b, 'b');
    assertGridPoint(c, 'c');
    return orientValue(a, b, c);
}

/** Exact foot of the perpendicular from `p` to the line through the distinct grid points `u` and `v`. */
function footOnLine(p: RationalPoint, u: GridPoint, v: GridPoint): RationalPoint {
    const origin = RationalPoint.fromGrid(u);
    const direction = RationalPoint.fromGrid(v).sub(origin);
    const t = p.sub(origin).dot(direction).div(direction.dot(direction));
    return origin.add(direction.scale(t));
}

export function feet(p: RationalPoint, a: GridPoint, b: GridPoint, c: GridPoint): FeetResult {
    if (checkTriangle(a, b, c) === 0) return DEGENERATE;
    const f: readonly [RationalPoint, RationalPoint, RationalPoint] = [
        footOnLine(p, b, c), footOnLine(p, c, a), footOnLine(p, a, b),
    ];
    const coincident: (readonly [Index, Index])[] = [];
    if (f[0].equals(f[1])) coincident.push([0, 1]);
    if (f[0].equals(f[2])) coincident.push([0, 2]);
    if (f[1].equals(f[2])) coincident.push([1, 2]);
    return {kind: 'feet', feet: f, coincident, distinctCount: countDistinctPoints(f)};
}

export function pedalOrient(p: RationalPoint, a: GridPoint, b: GridPoint, c: GridPoint): ExactValue {
    const result = feet(p, a, b, c);
    if (result.kind !== 'feet') return result;
    const [fa, fb, fc] = result.feet;
    const value: Rational = fb.sub(fa).cross(fc.sub(fa));
    return {kind: 'value', value};
}

export function gliderPoint(a: GridPoint, b: GridPoint, c: GridPoint, t: number, epsilon = 0): GliderPointResult {
    if (!Number.isFinite(t) || !Number.isFinite(epsilon) || epsilon <= -1) {
        throw new RangeError('t must be finite and epsilon finite and greater than -1');
    }
    const circle = circumcircle(a, b, c);
    if (circle.kind !== 'circle') return DEGENERATE;
    const radius = Math.sqrt(circle.r2.toNumber()) * (1 + epsilon);
    return {
        kind: 'point',
        x: circle.centre.x.toNumber() + radius * Math.cos(t),
        y: circle.centre.y.toNumber() + radius * Math.sin(t),
        inexact: true,
    };
}

function footInexact(p: XY, u: GridPoint, v: GridPoint): XY {
    const dx = v.x - u.x;
    const dy = v.y - u.y;
    const t = ((p.x - u.x) * dx + (p.y - u.y) * dy) / (dx * dx + dy * dy);
    return {x: u.x + t * dx, y: u.y + t * dy};
}

export function pedalAreaInexact(p: XY, a: GridPoint, b: GridPoint, c: GridPoint): PedalAreaResult {
    const orientation = checkTriangle(a, b, c);
    if (orientation === 0) return DEGENERATE;
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) throw new RangeError('p must have finite coordinates');
    const fa = footInexact(p, b, c);
    const fb = footInexact(p, c, a);
    const fc = footInexact(p, a, b);
    const area = Math.abs((fb.x - fa.x) * (fc.y - fa.y) - (fb.y - fa.y) * (fc.x - fa.x)) / 2;
    const relative = area / (Math.abs(orientation) / 2);
    return {kind: 'area', area, relative, collinear: relative <= SIMSON_GLIDER_TOLERANCE, inexact: true};
}
