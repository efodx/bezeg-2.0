/**
 * Model of the inscribed-angle graph (spec triangle-geometry-lessons T2; ADR 0030 section 2). Pure TypeScript.
 *
 * Three grid vertices A, B, C define the circle (`circumcircle`: exact centre O and r^2); AB is the chord and C is an exact
 * grid point on the circle. The glider P is the only inexact input: its parameter `t` is in DEGREES (polar angle about O),
 * normalised to [0, 360), and its position is a double. Angles are doubles in degrees; only the diameter test
 * (`thalesDot(C, A, B) = 0`) is exact. No NaN or infinity leaves this file: collinear or coincident vertices give
 * `degenerate`, fewer than three give `missing`, and a circle beyond `BOARD_COORDINATE_CAP` has `board: undefined`
 * and no glider.
 *
 * Central angle rule: `angleBetween(O, A, B)` is the unsigned angle in [0, 180]. The central angle that subtends the arc
 * AB not containing C equals 2 * angle ACB. When angle ACB > 90 (C on the minor arc, exact test `thalesDot < 0`) that arc
 * is the major one and the central angle is 360 - angleBetween(O, A, B); otherwise it is angleBetween(O, A, B) itself.
 *
 * Theorems: P on C's arc gives angle APB = angle ACB (Euclid III.21), equal to half the central angle (III.20); P on the
 * other arc gives angle APB = 180 - angle ACB (III.22).
 */
import {GridPoint} from './grid';
import {angleBetween, Circle, circlePoint, circumcircle, thalesDot} from './circle';
import {BOARD_COORDINATE_CAP, BoardXY, toBoard} from './notablePointsModel';
import {orientValue} from './predicates';
import {RationalPoint} from './rational';

export {BOARD_COORDINATE_CAP, toBoard};
export type {BoardXY};

/** P never lies within this many degrees (exclusive) of the polar angle of A or of B about O. */
export const GLIDER_EXCLUSION_DEG = 0.5;
/** Tolerance so that a gap edge, computed from the gap centre, is itself accepted. */
const EDGE_TOLERANCE_DEG = 1e-9;

export type InscribedExampleId = 'default' | 'thales';

export interface InscribedExample {
    readonly id: InscribedExampleId;
    readonly points: readonly [GridPoint, GridPoint, GridPoint];
    /** Integer glider parameter in degrees, on C's arc. */
    readonly t: number;
}

/** Spec T2 examples: the T1 triangle (angle ACB 66.8014, angle AOB 133.6028) and a circle with grid points where AB is a diameter. */
export const INSCRIBED_EXAMPLES: readonly InscribedExample[] = [
    {id: 'default', points: [{x: 0, y: 0}, {x: 7, y: 0}, {x: 2, y: 5}], t: 90},
    {id: 'thales', points: [{x: 0, y: 0}, {x: 8, y: 6}, {x: 1, y: 7}], t: 90},
];

export function isInscribedExampleId(value: unknown): value is InscribedExampleId {
    return INSCRIBED_EXAMPLES.some(example => example.id === value);
}

export function inscribedExample(id: InscribedExampleId): InscribedExample {
    const found = INSCRIBED_EXAMPLES.find(example => example.id === id);
    if (!found) throw new RangeError(`unknown example "${id}"`);
    return found;
}

/** The stored example id if the vertices are still exactly that example's; otherwise undefined. */
export function activeInscribedExampleId(id: InscribedExampleId | undefined, points: readonly GridPoint[]): InscribedExampleId | undefined {
    if (id === undefined) return undefined;
    const example = inscribedExample(id);
    return points.length === 3 && example.points.every((p, i) => p.x === points[i].x && p.y === points[i].y) ? id : undefined;
}

const RAD = Math.PI / 180;

/** Degrees normalised to [0, 360). A non-finite input gives 0 (the callers validate first). */
export function normaliseDegrees(t: number): number {
    if (!Number.isFinite(t)) return 0;
    const r = t % 360;
    const n = r < 0 ? r + 360 : r;
    return n >= 360 ? 0 : n + 0;
}

/** Signed difference `a - b` in degrees mapped to [-180, 180). */
function signedDelta(a: number, b: number): number {
    return normaliseDegrees(a - b + 180) - 180;
}

function polarDegrees(centre: { x: number; y: number }, p: { x: number; y: number }): number {
    return normaliseDegrees(Math.atan2(p.y - centre.y, p.x - centre.x) / RAD);
}

function centreOf(circle: Circle): { x: number; y: number } {
    return {x: circle.centre.x.toNumber(), y: circle.centre.y.toNumber()};
}

function circleOf(points: readonly GridPoint[]): Circle | undefined {
    if (points.length < 3) return undefined;
    const result = circumcircle(points[0], points[1], points[2]);
    return result.kind === 'circle' ? result : undefined;
}

/**
 * Moves a glider parameter out of the exclusion gaps around the polar angles `gapCentres` (degrees) and normalises it.
 * `direction` > 0 or < 0 is the direction of motion: the glider moves to the far edge in that direction (a step across a
 * gap skips it); 0 or undefined moves to the nearer edge of the gap it lands in first. With overlapping gaps that is not
 * always the nearest valid value, but the result is always outside every gap.
 */
export function excludeGliderGaps(gapCentres: readonly number[], t: number, direction?: number): number {
    let value = normaliseDegrees(t);
    let dir = direction === undefined ? 0 : Math.sign(direction);
    for (let pass = 0; pass < 2 * gapCentres.length + 2; pass++) {
        const gap = gapCentres.find(centre => Math.abs(signedDelta(value, centre)) < GLIDER_EXCLUSION_DEG - EDGE_TOLERANCE_DEG);
        if (gap === undefined) return value;
        const delta = signedDelta(value, gap);
        if (dir === 0) dir = delta >= 0 ? 1 : -1;
        value = normaliseDegrees(gap + dir * GLIDER_EXCLUSION_DEG);
    }
    return value;
}

/** Polar angles (degrees, about O) of A and B, or undefined for a degenerate or missing triangle. */
export function gliderGapCentres(points: readonly GridPoint[]): readonly [number, number] | undefined {
    const circle = circleOf(points);
    if (!circle) return undefined;
    const o = centreOf(circle);
    return [polarDegrees(o, points[0]), polarDegrees(o, points[1])];
}

/**
 * Normalises `t` and moves it out of the gaps (see `excludeGliderGaps`). Without a circle only the normalisation applies.
 * A step, drag or typed value passes its direction of motion; a Preset passes none.
 */
export function resolveGliderT(points: readonly GridPoint[], t: number, direction?: number): number {
    const gaps = gliderGapCentres(points);
    return gaps ? excludeGliderGaps(gaps, t, direction) : normaliseDegrees(t);
}

/** The parameter after moving by `deltaDeg` (1 for an arrow key, 10 with Shift, signed), outside the gaps. */
export function stepGliderT(points: readonly GridPoint[], t: number, deltaDeg: number): number {
    return resolveGliderT(points, t + deltaDeg, deltaDeg);
}

/** Parameter (degrees) of a board point about the circle's centre, outside the gaps; for dragging P. */
export function gliderTFromBoard(points: readonly GridPoint[], x: number, y: number, previousT?: number): number | undefined {
    const circle = circleOf(points);
    if (!circle || !Number.isFinite(x) || !Number.isFinite(y)) return undefined;
    const raw = polarDegrees(centreOf(circle), {x, y});
    const direction = previousT === undefined ? 0 : signedDelta(raw, previousT);
    return resolveGliderT(points, raw, direction);
}

export type ArcRelation = 'sameArc' | 'otherArc';

export interface GliderView {
    /** Effective parameter in degrees, in [0, 360), outside the gaps. */
    readonly t: number;
    readonly board: BoardXY;
    /** Inscribed angle APB in degrees (a double). */
    readonly angleApb: number;
    /** Which arc P is on, relative to C (orientation sign of A, B, P against A, B, C). */
    readonly relation: ArcRelation;
    /** The value the theorem predicts: angle ACB (same arc) or 180 - angle ACB (other arc). */
    readonly expectedApb: number;
}

export interface InscribedCircleAnalysis {
    readonly kind: 'circle';
    readonly circle: Circle;
    /** Centre O and radius as board doubles, undefined when beyond the cap (then there is no glider). */
    readonly board: { readonly centre: BoardXY; readonly radius: number } | undefined;
    readonly vertices: readonly [BoardXY, BoardXY, BoardXY];
    /** Inscribed angle ACB in degrees. */
    readonly angleAcb: number;
    /** Central angle subtending the arc AB not containing C, in degrees (2 * angle ACB). */
    readonly centralAngle: number;
    /** Exact: AB is a diameter (thalesDot(C, A, B) = 0). */
    readonly diameter: boolean;
    /** Polar angles (degrees) of A and B about O. */
    readonly gapCentres: readonly [number, number];
    readonly glider: GliderView | undefined;
}

export type InscribedAnalysis = { readonly kind: 'missing'; readonly have: number } | { readonly kind: 'degenerate' } | InscribedCircleAnalysis;

/** Analyses the first three points with the glider at `t` degrees (resolved without a direction). Throws RangeError only for points outside the grid range. */
export function analyseInscribedAngle(points: readonly GridPoint[], t: number): InscribedAnalysis {
    if (points.length < 3) return {kind: 'missing', have: points.length};
    const [a, b, c] = points as readonly [GridPoint, GridPoint, GridPoint];
    const circle = circleOf(points);
    if (!circle) return {kind: 'degenerate'};
    const o = centreOf(circle);
    const acb = angleBetween(c, a, b);
    const aob = angleBetween(o, a, b);
    if (acb === undefined || aob === undefined) return {kind: 'degenerate'};
    const dot = thalesDot(RationalPoint.fromGrid(c), RationalPoint.fromGrid(a), RationalPoint.fromGrid(b));
    const angleAcb = acb / RAD;
    const centralAngle = dot.sign() < 0 ? 360 - aob / RAD : aob / RAD;
    const gapCentres: readonly [number, number] = [polarDegrees(o, a), polarDegrees(o, b)];
    const centre = toBoard(circle.centre);
    const radius = Math.sqrt(circle.r2.toNumber());
    const board = centre && Number.isFinite(radius) && Math.abs(centre.x) + radius <= BOARD_COORDINATE_CAP
    && Math.abs(centre.y) + radius <= BOARD_COORDINATE_CAP ? {centre, radius} : undefined;
    let glider: GliderView | undefined;
    if (board) {
        const resolved = excludeGliderGaps(gapCentres, t);
        const p = circlePoint(circle, resolved * RAD);
        const apb = angleBetween(p, a, b);
        const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
        if (apb !== undefined && cross !== 0 && Number.isFinite(p.x) && Number.isFinite(p.y)) {
            const relation: ArcRelation = Math.sign(cross) === Math.sign(orientValue(a, b, c)) ? 'sameArc' : 'otherArc';
            const angleApb = apb / RAD;
            glider = {
                t: resolved, board: {x: p.x, y: p.y}, angleApb, relation,
                expectedApb: relation === 'sameArc' ? angleAcb : 180 - angleAcb,
            };
        }
    }
    return {
        kind: 'circle', circle, board, vertices: [{x: a.x, y: a.y}, {x: b.x, y: b.y}, {x: c.x, y: c.y}], angleAcb, centralAngle,
        diameter: dot.isZero(), gapCentres, glider,
    };
}
