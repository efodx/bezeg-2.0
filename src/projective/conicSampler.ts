/**
 * Conic sampler for drawing (ADR 0033 section 3; projective conics task 03).
 *
 * Everything here is doubles and is for drawing only; the conic type comes from the exact `classify`. A smooth conic
 * is walked through the pencil of lines through a base point Q0 (computed in doubles, so conics without a rational
 * point still sample): for a line direction d at angle theta the second intersection is P(theta) = Q0 + s d with
 * s = -(grad f(Q0) . d) / Q(d), where Q(d) is the quadratic form A dx^2 + B dx dy + C dy^2. P is undefined exactly at
 * the asymptotic directions (Q(d) = 0, the ideal points), where the pieces break. Theta runs over a half turn, so an
 * ellipse closes, a parabola is one open piece and a hyperbola is two pieces that are never joined.
 *
 * "Relative residual" of a point (x, y): |f(x, y)| / (|A x^2| + |B x y| + |C y^2| + |D x| + |E y| + |F|), the
 * form value divided by the sum of the absolute values of its six terms. Every curve sample is polished by one Newton
 * step so this stays far below 1e-12. Pieces are clipped by bisecting the pencil angle, so the exit and entry
 * vertices are conic points too (the last sample inside the view, within rounding of the boundary).
 */
import {classify, type Conic, type ConicType} from './conic';

export interface Pt {
    readonly x: number;
    readonly y: number;
}

/** Axis-aligned rectangle; pieces are clipped to it. */
export interface SamplerView {
    readonly xMin: number;
    readonly xMax: number;
    readonly yMin: number;
    readonly yMax: number;
}

export interface ConicPiece {
    readonly points: readonly Pt[];
    /** True only for a closed curve lying entirely in the view; then the first and last point are equal. */
    readonly closed: boolean;
}

export interface SampledConic {
    readonly type: ConicType;
    /**
     * 'ok': pieces drawn (possibly none if the view misses the conic). 'point': `markers` holds the single point.
     * 'empty': no affine point (an empty conic, or a double line at infinity), so no pieces.
     * 'no-base-point': a smooth conic whose base point could not be computed (should not occur; never silent).
     */
    readonly status: 'ok' | 'point' | 'empty' | 'no-base-point';
    readonly pieces: readonly ConicPiece[];
    readonly markers: readonly Pt[];
}

/**
 * Number of pencil directions per half turn (a branch gets a share proportional to its angular span). Measured in
 * projective slice 05d (ADR 0033, measurement addendum): every K2/K3 conic deviates at most 0.025 px from its polyline
 * at 1920 px, at half the vertices of 720.
 */
export const DEFAULT_SAMPLE_DENSITY = 360;

const BISECTIONS = 60;
const REFINE_DEPTH = 8;
/** Hard cap on recursion; levels past REFINE_DEPTH follow only branches whose hull touches the view. */
const MAX_REFINE_DEPTH = 40;
const END_LEVELS = 30;
const REFINE_STEP_DIVISOR = 100;

type Coef = readonly [number, number, number, number, number, number];

function f(k: Coef, x: number, y: number): number {
    return k[0] * x * x + k[1] * x * y + k[2] * y * y + k[3] * x + k[4] * y + k[5];
}

function grad(k: Coef, x: number, y: number): readonly [number, number] {
    return [2 * k[0] * x + k[1] * y + k[3], k[1] * x + 2 * k[2] * y + k[4]];
}

function quad(k: Coef, dx: number, dy: number): number {
    return k[0] * dx * dx + k[1] * dx * dy + k[2] * dy * dy;
}

function inView(v: SamplerView, p: Pt): boolean {
    return p.x >= v.xMin && p.x <= v.xMax && p.y >= v.yMin && p.y <= v.yMax;
}

/** One Newton step toward f = 0, so the sample lies on the conic to rounding. */
function polish(k: Coef, p: Pt): Pt {
    const [gx, gy] = grad(k, p.x, p.y);
    const g2 = gx * gx + gy * gy;
    if (g2 === 0) return p;
    const t = f(k, p.x, p.y) / g2;
    return {x: p.x - t * gx, y: p.y - t * gy};
}

/** Intersection of line P0 + t d with the conic; null if there is none. */
function lineHit(k: Coef, x0: number, y0: number, dx: number, dy: number): Pt | null {
    const a = quad(k, dx, dy);
    const [gx, gy] = grad(k, x0, y0);
    const b = gx * dx + gy * dy;
    const c = f(k, x0, y0);
    let t: number;
    if (a === 0) {
        if (b === 0) return null;
        t = -c / b;
    } else {
        const disc = b * b - 4 * a * c;
        if (disc < 0) return null;
        // Both roots are q / a and c / q; c / q stays accurate when a is tiny (a line almost parallel to the axis).
        const q = -(b + (b >= 0 ? 1 : -1) * Math.sqrt(disc)) / 2;
        t = q !== 0 ? c / q : 0;
    }
    return Number.isFinite(t) ? {x: x0 + t * dx, y: y0 + t * dy} : null;
}

/**
 * A point on a smooth real conic. Principal axes first: through the centre, one axis always meets an ellipse and the
 * transverse axis meets a hyperbola; the line through the origin parallel to a parabola's axis meets it once.
 * A fan of other directions is the fallback. `parabola` comes from the exact classification: with coefficients above
 * 2^53, 4AC - B^2 in doubles can be non-zero for an exact parabola, and its "centre" would be rounding noise.
 */
function basePoint(k: Coef, parabola: boolean): Pt | null {
    const det = parabola ? 0 : 4 * k[0] * k[2] - k[1] * k[1];
    const cx = det !== 0 ? (k[1] * k[4] - 2 * k[2] * k[3]) / det : 0;
    const cy = det !== 0 ? (k[1] * k[3] - 2 * k[0] * k[4]) / det : 0;
    const phi = Math.atan2(k[1], k[0] - k[2]) / 2; // eigen-direction of the quadratic part
    const angles = [phi, phi + Math.PI / 2]; // for a parabola one of them is the axis
    for (let i = 0; i < 32; i++) angles.push(0.1 + (i * Math.PI) / 32);
    if (det === 0) {
        // Parabola: the vertex. d is the axis direction (null direction of Q), n its normal; the axis is the line
        // grad f . n = 0, parallel to d, and it meets the parabola once, at the vertex.
        const d = [Math.cos(phi), Math.sin(phi)];
        const [dd, nn] = Math.abs(quad(k, d[0], d[1])) <= Math.abs(quad(k, -d[1], d[0])) ? [d, [-d[1], d[0]]] : [[-d[1], d[0]], d];
        const gx = 2 * k[0] * nn[0] + k[1] * nn[1];
        const gy = k[1] * nn[0] + 2 * k[2] * nn[1];
        const g2 = gx * gx + gy * gy;
        if (g2 > 0) {
            const c0 = -(k[3] * nn[0] + k[4] * nn[1]) / g2;
            const hit = lineHit(k, c0 * gx, c0 * gy, dd[0], dd[1]);
            if (hit) return polish(k, hit);
        }
    }
    for (const th of angles) {
        const hit = lineHit(k, cx, cy, Math.cos(th), Math.sin(th));
        if (hit) return polish(k, hit);
    }
    return null;
}

/** Second intersection of the line through q0 at angle theta; null at (numerically) asymptotic directions. */
function pencilPoint(k: Coef, q0: Pt, theta: number): Pt | null {
    const dx = Math.cos(theta);
    const dy = Math.sin(theta);
    const a = quad(k, dx, dy);
    if (a === 0) return null;
    const [gx, gy] = grad(k, q0.x, q0.y);
    const s = -(gx * dx + gy * dy) / a;
    const p = {x: q0.x + s * dx, y: q0.y + s * dy};
    return Number.isFinite(p.x) && Number.isFinite(p.y) ? polish(k, p) : null;
}

/** True if the segment from a to b meets the view rectangle. */
function chordMeets(v: SamplerView, a: Pt, b: Pt): boolean {
    let t0 = 0;
    let t1 = 1;
    const slab = (p: number, d: number, lo: number, hi: number): boolean => {
        if (d === 0) return p >= lo && p <= hi;
        const u = (lo - p) / d;
        const w = (hi - p) / d;
        t0 = Math.max(t0, Math.min(u, w));
        t1 = Math.min(t1, Math.max(u, w));
        return t0 <= t1;
    };
    return slab(a.x, b.x - a.x, v.xMin, v.xMax) && slab(a.y, b.y - a.y, v.yMin, v.yMax);
}

/** True if the triangle a, b, c meets the view rectangle (an edge crosses it, or a rectangle corner lies inside). */
function triangleMeets(v: SamplerView, a: Pt, b: Pt, c: Pt): boolean {
    if (chordMeets(v, a, b) || chordMeets(v, b, c) || chordMeets(v, c, a)) return true;
    const cross = (p: Pt, q: Pt, r: Pt) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
    const corner = {x: v.xMin, y: v.yMin};
    const d1 = cross(a, b, corner);
    const d2 = cross(b, c, corner);
    const d3 = cross(c, a, corner);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

/**
 * Conservative test that the arc between consecutive samples pa and pb (convex, turning less than pi, with mid-sample
 * pm on it) misses the view: the arc lies in the triangle pa, pb, T, T the meeting of the tangents. When the tangents
 * are near parallel, T is not finite, or pm is not inside that triangle, the hull is unknown and this returns null.
 */
function hullMisses(k: Coef, view: SamplerView, pa: Pt, pb: Pt, pm: Pt | null): boolean | null {
    if (pm === null) return null;
    const [ga, gb] = [grad(k, pa.x, pa.y), grad(k, pb.x, pb.y)];
    // Tangent lines: g . (X - p) = 0. Solve the 2x2 system for T.
    const det = ga[0] * gb[1] - ga[1] * gb[0];
    const scale = Math.hypot(ga[0], ga[1]) * Math.hypot(gb[0], gb[1]);
    if (!(Math.abs(det) > 1e-9 * scale)) {
        // Near-parallel tangents. With gradients pointing the same way the arc is almost straight (turning angle alpha
        // with sin alpha <= 1e-9), so it stays within L sin(alpha) of its chord: test the chord against the view widened
        // by that margin. Far pieces near an asymptote land here; subdividing them blindly cost 30x the sampling time.
        // Opposite gradients mean a turn near pi: the hull is unknown.
        if (!(ga[0] * gb[0] + ga[1] * gb[1] > 0)) return null;
        const margin = 1e-9 * Math.hypot(pb.x - pa.x, pb.y - pa.y) + 1e-12 * (1 + Math.max(Math.abs(pa.x), Math.abs(pa.y), Math.abs(pb.x), Math.abs(pb.y)));
        const wide = {xMin: view.xMin - margin, xMax: view.xMax + margin, yMin: view.yMin - margin, yMax: view.yMax + margin};
        return !chordMeets(wide, pa, pb);
    }
    const ra = ga[0] * pa.x + ga[1] * pa.y;
    const rb = gb[0] * pb.x + gb[1] * pb.y;
    const t = {x: (ra * gb[1] - ga[1] * rb) / det, y: (ga[0] * rb - ra * gb[0]) / det};
    if (!Number.isFinite(t.x) || !Number.isFinite(t.y)) return null;
    const cross = (p: Pt, q: Pt, r: Pt) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
    const area = cross(pa, pb, t);
    if (area === 0) return null;
    const sgn = Math.sign(area);
    // Rounding tolerance: coordinate error (relative to their size) times the triangle's edge lengths.
    const size = 1 + Math.max(Math.abs(pa.x), Math.abs(pa.y), Math.abs(pb.x), Math.abs(pb.y), Math.abs(t.x), Math.abs(t.y));
    const tol = 1e-12 * size * (Math.hypot(pb.x - pa.x, pb.y - pa.y) + Math.hypot(t.x - pa.x, t.y - pa.y) + Math.hypot(t.x - pb.x, t.y - pb.y));
    const holdsArc =
        sgn * cross(pa, pb, pm) >= -tol && sgn * cross(pb, t, pm) >= -tol && sgn * cross(t, pa, pm) >= -tol;
    return holdsArc ? !triangleMeets(view, pa, pb, t) : null;
}

/** Walk the angles in order; clip with bisection on the angle so every vertex lies on the conic. */
function walk(k: Coef, q0: Pt, view: SamplerView, thetas: number[], out: Pt[][]): void {
    const at = (th: number) => pencilPoint(k, q0, th);
    const ins = (p: Pt | null): p is Pt => p !== null && inView(view, p);
    // Boundary crossing between an inside angle and an outside angle: the inside end of the final bracket.
    const cross = (thIn: number, thOut: number): Pt => {
        let lo = thIn;
        let hi = thOut;
        let best = at(lo) as Pt;
        for (let i = 0; i < BISECTIONS; i++) {
            const mid = (lo + hi) / 2;
            const p = at(mid);
            if (ins(p)) {
                lo = mid;
                best = p;
            } else hi = mid;
        }
        return best;
    };
    // Subdivide the angle (to a bounded depth) where a chord is long and touches the view: an arc may hide between two
    // consecutive samples, e.g. both outside but the chord crossing the view, or a narrow branch inside one angle step.
    const maxStep = Math.hypot(view.xMax - view.xMin, view.yMax - view.yMin) / REFINE_STEP_DIVISOR;
    const refine = (ta: number, pa: Pt | null, tb: number, pb: Pt | null, depth: number, acc: number[]): void => {
        if (depth === 0 || pa === null || pb === null) return;
        if (Math.hypot(pb.x - pa.x, pb.y - pa.y) <= maxStep) return;
        const tm = (ta + tb) / 2;
        const pm = at(tm);
        const misses = hullMisses(k, view, pa, pb, pm); // null: hull unknown, so never skip on it
        // Past REFINE_DEPTH only branches with a known hull that touches the view continue (a tiny visible arc far from Q0).
        if (depth <= MAX_REFINE_DEPTH - REFINE_DEPTH && misses !== false) return;
        if (!ins(pa) && !ins(pb) && misses === true) return;
        refine(ta, pa, tm, pm, depth - 1, acc);
        acc.push(tm);
        refine(tm, pm, tb, pb, depth - 1, acc);
    };
    const dense: number[] = [];
    let prevT = 0;
    let prevP: Pt | null = null;
    for (let i = 0; i < thetas.length; i++) {
        const p = at(thetas[i]);
        if (i > 0) refine(prevT, prevP, thetas[i], p, MAX_REFINE_DEPTH, dense);
        dense.push(thetas[i]);
        prevT = thetas[i];
        prevP = p;
    }
    thetas = dense;
    let current: Pt[] | null = null;
    for (let i = 0; i < thetas.length; i++) {
        const p = at(thetas[i]);
        if (ins(p)) {
            if (current === null) {
                current = [];
                if (i > 0) current.push(cross(thetas[i], thetas[i - 1]));
            }
            current.push(p);
        } else if (current !== null) {
            current.push(cross(thetas[i - 1], thetas[i]));
            out.push(current);
            current = null;
        }
    }
    if (current !== null) out.push(current);
}

function toPieces(lists: Pt[][]): ConicPiece[] {
    return lists.filter((l) => l.length >= 2).map((points) => ({points, closed: false}));
}

function sampleSmooth(type: ConicType, k: Coef, view: SamplerView, density: number): SampledConic {
    const q0 = basePoint(k, type === 'parabola');
    // A guard only: every test conic finds a base point. Near-degenerate conics with huge coefficient ranges might not.
    if (!q0) return {type, status: 'no-base-point', pieces: [], markers: []};
    const [gx, gy] = grad(k, q0.x, q0.y);
    const tangent = Math.atan2(gx, -gy); // direction (-gy, gx) is tangent at q0
    const lists: Pt[][] = [];
    if (type === 'ellipse' || type === 'circle') {
        const n = density;
        const thetas = Array.from({length: n + 1}, (_, i) => tangent + (i * Math.PI) / n);
        const pts: Pt[] = thetas.map((th, i) => (i === 0 || i === n ? q0 : (pencilPoint(k, q0, th) ?? q0)));
        const outside = pts.findIndex((p, i) => i < n && !inView(view, p));
        if (outside < 0) return {type, status: 'ok', pieces: [{points: pts, closed: true}], markers: []};
        // Start the walk at a sample outside the view, so no piece wraps around the start.
        const rotated: number[] = [];
        for (let i = outside; i <= n; i++) rotated.push(thetas[i]);
        for (let i = 1; i <= outside; i++) rotated.push(thetas[i] + Math.PI);
        walk(k, q0, view, rotated, lists);
        return {type, status: 'ok', pieces: toPieces(lists), markers: []};
    }
    // Asymptotic angles: Q(cos phi, sin phi) = 0, i.e. R cos(2 phi - delta) = -(A + C) / 2.
    const R = Math.hypot((k[0] - k[2]) / 2, k[1] / 2);
    const delta = Math.atan2(k[1] / 2, (k[0] - k[2]) / 2);
    const half = Math.acos(Math.max(-1, Math.min(1, -(k[0] + k[2]) / 2 / R)));
    const mod = (a: number) => ((a % Math.PI) + Math.PI) % Math.PI;
    const phis =
        type === 'parabola'
            ? [mod((delta + half) / 2)]
            : [mod((delta + half) / 2), mod((delta - half) / 2)].sort((a, b) => a - b);
    const intervals: [number, number][] =
        phis.length === 1
            ? [[phis[0], phis[0] + Math.PI]]
            : [
                  [phis[0], phis[1]],
                  [phis[1], phis[0] + Math.PI],
              ];
    for (const [lo, hi] of intervals) {
        const n = Math.max(2, Math.round((density * (hi - lo)) / Math.PI));
        // Open interval: the asymptotic angles themselves are excluded. The tangent at Q0 lies in one interval and is
        // continuous there (P = Q0), so it needs no special case.
        const step = (hi - lo) / n;
        const thetas = Array.from({length: n - 1}, (_, i) => lo + (i + 1) * step);
        // Geometric samples toward each asymptotic angle: a branch crossing the view close to an asymptote (a narrow
        // hyperbola, or one with a distant centre) occupies a tiny angle range there.
        for (let j = 1; j <= END_LEVELS; j++) {
            thetas.unshift(lo + step * 2 ** -j);
            thetas.push(hi - step * 2 ** -j);
        }
        walk(k, q0, view, thetas, lists);
    }
    return {type, status: 'ok', pieces: toPieces(lists), markers: []};
}

/** The part of the line through (px, py) with direction (dx, dy) inside the view, as a two-point piece, or null. */
function clipLine(view: SamplerView, px: number, py: number, dx: number, dy: number): ConicPiece | null {
    let t0 = -Infinity;
    let t1 = Infinity;
    const slab = (p: number, d: number, lo: number, hi: number): boolean => {
        if (d === 0) return p >= lo && p <= hi;
        let a = (lo - p) / d;
        let b = (hi - p) / d;
        if (a > b) [a, b] = [b, a];
        t0 = Math.max(t0, a);
        t1 = Math.min(t1, b);
        return true;
    };
    if (!slab(px, dx, view.xMin, view.xMax) || !slab(py, dy, view.yMin, view.yMax) || t0 > t1) return null;
    return {
        points: [
            {x: px + t0 * dx, y: py + t0 * dy},
            {x: px + t1 * dx, y: py + t1 * dy},
        ],
        closed: false,
    };
}

type LineSpec = readonly [number, number, number, number]; // point x, point y, direction x, direction y

function segments(type: ConicType, lines: readonly LineSpec[], view: SamplerView): SampledConic {
    const pieces: ConicPiece[] = [];
    for (const [px, py, dx, dy] of lines) {
        const p = clipLine(view, px, py, dx, dy);
        if (p) pieces.push(p);
    }
    return {type, status: 'ok', pieces, markers: []};
}

/** The line {n . p = t}, n a unit normal. */
function normalLine(nx: number, ny: number, t: number): LineSpec {
    return [nx * t, ny * t, -ny, nx];
}

/**
 * Sample a conic for drawing within `view`. `density` is the number of pencil directions per half turn
 * (default {@link DEFAULT_SAMPLE_DENSITY}). May return no pieces if the view misses the conic.
 */
export function sampleConic(c: Conic, view: SamplerView, density: number = DEFAULT_SAMPLE_DENSITY): SampledConic {
    if (!Number.isInteger(density) || density < 2) {
        throw new RangeError(`density must be an integer >= 2, got ${density}`);
    }
    const type = classify(c);
    const k = c.map(Number) as unknown as Coef;
    const [A, B, C, D, E, F] = k;
    switch (type) {
        case 'ellipse':
        case 'circle':
        case 'parabola':
        case 'hyperbola':
            return sampleSmooth(type, k, view, density);
        case 'empty':
            return {type, status: 'empty', pieces: [], markers: []};
        case 'point': {
            const det = 4 * A * C - B * B;
            return {
                type,
                status: 'point',
                pieces: [],
                markers: [{x: (B * E - 2 * C * D) / det, y: (B * D - 2 * A * E) / det}],
            };
        }
        case 'double-line': {
            // f = (1/sq) (nx x + ny y + lin)^2, taking the larger of A, C; A = C = 0 is the line at infinity w^2.
            let nx: number;
            let ny: number;
            let lin: number;
            if (A !== 0 && Math.abs(A) >= Math.abs(C)) [nx, ny, lin] = [A, B / 2, D / 2];
            else if (C !== 0) [nx, ny, lin] = [B / 2, C, E / 2];
            else return {type, status: 'empty', pieces: [], markers: []};
            const len = Math.hypot(nx, ny);
            return segments(type, [normalLine(nx / len, ny / len, -lin / len)], view);
        }
        case 'parallel-lines': {
            // The quadratic part is kq (n . p)^2 and (D, E) is parallel to n, so f = kq u^2 + m u + F with u = n . p.
            const useX = Math.abs(A) >= Math.abs(C);
            const nx0 = useX ? A : B / 2;
            const ny0 = useX ? B / 2 : C;
            const len = Math.hypot(nx0, ny0);
            const nx = nx0 / len;
            const ny = ny0 / len;
            const kq = Math.abs(nx) >= Math.abs(ny) ? A / (nx * nx) : C / (ny * ny);
            const m = D * nx + E * ny;
            const r = Math.sqrt(Math.max(0, m * m - 4 * kq * F));
            return segments(
                type,
                [normalLine(nx, ny, (-m + r) / (2 * kq)), normalLine(nx, ny, (-m - r) / (2 * kq))],
                view,
            );
        }
        case 'line-pair': {
            if (A === 0 && B === 0 && C === 0) {
                // w (D x + E y + F w): only the finite line D x + E y + F = 0 is drawn.
                const len = Math.hypot(D, E);
                return segments(type, [normalLine(D / len, E / len, -F / len)], view);
            }
            const det = 4 * A * C - B * B;
            const px = (B * E - 2 * C * D) / det;
            const py = (B * D - 2 * A * E) / det;
            const R = Math.hypot((A - C) / 2, B / 2);
            const delta = Math.atan2(B / 2, (A - C) / 2);
            const half = Math.acos(Math.max(-1, Math.min(1, -(A + C) / 2 / R)));
            const dirs = [(delta + half) / 2, (delta - half) / 2];
            return segments(
                type,
                dirs.map((p): LineSpec => [px, py, Math.cos(p), Math.sin(p)]),
                view,
            );
        }
    }
}
