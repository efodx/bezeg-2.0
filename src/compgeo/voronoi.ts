/**
 * Voronoi diagram as an exact value (spec triangulation-voronoi-lessons.md "Voronoi drawing" and B4; task
 * triangulation-voronoi/05).
 *
 * `VoronoiDiagram` is independent of the Delaunay code so that Fortune's algorithm can later build the same value:
 * vertices are exact rational points that list the sites they are equidistant from, edges lie between two sites and
 * are a segment, a ray or a full line, and a cell lists its edges counter-clockwise. `voronoiFromDelaunay` is one
 * builder; `clipCell` and `nearestSites` read only the value and the sites.
 *
 * Every decision is exact (ADR 0021, ADR 0035): circumcentres are exact rationals, equal centres are merged by exact
 * equality, and clipping compares rationals. Doubles are for drawing only and never appear here. Pure TypeScript: no
 * React, JSXGraph, localization or graph state.
 */
import {isGridPoint, type GridPoint} from './grid';
import {DELAUNAY_MAX_POINTS, delaunayTriangulation} from './delaunay';
import {Rational, RationalPoint} from './rational';
import {circumcentre} from './triangle';
import {edges as triangulationEdges} from './triangulation';

/** An exact integer direction (components are safe integers, reduced by their gcd when built here). */
export interface IntegerVector {
    readonly x: number;
    readonly y: number;
}

/** A Voronoi vertex: distinct exact point and the sites (ascending) at that exact common distance, 3 or more. */
export interface VoronoiVertex {
    readonly point: RationalPoint;
    readonly sites: readonly number[];
}

/**
 * The part of the bisector of `sites = [i, j]` (`i < j`) that bounds both cells.
 * - `segment`: between two vertex indices.
 * - `ray`: from one vertex along `direction`, an integer vector perpendicular to `p_i p_j` pointing away from the
 *   remaining sites (to the right of the counter-clockwise hull edge).
 * - `line`: the full bisector (collinear sites only): `point` on it and `direction` along it.
 */
export type VoronoiEdge =
    | { readonly kind: 'segment'; readonly sites: readonly [number, number]; readonly from: number; readonly to: number }
    | { readonly kind: 'ray'; readonly sites: readonly [number, number]; readonly vertex: number; readonly direction: IntegerVector }
    | { readonly kind: 'line'; readonly sites: readonly [number, number]; readonly point: RationalPoint; readonly direction: IntegerVector };

/** The cell of `site`: indices into `edges` in counter-clockwise order; `bounded` iff every edge is a segment. */
export interface VoronoiCell {
    readonly site: number;
    readonly edges: readonly number[];
    readonly bounded: boolean;
}

export interface VoronoiDiagram {
    readonly vertices: readonly VoronoiVertex[];
    readonly edges: readonly VoronoiEdge[];
    /** `cells[i].site === i`. */
    readonly cells: readonly VoronoiCell[];
}

export type VoronoiRefusal =
    | { readonly kind: 'invalid-point'; readonly index: number }
    | { readonly kind: 'duplicate-point'; readonly indices: readonly [number, number] }
    | { readonly kind: 'too-many-points'; readonly limit: number };

export type VoronoiOutcome =
    | { readonly ok: true; readonly value: VoronoiDiagram }
    | { readonly ok: false; readonly refusal: VoronoiRefusal };

/** Axis-aligned rational box with `minX < maxX` and `minY < maxY`. */
export interface RationalBox {
    readonly minX: Rational;
    readonly minY: Rational;
    readonly maxX: Rational;
    readonly maxY: Rational;
}

/**
 * A cell intersected with a box: a convex polygon, counter-clockwise, no repeated vertex, empty when the cell meets the
 * box in at most a segment. `open[k]` says the polygon side from `polygon[k]` to `polygon[k + 1]` lies on the box
 * boundary because the cell continues beyond it (the "continues" marker); sides that are cell boundaries are closed.
 */
export interface ClippedCell {
    readonly polygon: readonly RationalPoint[];
    readonly open: readonly boolean[];
}

const big = (n: number): bigint => BigInt(n);

function gcd(a: number, b: number): number {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y !== 0) [x, y] = [y, x % y];
    return x;
}

function reduced(x: number, y: number): IntegerVector {
    const g = gcd(x, y);
    // `+ 0` turns -0 into 0.
    return {x: x / g + 0, y: y / g + 0};
}

/** Counter-clockwise angular order of non-zero integer vectors starting at the positive x axis (exact). */
function angleCompare(a: GridPoint, b: GridPoint): number {
    const half = (v: GridPoint): number => (v.y > 0 || (v.y === 0 && v.x > 0) ? 0 : 1);
    if (half(a) !== half(b)) return half(a) - half(b);
    const cross = big(a.x) * big(b.y) - big(a.y) * big(b.x);
    return cross > 0n ? -1 : cross < 0n ? 1 : 0;
}

/**
 * Counter-clockwise order of a cell's edges. Boundary edge `k` has outward normal `p_other - p_site`; for a convex
 * region the normals turn counter-clockwise along the boundary. An unbounded cell starts after the angular gap of at
 * least a half turn (the cell opens there); a bounded cell starts at the smallest normal angle.
 */
function orderCellEdges(site: number, incident: readonly number[], edgeList: readonly VoronoiEdge[], points: readonly GridPoint[]): number[] {
    const normal = (e: number): GridPoint => {
        const [i, j] = edgeList[e].sites;
        const other = i === site ? j : i;
        return {x: points[other].x - points[site].x, y: points[other].y - points[site].y};
    };
    const sorted = [...incident].sort((p, q) => angleCompare(normal(p), normal(q)));
    for (let k = 0; k < sorted.length; k++) {
        const a = normal(sorted[k]);
        const b = normal(sorted[(k + 1) % sorted.length]);
        if (big(a.x) * big(b.y) - big(a.y) * big(b.x) <= 0n) {
            return [...sorted.slice(k + 1), ...sorted.slice(0, k + 1)];
        }
    }
    return sorted;
}

function buildCells(points: readonly GridPoint[], edgeList: readonly VoronoiEdge[]): VoronoiCell[] {
    const incident: number[][] = points.map(() => []);
    edgeList.forEach((e, index) => {
        incident[e.sites[0]].push(index);
        incident[e.sites[1]].push(index);
    });
    return points.map((_, site) => {
        const ordered = orderCellEdges(site, incident[site], edgeList, points);
        const bounded = ordered.length > 0 && ordered.every(e => edgeList[e].kind === 'segment');
        return Object.freeze({site, edges: Object.freeze(ordered), bounded});
    });
}

/** Sites collinear on one line (distinct, n >= 2): consecutive bisectors are parallel lines, with no vertices. */
function collinearDiagram(points: readonly GridPoint[]): VoronoiDiagram {
    const order = points.map((_, i) => i).sort((p, q) => points[p].x - points[q].x || points[p].y - points[q].y);
    const edgeList: VoronoiEdge[] = [];
    for (let k = 0; k + 1 < order.length; k++) {
        const a = points[order[k]];
        const b = points[order[k + 1]];
        const middle = RationalPoint.fromGrid(a).add(RationalPoint.fromGrid(b)).scale(Rational.of(1, 2));
        const sites: readonly [number, number] = [Math.min(order[k], order[k + 1]), Math.max(order[k], order[k + 1])];
        edgeList.push(Object.freeze({
            kind: 'line' as const, sites, point: middle, direction: reduced(-(b.y - a.y), b.x - a.x),
        }));
    }
    return {vertices: [], edges: edgeList, cells: buildCells(points, edgeList)};
}

/**
 * Voronoi diagram of distinct grid points from their Delaunay triangulation. Vertices are the exact circumcentres of
 * the triangles, equal centres (cocircular sites) merged into one vertex whose zero-length shared edges are dropped.
 * Each remaining interior Delaunay edge gives a segment between its two triangles' vertices, each hull edge a ray from
 * its triangle's vertex to the right of the counter-clockwise hull edge. Collinear sites (two or more, no triangle)
 * give n - 1 parallel lines; one site gives one cell without edges; no site gives an empty diagram. Refuses duplicate
 * sites, non-grid points and more than `DELAUNAY_MAX_POINTS` points with a reason value.
 */
export function voronoiFromDelaunay(points: readonly GridPoint[]): VoronoiOutcome {
    const refuse = (refusal: VoronoiRefusal): VoronoiOutcome => ({ok: false, refusal});
    if (!Array.isArray(points)) throw new TypeError('points must be an array');
    if (points.length > DELAUNAY_MAX_POINTS) return refuse({kind: 'too-many-points', limit: DELAUNAY_MAX_POINTS});
    for (let i = 0; i < points.length; i++) if (!isGridPoint(points[i])) return refuse({kind: 'invalid-point', index: i});
    const n = points.length;
    if (n < 3) {
        if (n === 2 && points[0].x === points[1].x && points[0].y === points[1].y) {
            return refuse({kind: 'duplicate-point', indices: [0, 1]});
        }
        return {ok: true, value: n === 2 ? collinearDiagram(points) : {vertices: [], edges: [], cells: buildCells(points, [])}};
    }
    const outcome = delaunayTriangulation(points);
    if (!outcome.ok) {
        const {refusal} = outcome;
        if (refusal.kind === 'duplicate-point') return refuse({kind: 'duplicate-point', indices: refusal.indices});
        if (refusal.kind === 'degenerate-points') return {ok: true, value: collinearDiagram(points)};
        throw new Error(`internal error: unexpected Delaunay refusal ${refusal.kind}`);
    }
    const tri = outcome.value;

    // One vertex per distinct circumcentre; sites are the union of the triangles' corners.
    const vertexSites: Set<number>[] = [];
    const vertexPoints: RationalPoint[] = [];
    const byCentre = new Map<string, number>();
    const vertexOfTriangle: number[] = tri.triangles.map(([a, b, c]) => {
        const centre = circumcentre(points[a], points[b], points[c]);
        if (centre.kind !== 'point') throw new Error('internal error: degenerate Delaunay triangle');
        const key = `${centre.point.x.format()},${centre.point.y.format()}`;
        let index = byCentre.get(key);
        if (index === undefined) {
            index = vertexPoints.length;
            byCentre.set(key, index);
            vertexPoints.push(centre.point);
            vertexSites.push(new Set());
        }
        for (const corner of [a, b, c]) vertexSites[index].add(corner);
        return index;
    });
    const vertices = vertexPoints.map((point, i) =>
        Object.freeze({point, sites: Object.freeze([...vertexSites[i]].sort((p, q) => p - q))}));

    const edgeList: VoronoiEdge[] = [];
    for (const e of triangulationEdges(tri)) {
        const sites: readonly [number, number] = [e.a, e.b];
        if (e.interior) {
            const from = vertexOfTriangle[e.triangles[0]];
            const to = vertexOfTriangle[e.triangles[1]];
            if (from !== to) edgeList.push(Object.freeze({kind: 'segment' as const, sites, from, to}));
        } else {
            // The hull edge as traversed by its triangle has the triangle on its left: outward is to the right.
            const t = e.triangles[0];
            const corners = tri.triangles[t];
            const k = [0, 1, 2].find(c => {
                const u = corners[c];
                const v = corners[(c + 1) % 3];
                return (u === e.a && v === e.b) || (u === e.b && v === e.a);
            });
            if (k === undefined) throw new Error('internal error: hull edge not in its triangle');
            const from = points[corners[k]];
            const to = points[corners[(k + 1) % 3]];
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            edgeList.push(Object.freeze({kind: 'ray' as const, sites, vertex: vertexOfTriangle[t], direction: reduced(dy, -dx)}));
        }
    }
    return {ok: true, value: {vertices, edges: edgeList, cells: buildCells(points, edgeList)}};
}

/** The dual site pairs of a diagram, each ascending: `finite` for segments, `unbounded` for rays and lines. */
export function dualEdges(diagram: VoronoiDiagram): { finite: [number, number][]; unbounded: [number, number][] } {
    const finite: [number, number][] = [];
    const unbounded: [number, number][] = [];
    for (const e of diagram.edges) (e.kind === 'segment' ? finite : unbounded).push([e.sites[0], e.sites[1]]);
    return {finite, unbounded};
}

/** Exact `|x - p_site|^2 - |x - p_other|^2`, which is <= 0 exactly when `x` is at least as near to `site`. */
function bisectorValue(x: RationalPoint, site: GridPoint, other: GridPoint): Rational {
    const toOther = RationalPoint.fromGrid({x: other.x - site.x, y: other.y - site.y});
    const norm = Rational.fromInt(other.x).mul(Rational.fromInt(other.x)).add(Rational.fromInt(other.y).mul(Rational.fromInt(other.y)))
        .sub(Rational.fromInt(site.x).mul(Rational.fromInt(site.x))).sub(Rational.fromInt(site.y).mul(Rational.fromInt(site.y)));
    return Rational.of(2).mul(x.dot(toOther)).sub(norm);
}

interface Corner {
    readonly point: RationalPoint;
    /** Whether the side leaving this corner (towards the next one) is an open box side. */
    readonly open: boolean;
}

/** Keeps the part of the convex polygon where `value <= 0` (exact); cut sides are closed. */
function clipHalfPlane(polygon: readonly Corner[], value: (p: RationalPoint) => Rational): Corner[] {
    const out: Corner[] = [];
    const m = polygon.length;
    for (let k = 0; k < m; k++) {
        const a = polygon[k];
        const b = polygon[(k + 1) % m];
        const ha = value(a.point);
        const hb = value(b.point);
        const aIn = ha.sign() <= 0;
        const bIn = hb.sign() <= 0;
        const along = ha.isZero() && hb.isZero();
        if (aIn && bIn) {
            out.push({point: a.point, open: along ? false : a.open});
        } else if (aIn) {
            // Leaves the half-plane: the side from here (or from the crossing) to the next kept corner is a cut.
            if (ha.isZero()) {
                out.push({point: a.point, open: false});
            } else {
                out.push(a);
                out.push({point: crossing(a.point, b.point, ha, hb), open: false});
            }
        } else if (bIn && !hb.isZero()) {
            out.push({point: crossing(a.point, b.point, ha, hb), open: a.open});
        }
    }
    return out;
}

function crossing(a: RationalPoint, b: RationalPoint, ha: Rational, hb: Rational): RationalPoint {
    return a.add(b.sub(a).scale(ha.div(ha.sub(hb))));
}

/** Drops repeated consecutive corners, keeping the side that leaves the last of a run. */
function dedupe(polygon: readonly Corner[]): Corner[] {
    const result: Corner[] = [];
    for (const corner of polygon) {
        if (result.length > 0 && result[result.length - 1].point.equals(corner.point)) result.pop();
        result.push(corner);
    }
    while (result.length > 1 && result[0].point.equals(result[result.length - 1].point)) result.pop();
    return result;
}

/**
 * The cell of `site` intersected with `box`, exact. The cell is the intersection of the half-planes nearer to `site`
 * than to each site across one of its edges; those are cut from the box in turn. Returns an empty polygon when the
 * result has no area. Throws RangeError for a degenerate box or an out-of-range site.
 */
export function clipCell(diagram: VoronoiDiagram, points: readonly GridPoint[], site: number, box: RationalBox): ClippedCell {
    if (!Number.isInteger(site) || site < 0 || site >= diagram.cells.length || site >= points.length) {
        throw new RangeError('site is not a cell of the diagram');
    }
    if (box.minX.compare(box.maxX) >= 0 || box.minY.compare(box.maxY) >= 0) {
        throw new RangeError('box must have positive width and height');
    }
    let polygon: Corner[] = [
        {point: new RationalPoint(box.minX, box.minY), open: true},
        {point: new RationalPoint(box.maxX, box.minY), open: true},
        {point: new RationalPoint(box.maxX, box.maxY), open: true},
        {point: new RationalPoint(box.minX, box.maxY), open: true},
    ];
    for (const index of diagram.cells[site].edges) {
        const [i, j] = diagram.edges[index].sites;
        const other = i === site ? j : i;
        polygon = dedupe(clipHalfPlane(polygon, p => bisectorValue(p, points[site], points[other])));
        if (polygon.length < 3) return {polygon: [], open: []};
    }
    polygon = dedupe(polygon);
    let area = Rational.ZERO;
    polygon.forEach((corner, k) => {
        area = area.add(corner.point.cross(polygon[(k + 1) % polygon.length].point));
    });
    if (polygon.length < 3 || area.sign() === 0) return {polygon: [], open: []};
    return {polygon: polygon.map(c => c.point), open: polygon.map(c => c.open)};
}

/** Brute-force nearest sites to `q` by exact squared distances: every site at the minimum, ascending. */
export function nearestSites(points: readonly GridPoint[], q: RationalPoint): number[] {
    let best: Rational | undefined;
    let result: number[] = [];
    points.forEach((p, i) => {
        const d = RationalPoint.fromGrid(p).sub(q);
        const squared = d.dot(d);
        const order = best === undefined ? -1 : squared.compare(best);
        if (order < 0) {
            best = squared;
            result = [i];
        } else if (order === 0) {
            result.push(i);
        }
    });
    return result;
}
