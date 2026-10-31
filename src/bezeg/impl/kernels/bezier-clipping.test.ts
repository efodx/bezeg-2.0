import {describe, expect, it} from "vitest";
import {stateAt} from "../../../compgeo/trace";
import {orient} from "../../../compgeo/predicates";
import {
    INITIAL_CLIP_STATE,
    bandClipInterval,
    bezierFatLine,
    clipBezierPair,
    clipFold,
    clipScale,
    distanceControlPoints,
    mergeClipResults,
    subNet,
    type ClipPoint,
    type ClipRange,
    type ClipRun,
    type DistancePoint,
} from "./bezier-clipping";

type P = [number, number];

// ---- test-only references (share no code with the kernel) ----

function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function bezierAt(net: readonly ClipPoint[], t: number): P {
    let rows: P[] = net.map(p => [p[0], p[1]]);
    while (rows.length > 1) {
        rows = rows.slice(1).map((q, i) => [(1 - t) * rows[i][0] + t * q[0], (1 - t) * rows[i][1] + t * q[1]] as P);
    }
    return rows[0];
}

const BINOMIAL = [[1], [1, 1], [1, 2, 1], [1, 3, 3, 1]];

/** Power-basis coefficients c_k (ascending) of one coordinate of a Bézier net: c_k = C(n,k) sum_j (-1)^(k-j) C(k,j) P_j. */
function powerCoefficients(values: readonly number[]): number[] {
    const n = values.length - 1;
    return values.map((_, k) => {
        let sum = 0;
        for (let j = 0; j <= k; j++) sum += (-1) ** (k - j) * BINOMIAL[k][j] * values[j];
        return BINOMIAL[n][k] * sum;
    });
}

function evalPoly(c: readonly number[], s: number): number {
    return c.reduceRight((acc, v) => acc * s + v, 0);
}

function derivPoly(c: readonly number[], s: number): number {
    return c.slice(1).reduceRight((acc, v, k) => acc * s + (k + 1) * v, 0);
}

function determinant(m: number[][]): number {
    const a = m.map(r => [...r]);
    const n = a.length;
    let det = 1;
    for (let c = 0; c < n; c++) {
        let piv = c;
        for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[piv][c])) piv = r;
        if (a[piv][c] === 0) return 0;
        if (piv !== c) {
            [a[piv], a[c]] = [a[c], a[piv]];
            det = -det;
        }
        det *= a[c][c];
        for (let r = c + 1; r < n; r++) {
            const f = a[r][c] / a[c][c];
            for (let k = c; k < n; k++) a[r][k] -= f * a[c][k];
        }
    }
    return det;
}

/** Sylvester determinant of two polynomials of degree m (ascending coefficients), size 2m. */
function sylvester(f: readonly number[], g: readonly number[]): number {
    const m = f.length - 1;
    const rows: number[][] = [];
    for (const poly of [f, g]) {
        for (let i = 0; i < m; i++) {
            const row = new Array<number>(2 * m).fill(0);
            for (let k = 0; k <= m; k++) row[i + k] = poly[m - k];
            rows.push(row);
        }
    }
    return determinant(rows);
}

interface RefRoot {
    t: number;
    s: number;
    exact: boolean;
}

/** Resultant reference: roots (t, s) of A(t) = B(s) with t, s in [0, 1]; tangential (double) roots give no sign change. */
function resultantRoots(a: readonly ClipPoint[], b: readonly ClipPoint[]): RefRoot[] {
    const bx = powerCoefficients(b.map(p => p[0]));
    const by = powerCoefficients(b.map(p => p[1]));
    let m = b.length - 1;
    while (m > 0 && bx[m] === 0 && by[m] === 0) m--;
    if (m === 0) return [];
    const resultant = (t: number) => {
        const [x, y] = bezierAt(a, t);
        const f = bx.slice(0, m + 1).map((c, k) => (k === 0 ? x - c : -c));
        const g = by.slice(0, m + 1).map((c, k) => (k === 0 ? y - c : -c));
        return sylvester(f, g);
    };
    const steps = 2000;
    const roots: RefRoot[] = [];
    let prevT = 0;
    let prev = resultant(0);
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const value = resultant(t);
        if (prev === 0 || (prev < 0) !== (value < 0)) {
            let lo = prevT;
            let hi = t;
            let flo = prev;
            for (let k = 0; k < 60; k++) {
                const mid = (lo + hi) / 2;
                const fm = resultant(mid);
                if ((flo < 0) === (fm < 0) && flo !== 0) {
                    lo = mid;
                    flo = fm;
                } else hi = mid;
            }
            const root = (lo + hi) / 2;
            const s = recoverParameter(b, bezierAt(a, root));
            if (s !== null && !roots.some(r => Math.abs(r.t - root) < 1e-5 && Math.abs(r.s - s) < 1e-5)) roots.push({t: root, s, exact: true});
        }
        prevT = t;
        prev = value;
    }
    return roots;
}

/** Solves for s in [0, 1] with B(s) = point: dense scan for the closest sample, then golden-section refinement. */
function recoverParameter(b: readonly ClipPoint[], point: P): number | null {
    const dist = (s: number) => {
        const q = bezierAt(b, s);
        return Math.hypot(q[0] - point[0], q[1] - point[1]);
    };
    let best = 0;
    for (let i = 1; i <= 2000; i++) if (dist(i / 2000) < dist(best / 2000)) best = i;
    let lo = Math.max(0, (best - 1) / 2000);
    let hi = Math.min(1, (best + 1) / 2000);
    for (let k = 0; k < 80; k++) {
        const m1 = lo + (hi - lo) / 3;
        const m2 = hi - (hi - lo) / 3;
        if (dist(m1) < dist(m2)) hi = m2; else lo = m1;
    }
    const s = (lo + hi) / 2;
    return dist(s) < 1e-5 ? s : null;
}

/** Dense polyline reference: segment crossings of two 2000-sample polylines, refined by Newton when it converges. */
function polylineRoots(a: readonly ClipPoint[], b: readonly ClipPoint[], samples = 2000): RefRoot[] {
    const pa = Array.from({length: samples + 1}, (_, i) => bezierAt(a, i / samples));
    const pb = Array.from({length: samples + 1}, (_, i) => bezierAt(b, i / samples));
    const ax = powerCoefficients(a.map(p => p[0]));
    const ay = powerCoefficients(a.map(p => p[1]));
    const bx = powerCoefficients(b.map(p => p[0]));
    const by = powerCoefficients(b.map(p => p[1]));
    const roots: RefRoot[] = [];
    const cross = (o: P, p: P, q: P) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
    // Uniform grid over the B polyline so each A segment only meets nearby B segments.
    const all = [...pa, ...pb];
    const x0 = Math.min(...all.map(p => p[0]));
    const y0 = Math.min(...all.map(p => p[1]));
    const size = Math.max(Math.max(...all.map(p => p[0])) - x0, Math.max(...all.map(p => p[1])) - y0, 1e-9);
    const cells = 64;
    const cell = (v: number, o: number) => Math.min(cells - 1, Math.max(0, Math.floor((v - o) / size * cells)));
    const grid = new Map<number, number[]>();
    for (let j = 0; j < samples; j++) {
        const [q0, q1] = [pb[j], pb[j + 1]];
        for (let cx = cell(Math.min(q0[0], q1[0]), x0); cx <= cell(Math.max(q0[0], q1[0]), x0); cx++) {
            for (let cy = cell(Math.min(q0[1], q1[1]), y0); cy <= cell(Math.max(q0[1], q1[1]), y0); cy++) {
                const list = grid.get(cx * cells + cy) ?? [];
                list.push(j);
                grid.set(cx * cells + cy, list);
            }
        }
    }
    for (let i = 0; i < samples; i++) {
        const [p0, p1] = [pa[i], pa[i + 1]];
        const candidates = new Set<number>();
        for (let cx = cell(Math.min(p0[0], p1[0]), x0); cx <= cell(Math.max(p0[0], p1[0]), x0); cx++) {
            for (let cy = cell(Math.min(p0[1], p1[1]), y0); cy <= cell(Math.max(p0[1], p1[1]), y0); cy++) {
                for (const j of grid.get(cx * cells + cy) ?? []) candidates.add(j);
            }
        }
        for (const j of [...candidates].sort((u, v) => u - v)) {
            const [q0, q1] = [pb[j], pb[j + 1]];
            const d1 = cross(p0, p1, q0);
            const d2 = cross(p0, p1, q1);
            const d3 = cross(q0, q1, p0);
            const d4 = cross(q0, q1, p1);
            if (!((d1 <= 0 && d2 >= 0) || (d1 >= 0 && d2 <= 0))) continue;
            if (!((d3 <= 0 && d4 >= 0) || (d3 >= 0 && d4 <= 0))) continue;
            let t = (i + 0.5) / samples;
            let s = (j + 0.5) / samples;
            let exact = false;
            for (let k = 0; k < 30; k++) {
                const fx = evalPoly(ax, t) - evalPoly(bx, s);
                const fy = evalPoly(ay, t) - evalPoly(by, s);
                const j11 = derivPoly(ax, t);
                const j12 = -derivPoly(bx, s);
                const j21 = derivPoly(ay, t);
                const j22 = -derivPoly(by, s);
                const det = j11 * j22 - j12 * j21;
                if (Math.abs(det) < 1e-9) break;
                t -= (j22 * fx - j12 * fy) / det;
                s -= (-j21 * fx + j11 * fy) / det;
                if (Math.hypot(fx, fy) < 1e-13) {
                    exact = t > -1e-9 && t < 1 + 1e-9 && s > -1e-9 && s < 1 + 1e-9;
                    break;
                }
            }
            roots.push(exact ? {t, s, exact} : {t: (i + 0.5) / samples, s: (j + 0.5) / samples, exact: false});
        }
    }
    return roots;
}

const inside = (r: ClipRange, v: number, slack: number) => v >= r[0] - slack && v <= r[1] + slack;

/** Every reference root lies in a returned result or unresolved range pair (up to `slack`), else the run must be `limit`. */
function expectCovered(run: ClipRun, roots: RefRoot[], tolerance: number, label: string): void {
    if (run.status === "limit") return;
    for (const root of roots) {
        const slack = root.exact ? 5 * tolerance : 2.5e-3;
        const hit = [...run.results, ...run.unresolved].some(r => inside(r.aRange, root.t, slack) && inside(r.bRange, root.s, slack));
        expect(hit, `${label}: root (${root.t}, ${root.s}) lost, status ${run.status}`).toBe(true);
    }
}

function randomNet(rand: () => number, degree: number): P[] {
    return Array.from({length: degree + 1}, () => [Math.floor(rand() * 17) - 8, Math.floor(rand() * 17) - 8] as P);
}

const A: P[] = [[0, 0], [2, 4], [4, 0]];
const B_CROSS: P[] = [[0, 3], [2, -1], [4, 3]];
const B_TANGENT: P[] = [[0, 4], [2, 0], [4, 4]];
const B_OFFSET: P[] = [[0, 4.5], [2, 0.5], [4, 4.5]];

describe("bezier clipping: D2 oracle pairs", () => {
    it("crossing pair finds t = 0.25 and 0.75 on both curves as two merged results", () => {
        for (const tolerance of [1e-3, 1e-6]) {
            const run = clipBezierPair(A, B_CROSS, {tolerance});
            expect(run.status).toBe("found");
            expect(run.unresolved).toEqual([]);
            expect(run.results).toHaveLength(2);
            const sorted = [...run.results].sort((p, q) => p.aRange[0] - q.aRange[0]);
            for (const [r, t] of [[sorted[0], 0.25], [sorted[1], 0.75]] as const) {
                expect(inside(r.aRange, t, tolerance)).toBe(true);
                expect(inside(r.bRange, t, tolerance)).toBe(true);
                expect(r.aRange[1] - r.aRange[0]).toBeLessThanOrEqual(2 * tolerance);
            }
        }
    });

    it("records the crossing and tangent clip counts of the fixed rule", () => {
        expect(clipBezierPair(A, B_CROSS, {tolerance: 1e-3}).clipCount).toBe(17);
        const crossing = clipBezierPair(A, B_CROSS, {tolerance: 1e-6});
        expect(crossing.clipCount).toBe(21);
        expect(clipBezierPair(A, B_TANGENT, {tolerance: 1e-3}).clipCount).toBe(53);
        const tangent = clipBezierPair(A, B_TANGENT, {tolerance: 1e-6});
        expect(tangent.clipCount).toBe(113);
        // Acceptance 5: at least three times the crossing clips at 1e-6 (here about 5.4 times).
        expect(tangent.clipCount).toBeGreaterThanOrEqual(3 * crossing.clipCount);
    });

    it("tangent pair reports t = 1/2 in one merged result", () => {
        for (const tolerance of [1e-3, 1e-6]) {
            const run = clipBezierPair(A, B_TANGENT, {tolerance});
            expect(run.status).toBe("found");
            expect(run.results).toHaveLength(1);
            expect(inside(run.results[0].aRange, 0.5, tolerance)).toBe(true);
            expect(inside(run.results[0].bRange, 0.5, tolerance)).toBe(true);
        }
    });

    it("offset pair has overlapping hulls (exact oracle) yet clipping returns empty", () => {
        // Scale by 2 onto the integer grid: the offset curve's middle control point (2, 0.5) -> (4, 1) lies inside the
        // triangle (0,0), (8,0), (4,8) of A, so the control hulls overlap.
        const grid = (p: ClipPoint) => ({x: 2 * p[0], y: 2 * p[1]});
        const [a0, a1, a2] = A.map(grid);
        const inner = grid(B_OFFSET[1]);
        expect([orient(a0, a2, inner), orient(a2, a1, inner), orient(a1, a0, inner)].every(o => o === 1)).toBe(true);
        for (const tolerance of [1e-3, 1e-6]) {
            const run = clipBezierPair(A, B_OFFSET, {tolerance});
            expect(run.status).toBe("empty");
            expect(run.results).toEqual([]);
            expect(run.unresolved).toEqual([]);
            expect(run.clipCount).toBe(17);
        }
    });

    it("is invariant under a uniform scale of the pair (margin is relative to the scale)", () => {
        const big = (net: P[]) => net.map(p => [p[0] * 1e6, p[1] * 1e6] as P);
        const run = clipBezierPair(big(A), big(B_CROSS));
        expect(run.status).toBe("found");
        expect(run.clipCount).toBe(21);
        expect(run.results).toHaveLength(2);
    });
});

describe("bezier clipping: helpers", () => {
    it("fat line of the crossing curve and the distance net of A", () => {
        const line = bezierFatLine(B_CROSS);
        expect(line.origin).toEqual([0, 3]);
        expect(line.normal[0]).toBeCloseTo(0, 15);
        expect(line.normal[1]).toBeCloseTo(1, 15);
        expect(line.dmin).toBeCloseTo(-4, 15);
        expect(line.dmax).toBeCloseTo(0, 15);
        const net = distanceControlPoints(A, line);
        expect(net.map(p => p.t)).toEqual([0, 0.5, 1]);
        expect(net.map(p => p.d)).toEqual([-3, 1, -3]);
    });

    it("fat line falls back to the farthest control point, then to (1, 0), for a short chord", () => {
        const loop = bezierFatLine([[0, 0], [3, 4], [0, 0]], 1e-12);
        expect(loop.normal[0]).toBeCloseTo(-0.8, 15);
        expect(loop.normal[1]).toBeCloseTo(0.6, 15);
        expect(loop.dmin).toBeCloseTo(0, 14);
        expect(loop.dmax).toBeCloseTo(0, 14);
        const point = bezierFatLine([[1, 1], [1, 1], [1, 1]], 1e-12);
        expect(point.normal[0]).toBeCloseTo(0, 15);
        expect(point.normal[1]).toBe(1);
        expect([point.dmin, point.dmax]).toEqual([0, 0]);
    });

    it("band clip interval on hand-checked hulls", () => {
        const tri: DistancePoint[] = [{t: 0, d: 0}, {t: 0.5, d: 2}, {t: 1, d: 0}];
        expect(bandClipInterval(tri, 0.5, 1.5)).toEqual([0.125, 0.875]);
        expect(bandClipInterval(tri, 0, 2)).toEqual([0, 1]);
        expect(bandClipInterval(tri, 2, 3)).toEqual([0.5, 0.5]);
        expect(bandClipInterval(tri, 3, 4)).toBeNull();
        expect(bandClipInterval(tri, -2, -1)).toBeNull();
    });

    it("band clip interval equals the t-extent of the hull cut by the band (independent polygon clipping)", () => {
        const rand = mulberry32(7);
        for (let n = 0; n < 500; n++) {
            const count = 2 + Math.floor(rand() * 3);
            const pts: DistancePoint[] = Array.from({length: count}, (_, i) => ({t: i / (count - 1), d: Math.round((rand() * 20 - 10) * 4) / 4}));
            const lo = Math.round((rand() * 16 - 8) * 4) / 4;
            const hi = lo + 0.25 + Math.round(rand() * 6 * 4) / 4;
            const got = bandClipInterval(pts, lo, hi);
            const want = referenceBandInterval(pts, lo, hi);
            if (want === null || got === null) expect(got, JSON.stringify({pts, lo, hi})).toBe(want);
            else {
                expect(got[0]).toBeCloseTo(want[0], 3);
                expect(got[1]).toBeCloseTo(want[1], 3);
            }
        }
    });

    it("subNet equals the curve restricted to a global range, from the original net", () => {
        const net: P[] = [[0, 0], [1, 5], [4, -3], [6, 2]];
        for (const [t0, t1] of [[0, 1], [0, 0.3], [0.2, 1], [0.25, 0.6], [0.5, 0.5], [0, 0], [1, 1]] as const) {
            const sub = subNet(net, t0, t1);
            expect(sub).toHaveLength(4);
            for (const u of [0, 0.3, 0.5, 1]) {
                const got = bezierAt(sub, u);
                const want = bezierAt(net, t0 + (t1 - t0) * u);
                expect(got[0]).toBeCloseTo(want[0], 12);
                expect(got[1]).toBeCloseTo(want[1], 12);
            }
        }
    });

    it("merges results whose both ranges overlap or touch within the tolerance, to a fixed point", () => {
        const r = (a: ClipRange, b: ClipRange) => ({aRange: a, bRange: b});
        const merged = mergeClipResults([
            r([0.1, 0.2], [0.1, 0.2]), r([0.2, 0.3], [0.2, 0.3]), r([0.3 + 1e-9, 0.4], [0.3, 0.4]),
            r([0.7, 0.8], [0.1, 0.2]),
            r([0.1, 0.2], [0.8, 0.9]),
        ], 1e-6);
        expect(merged).toHaveLength(3);
        expect(merged[0]).toEqual(r([0.1, 0.4], [0.1, 0.4]));
        // Overlap in A only (B far away) does not merge.
        expect(mergeClipResults([r([0.1, 0.2], [0.1, 0.2]), r([0.15, 0.3], [0.6, 0.7])], 1e-6)).toHaveLength(2);
    });

    it("clipScale is the largest absolute coordinate of both nets, at least 1", () => {
        expect(clipScale([[0, 0], [0.5, 0.2]], [[0, 0], [0.1, 0.3]])).toBe(1);
        expect(clipScale([[0, -7], [2, 3]], [[0, 0], [9, 1]])).toBe(9);
    });
});

function referenceBandInterval(pts: readonly DistancePoint[], lo: number, hi: number): ClipRange | null {
    // Convex hull (monotone chain, float), then Sutherland-Hodgman against d >= lo and d <= hi.
    const sorted = [...pts].sort((p, q) => p.t - q.t || p.d - q.d);
    const cross = (o: DistancePoint, p: DistancePoint, q: DistancePoint) => (p.t - o.t) * (q.d - o.d) - (p.d - o.d) * (q.t - o.t);
    const half = (list: DistancePoint[]) => {
        const out: DistancePoint[] = [];
        for (const p of list) {
            while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
            out.push(p);
        }
        out.pop();
        return out;
    };
    let poly = sorted.length < 3 ? sorted : [...half(sorted), ...half([...sorted].reverse())];
    const clip = (list: DistancePoint[], keep: (p: DistancePoint) => boolean, level: number) => {
        const out: DistancePoint[] = [];
        const count = list.length;
        for (let i = 0; i < count; i++) {
            const cur = list[i];
            const prev = list[(i + count - 1) % count];
            if (keep(cur) !== keep(prev) && cur.d !== prev.d) {
                out.push({t: prev.t + (level - prev.d) / (cur.d - prev.d) * (cur.t - prev.t), d: level});
            }
            if (keep(cur)) out.push(cur);
        }
        return out;
    };
    if (poly.length === 2) {
        // Segment: sample finely instead (a two-gon has no area).
        poly = Array.from({length: 4001}, (_, i) => ({t: poly[0].t + (poly[1].t - poly[0].t) * i / 4000, d: poly[0].d + (poly[1].d - poly[0].d) * i / 4000}))
            .filter(p => p.d >= lo - 1e-12 && p.d <= hi + 1e-12);
    } else {
        poly = clip(poly, p => p.d >= lo, lo);
        poly = clip(poly, p => p.d <= hi, hi);
    }
    if (poly.length === 0) return null;
    return [Math.max(0, Math.min(...poly.map(p => p.t))), Math.min(1, Math.max(...poly.map(p => p.t)))];
}

describe("bezier clipping: guards", () => {
    it("margin keeps a root whose control point lies on the fat line only up to rounding", () => {
        // A(0) = (4, 5) lies on the line B through (1, 1) and (16, 21) (parameter 0.2), the other control points of A
        // are on one side. The computed signed distance of (4, 5) is -4.4e-16, below the band [0, 0] of B.
        const a: P[] = [[4, 5], [8, 2], [14, 10]];
        const b: P[] = [[1, 1], [16, 21]];
        const line = bezierFatLine(b);
        const d0 = distanceControlPoints(a, line)[0].d;
        expect(d0).toBeLessThan(line.dmin);
        expect(d0).toBeGreaterThan(-1e-12);
        const run = clipBezierPair(a, b);
        expect(run.status).toBe("found");
        expect(run.results.some(r => inside(r.aRange, 0, 1e-6) && inside(r.bRange, 0.2, 1e-6))).toBe(true);
    });

    it("sub-nets come from the original net for the global range (a clip result is a point of the original curve)", () => {
        const run = clipBezierPair(A, B_CROSS, {tolerance: 1e-9});
        for (const r of run.results) {
            const pa = bezierAt(A, (r.aRange[0] + r.aRange[1]) / 2);
            const pb = bezierAt(B_CROSS, (r.bRange[0] + r.bRange[1]) / 2);
            expect(Math.hypot(pa[0] - pb[0], pa[1] - pb[1])).toBeLessThan(1e-8);
        }
        const mids = run.results.map(r => (r.aRange[0] + r.aRange[1]) / 2).sort((p, q) => p - q);
        expect(mids[0]).toBeCloseTo(0.25, 8);
        expect(mids[1]).toBeCloseTo(0.75, 8);
    });

    it("honors the clip cap: status limit, unresolved ranges kept, clip count never above the cap", () => {
        const run = clipBezierPair(A, B_TANGENT, {maxClips: 30});
        expect(run.status).toBe("limit");
        expect(run.clipCount).toBeLessThanOrEqual(30);
        expect(run.unresolved.length).toBeGreaterThan(0);
        expect(run.unresolved.every(u => u.depth >= 0)).toBe(true);
        // No live range lost: the tangent parameter is still covered by an unresolved or finished range.
        expect([...run.results, ...run.unresolved].some(r => inside(r.aRange, 0.5, 0) && inside(r.bRange, 0.5, 0))).toBe(true);
        const limitEvents = run.trace.filter(e => e.kind === "limit");
        expect(limitEvents).toHaveLength(run.unresolved.length);
        expect(limitEvents.every(e => e.payload.reason === "clips")).toBe(true);
    });

    it("tangent pair at tolerance 1e-10 stops at the cap (rounding cannot certify a double root)", () => {
        const run = clipBezierPair(A, B_TANGENT, {tolerance: 1e-10});
        expect(run.clipCount).toBeLessThanOrEqual(200);
        expect(["found", "limit"]).toContain(run.status);
        expect([...run.results, ...run.unresolved].some(r => inside(r.aRange, 0.5, 1e-9) && inside(r.bRange, 0.5, 1e-9))).toBe(true);
    });

    it("honors the depth limit: no pair deeper than maxDepth, reason depth", () => {
        const run = clipBezierPair(A, A, {maxDepth: 3, maxClips: 1000, tolerance: 1e-15});
        expect(run.status).toBe("limit");
        expect(Math.max(...run.trace.map(e => e.payload.depth))).toBeLessThanOrEqual(3);
        expect(run.trace.some(e => e.kind === "limit" && e.payload.reason === "depth")).toBe(true);
        expect(run.clipCount).toBeLessThanOrEqual(1000);
    });

    it("discards an empty interval: parallel lines give empty and no result", () => {
        const run = clipBezierPair([[0, 0], [4, 0]], [[0, 1], [4, 1]]);
        expect(run.status).toBe("empty");
        expect(run.clipCount).toBe(1);
        expect(run.trace.map(e => e.kind)).toEqual(["phase", "discard", "done"]);
    });

    it("merges adjacent pieces of one root (the tangent root would otherwise split into several results)", () => {
        const run = clipBezierPair(A, B_TANGENT, {tolerance: 1e-3});
        const outputs = run.trace.filter(e => e.kind === "output");
        expect(outputs.length).toBeGreaterThan(1);
        expect(run.results).toHaveLength(1);
    });
});

describe("bezier clipping: degenerate input terminates", () => {
    it("crossing lines meet at the middle", () => {
        const run = clipBezierPair([[0, 0], [4, 4]], [[0, 4], [4, 0]]);
        expect(run.status).toBe("found");
        expect(run.results).toHaveLength(1);
        expect(inside(run.results[0].aRange, 0.5, 1e-6)).toBe(true);
        expect(inside(run.results[0].bRange, 0.5, 1e-6)).toBe(true);
        expect(run.clipCount).toBeLessThanOrEqual(4);
    });

    it("parallel lines and a line missing a curve are empty", () => {
        expect(clipBezierPair([[0, 0], [4, 0]], [[0, 1], [4, 1]]).status).toBe("empty");
        expect(clipBezierPair([[0, 5], [4, 5]], A).status).toBe("empty");
    });

    it("coincident lines and coincident curves stop at the cap with status limit", () => {
        for (const [a, b] of [[[[0, 0], [4, 4]], [[0, 0], [4, 4]]], [A, A], [A, [...A].reverse()]] as const) {
            const run = clipBezierPair(a, b);
            expect(run.status).toBe("limit");
            expect(run.clipCount).toBeLessThanOrEqual(200);
            expect(run.unresolved.length).toBeGreaterThan(0);
            expect(run.trace[run.trace.length - 1].kind).toBe("done");
        }
    });

    it("a point-like net terminates: off the curve empty, on the curve limit or found", () => {
        const dot = (p: P): P[] => [p, p, p];
        expect(clipBezierPair(dot([2, 5]), A).status).toBe("empty");
        const on = clipBezierPair(dot([2, 2]), A);
        expect(["limit", "found"]).toContain(on.status);
        expect(on.clipCount).toBeLessThanOrEqual(200);
        const both = clipBezierPair(dot([1, 1]), dot([1, 1]));
        expect(both.clipCount).toBeLessThanOrEqual(200);
    });

    it("rejects unsupported degree, too few points, non-2D and non-finite coordinates", () => {
        const quartic: P[] = [[0, 0], [1, 1], [2, 0], [3, 1], [4, 0]];
        expect(() => clipBezierPair(quartic, A)).toThrow(RangeError);
        expect(() => clipBezierPair(A, quartic)).toThrow(RangeError);
        expect(() => clipBezierPair([[0, 0]], A)).toThrow(RangeError);
        expect(() => clipBezierPair([], A)).toThrow(RangeError);
        expect(() => clipBezierPair([[0, 0], [Number.NaN, 1]], A)).toThrow(RangeError);
        expect(() => clipBezierPair(A, [[0, 0], [Infinity, 1]])).toThrow(RangeError);
        expect(() => clipBezierPair(A, [[0, 0, 0] as unknown as P, [1, 1]])).toThrow(RangeError);
    });
});

describe("bezier clipping: trace", () => {
    const runs: [string, ClipRun, number][] = [
        ["crossing 1e-3", clipBezierPair(A, B_CROSS, {tolerance: 1e-3}), 1e-3],
        ["crossing", clipBezierPair(A, B_CROSS), 1e-6],
        ["tangent", clipBezierPair(A, B_TANGENT), 1e-6],
        ["offset", clipBezierPair(A, B_OFFSET), 1e-6],
        ["capped", clipBezierPair(A, B_TANGENT, {maxClips: 25}), 1e-6],
        ["coincident", clipBezierPair(A, A), 1e-6],
        ["depth", clipBezierPair(A, A, {maxDepth: 2, tolerance: 1e-15}), 1e-15],
    ];

    it.each(runs)("%s: the fold at the last index equals the returned result", (_, run, tolerance) => {
        const fold = clipFold(tolerance);
        const last = stateAt(run.trace, run.trace.length - 1, fold, INITIAL_CLIP_STATE);
        expect(last.status).toBe(run.status);
        expect(last.results).toEqual(run.results);
        expect(last.unresolved).toEqual(run.unresolved);
        expect(last.clipCount).toBe(run.clipCount);
        expect(last.active).toEqual([]);
        // Out-of-range indices clamp to the same state.
        expect(stateAt(run.trace, 1e9, fold, INITIAL_CLIP_STATE)).toEqual(last);
    });

    it.each(runs)("%s: running counts are monotone, payloads hold ids and ranges only, pairs stay in [0, 1]", (_, run) => {
        let previous = 0;
        for (const event of run.trace) {
            expect(event.predicateCount).toBeGreaterThanOrEqual(previous);
            previous = event.predicateCount;
            expect(Object.keys(event.payload).sort()).toEqual(["aRange", "bRange", "children", "depth", "keep", "pair", "reason", "target"]);
            for (const r of [event.payload.aRange, event.payload.bRange]) {
                expect(r[0]).toBeGreaterThanOrEqual(0);
                expect(r[1]).toBeLessThanOrEqual(1);
                expect(r[0]).toBeLessThanOrEqual(r[1]);
            }
        }
        expect(run.trace[0].kind).toBe("phase");
        expect(run.trace[run.trace.length - 1].kind).toBe("done");
        expect(run.trace[run.trace.length - 1].predicateCount).toBe(run.clipCount);
    });

    it("the fold tracks the live pairs step by step on the crossing run", () => {
        const run = clipBezierPair(A, B_CROSS, {tolerance: 1e-3});
        const fold = clipFold(1e-3);
        expect(stateAt(run.trace, 0, fold, INITIAL_CLIP_STATE).active).toHaveLength(1);
        const firstClip = run.trace.findIndex(e => e.kind === "clip");
        const afterClip = stateAt(run.trace, firstClip, fold, INITIAL_CLIP_STATE);
        expect(afterClip.clipCount).toBe(1);
        expect(afterClip.active[0].target).toBe("B");
        const firstSplit = run.trace.findIndex(e => e.kind === "split");
        expect(stateAt(run.trace, firstSplit, fold, INITIAL_CLIP_STATE).active).toHaveLength(2);
        // Pure: folding twice from the same initial state gives equal, independent results.
        expect(INITIAL_CLIP_STATE.active).toEqual([]);
        expect(INITIAL_CLIP_STATE.results).toEqual([]);
    });

    it("runs are deterministic", () => {
        expect(clipBezierPair(A, B_TANGENT)).toEqual(clipBezierPair(A, B_TANGENT));
    });
});

describe("bezier clipping: seeded random pairs against two references", () => {
    function checkPairs(seed: number, count: number, degrees: (i: number) => [number, number]): {checked: number; limited: number; rootCount: number} {
        const rand = mulberry32(seed);
        let checked = 0;
        let limited = 0;
        let rootCount = 0;
        for (let i = 0; i < count; i++) {
            const [da, db] = degrees(i);
            const a = randomNet(rand, da);
            const b = randomNet(rand, db);
            const run = clipBezierPair(a, b);
            expect(run.clipCount).toBeLessThanOrEqual(200);
            if (run.status === "limit") {
                limited++;
                continue;
            }
            const roots = resultantRoots(a, b);
            expectCovered(run, roots, 1e-6, `resultant ${JSON.stringify([a, b])}`);
            rootCount += roots.length;
            checked++;
        }
        return {checked, limited, rootCount};
    }

    it("200 quadratic pairs: every resultant root lies in a returned interval", () => {
        const {checked, rootCount} = checkPairs(11, 200, () => [2, 2]);
        expect(checked).toBeGreaterThanOrEqual(190);
        expect(rootCount).toBeGreaterThanOrEqual(80);
    });

    it("200 cubic pairs: every resultant root lies in a returned interval", () => {
        const {checked, rootCount} = checkPairs(23, 200, () => [3, 3]);
        expect(checked).toBeGreaterThanOrEqual(190);
        expect(rootCount).toBeGreaterThanOrEqual(150);
    });

    it("200 mixed-degree pairs (lines, quadratics, cubics): every resultant root lies in a returned interval", () => {
        const table: [number, number][] = [[1, 3], [3, 1], [2, 3], [3, 2], [1, 2], [2, 1], [1, 1]];
        const {checked, rootCount} = checkPairs(37, 200, i => table[i % table.length]);
        expect(checked).toBeGreaterThanOrEqual(190);
        expect(rootCount).toBeGreaterThanOrEqual(90);
    });

    it("dense polyline roots (2000 samples) lie in a returned interval (quadratic, cubic, mixed)", () => {
        const rand = mulberry32(101);
        let rootCount = 0;
        for (let i = 0; i < 90; i++) {
            const degrees = ([[2, 2], [3, 3], [2, 3]] as const)[i % 3];
            const a = randomNet(rand, degrees[0]);
            const b = randomNet(rand, degrees[1]);
            const run = clipBezierPair(a, b);
            const roots = polylineRoots(a, b);
            expectCovered(run, roots, 1e-6, `polyline ${JSON.stringify([a, b])}`);
            rootCount += roots.length;
        }
        expect(rootCount).toBeGreaterThanOrEqual(30);
    });

    it("the two references agree with each other on the oracle pair", () => {
        const roots = resultantRoots(A, B_CROSS).map(r => r.t).sort((p, q) => p - q);
        expect(roots).toHaveLength(2);
        expect(roots[0]).toBeCloseTo(0.25, 8);
        expect(roots[1]).toBeCloseTo(0.75, 8);
        expect(polylineRoots(A, B_CROSS).filter(r => r.exact).some(r => r.exact && Math.abs(r.t - 0.25) < 1e-9)).toBe(true);
    });
});
