/**
 * Point insertion into a triangulation and boundary counts (spec triangulation-voronoi-lessons.md B2; task
 * triangulation-voronoi/11). Works on any valid triangulation, also one that was flipped away from the start
 * triangulation. Every decision uses the exact predicates `orient` (ADR 0021). Pure TypeScript.
 */
import {assertGridPoint, type GridPoint} from './grid';
import {DELAUNAY_MAX_POINTS, visibleBoundaryArc} from './delaunay';
import {orient} from './predicates';
import {createTriangulation, type Triangulation} from './triangulation';

export type InsertionCase = 'inside' | 'interior-edge' | 'hull-edge' | 'outside';

export type InsertionRefusal =
    /** `q` equals the point with this index. */
    | { readonly kind: 'duplicate-point'; readonly index: number }
    | { readonly kind: 'too-many-points'; readonly limit: number };

export type InsertionResult =
    | { readonly ok: true; readonly value: Triangulation; readonly change: InsertionCase }
    | { readonly ok: false; readonly refusal: InsertionRefusal };

export interface BoundaryCount {
    /** Points on the hull boundary, collinear ones included (the number of hull edges). */
    readonly k: number;
    /** Strict hull vertices. */
    readonly corners: number;
    /** `k - corners`. */
    readonly collinear: number;
}

/** The hull boundary as point indices, counter-clockwise, collinear boundary points included. */
function boundaryCycle(tri: Triangulation): number[] {
    const next = new Map<number, number>();
    tri.triangles.forEach((v, t) => {
        for (let i = 0; i < 3; i++) if (tri.nbr[t][i] === -1) next.set(v[(i + 1) % 3], v[(i + 2) % 3]);
    });
    const first = next.keys().next();
    if (first.done) throw new Error('internal error: triangulation without a boundary');
    const cycle = [first.value];
    for (let v = next.get(first.value); v !== undefined && v !== first.value; v = next.get(v)) cycle.push(v);
    if (cycle.length !== next.size) throw new Error('internal error: the boundary is not a single cycle');
    return cycle;
}

/** Boundary count of a triangulation: `k` hull-boundary points (collinear included), strict corners, collinear rest. */
export function boundaryCount(tri: Triangulation): BoundaryCount {
    const cycle = boundaryCycle(tri);
    const m = cycle.length;
    let corners = 0;
    for (let i = 0; i < m; i++) {
        const a = tri.points[cycle[(i + m - 1) % m]], b = tri.points[cycle[i]], c = tri.points[cycle[(i + 1) % m]];
        if (orient(a, b, c) !== 0) corners++;
    }
    return {k: m, corners, collinear: m - corners};
}

const same = (p: GridPoint, q: GridPoint): boolean => p.x === q.x && p.y === q.y;

/**
 * Adds the grid point `q` (appended as the last index) to the current triangulation without changing the input.
 * `q` strictly inside a triangle splits it in three (+2 triangles); in the relative interior of an interior edge it
 * splits both neighbours in two (+2); in the relative interior of a hull edge it splits the one triangle in two (+1)
 * and becomes a collinear boundary point; outside the boundary it is joined to every boundary edge it sees strictly
 * (`orient(a, b, q) < 0`, the rule of `incrementalTriangulation`; a collinear edge is not joined). Refuses with
 * `duplicate-point` or `too-many-points` (above 40 points). Throws RangeError for a non-grid `q`.
 */
export function insertPoint(tri: Triangulation, q: GridPoint): InsertionResult {
    assertGridPoint(q, 'q');
    const dup = tri.points.findIndex(p => same(p, q));
    if (dup >= 0) return {ok: false, refusal: {kind: 'duplicate-point', index: dup}};
    if (tri.points.length + 1 > DELAUNAY_MAX_POINTS) {
        return {ok: false, refusal: {kind: 'too-many-points', limit: DELAUNAY_MAX_POINTS}};
    }
    const points = [...tri.points, q];
    const qi = tri.points.length;
    const triangles: (readonly number[])[] = tri.triangles.map(v => [...v]);

    // Locate: a triangle with orient >= 0 on all three edges contains q; the zero count says where.
    let change: InsertionCase = 'outside';
    for (let t = 0; t < tri.triangles.length; t++) {
        const v = tri.triangles[t];
        const o = [0, 1, 2].map(i => orient(points[v[(i + 1) % 3]], points[v[(i + 2) % 3]], q));
        if (o.some(s => s < 0)) continue;
        const zeros = o.filter(s => s === 0).length;
        if (zeros === 0) {
            const [a, b, c] = v;
            triangles[t] = [a, b, qi];
            triangles.push([b, c, qi], [c, a, qi]);
            change = 'inside';
        } else if (zeros === 1) {
            // q lies on the edge opposite corner i. Split t and, when present, its neighbour u across that edge.
            const split = (s: number, corner: number) => {
                const w = tri.triangles[s];
                const [c, a, b] = [w[corner], w[(corner + 1) % 3], w[(corner + 2) % 3]];
                triangles[s] = [c, a, qi];
                triangles.push([c, qi, b]);
            };
            const i = o.indexOf(0);
            split(t, i);
            const u = tri.nbr[t][i];
            if (u >= 0) split(u, tri.nbr[u].indexOf(t));
            change = u >= 0 ? 'interior-edge' : 'hull-edge';
        } else {
            throw new Error('internal error: a point on two triangle edges is a vertex');
        }
        break;
    }
    if (change === 'outside') {
        const cycle = boundaryCycle(tri);
        const m = cycle.length;
        const {start, end} = visibleBoundaryArc(points, cycle, qi);
        for (let i = start; i <= end; i++) triangles.push([cycle[i % m], qi, cycle[(i + 1) % m]]);
    }
    const result = createTriangulation(points, triangles);
    if (!result.ok) throw new Error(`internal error: point insertion produced an invalid triangulation (${result.refusal.kind})`);
    return {ok: true, value: result.value, change};
}
