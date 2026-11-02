import type {GridPoint} from "../../compgeo/grid";
import {incircleValue, orient} from "../../compgeo/predicates";
import type {VoronoiDiagram} from "../../compgeo/voronoi";

/** Where the fourth site lies against the circle through the first three, taken counter-clockwise. */
export type IncircleSign = "inside" | "on" | "outside";

/** One diagonal of the quadrilateral (0-based site indices, ascending) and whether `incircle <= 0` holds for it. */
export interface Diagonal {
    readonly from: number;
    readonly to: number;
    readonly legal: boolean;
}

/**
 * Everything the four-point readout shows, computed exactly (task 20, spec B5).
 * - `circle`: the first three sites in counter-clockwise order (0-based) and the fourth; undefined when the first three are
 *   collinear (no circle through them).
 * - `determinant`: `incircleValue` of that order as exact `bigint` text; undefined with `circle`.
 * - `diagonals`: both diagonals of the convex quadrilateral, each with its legality; undefined when the four sites are not in
 *   strictly convex position (a site inside the triangle of the others, or three on a line): then no diagonal is a choice.
 * - `degrees`: the degree of every Voronoi vertex, descending (from the exact diagram, not from doubles).
 */
export interface FourPointReadout {
    readonly circle?: {readonly a: number; readonly b: number; readonly c: number; readonly d: number};
    readonly determinant?: string;
    readonly sign?: IncircleSign;
    readonly diagonals?: readonly [Diagonal, Diagonal];
    readonly degrees: readonly number[];
}

/** `incircle <= 0` for the opposite site: the diagonal pq of the quadrilateral p r q s is legal. */
function legal(points: readonly GridPoint[], p: number, q: number, r: number, s: number): boolean {
    const ccw = orient(points[p], points[q], points[r]) > 0;
    const value = ccw
        ? incircleValue(points[p], points[q], points[r], points[s])
        : incircleValue(points[p], points[r], points[q], points[s]);
    return value <= 0n;
}

/** True when segments ab and cd cross at an interior point of both. */
function properlyCross(a: GridPoint, b: GridPoint, c: GridPoint, d: GridPoint): boolean {
    return orient(a, b, c) * orient(a, b, d) < 0 && orient(c, d, a) * orient(c, d, b) < 0;
}

/** The readout of exactly four sites, or undefined for any other count. */
export function fourPointReadout(points: readonly GridPoint[], diagram: VoronoiDiagram | undefined): FourPointReadout | undefined {
    if (points.length !== 4) return undefined;
    const degrees = [...(diagram?.vertices ?? [])].map(vertex => vertex.sites.length).sort((x, y) => y - x);
    const turn = orient(points[0], points[1], points[2]);
    let circle: FourPointReadout["circle"];
    let determinant: bigint | undefined;
    if (turn !== 0) {
        circle = turn > 0 ? {a: 0, b: 1, c: 2, d: 3} : {a: 0, b: 2, c: 1, d: 3};
        determinant = incircleValue(points[circle.a], points[circle.b], points[circle.c], points[circle.d]);
    }
    // The pairing whose two segments cross is the diagonal pair of a strictly convex quadrilateral.
    const pairings: readonly (readonly [number, number, number, number])[] = [[0, 1, 2, 3], [0, 2, 1, 3], [0, 3, 1, 2]];
    const pairing = pairings.find(([a, b, c, d]) => properlyCross(points[a], points[b], points[c], points[d]));
    const diagonals = pairing && [
        {from: pairing[0], to: pairing[1], legal: legal(points, pairing[0], pairing[1], pairing[2], pairing[3])},
        {from: pairing[2], to: pairing[3], legal: legal(points, pairing[2], pairing[3], pairing[0], pairing[1])},
    ] as const;
    return {
        circle, degrees, diagonals,
        determinant: determinant === undefined ? undefined : determinant.toString(),
        sign: determinant === undefined ? undefined : determinant > 0n ? "inside" : determinant < 0n ? "outside" : "on",
    };
}
