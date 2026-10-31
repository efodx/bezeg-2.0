/**
 * Exact geometric predicates on integer grid points (ADR 0021, docs/specs/convexity-hulls-lessons.md section 1).
 *
 * Every predicate takes `GridPoint`s (safe integers with |c| <= 2^25) and rejects anything else with a RangeError
 * instead of approximating. Algorithms must call only these predicates for decisions about order, sides or crossings.
 *
 * Exactness bounds:
 * - `orientValue` / `orient` have degree two. Coordinate differences stay within 2^26, each product within 2^52 and
 *   their difference within 2^53, so plain doubles are exact. `onSegment`, `segmentIntersection` and
 *   `polygonSimplicity` only combine signs of `orient` and exact integer comparisons, so they are exact too.
 * - `incircleValue` / `incircle` have degree four. See `INCIRCLE_FAST_LIMIT` below: exact in doubles for |c| <= 2^11,
 *   computed in `BigInt` above that.
 */
import {assertGridPoint, type GridPoint} from './grid';

export type Orientation = -1 | 0 | 1;

/** Outcome of intersecting two closed segments, never coordinates. */
export type SegmentIntersection = 'none' | 'proper' | 'touch' | 'overlap';

export type PolygonSimplicity = { simple: true } | { simple: false; edges: [number, number] };

/**
 * The determinant (b.x-a.x)(c.y-a.y) - (b.y-a.y)(c.x-a.x): twice the signed area of triangle abc, positive for a
 * counter-clockwise turn a -> b -> c. Exact for grid points; returns +0 rather than -0.
 */
export function orientValue(a: GridPoint, b: GridPoint, c: GridPoint): number {
    assertGridPoint(a, 'a');
    assertGridPoint(b, 'b');
    assertGridPoint(c, 'c');
    const value = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    return value === 0 ? 0 : value;
}

/** Sign of `orientValue`: 1 for a counter-clockwise turn, -1 for clockwise, 0 for collinear (or coincident) points. */
export function orient(a: GridPoint, b: GridPoint, c: GridPoint): Orientation {
    const value = orientValue(a, b, c);
    return value > 0 ? 1 : value < 0 ? -1 : 0;
}

/** 2^11: the largest absolute coordinate for which `incircleValue` evaluates in plain doubles (see below). */
export const INCIRCLE_FAST_LIMIT = 2 ** 11;

/**
 * The exact incircle determinant of the rows (a.x-d.x, a.y-d.y, (a.x-d.x)^2+(a.y-d.y)^2) for a, b, c in that order,
 * as a `bigint`: positive when d lies strictly inside the circle through the counter-clockwise triangle abc, zero
 * when the four points are cocircular, negative outside. For a clockwise abc the sign flips. At the grid limit 2^25
 * the value reaches about 2^105, so it cannot be a `number`; readouts convert with `toString()`.
 *
 * Exactness bound (the same role as the 2^25 comment of `orientValue`): the double path runs only when every absolute
 * coordinate of the four points is at most 2^11 and expands along the lift column,
 *   det = la (bx cy - by cx) - lb (ax cy - ay cx) + lc (ax by - ay bx),
 * where (ax, ay) = a - d and la = ax^2 + ay^2, and so on. Differences are at most 2^12, so each product in a 2x2
 * minor is at most 2^24 and each minor at most 2^25; each lift is at most 2*(2^12)^2 = 2^25; every term is at most
 * 2^50 and the three-term sum is below 3*2^50 < 2^52, so every intermediate value is an exact double. Another
 * expansion order needs its own bound. Above the limit the same determinant is evaluated with `BigInt`.
 */
export function incircleValue(a: GridPoint, b: GridPoint, c: GridPoint, d: GridPoint): bigint {
    assertGridPoint(a, 'a');
    assertGridPoint(b, 'b');
    assertGridPoint(c, 'c');
    assertGridPoint(d, 'd');
    const small = [a, b, c, d].every(p => Math.abs(p.x) <= INCIRCLE_FAST_LIMIT && Math.abs(p.y) <= INCIRCLE_FAST_LIMIT);
    if (small) {
        const ax = a.x - d.x, ay = a.y - d.y;
        const bx = b.x - d.x, by = b.y - d.y;
        const cx = c.x - d.x, cy = c.y - d.y;
        const value = (ax * ax + ay * ay) * (bx * cy - by * cx)
            - (bx * bx + by * by) * (ax * cy - ay * cx)
            + (cx * cx + cy * cy) * (ax * by - ay * bx);
        return BigInt(value);
    }
    const dx = BigInt(d.x), dy = BigInt(d.y);
    const ax = BigInt(a.x) - dx, ay = BigInt(a.y) - dy;
    const bx = BigInt(b.x) - dx, by = BigInt(b.y) - dy;
    const cx = BigInt(c.x) - dx, cy = BigInt(c.y) - dy;
    return (ax * ax + ay * ay) * (bx * cy - by * cx)
        - (bx * bx + by * by) * (ax * cy - ay * cx)
        + (cx * cx + cy * cy) * (ax * by - ay * bx);
}

/**
 * Sign of `incircleValue`: 1 when d is strictly inside the circle through the counter-clockwise triangle abc, 0 on
 * the circle, -1 outside. Throws a RangeError when a, b, c are collinear (no circle), as for non-grid input.
 */
export function incircle(a: GridPoint, b: GridPoint, c: GridPoint, d: GridPoint): Orientation {
    if (orient(a, b, c) === 0) throw new RangeError('a, b, c must not be collinear');
    const value = incircleValue(a, b, c, d);
    return value > 0n ? 1 : value < 0n ? -1 : 0;
}

/** True when p lies on the closed segment ab (endpoints included; a = b is the single point a). */
export function onSegment(p: GridPoint, a: GridPoint, b: GridPoint): boolean {
    if (orient(a, b, p) !== 0) return false; // also validates the three points
    return Math.min(a.x, b.x) <= p.x && p.x <= Math.max(a.x, b.x)
        && Math.min(a.y, b.y) <= p.y && p.y <= Math.max(a.y, b.y);
}

function samePoint(a: GridPoint, b: GridPoint): boolean {
    return a.x === b.x && a.y === b.y;
}

/** Lexicographic comparison; on collinear points it is the order along the common line. */
function compareLex(a: GridPoint, b: GridPoint): number {
    return a.x !== b.x ? a.x - b.x : a.y - b.y;
}

/**
 * Classifies the intersection of closed segments ab and cd (either may be a single point):
 * - `'none'`: they share no point;
 * - `'proper'`: they share one point that is interior to both;
 * - `'touch'`: they share exactly one point and it is an endpoint of at least one of them;
 * - `'overlap'`: they are collinear and share a sub-segment of positive length.
 */
export function segmentIntersection(a: GridPoint, b: GridPoint, c: GridPoint, d: GridPoint): SegmentIntersection {
    const o1 = orient(a, b, c);
    const o2 = orient(a, b, d);
    const o3 = orient(c, d, a);
    const o4 = orient(c, d, b);
    if (o1 * o2 < 0 && o3 * o4 < 0) return 'proper';
    if (o1 === 0 && o2 === 0 && o3 === 0 && o4 === 0) {
        // Collinear or degenerate: compare the lexicographic intervals along the shared line.
        const [lo1, hi1] = compareLex(a, b) <= 0 ? [a, b] : [b, a];
        const [lo2, hi2] = compareLex(c, d) <= 0 ? [c, d] : [d, c];
        const lo = compareLex(lo1, lo2) >= 0 ? lo1 : lo2;
        const hi = compareLex(hi1, hi2) <= 0 ? hi1 : hi2;
        const order = compareLex(lo, hi);
        return order > 0 ? 'none' : order === 0 ? 'touch' : 'overlap';
    }
    if (onSegment(c, a, b) || onSegment(d, a, b) || onSegment(a, c, d) || onSegment(b, c, d)) return 'touch';
    return 'none';
}

/**
 * Checks whether a polygon (`closed`) or polyline (open chain) is simple.
 *
 * Edge i joins vertices i and i+1 (a closed polygon has an extra edge from the last vertex to the first). Rules:
 * non-adjacent edges must not meet at all; adjacent edges may share only their common vertex (no overlap, so a
 * path that doubles back along an edge is non-simple); a zero-length edge (repeated consecutive vertices) is
 * non-simple and is reported as `[i, i]`. A closed polygon needs at least 3 vertices: with fewer, the result is
 * `[0, 1]` for two vertices (the two edges coincide) and `[0, 0]` otherwise. Zero-length edges are reported first
 * (lowest index); otherwise the result names the lexicographically first offending pair `[i, j]` with i < j. An open
 * chain with fewer than two vertices is simple.
 */
export function polygonSimplicity(vertices: readonly GridPoint[], closed: boolean): PolygonSimplicity {
    vertices.forEach((v, i) => assertGridPoint(v, `vertices[${i}]`));
    const n = vertices.length;
    if (closed && n < 3) return {simple: false, edges: n === 2 ? [0, 1] : [0, 0]};
    const edgeCount = closed ? n : Math.max(0, n - 1);
    const start = (i: number) => vertices[i];
    const end = (i: number) => vertices[(i + 1) % n];
    for (let i = 0; i < edgeCount; i++) {
        if (samePoint(start(i), end(i))) return {simple: false, edges: [i, i]};
    }
    for (let i = 0; i < edgeCount; i++) {
        for (let j = i + 1; j < edgeCount; j++) {
            const adjacent = j === i + 1 || (closed && i === 0 && j === edgeCount - 1);
            const outcome = segmentIntersection(start(i), end(i), start(j), end(j));
            // Adjacent non-degenerate edges always meet at their common vertex; only an overlap is an offence.
            if (adjacent ? outcome === 'overlap' : outcome !== 'none') return {simple: false, edges: [i, j]};
        }
    }
    return {simple: true};
}
