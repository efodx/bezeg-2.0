/**
 * The curve pair's point list and Bezier evaluation (convexity task 25). `model.points` holds net A, then net B, each of
 * degree + 1 points, so the degree is `points.length / 2 - 1` and needs no other state. Pure TypeScript.
 */
import type {GridPoint} from './grid';

export interface CurvePairNets {
    readonly degree: 2 | 3;
    readonly a: readonly GridPoint[];
    readonly b: readonly GridPoint[];
}

/** The two nets of a point list of 6 (degree 2) or 8 (degree 3) points; undefined for any other length. */
export function splitCurvePair(points: readonly GridPoint[]): CurvePairNets | undefined {
    if (points.length !== 6 && points.length !== 8) return undefined;
    const half = points.length / 2;
    return {degree: (half - 1) as 2 | 3, a: points.slice(0, half), b: points.slice(half)};
}

/** The curve point at parameter t by de Casteljau's algorithm, in the net's own units. */
export function bezierAt(net: readonly {readonly x: number; readonly y: number}[], t: number): {x: number; y: number} {
    if (net.length === 0) throw new RangeError('a net needs at least one point');
    let level = net.map(p => ({x: p.x, y: p.y}));
    while (level.length > 1) {
        level = level.slice(1).map((p, i) => ({x: (1 - t) * level[i].x + t * p.x, y: (1 - t) * level[i].y + t * p.y}));
    }
    return level[0];
}
