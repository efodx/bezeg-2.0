/**
 * Model of the notable-points graph (spec triangle-geometry-lessons T1; ADR 0030 section 2). Pure TypeScript: it turns
 * three grid vertices into the numbers and the board geometry the graph shows, using only the triangle kernel
 * (`triangle.ts`); nothing is recomputed here. No NaN or infinity leaves this file: a collinear or coincident triple
 * gives `degenerate` results, a missing vertex gives `missing`, and a board coordinate larger than
 * `BOARD_COORDINATE_CAP` is reported as `board: undefined` (the centre exists exactly but is not drawn).
 *
 * Exact values (centroid, circumcentre, orthocentre, S, R^2) are `Rational`; the incentre and the radii are doubles
 * (`inexact`), as in the kernel. The grid scale is 1: board units equal grid units.
 */
import {GridPoint} from './grid';
import {orientValue} from './predicates';
import {Rational, RationalPoint} from './rational';
import {
    centroid, circumcentre, circumradius, circumradiusSquared, classifyTriangle, incentre, inradius, ninePoints, orthocentre,
    Position, TriangleClassification,
} from './triangle';

export type CentreId = 'centroid' | 'circumcentre' | 'incentre' | 'orthocentre';
export const CENTRE_IDS: readonly CentreId[] = ['centroid', 'circumcentre', 'incentre', 'orthocentre'];

/** Largest board coordinate (and radius) that is drawn; beyond it the object is skipped, never sent to the board. */
export const BOARD_COORDINATE_CAP = 1e9;

export type NotableExampleId = 'default' | 'obtuse' | 'right' | 'degenerate';

export interface NotableExample {
    readonly id: NotableExampleId;
    readonly points: readonly [GridPoint, GridPoint, GridPoint];
}

/** The checked examples of spec T1 (default acute, obtuse, right, collinear). */
export const NOTABLE_EXAMPLES: readonly NotableExample[] = [
    {id: 'default', points: [{x: 0, y: 0}, {x: 7, y: 0}, {x: 2, y: 5}]},
    {id: 'obtuse', points: [{x: 0, y: 0}, {x: 7, y: 0}, {x: 1, y: 1}]},
    {id: 'right', points: [{x: 0, y: 0}, {x: 4, y: 0}, {x: 0, y: 3}]},
    {id: 'degenerate', points: [{x: 0, y: 0}, {x: 1, y: 1}, {x: 3, y: 3}]},
];

export function isNotableExampleId(value: unknown): value is NotableExampleId {
    return NOTABLE_EXAMPLES.some(example => example.id === value);
}

export function notableExample(id: NotableExampleId): NotableExample {
    const found = NOTABLE_EXAMPLES.find(example => example.id === id);
    if (!found) throw new RangeError(`unknown example "${id}"`);
    return found;
}

/** The stored example id if the vertices are still exactly that example's; otherwise undefined (a custom triangle). */
export function activeExampleId(id: NotableExampleId | undefined, points: readonly GridPoint[]): NotableExampleId | undefined {
    if (id === undefined) return undefined;
    const example = notableExample(id);
    return points.length === 3 && example.points.every((p, i) => p.x === points[i].x && p.y === points[i].y) ? id : undefined;
}

export interface BoardXY {
    readonly x: number;
    readonly y: number;
}

export interface ExactCentreView {
    readonly point: RationalPoint;
    readonly position: Position;
    /** Board coordinates, or undefined if a coordinate is non-finite or beyond the cap. */
    readonly board: BoardXY | undefined;
}

export type NotableAnalysis =
    | {readonly kind: 'missing'; readonly have: number}
    | {
        readonly kind: 'triangle';
        readonly vertices: readonly [GridPoint, GridPoint, GridPoint];
        readonly classification: TriangleClassification;
        /** Twice the signed area (exact integer). */
        readonly orient: number;
        readonly centroid: ExactCentreView;
        /** The centres below are undefined exactly when the triangle is degenerate. */
        readonly circumcentre: ExactCentreView | undefined;
        readonly orthocentre: ExactCentreView | undefined;
        /** Double coordinates of the incentre. */
        readonly incentre: BoardXY | undefined;
        /** Area S = |orient| / 2, exact. */
        readonly area: Rational;
        readonly circumradiusSquared: Rational | undefined;
        /** Doubles; undefined when degenerate. */
        readonly circumradius: number | undefined;
        readonly inradius: number | undefined;
        /** Altitude feet from A, B, C as board doubles; undefined when degenerate or beyond the cap. */
        readonly feet: readonly [BoardXY, BoardXY, BoardXY] | undefined;
        /** Midpoints of BC, CA, AB. */
        readonly midpoints: readonly [BoardXY, BoardXY, BoardXY];
    };

/** A coordinate pair as board doubles, or undefined if either is non-finite or beyond the cap. */
export function toBoard(point: RationalPoint): BoardXY | undefined {
    const x = point.x.toNumber();
    const y = point.y.toNumber();
    return Number.isFinite(x) && Number.isFinite(y) && Math.abs(x) <= BOARD_COORDINATE_CAP && Math.abs(y) <= BOARD_COORDINATE_CAP ? {x, y} : undefined;
}

function exactView(point: RationalPoint, position: Position): ExactCentreView {
    return {point, position, board: toBoard(point)};
}

/** Analyses the first three points; fewer give `missing`. Throws RangeError only for points outside the grid range. */
export function analyseNotablePoints(points: readonly GridPoint[]): NotableAnalysis {
    if (points.length < 3) return {kind: 'missing', have: points.length};
    const [a, b, c] = points as readonly [GridPoint, GridPoint, GridPoint];
    const classification = classifyTriangle(a, b, c);
    const g = centroid(a, b, c);
    const mid = (p: GridPoint, q: GridPoint): BoardXY => ({x: (p.x + q.x) / 2, y: (p.y + q.y) / 2});
    const base = {
        kind: 'triangle' as const, vertices: [a, b, c] as const, classification, orient: orientValue(a, b, c),
        centroid: exactView(g.point, g.position), area: Rational.of(Math.abs(orientValue(a, b, c)), 2),
        midpoints: [mid(b, c), mid(c, a), mid(a, b)] as const,
    };
    if (classification.kind === 'degenerate') {
        return {...base, circumcentre: undefined, orthocentre: undefined, incentre: undefined, circumradiusSquared: undefined,
            circumradius: undefined, inradius: undefined, feet: undefined};
    }
    const o = circumcentre(a, b, c);
    const h = orthocentre(a, b, c);
    const i = incentre(a, b, c);
    const r2 = circumradiusSquared(a, b, c);
    const bigR = circumradius(a, b, c);
    const smallR = inradius(a, b, c);
    const nine = ninePoints(a, b, c);
    if (o.kind !== 'point' || h.kind !== 'point' || i.kind !== 'point' || r2.kind !== 'value' || bigR.kind !== 'value'
        || smallR.kind !== 'value' || nine.kind !== 'points') {
        throw new Error('a proper triangle must have all centres');
    }
    const feet = nine.feet.map(foot => toBoard(foot));
    const allFeet = feet.every(foot => foot !== undefined);
    return {
        ...base,
        circumcentre: exactView(o.point, o.position),
        orthocentre: exactView(h.point, h.position),
        incentre: {x: i.x, y: i.y},
        circumradiusSquared: r2.value,
        circumradius: bigR.value,
        inradius: smallR.value,
        feet: allFeet ? [feet[0]!, feet[1]!, feet[2]!] : undefined,
    };
}

/** Whether a board point lies in the box `[left, top, right, bottom]` (JSXGraph order). */
export function inBox(box: readonly number[], p: BoardXY): boolean {
    const [left, top, right, bottom] = box;
    return p.x >= Math.min(left, right) && p.x <= Math.max(left, right) && p.y >= Math.min(top, bottom) && p.y <= Math.max(top, bottom);
}

/** Exact fraction text of a rational point, "(7/2, 3/2)". */
export function formatExactPoint(point: RationalPoint): string {
    return `(${point.x.format()}, ${point.y.format()})`;
}
