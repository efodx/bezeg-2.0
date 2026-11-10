/**
 * Plane section and clipping of a grid solid (ADR 0051 section 2).
 *
 * The plane is `n . x = d` with integer `n` (components -4..4, not all zero) and integer `d` in
 * grid units of 1/4, so `n . v - d` is an exact integer for every grid vertex. Every discrete
 * decision (which edges are cut, point count, plane through a vertex, coplanar face) uses only the
 * sign of that integer: no tolerance appears. Only the cut-point coordinates are doubles, labelled
 * computed. A vertex with sign 0 is one point identified by its index, never by its coordinates.
 */
import {assertGridSolid, realCoords, vertexCount, GRID_UNITS_PER_ONE, type Solid, type Vec3} from "./solid";
import {newellVector} from "./volume";

export const NORMAL_LIMIT = 4;
/** Largest |n . v| for a grid vertex is 3 * 4 * 12, so offsets beyond it never meet the solid. */
export const OFFSET_LIMIT = 3 * NORMAL_LIMIT * 12;

export type CutPoint =
    | {readonly kind: "vertex"; readonly vertex: number; readonly xyz: Vec3}
    | {readonly kind: "edge"; readonly a: number; readonly b: number; readonly xyz: Vec3};

export type Section =
    | {readonly kind: "empty"}
    | {readonly kind: "point"; readonly v: Vec3; readonly points: readonly CutPoint[]}
    | {readonly kind: "segment"; readonly points: readonly CutPoint[]}
    | {
        readonly kind: "polygon";
        /** All cut points: sign-0 vertices first (by index), then edge cuts. Coordinates in real units. */
        readonly points: readonly CutPoint[];
        /** Point indices in boundary order, oriented so the Newell vector points along n. */
        readonly loop: readonly number[];
        /** The unordered cut segments the faces contribute; each point is used by exactly two. */
        readonly segments: ReadonlyArray<readonly [number, number]>;
        /** Number of edges cut with strictly opposite endpoint signs. */
        readonly edgeCuts: number;
        /** Index of a face lying in the plane, when there is one. */
        readonly coplanarFace?: number;
    };

export function assertPlane(n: Vec3, d: number): void {
    if (n.some(c => !Number.isInteger(c) || Math.abs(c) > NORMAL_LIMIT) || n.every(c => c === 0)) {
        throw new RangeError(`Plane normal must be a nonzero integer vector with components in -${NORMAL_LIMIT}..${NORMAL_LIMIT}`);
    }
    if (!Number.isInteger(d) || Math.abs(d) > OFFSET_LIMIT) {
        throw new RangeError(`Plane offset must be an integer in -${OFFSET_LIMIT}..${OFFSET_LIMIT}`);
    }
}

/** Exact integer `n . v - d` per vertex (grid units); only its sign is ever used for decisions. */
export function vertexSides(solid: Solid, n: Vec3, d: number): Int32Array {
    assertGridSolid(solid);
    assertPlane(n, d);
    const v = solid.vertices;
    const s = new Int32Array(vertexCount(solid));
    for (let i = 0; i < s.length; i++) {
        s[i] = n[0] * v[3 * i] + n[1] * v[3 * i + 1] + n[2] * v[3 * i + 2] - d;
    }
    return s;
}

function edgeKey(a: number, b: number, count: number): number {
    return a < b ? a * count + b : b * count + a;
}

function edgeCutXyz(solid: Solid, a: number, b: number, sa: number, sb: number): Vec3 {
    const lo = a < b ? a : b;
    const hi = a < b ? b : a;
    const slo = a < b ? sa : sb;
    const shi = a < b ? sb : sa;
    const t = slo / (slo - shi);
    const v = solid.vertices;
    const k = 1 / GRID_UNITS_PER_ONE;
    const at = (c: number) => (v[3 * lo + c] + t * (v[3 * hi + c] - v[3 * lo + c])) * k;
    return [at(0), at(1), at(2)];
}

/**
 * Section of a convex grid solid by the plane `n . x = d`. The loop is built by chaining the cut
 * segment each face contributes through shared points, never by sorting angles; faces that meet the
 * plane in more than one segment (non-convex faces) are rejected.
 *
 * Contract: the input must be welded (distinct vertex indices have distinct coordinates). Besides
 * convex solids, it also accepts non-convex solids whose faces each meet the plane in at most one
 * segment; the chain then still gives the boundary order of a concave section.
 */
export function sectionConvex(solid: Solid, n: Vec3, d: number): Section {
    const s = vertexSides(solid, n, d);
    const count = s.length;

    // A face lying in the plane has every vertex at sign 0.
    const coplanar = solid.faces.findIndex(f => f.every(i => s[i] === 0));
    if (coplanar >= 0) {
        const face = solid.faces[coplanar];
        const points: CutPoint[] = face.map(i => ({kind: "vertex", vertex: i, xyz: realCoords(solid, i)}));
        const loop = face.map((_, i) => i);
        return {
            kind: "polygon", points, loop, edgeCuts: 0, coplanarFace: coplanar,
            segments: loop.map(i => [i, (i + 1) % loop.length] as const),
        };
    }

    const points: CutPoint[] = [];
    const pointOfVertex = new Map<number, number>();
    for (let i = 0; i < count; i++) {
        if (s[i] === 0) {
            pointOfVertex.set(i, points.length);
            points.push({kind: "vertex", vertex: i, xyz: realCoords(solid, i)});
        }
    }
    const pointOfEdge = new Map<number, number>();
    let edgeCuts = 0;
    for (const f of solid.faces) {
        for (let i = 0; i < f.length; i++) {
            const a = f[i];
            const b = f[(i + 1) % f.length];
            if (s[a] * s[b] < 0) {
                const key = edgeKey(a, b, count);
                if (!pointOfEdge.has(key)) {
                    pointOfEdge.set(key, points.length);
                    points.push({kind: "edge", a: Math.min(a, b), b: Math.max(a, b), xyz: edgeCutXyz(solid, a, b, s[a], s[b])});
                    edgeCuts++;
                }
            }
        }
    }

    if (points.length === 0) {
        return {kind: "empty"};
    }
    if (points.length === 1) {
        return {kind: "point", v: points[0].xyz, points};
    }
    if (points.length === 2) {
        return {kind: "segment", points};
    }

    // Each face contributes the segment between its cut points (at most two).
    const seen = new Set<number>();
    const segments: Array<readonly [number, number]> = [];
    for (const f of solid.faces) {
        const onFace: number[] = [];
        for (let i = 0; i < f.length; i++) {
            const a = f[i];
            const b = f[(i + 1) % f.length];
            if (s[a] === 0) {
                onFace.push(pointOfVertex.get(a)!);
            }
            if (s[a] * s[b] < 0) {
                onFace.push(pointOfEdge.get(edgeKey(a, b, count))!);
            }
        }
        if (onFace.length > 2) {
            throw new Error("A face meets the plane in more than one segment: the solid is not convex");
        }
        if (onFace.length === 2) {
            const [p, q] = onFace[0] < onFace[1] ? onFace : [onFace[1], onFace[0]];
            const key = p * points.length + q;
            if (!seen.has(key)) {
                seen.add(key);
                segments.push([p, q]);
            }
        }
    }

    const loop = chain(points.length, segments);
    const net = newellVector(loop.map(i => points[i].xyz));
    if (net[0] * n[0] + net[1] * n[1] + net[2] * n[2] < 0) {
        loop.reverse();
    }
    return {kind: "polygon", points, loop, segments, edgeCuts};
}

/** Walks the segments through shared points; every point must have exactly two segments. */
function chain(pointCount: number, segments: ReadonlyArray<readonly [number, number]>): number[] {
    const next: number[][] = Array.from({length: pointCount}, () => []);
    for (const [p, q] of segments) {
        next[p].push(q);
        next[q].push(p);
    }
    if (next.some(list => list.length !== 2)) {
        throw new Error("The cut segments do not form a simple closed chain");
    }
    const loop = [0];
    let prev = 0;
    let cur = next[0][0];
    while (cur !== 0) {
        loop.push(cur);
        const [x, y] = next[cur];
        const step = x === prev ? y : x;
        prev = cur;
        cur = step;
        if (loop.length > pointCount) {
            throw new Error("The cut segments do not form a simple closed chain");
        }
    }
    if (loop.length !== pointCount) {
        throw new Error("The cut segments form more than one loop");
    }
    return loop;
}

/**
 * The part of a convex grid solid on one side of the plane, closed again with a cap. Sign-0
 * vertices belong to both sides. A solid wholly on the kept side is returned unchanged (in real
 * units); wholly on the other side, or only touching the plane, gives an empty mesh.
 */
export function clipSolid(solid: Solid, n: Vec3, d: number, keep: "below" | "above"): Solid {
    const s = vertexSides(solid, n, d);
    const count = s.length;
    const sign = keep === "below" ? 1 : -1;
    const kept = (i: number) => s[i] * sign <= 0;
    const hasNeg = s.some(x => x < 0);
    const hasPos = s.some(x => x > 0);
    const real = (i: number) => realCoords(solid, i);

    if (!(hasNeg && hasPos)) {
        const wholly = keep === "below" ? !hasPos : !hasNeg;
        if (!wholly || (!hasNeg && !hasPos)) {
            return {vertices: new Float64Array(0), faces: []};
        }
        const out = new Float64Array(3 * count);
        for (let i = 0; i < count; i++) {
            out.set(real(i), 3 * i);
        }
        return {vertices: out, faces: solid.faces.map(f => [...f])};
    }

    const sec = sectionConvex(solid, n, d);
    if (sec.kind !== "polygon") {
        throw new Error("Expected a polygon section");
    }
    const coords: number[] = [];
    const remap = new Int32Array(count).fill(-1);
    for (let i = 0; i < count; i++) {
        if (kept(i)) {
            remap[i] = coords.length / 3;
            coords.push(...real(i));
        }
    }
    const cutId = new Map<number, number>();
    sec.points.forEach(p => {
        if (p.kind === "edge") {
            cutId.set(edgeKey(p.a, p.b, count), coords.length / 3);
            coords.push(...p.xyz);
        }
    });

    const faces: number[][] = [];
    for (const f of solid.faces) {
        const out: number[] = [];
        for (let i = 0; i < f.length; i++) {
            const a = f[i];
            const b = f[(i + 1) % f.length];
            if (kept(a)) {
                out.push(remap[a]);
            }
            if (s[a] * s[b] < 0) {
                out.push(cutId.get(edgeKey(a, b, count))!);
            }
        }
        if (out.length >= 3) {
            faces.push(out);
        }
    }
    // The loop's Newell vector points along n, which is outward for the kept-below side.
    const cap = sec.loop.map(i => {
        const p = sec.points[i];
        return p.kind === "vertex" ? remap[p.vertex] : cutId.get(edgeKey(p.a, p.b, count))!;
    });
    faces.push(keep === "below" ? cap : cap.reverse());
    return {vertices: Float64Array.from(coords), faces};
}
