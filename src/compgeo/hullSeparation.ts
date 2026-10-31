/**
 * Conservative separation test for the convex hulls of two small double point lists (convexity task 11, ADR 0036,
 * spec A6; also used by the Curves stream's Bezier clipping).
 *
 * This is the one named exception to ADR 0021's grid-only rule: its inputs are off-grid doubles (control points of
 * de Casteljau pieces). It therefore never decides an orientation sign and never builds a hull. Instead it tries a
 * complete finite set of candidate axes: the direction q - p and its normal for every pair of distinct points of the
 * union of both lists. Two disjoint compact convex polygons are strictly separated by the line perpendicular to the
 * segment between their closest points, and that segment's direction is a difference of two input points (vertex to
 * vertex) or normal to a hull edge (vertex to edge, parallel edges), so some candidate separates them.
 *
 * Guarantee. With unit axis u, the pair is reported separated only when the projections are apart by more than
 * delta = HULL_SEPARATION_MARGIN * s, where s is the largest absolute coordinate of both lists (at least 1). Hence
 * "separated" is correct for the exact pieces whenever every control point is within delta / 4 of its exact value
 * (a de Casteljau level adds at most about 2^-53 s, so 40 levels stay near 5e-15 s). Touching or nearly touching
 * hulls count as overlapping, so rounding only ever keeps a pair. "Not separated" proves nothing.
 */

/** Relative keep-biased margin: delta = HULL_SEPARATION_MARGIN * max(1, largest absolute coordinate). */
export const HULL_SEPARATION_MARGIN = 1e-12;

export interface HullPoint {
    readonly x: number;
    readonly y: number;
}

export type HullSeparation =
    /** `axis` is a unit vector pointing from A to B with max over A of axis.a + delta < min over B of axis.b. */
    | { readonly separated: true; readonly axis: HullPoint }
    | { readonly separated: false };

const MAX_POINTS = 8;

function assertPoints(points: readonly HullPoint[], name: string): void {
    if (points.length < 1 || points.length > MAX_POINTS) {
        throw new RangeError(`${name} needs 1 to ${MAX_POINTS} points, got ${points.length}`);
    }
    for (const point of points) {
        if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
            throw new RangeError(`${name} contains a non-finite coordinate`);
        }
    }
}

/** Whether, along the unit axis (ux, uy), every projection of B exceeds every projection of A by more than delta. */
function separatesAlong(ux: number, uy: number, a: readonly HullPoint[], b: readonly HullPoint[], delta: number): boolean {
    let maxA = -Infinity;
    for (const p of a) maxA = Math.max(maxA, ux * p.x + uy * p.y);
    let minB = Infinity;
    for (const p of b) minB = Math.min(minB, ux * p.x + uy * p.y);
    return minB - maxA > delta;
}

/**
 * Whether the convex hulls of the point lists `a` and `b` (1 to 8 finite points each) are certified disjoint with the
 * safety margin described above. The candidate order is fixed: pairs in index order of `[...a, ...b]`, the direction
 * before the normal. A returned axis points from A to B.
 */
export function hullsSeparated(a: readonly HullPoint[], b: readonly HullPoint[]): HullSeparation {
    assertPoints(a, 'a');
    assertPoints(b, 'b');
    const all = [...a, ...b];
    let s = 1;
    for (const p of all) s = Math.max(s, Math.abs(p.x), Math.abs(p.y));
    const delta = HULL_SEPARATION_MARGIN * s;

    for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
            const dx = all[j].x - all[i].x;
            const dy = all[j].y - all[i].y;
            const length = Math.hypot(dx, dy);
            if ((dx === 0 && dy === 0) || !Number.isFinite(length)) continue;
            const ux = dx / length;
            const uy = dy / length;
            for (const [cx, cy] of [[ux, uy], [-uy, ux]]) {
                if (separatesAlong(cx, cy, a, b, delta)) return {separated: true, axis: {x: cx, y: cy}};
                if (separatesAlong(-cx, -cy, a, b, delta)) return {separated: true, axis: {x: -cx, y: -cy}};
            }
        }
    }
    return {separated: false};
}
