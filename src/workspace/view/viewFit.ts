import {FIT_MARGIN_PX, FitBox} from "../../graphs/base/fitBoundingBox";
import {convexHull, HullPoint} from "./hull";

export type Point = HullPoint;
/** Canvas pixels, y down (as on screen). Not the layout's `{x, y, w, h}`: see `rectFromLayout` in `layoutRects.ts`. */
export interface Rect {x: number; y: number; width: number; height: number}

export interface FitInput {
    /** Points that must stay visible and clear of obstacles. */
    must: readonly Point[];
    /** Points that should be visible when possible. */
    nice?: readonly Point[];
    /** Points the parameters may reach nearby (predicted); tried first, dropped before `nice`. */
    reach?: readonly Point[];
    canvas: {width: number; height: number};
    obstacles: readonly Rect[];
    /** The graph's default view, [left, top, right, bottom] in user units, y up. */
    base: FitBox;
    equalAxisUnits: boolean;
    /** maxOut >= 1: scale may drop to base/maxOut. maxIn >= 1: scale may grow to base*maxIn (fill only). */
    limits: {maxOut: number; maxIn: number};
    marginPx?: number;
    mode: 'keep' | 'fill';
    /** The card-free rectangle (px): `fill` centres the hull in it. Absent: the canvas. */
    free?: Rect;
}

export interface FitResult {
    box: FitBox;
    tier: 'reach' | 'all' | 'must' | 'none';
    /** Must points still inside an obstacle or outside the canvas. */
    covered: Point[];
    /** Scale relative to base (1 = base scale, 0.5 = zoomed out twofold). */
    scaleFactor: number;
}

type V = [number, number];
const EPS = 1e-6;
const KEEP_STEP = 0.95;
const FILL_ITERATIONS = 12;

/** Convex polygon (ccw) of displacements d for which the hull shifted by d meets the rect. */
function forbiddenRegion(hull: readonly V[], r: Rect): V[] {
    const sums: V[] = [];
    const xs = [r.x, r.x + r.width], ys = [r.y, r.y + r.height];
    for (const h of hull) for (const x of xs) for (const y of ys) sums.push([x - h[0], y - h[1]]);
    return convexHull(sums) as V[];
}

function strictlyInside(poly: readonly V[], d: V): boolean {
    const n = poly.length;
    for (let i = 0; i < n; i++) {
        const a = poly[i], b = poly[(i + 1) % n];
        const ex = b[0] - a[0], ey = b[1] - a[1];
        const len = Math.hypot(ex, ey) || 1;
        if ((ex * (d[1] - a[1]) - ey * (d[0] - a[0])) / len <= EPS) return false;
    }
    return true;
}

function closestOnSegment(a: V, b: V): V {
    const ex = b[0] - a[0], ey = b[1] - a[1];
    const l2 = ex * ex + ey * ey;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, -(a[0] * ex + a[1] * ey) / l2));
    return [a[0] + t * ex, a[1] + t * ey];
}

function intersect(a: V, b: V, c: V, d: V): V | undefined {
    const rx = b[0] - a[0], ry = b[1] - a[1], sx = d[0] - c[0], sy = d[1] - c[1];
    const den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-12) return undefined;
    const t = ((c[0] - a[0]) * sy - (c[1] - a[1]) * sx) / den;
    const u = ((c[0] - a[0]) * ry - (c[1] - a[1]) * rx) / den;
    if (t < -1e-9 || t > 1 + 1e-9 || u < -1e-9 || u > 1 + 1e-9) return undefined;
    return [a[0] + t * rx, a[1] + t * ry];
}

interface Region {
    /** Allowed displacement box [xmin, xmax, ymin, ymax]; the canvas constraint. */
    box: [number, number, number, number];
    forbidden: V[][];
}

function buildRegion(pts: readonly V[], canvas: {width: number; height: number}, margin: number,
                     obstacles: readonly Rect[]): Region | undefined {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of pts) {
        minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
        minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
    }
    const box: Region['box'] = [margin - minX, canvas.width - margin - maxX, margin - minY, canvas.height - margin - maxY];
    if (box[0] > box[1] + EPS || box[2] > box[3] + EPS) return undefined;
    const forbidden: V[][] = [];
    for (const o of obstacles) {
        if (!(o.width > 0) || !(o.height > 0)) continue;
        const grown: Rect = {x: o.x - margin, y: o.y - margin, width: o.width + 2 * margin, height: o.height + 2 * margin};
        const q = forbiddenRegion(pts, grown);
        let qx0 = Infinity, qx1 = -Infinity, qy0 = Infinity, qy1 = -Infinity;
        for (const v of q) {
            qx0 = Math.min(qx0, v[0]); qx1 = Math.max(qx1, v[0]);
            qy0 = Math.min(qy0, v[1]); qy1 = Math.max(qy1, v[1]);
        }
        if (qx1 <= box[0] + EPS || qx0 >= box[1] - EPS || qy1 <= box[2] + EPS || qy0 >= box[3] - EPS) continue;
        forbidden.push(q);
    }
    return {box, forbidden};
}

function inBox(box: Region['box'], d: V): boolean {
    return d[0] >= box[0] - EPS && d[0] <= box[1] + EPS && d[1] >= box[2] - EPS && d[1] <= box[3] + EPS;
}

/** Candidate displacements, nearest to zero first. */
function candidates(region: Region, target: V = [0, 0]): V[] {
    const {box, forbidden} = region;
    const edges: [V, V][] = [];
    const out: V[] = [];
    const corners: V[] = [[box[0], box[2]], [box[1], box[2]], [box[1], box[3]], [box[0], box[3]]];
    out.push([Math.max(box[0], Math.min(box[1], target[0])), Math.max(box[2], Math.min(box[3], target[1]))], ...corners);
    for (let i = 0; i < 4; i++) edges.push([corners[i], corners[(i + 1) % 4]]);
    const owner: number[] = [-1, -1, -1, -1];
    forbidden.forEach((q, k) => {
        for (let i = 0; i < q.length; i++) {
            out.push(q[i]);
            const a = q[i], b = q[(i + 1) % q.length];
            // Edges entirely outside the allowed box cannot contribute candidates inside it.
            if (Math.max(a[0], b[0]) < box[0] - EPS || Math.min(a[0], b[0]) > box[1] + EPS
                || Math.max(a[1], b[1]) < box[2] - EPS || Math.min(a[1], b[1]) > box[3] + EPS) continue;
            edges.push([a, b]);
            owner.push(k);
        }
    });
    for (const [a, b] of edges) {
        const c = closestOnSegment([a[0] - target[0], a[1] - target[1]], [b[0] - target[0], b[1] - target[1]]);
        out.push([c[0] + target[0], c[1] + target[1]]);
    }
    for (let i = 0; i < edges.length; i++) {
        for (let j = i + 1; j < edges.length; j++) {
            if (owner[i] === owner[j] && owner[i] >= 0) continue;
            const p = intersect(edges[i][0], edges[i][1], edges[j][0], edges[j][1]);
            if (p) out.push(p);
        }
    }
    return out.filter(d => inBox(box, d)).sort((a, b) => Math.hypot(a[0] - target[0], a[1] - target[1]) - Math.hypot(b[0] - target[0], b[1] - target[1]));
}

function isClear(region: Region, d: V): boolean {
    return inBox(region.box, d) && !region.forbidden.some(q => strictlyInside(q, d));
}

/** Clear displacement (px) nearest the target (default: no pan), or undefined. */
function leastPan(region: Region | undefined, target: V = [0, 0]): V | undefined {
    if (!region) return undefined;
    if (isClear(region, target)) return target;
    for (const d of candidates(region, target)) if (isClear(region, d)) return d;
    return undefined;
}

/**
 * Pure view fit: pan and zoom the base view so the convex hull of the focus points is visible and clear of
 * the obstacle rectangles. Depends only on the input (never on a current view), so it is idempotent.
 */
export function fitView(input: FitInput): FitResult {
    const {width: W, height: H} = input.canvas;
    const [left, top, right, bottom] = input.base;
    const margin = input.marginPx ?? Math.min(FIT_MARGIN_PX, 0.1 * Math.min(W, H));
    const sx0 = W / (right - left), sy0 = H / (top - bottom);
    const bs: V = input.equalAxisUnits ? [Math.min(sx0, sy0), Math.min(sx0, sy0)] : [sx0, sy0];
    const cx0 = (left + right) / 2, cy0 = (top + bottom) / 2;
    const maxOut = Math.max(1, input.limits.maxOut), maxIn = Math.max(1, input.limits.maxIn);
    const fMin = 1 / maxOut;
    const obstacles = input.obstacles;

    const project = (p: Point, f: number): V => [W / 2 + (p[0] - cx0) * bs[0] * f, H / 2 - (p[1] - cy0) * bs[1] * f];
    const hullAt = (hull: readonly Point[], f: number): V[] => hull.map(p => project(p, f));

    const finish = (f: number, d: V, tier: FitResult['tier']): FitResult => {
        const sx = bs[0] * f, sy = bs[1] * f;
        const cx = cx0 - d[0] / sx, cy = cy0 + d[1] / sy;
        const box: FitBox = [cx - W / 2 / sx, cy + H / 2 / sy, cx + W / 2 / sx, cy - H / 2 / sy];
        const covered = input.must.filter(p => {
            if (!Number.isFinite(p[0]) || !Number.isFinite(p[1])) return false;
            const [px, py] = project(p, f);
            const x = px + d[0], y = py + d[1];
            if (x < 0 || x > W || y < 0 || y > H) return true;
            return obstacles.some(o => x > o.x && x < o.x + o.width && y > o.y && y < o.y + o.height);
        });
        return {box, tier, covered: covered as Point[], scaleFactor: f};
    };

    const attempt = (hull: readonly Point[]): {f: number; d: V} | undefined => {
        const solve = (f: number) => {
            const pts = hullAt(hull, f);
            let target: V = [0, 0];
            if (input.mode === 'fill') {
                // Fit to content: aim for the hull centred in the free rectangle (the canvas when none is given), not the
                // least pan from the base centre. Centring on the canvas put the content under a card on one side.
                const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
                const free = input.free ?? {x: 0, y: 0, width: W, height: H};
                target = [free.x + free.width / 2 - (Math.min(...xs) + Math.max(...xs)) / 2,
                    free.y + free.height / 2 - (Math.min(...ys) + Math.max(...ys)) / 2];
            }
            const d = leastPan(buildRegion(pts, input.canvas, margin, obstacles), target);
            return d ? {f, d} : undefined;
        };
        if (input.mode === 'keep') {
            for (let f = 1; ; f *= KEEP_STEP) {
                const ff = Math.max(f, fMin);
                const r = solve(ff);
                if (r) return r;
                if (ff <= fMin) return undefined;
            }
        }
        const best = solve(maxIn);
        if (best) return best;
        let lo = solve(fMin);
        if (!lo) return undefined;
        let loF = fMin, hiF = maxIn;
        for (let i = 0; i < FILL_ITERATIONS; i++) {
            const mid = Math.sqrt(loF * hiF);
            const r = solve(mid);
            if (r) { lo = r; loF = mid; } else hiF = mid;
        }
        return lo;
    };

    const mustHull = convexHull(input.must);
    if (mustHull.length === 0) return finish(1, [0, 0], 'all');
    const allHull = input.nice?.length ? convexHull([...input.must, ...input.nice]) : mustHull;

    if (input.reach?.length) {
        const r = attempt(convexHull([...input.must, ...(input.nice ?? []), ...input.reach]));
        if (r) return finish(r.f, r.d, 'reach');
    }
    if (input.nice?.length) {
        const r = attempt(allHull);
        if (r) return finish(r.f, r.d, 'all');
    }
    const r = attempt(mustHull);
    if (r) return finish(r.f, r.d, 'must');

    // Best effort at the smallest scale: the candidate displacement covering the fewest must points.
    const region = buildRegion(hullAt(mustHull, fMin), input.canvas, margin, obstacles);
    let best: FitResult | undefined;
    const tryD = (d: V) => {
        const res = finish(fMin, d, 'none');
        if (!best || res.covered.length < best.covered.length) best = res;
    };
    tryD([0, 0]);
    if (region) for (const d of candidates(region).slice(0, 300)) tryD(d);
    return best!;
}
