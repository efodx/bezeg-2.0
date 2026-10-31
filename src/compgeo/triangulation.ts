/**
 * Triangulation of a point set as an immutable value (spec triangulation-voronoi-lessons.md "Triangulation structure",
 * option A; task triangulation-voronoi/03).
 *
 * The value is a point list, a triangle list `[v0, v1, v2]` of point indices that are strictly counter-clockwise, and
 * for every triangle `nbr[i]`, the triangle across the edge opposite vertex `i` (the edge `v(i+1) -> v(i+2)`), or `-1`
 * when that edge lies on the hull boundary. Values are frozen; `flip` returns a new value.
 *
 * Every decision uses the exact predicates `orient`, `onSegment` and `incircle` (ADR 0021). No React, no rendering.
 *
 * Counts (Euler): a triangulation that uses all n points as vertices has 2n - 2 - k triangles and 3n - 3 - k edges,
 * with k the number of points on the hull *boundary*, collinear ones included (the number of hull edges).
 */
import {isGridPoint, type GridPoint} from './grid';
import {doubledSignedArea} from './polygonMeasures';
import {incircle, onSegment, orient} from './predicates';

export type TriangleIndices = readonly [number, number, number];

export interface Triangulation {
    readonly points: readonly GridPoint[];
    /** Counter-clockwise vertex indices of every triangle. */
    readonly triangles: readonly TriangleIndices[];
    /** `nbr[t][i]` is the triangle across the edge of `t` opposite its vertex `i`, or -1 on the hull. */
    readonly nbr: readonly TriangleIndices[];
}

/** An undirected edge `a < b`; `triangles` lists the one (hull) or two (interior) triangles that contain it. */
export interface TriangulationEdge {
    readonly a: number;
    readonly b: number;
    readonly interior: boolean;
    readonly triangles: readonly number[];
}

/** The first failed validity check of `createTriangulation`, in the order the checks run. */
export type TriangulationRefusal =
    | { readonly kind: 'invalid-point'; readonly index: number }
    | { readonly kind: 'duplicate-point'; readonly indices: readonly [number, number] }
    /** Fewer than three points, or all points collinear: no triangle exists. */
    | { readonly kind: 'degenerate-points' }
    | { readonly kind: 'malformed-triangle'; readonly triangle: number }
    | { readonly kind: 'index-out-of-range'; readonly triangle: number; readonly corner: number }
    | { readonly kind: 'not-counter-clockwise'; readonly triangle: number }
    /** An undirected edge belongs to a third triangle. */
    | { readonly kind: 'edge-overused'; readonly edge: readonly [number, number] }
    /** Two triangles traverse the same directed edge: they lie on the same side of it, so they overlap. */
    | { readonly kind: 'edge-same-direction'; readonly edge: readonly [number, number] }
    | { readonly kind: 'missing-point'; readonly point: number }
    | { readonly kind: 'wrong-triangle-count'; readonly expected: number; readonly actual: number }
    /** A directed edge without an opposite twin that is not a (split) hull boundary edge. */
    | { readonly kind: 'hull-edge-unexpected'; readonly edge: readonly [number, number] }
    /** A (split) hull boundary edge that the triangles do not use as a hull edge. */
    | { readonly kind: 'hull-edge-missing'; readonly edge: readonly [number, number] }
    | { readonly kind: 'area-mismatch'; readonly expected: bigint; readonly actual: bigint };

export type TriangulationResult =
    | { readonly ok: true; readonly value: Triangulation }
    | { readonly ok: false; readonly refusal: TriangulationRefusal };

export type FlipRefusal =
    | { readonly kind: 'no-such-edge'; readonly edge: readonly [number, number] }
    | { readonly kind: 'hull-edge'; readonly edge: readonly [number, number] }
    | { readonly kind: 'not-convex'; readonly edge: readonly [number, number] };

export type FlipResult =
    | { readonly ok: true; readonly value: Triangulation }
    | { readonly ok: false; readonly refusal: FlipRefusal };

export interface TriangulationCounts {
    readonly points: number;
    readonly triangles: number;
    readonly edges: number;
    readonly interiorEdges: number;
    readonly hullEdges: number;
}

const refuse = (refusal: TriangulationRefusal): TriangulationResult => ({ok: false, refusal});

const triple = (a: number, b: number, c: number): TriangleIndices => Object.freeze([a, b, c] as const);

/** Strict convex hull (collinear points dropped), counter-clockwise, as indices into `points` (distinct points). */
function strictHull(points: readonly GridPoint[]): number[] {
    const order = points.map((_, i) => i).sort((i, j) => points[i].x - points[j].x || points[i].y - points[j].y);
    const build = (ordered: readonly number[]): number[] => {
        const chain: number[] = [];
        for (const p of ordered) {
            while (chain.length >= 2
                && orient(points[chain[chain.length - 2]], points[chain[chain.length - 1]], points[p]) <= 0) {
                chain.pop();
            }
            chain.push(p);
        }
        chain.pop();
        return chain;
    };
    return [...build(order), ...build([...order].reverse())];
}

/**
 * The directed hull-boundary segments, counter-clockwise, with every point lying on a strict hull edge as a split
 * point: for a hull edge u -> v the consecutive pairs of the points on the closed segment uv ordered from u to v.
 */
function boundarySegments(points: readonly GridPoint[], hull: readonly number[]): [number, number][] {
    const segments: [number, number][] = [];
    hull.forEach((u, i) => {
        const v = hull[(i + 1) % hull.length];
        const along = points.map((_, p) => p).filter(p => onSegment(points[p], points[u], points[v]));
        const lex = (p: number, q: number): number => points[p].x - points[q].x || points[p].y - points[q].y;
        const ascending = lex(u, v) < 0; // collinear points: lexicographic order is the order along the line
        along.sort((p, q) => (ascending ? lex(p, q) : lex(q, p)));
        for (let j = 0; j + 1 < along.length; j++) segments.push([along[j], along[j + 1]]);
    });
    return segments;
}

/**
 * Validates `triangles` as a triangulation of `points` and returns it with computed neighbours, or the first failed
 * check, in this order: points (grid points, distinct, not all collinear); triangle indices in range; every triangle
 * strictly counter-clockwise; every undirected edge used by at most two triangles, with opposite directions; every
 * point used as a vertex; triangle count 2n - 2 - k (k = boundary count, collinear boundary points included); the
 * edges without a twin are exactly the convex hull boundary split at every collinear boundary point; and the sum of
 * the triangles' doubled areas equals the hull's doubled area. Later preset imports use this as their validator.
 */
export function createTriangulation(
    points: readonly GridPoint[],
    triangles: readonly (readonly number[])[],
): TriangulationResult {
    const n = points.length;
    for (let i = 0; i < n; i++) if (!isGridPoint(points[i])) return refuse({kind: 'invalid-point', index: i});
    const seen = new Map<string, number>();
    for (let i = 0; i < n; i++) {
        const key = `${points[i].x},${points[i].y}`;
        const earlier = seen.get(key);
        if (earlier !== undefined) return refuse({kind: 'duplicate-point', indices: [earlier, i]});
        seen.set(key, i);
    }
    const hull = n < 3 ? [] : strictHull(points);
    if (hull.length < 3) return refuse({kind: 'degenerate-points'});

    for (let t = 0; t < triangles.length; t++) {
        const tri = triangles[t];
        if (!Array.isArray(tri) || tri.length !== 3) return refuse({kind: 'malformed-triangle', triangle: t});
        for (let c = 0; c < 3; c++) {
            if (!Number.isInteger(tri[c]) || tri[c] < 0 || tri[c] >= n) {
                return refuse({kind: 'index-out-of-range', triangle: t, corner: c});
            }
        }
    }
    for (let t = 0; t < triangles.length; t++) {
        const [a, b, c] = triangles[t];
        if (orient(points[a], points[b], points[c]) <= 0) return refuse({kind: 'not-counter-clockwise', triangle: t});
    }

    // Directed edge -> (triangle, opposite corner). Each undirected edge: at most two uses, opposite directions.
    const directed = new Map<number, { triangle: number; corner: number }>();
    const uses = new Map<number, number>();
    for (let t = 0; t < triangles.length; t++) {
        for (let i = 0; i < 3; i++) {
            const from = triangles[t][(i + 1) % 3];
            const to = triangles[t][(i + 2) % 3];
            const undirected = Math.min(from, to) * n + Math.max(from, to);
            const edge: readonly [number, number] = [Math.min(from, to), Math.max(from, to)];
            if ((uses.get(undirected) ?? 0) >= 2) return refuse({kind: 'edge-overused', edge});
            if (directed.has(from * n + to)) return refuse({kind: 'edge-same-direction', edge});
            uses.set(undirected, (uses.get(undirected) ?? 0) + 1);
            directed.set(from * n + to, {triangle: t, corner: i});
        }
    }

    const used = new Array<boolean>(n).fill(false);
    for (const tri of triangles) for (const v of tri) used[v] = true;
    const missing = used.indexOf(false);
    if (missing >= 0) return refuse({kind: 'missing-point', point: missing});

    const segments = boundarySegments(points, hull);
    const expected = 2 * n - 2 - segments.length;
    if (triangles.length !== expected) {
        return refuse({kind: 'wrong-triangle-count', expected, actual: triangles.length});
    }

    // Edges without a twin must be exactly the split hull boundary (all with the interior on the left).
    const boundary = new Set(segments.map(([u, v]) => u * n + v));
    const unmatched: [number, number][] = [];
    directed.forEach((_, key) => {
        const from = Math.floor(key / n);
        const to = key % n;
        if (!directed.has(to * n + from)) unmatched.push([from, to]);
    });
    unmatched.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    for (const [from, to] of unmatched) {
        if (!boundary.has(from * n + to)) return refuse({kind: 'hull-edge-unexpected', edge: [from, to]});
    }
    const sortedSegments = [...segments].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    for (const [from, to] of sortedSegments) {
        if (directed.has(from * n + to) && !directed.has(to * n + from)) continue;
        return refuse({kind: 'hull-edge-missing', edge: [from, to]});
    }

    let area = 0n;
    for (const [a, b, c] of triangles) area += doubledSignedArea([points[a], points[b], points[c]]);
    const hullArea = doubledSignedArea(hull.map(i => points[i]));
    if (area !== hullArea) return refuse({kind: 'area-mismatch', expected: hullArea, actual: area});

    const nbr = triangles.map(tri => {
        const across = (i: number): number => {
            const twin = directed.get(tri[(i + 2) % 3] * n + tri[(i + 1) % 3]);
            return twin === undefined ? -1 : twin.triangle;
        };
        return triple(across(0), across(1), across(2));
    });
    return {
        ok: true,
        value: Object.freeze({
            points: Object.freeze(points.map(p => Object.freeze({x: p.x, y: p.y}))),
            triangles: Object.freeze(triangles.map(([a, b, c]) => triple(a, b, c))),
            nbr: Object.freeze(nbr),
        }),
    };
}

/** Each undirected edge once (`a < b`), flagged interior or hull, in lexicographic order of `(a, b)`. */
export function edges(tri: Triangulation): TriangulationEdge[] {
    const result: TriangulationEdge[] = [];
    tri.triangles.forEach((vertices, t) => {
        for (let i = 0; i < 3; i++) {
            const other = tri.nbr[t][i];
            if (other >= 0 && other < t) continue; // reported from the smaller triangle
            const u = vertices[(i + 1) % 3];
            const v = vertices[(i + 2) % 3];
            result.push({
                a: Math.min(u, v),
                b: Math.max(u, v),
                interior: other >= 0,
                triangles: Object.freeze(other >= 0 ? [t, other] : [t]),
            });
        }
    });
    return result.sort((p, q) => p.a - q.a || p.b - q.b);
}

/** The hull-boundary edges (collinear boundary points split them), in lexicographic order of `(a, b)`. */
export function hullEdges(tri: Triangulation): TriangulationEdge[] {
    return edges(tri).filter(e => !e.interior);
}

/** The triangle across the edge of `triangle` opposite its vertex `corner` (0..2), or -1 on the hull. */
export function neighbourAcross(tri: Triangulation, triangle: number, corner: number): number {
    if (!Number.isInteger(triangle) || triangle < 0 || triangle >= tri.triangles.length) {
        throw new RangeError('triangle index out of range');
    }
    if (corner !== 0 && corner !== 1 && corner !== 2) throw new RangeError('corner must be 0, 1 or 2');
    return tri.nbr[triangle][corner];
}

export function triangulationCounts(tri: Triangulation): TriangulationCounts {
    const all = edges(tri);
    const interiorEdges = all.filter(e => e.interior).length;
    return {
        points: tri.points.length,
        triangles: tri.triangles.length,
        edges: all.length,
        interiorEdges,
        hullEdges: all.length - interiorEdges,
    };
}

/** The apex of triangle `t` over its directed edge `a -> b`, or undefined when `t` does not traverse a -> b. */
function apexOver(tri: Triangulation, t: number, a: number, b: number): number | undefined {
    const v = tri.triangles[t];
    for (let i = 0; i < 3; i++) if (v[(i + 1) % 3] === a && v[(i + 2) % 3] === b) return v[i];
    return undefined;
}

/**
 * Flips the interior edge `{a, b}`: the two triangles (a, b, c) and (b, a, d) become (a, d, c) and (d, b, c). Succeeds
 * only when both new triangles are strictly counter-clockwise, i.e. a, d, b, c is a strictly convex quadrilateral (a
 * corner with a straight angle does not count). Refuses with `no-such-edge`, `hull-edge` or `not-convex`; the input is
 * never changed and a degenerate triangle is never produced. The two triangle slots are reused for the new triangles
 * and only the three neighbour entries that name them are rewritten.
 */
export function flip(tri: Triangulation, edge: readonly [number, number]): FlipResult {
    const [x, y] = edge;
    const fail = (kind: FlipRefusal['kind']): FlipResult => ({ok: false, refusal: {kind, edge: [x, y]}});
    let t = -1;
    let a = x;
    let b = y;
    let c = -1;
    for (let s = 0; s < tri.triangles.length && t < 0; s++) {
        for (const [from, to] of [[x, y], [y, x]]) {
            const apex = apexOver(tri, s, from, to);
            if (apex !== undefined) {
                t = s;
                a = from;
                b = to;
                c = apex;
            }
        }
    }
    if (t < 0) return fail('no-such-edge');
    const u = tri.nbr[t][tri.triangles[t].indexOf(c)];
    if (u < 0) return fail('hull-edge');
    const d = apexOver(tri, u, b, a);
    if (d === undefined) throw new Error('corrupt triangulation: neighbour does not share the edge');
    const pts = tri.points;
    if (orient(pts[a], pts[d], pts[c]) <= 0 || orient(pts[d], pts[b], pts[c]) <= 0) return fail('not-convex');

    const across = (s: number, vertex: number): number => tri.nbr[s][tri.triangles[s].indexOf(vertex)];
    const nBC = across(t, a); // across b-c, was t
    const nCA = across(t, b); // across c-a, stays t
    const nAD = across(u, b); // across a-d, was u
    const nDB = across(u, a); // across d-b, stays u

    const triangles = tri.triangles.map(v => v);
    const nbr = tri.nbr.map(v => v);
    triangles[t] = triple(a, d, c);
    nbr[t] = triple(u, nCA, nAD); // opposite a, d, c
    triangles[u] = triple(d, b, c);
    nbr[u] = triple(nBC, t, nDB); // opposite d, b, c
    const redirect = (m: number, p: number, q: number, from: number, to: number): void => {
        if (m < 0) return;
        const corner = tri.triangles[m].findIndex(v => v !== p && v !== q);
        const current = nbr[m];
        if (current[corner] !== from) throw new Error('corrupt triangulation: neighbour entry mismatch');
        nbr[m] = triple(corner === 0 ? to : current[0], corner === 1 ? to : current[1], corner === 2 ? to : current[2]);
    };
    redirect(nBC, b, c, t, u);
    redirect(nAD, a, d, u, t);
    return {
        ok: true,
        value: Object.freeze({points: tri.points, triangles: Object.freeze(triangles), nbr: Object.freeze(nbr)}),
    };
}

/**
 * Interior edges whose opposite vertex lies strictly inside the circle through the triangle on the other side
 * (`incircle > 0`), in lexicographic order of `(a, b)`. Equal-circle cases (`incircle = 0`) are not illegal.
 */
export function illegalEdges(tri: Triangulation): TriangulationEdge[] {
    return edges(tri).filter(e => {
        if (!e.interior) return false;
        const [first, second] = e.triangles;
        let a = e.a;
        let b = e.b;
        let c = apexOver(tri, first, a, b);
        let d: number | undefined;
        if (c === undefined) {
            [a, b] = [b, a];
            c = apexOver(tri, first, a, b);
        }
        if (c !== undefined) d = apexOver(tri, second, b, a);
        if (c === undefined || d === undefined) throw new Error('corrupt triangulation: edge directions disagree');
        return incircle(tri.points[a], tri.points[b], tri.points[c], tri.points[d]) > 0;
    });
}
