/**
 * Point in polygon on the integer grid (spec A3, ADR 0021): ray casting, the winding number, and the even-odd and
 * nonzero rules for closed, possibly self-intersecting polygons. Pure TypeScript, independent of React, JSXGraph and
 * localization. Every decision is an `orient`/`onSegment` sign or an integer comparison on grid points; the only
 * computed intersection is the crossing's x, returned as an exact `Rational` for drawing and never used to decide.
 *
 * Half-open rule (quotable): the ray from q towards +x treats a vertex exactly on it as lying just below the ray, so an
 * edge counts when exactly one endpoint is strictly above q's horizontal line, and a horizontal edge on the ray never
 * counts.
 *
 * The polygon is closed (the last vertex joins the first). Degenerate input is not an error: no vertices give no edges
 * (outside, winding 0); one vertex is a single point (boundary only at itself); two vertices are one edge traversed
 * twice (boundary on the segment, winding 0 elsewhere); a polygon of zero doubled area with no boundary hit is
 * classified like any other (it can still have nonzero winding numbers, e.g. a figure eight with equal opposite
 * lobes). Points that are not grid points make `orient` throw a RangeError, as for every predicate.
 */
import type {GridPoint} from './grid';
import {orient, onSegment} from './predicates';
import {Rational} from './rational';

export type FillRule = 'inside' | 'outside';

/** An edge the +x ray crosses: `direction` +1 for an upward edge (q left of it), -1 for a downward edge (q right). */
export interface RayCrossing {
    /** Index i of the edge vertices[i] -> vertices[(i + 1) % n]. */
    readonly edge: number;
    readonly direction: 1 | -1;
    /** Exact x of the crossing, for drawing only. */
    readonly x: Rational;
}

/** An edge with an endpoint on the ray (to the right of q) that the half-open rule does not count. */
export interface RayTouch {
    readonly edge: number;
    /** The endpoints of the edge that lie on the ray's horizontal line, to the right of q (one, or two for a horizontal edge). */
    readonly points: readonly GridPoint[];
}

export interface RayCrossings {
    /** Counted edges in edge order. */
    readonly crossings: readonly RayCrossing[];
    /** Edges touching the ray at a vertex without counting, in edge order. */
    readonly touching: readonly RayTouch[];
}

export type PointClassification =
    | { readonly location: 'boundary' }
    | {
    readonly location: 'off-boundary';
    /** Number of counted edges (the ray-casting count). */
    readonly crossings: number;
    /** Sum of the crossings' directions; its parity always equals the parity of `crossings`. */
    readonly winding: number;
    readonly evenOdd: FillRule;
    readonly nonzero: FillRule;
};

/**
 * The edges the ray from q towards +x crosses under the half-open rule, and those it touches without counting.
 * Edge ab counts when exactly one of a.y > q.y and b.y > q.y holds and the crossing lies to the right of q, decided
 * by the sign of `orient(a, b, q)`: positive (q left of an upward edge) or negative (q right of a downward edge).
 * It does not test for the boundary: with q on an edge `orient` is 0 there and the edge is skipped.
 */
export function rayCrossings(q: GridPoint, vertices: readonly GridPoint[]): RayCrossings {
    const n = vertices.length;
    const crossings: RayCrossing[] = [];
    const touching: RayTouch[] = [];
    for (let i = 0; i < n; i++) {
        const a = vertices[i];
        const b = vertices[(i + 1) % n];
        const aAbove = a.y > q.y;
        const bAbove = b.y > q.y;
        if (aAbove !== bAbove) {
            const side = orient(a, b, q);
            const direction = bAbove ? 1 : -1; // upward when b is the endpoint above the ray
            if (side === direction) crossings.push({edge: i, direction, x: crossingX(q, a, b)});
        } else {
            const points = [a, b].filter((v) => v.y === q.y && v.x > q.x);
            if (points.length > 0) touching.push({edge: i, points});
        }
    }
    return {crossings, touching};
}

/** x of edge ab at height q.y, exact: a.x + (q.y - a.y)(b.x - a.x)/(b.y - a.y), in bigint so no product overflows. */
function crossingX(q: GridPoint, a: GridPoint, b: GridPoint): Rational {
    const dy = BigInt(b.y - a.y);
    const numerator = BigInt(a.x) * dy + BigInt(q.y - a.y) * BigInt(b.x - a.x);
    return Rational.fromBigInt(numerator, dy);
}

/**
 * Locates q against the closed polygon. On an edge or at a vertex: `boundary`. Otherwise the ray-casting count
 * `crossings`, the `winding` number, and both fill rules: even-odd is inside for an odd `crossings`, nonzero is inside
 * for a nonzero `winding`. They agree on simple polygons and differ on self-intersecting ones (the pentagram's centre).
 */
export function classifyPoint(q: GridPoint, vertices: readonly GridPoint[]): PointClassification {
    const n = vertices.length;
    for (let i = 0; i < n; i++) {
        if (onSegment(q, vertices[i], vertices[(i + 1) % n])) return {location: 'boundary'};
    }
    const {crossings} = rayCrossings(q, vertices);
    const winding = crossings.reduce((sum, c) => sum + c.direction, 0);
    return {
        location: 'off-boundary',
        crossings: crossings.length,
        winding,
        evenOdd: crossings.length % 2 === 1 ? 'inside' : 'outside',
        nonzero: winding !== 0 ? 'inside' : 'outside',
    };
}

/** The notched pentagon of spec A2/A3 (doubled area 36, B = 16, I = 11), counter-clockwise. */
export const NOTCHED_PENTAGON: readonly GridPoint[] = [
    {x: 0, y: 0}, {x: 6, y: 0}, {x: 6, y: 4}, {x: 3, y: 2}, {x: 0, y: 4},
];

/**
 * A lattice approximation of the regular {5/2} pentagram, not the exact figure (its vertices are irrational on any
 * grid). Scale 16: the unit-circle vertices at 90 + 72k degrees, multiplied by 16 and rounded to the nearest integer,
 * visited in star order (every second vertex), counter-clockwise, so the centre has winding number 2. The central
 * pentagon has inradius about 0.31 * 16 = 4.9 grid units, so (0,0) lies about 4.8 units from every edge; the winding
 * numbers (2 at the centre, 1 in each tip) are verified by exact computation in the tests.
 */
export const PENTAGRAM_VERTICES: readonly GridPoint[] = [
    {x: 0, y: 16}, {x: -9, y: -13}, {x: 15, y: 5}, {x: -15, y: 5}, {x: 9, y: -13},
];
