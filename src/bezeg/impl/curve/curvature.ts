/**
 * Pure planar curvature kernel on plain numbers (no Points, JSXGraph, React, caches or mutable state).
 * Contract: docs/specs/curve-geometry-lessons.md, "Curvature kernel".
 *
 * Conventions. Plane curve r(t) with r'(t) != 0, unit tangent T = r'/|r'|, LEFT unit normal N = (-Ty, Tx),
 * signed curvature kappa = (x'y'' - y'x'') / |r'|^3 (positive for a counter-clockwise turn), centre of
 * curvature r + N/kappa. The app's PH offset uses the RIGHT normal N_R = -N: r_d = r + d*N_R has
 * r_d' = |r'| (1 + d*kappa) T (see {@link OFFSET_NORMAL_SIGN}, {@link offsetNormal}).
 *
 * Deviations from the spec's sketch signatures (documented in docs/reviews/curve-geometry/cg-1-kernel.md):
 * a {@link DerivativeSource} also yields the point r(t) and a length `scale` for relative tolerances;
 * `combAtJoin` takes `{source, t}` per side; `cuspParameters` takes the source and the sample parameters.
 */
import {deCasteljauInPlace} from "../kernels/bezier-kernels";

export type Vec2 = readonly [number, number];

/** r, r' and r'' at one parameter value. */
export interface DerivativeTuple {
    point: Vec2;
    d1: Vec2;
    d2: Vec2;
}

/** A curve (or one span of it) as a function of its parameter, plus a length scale for tolerances. */
export interface DerivativeSource {
    at(t: number): DerivativeTuple;
    /** Characteristic length (e.g. control-polygon extent); tolerances are relative to it. */
    scale: number;
}

/** Offset r + d*N_R uses the right normal N_R = OFFSET_NORMAL_SIGN * N (N = left normal). */
export const OFFSET_NORMAL_SIGN = -1;
/** Comb tooth tip = base + COMB_TOOTH_SIGN * gain * kappa * N: away from the centre of curvature. */
export const COMB_TOOTH_SIGN = -1;
export const COMB_MIN_COUNT = 8;
export const COMB_MAX_COUNT = 256;
/** Singular when |r'| <= SPEED_EPS * scale. */
export const SPEED_EPS = 1e-9;
/** Line (infinite radius) when |kappa| * scale <= KAPPA_EPS. */
export const KAPPA_EPS = 1e-9;

export type CurvatureResult =
    | { kind: 'regular', kappa: number, speed: number, tangent: Vec2, normal: Vec2 }
    | { kind: 'singular', speed: number };

export type OsculatingCircle =
    | { kind: 'circle', centre: Vec2, radius: number, kappa: number }
    | { kind: 'line' }
    | { kind: 'singular' };

export interface CombTooth {
    t: number;
    base: Vec2;
    tip: Vec2;
    kappa: number;
    /** True when the tooth was shortened to the visible maximum; the UI marks it. `kappa` stays unclamped. */
    clipped: boolean;
}

export interface JoinSide {
    source: DerivativeSource;
    /** Parameter of the join in this span's own parametrization. */
    t: number;
}

export interface JoinCurvature {
    kappaLeft: number | undefined;
    kappaRight: number | undefined;
    /** kappaRight - kappaLeft; undefined when either side is singular. */
    jump: number | undefined;
}

/** The right-normal convention as one function: maps the left normal N to the offset normal N_R. */
export function offsetNormal(normal: Vec2): Vec2 {
    return [OFFSET_NORMAL_SIGN * normal[0], OFFSET_NORMAL_SIGN * normal[1]];
}

export function curvatureAt(d1: Vec2, d2: Vec2, scale = 1): CurvatureResult {
    const speed = Math.hypot(d1[0], d1[1]);
    if (!Number.isFinite(speed) || speed === 0 || speed <= SPEED_EPS * scale) {
        return {kind: 'singular', speed: Number.isFinite(speed) ? speed : 0};
    }
    const kappa = (d1[0] * d2[1] - d1[1] * d2[0]) / (speed * speed * speed);
    if (!Number.isFinite(kappa)) {
        return {kind: 'singular', speed};
    }
    const tangent: Vec2 = [d1[0] / speed, d1[1] / speed];
    return {kind: 'regular', kappa, speed, tangent, normal: [-tangent[1], tangent[0]]};
}

export function osculatingCircle(r: Vec2, d1: Vec2, d2: Vec2, scale = 1): OsculatingCircle {
    const c = curvatureAt(d1, d2, scale);
    if (c.kind === 'singular') {
        return {kind: 'singular'};
    }
    if (Math.abs(c.kappa) * scale <= KAPPA_EPS) {
        return {kind: 'line'};
    }
    return {
        kind: 'circle',
        centre: [r[0] + c.normal[0] / c.kappa, r[1] + c.normal[1] / c.kappa],
        radius: 1 / Math.abs(c.kappa),
        kappa: c.kappa,
    };
}

/** Default visible maximum tooth length, as a multiple of the source's length scale. */
export const COMB_MAX_TOOTH_FACTOR = 1;

/**
 * Comb teeth at `count` (clamped to 8..256) equally spaced parameters of [t0, t1]; singular samples are omitted.
 * Tooth length gain*|kappa| is clipped to `maxLength` (default COMB_MAX_TOOTH_FACTOR * scale) and flagged.
 */
export function sampleComb(source: DerivativeSource, t0: number, t1: number, count: number, gain: number,
                           maxLength: number = COMB_MAX_TOOTH_FACTOR * source.scale): CombTooth[] {
    if (!Number.isFinite(gain) || !(maxLength >= 0) || !Number.isFinite(maxLength)) {
        throw new RangeError("sampleComb needs a finite gain and a finite, non-negative maxLength.");
    }
    const n = Math.min(COMB_MAX_COUNT, Math.max(COMB_MIN_COUNT, Math.round(Number.isFinite(count) ? count : COMB_MIN_COUNT)));
    const teeth: CombTooth[] = [];
    for (let i = 0; i < n; i++) {
        const t = t0 + (t1 - t0) * i / (n - 1);
        const {point, d1, d2} = source.at(t);
        const c = curvatureAt(d1, d2, source.scale);
        if (c.kind === 'singular') {
            continue;
        }
        const raw = COMB_TOOTH_SIGN * gain * c.kappa;
        const clipped = Math.abs(raw) > maxLength;
        const len = clipped ? Math.sign(raw) * maxLength : raw;
        teeth.push({t, base: point, tip: [point[0] + len * c.normal[0], point[1] + len * c.normal[1]], kappa: c.kappa, clipped});
    }
    return teeth;
}

function kappaOf(side: JoinSide): number | undefined {
    const {d1, d2} = side.source.at(side.t);
    const c = curvatureAt(d1, d2, side.source.scale);
    return c.kind === 'regular' ? c.kappa : undefined;
}

/** One-sided curvatures at a spline join: `left` is the end of the left span, `right` the start of the right span. */
export function combAtJoin(left: JoinSide, right: JoinSide): JoinCurvature {
    const kappaLeft = kappaOf(left);
    const kappaRight = kappaOf(right);
    const jump = kappaLeft === undefined || kappaRight === undefined ? undefined : kappaRight - kappaLeft;
    return {kappaLeft, kappaRight, jump};
}

/** r + d*N_R, with N the LEFT unit normal. */
export function offsetPoint(r: Vec2, normal: Vec2, d: number): Vec2 {
    const nr = offsetNormal(normal);
    return [r[0] + d * nr[0], r[1] + d * nr[1]];
}

/** r_d' = |r'| * (1 + d*kappa) T for the right-normal offset: the offset is regular where this is nonzero. */
export function offsetSpeedFactor(kappa: number, d: number): number {
    return 1 + d * kappa;
}

/**
 * A refined local minimum of f = 1 + d*kappa is a tangential cusp when it is within this many units of 0, scaled by
 * 1 + |d*kappa| (f is dimensionless; the factor admits the rounding noise of a large d*kappa). A double root locates t
 * only to about sqrt(machine epsilon) (f ~ c*x^2 and f is evaluated to about 1e-16), i.e. ~1e-8, inside the 1e-6 the
 * lessons need. A real near miss such as d = -0.49 on y = x^2 leaves f = 0.02, many orders above this.
 */
export const TANGENT_CUSP_TOLERANCE = 1e-9;
/** Cusp parameters closer than this fraction of the sampled parameter range are one cusp. */
export const CUSP_MERGE_FRACTION = 1e-7;

/**
 * Parameters where 1 + d*kappa vanishes between regular samples `ts`, sorted. Sign changes between consecutive samples
 * are refined by bisection. A tangential zero (a double root, where f touches 0 without changing sign) is found as an
 * interior local minimum of |f| between three same-signed regular samples, refined by golden section and accepted when
 * |f| <= TANGENT_CUSP_TOLERANCE * (1 + |d*kappa|); if the refined minimum has crossed zero, the two roots are bisected.
 * Intervals touching a singular sample are skipped. Roots within CUSP_MERGE_FRACTION of the range are merged.
 */
export function cuspParameters(source: DerivativeSource, ts: ReadonlyArray<number>, d: number): number[] {
    const factor = (t: number): number | undefined => {
        const {d1, d2} = source.at(t);
        const c = curvatureAt(d1, d2, source.scale);
        return c.kind === 'regular' ? offsetSpeedFactor(c.kappa, d) : undefined;
    };
    const bisect = (a: number, b: number, fa: number): number => {
        let lo = a;
        let hi = b;
        let fLo = fa;
        for (let i = 0; i < 80; i++) {
            const mid = (lo + hi) / 2;
            const fm = factor(mid);
            if (fm === undefined || fm === 0) {
                lo = hi = mid;
                break;
            }
            if ((fm < 0) === (fLo < 0)) {
                lo = mid;
                fLo = fm;
            } else {
                hi = mid;
            }
        }
        return (lo + hi) / 2;
    };
    const fs = ts.map(factor);
    const roots: number[] = [];
    for (let i = 1; i < ts.length; i++) {
        const prevF = fs[i - 1];
        const f = fs[i];
        if (f !== undefined && prevF !== undefined && prevF !== 0 && (f === 0 || (f < 0) !== (prevF < 0))) {
            roots.push(bisect(ts[i - 1], ts[i], prevF));
        }
    }
    // Tangential zeros: strict local minimum of |f| over three same-signed regular samples.
    for (let i = 1; i + 1 < ts.length; i++) {
        const fa = fs[i - 1];
        const fb = fs[i];
        const fc = fs[i + 1];
        if (fa === undefined || fb === undefined || fc === undefined || fb === 0) continue;
        const sign = fb < 0 ? -1 : 1;
        if (fa * sign <= 0 || fc * sign <= 0) continue;
        if (!(fb * sign <= fa * sign && fb * sign <= fc * sign && (fb * sign < fa * sign || fb * sign < fc * sign))) continue;
        const g = (t: number): number => {
            const v = factor(t);
            return v === undefined ? Infinity : sign * v;
        };
        let lo = ts[i - 1];
        let hi = ts[i + 1];
        const inv = (Math.sqrt(5) - 1) / 2;
        let x1 = hi - inv * (hi - lo);
        let x2 = lo + inv * (hi - lo);
        let g1 = g(x1);
        let g2 = g(x2);
        for (let k = 0; k < 80; k++) {
            if (g1 <= g2) {
                hi = x2; x2 = x1; g2 = g1;
                x1 = hi - inv * (hi - lo);
                g1 = g(x1);
            } else {
                lo = x1; x1 = x2; g1 = g2;
                x2 = lo + inv * (hi - lo);
                g2 = g(x2);
            }
        }
        const tm = (lo + hi) / 2;
        const gm = g(tm);
        if (!Number.isFinite(gm)) continue;
        if (gm < 0) {
            roots.push(bisect(ts[i - 1], tm, fa), bisect(tm, ts[i + 1], sign * gm));
        } else {
            const {d1, d2} = source.at(tm);
            const c = curvatureAt(d1, d2, source.scale);
            const dk = c.kind === 'regular' ? Math.abs(d * c.kappa) : 0;
            if (gm <= TANGENT_CUSP_TOLERANCE * (1 + dk)) roots.push(tm);
        }
    }
    roots.sort((p, q) => p - q);
    const range = ts.length > 1 ? Math.abs(ts[ts.length - 1] - ts[0]) : 0;
    const merged: number[] = [];
    for (const r of roots) {
        if (merged.length > 0 && r - merged[merged.length - 1] <= CUSP_MERGE_FRACTION * range) continue;
        merged.push(r);
    }
    return merged;
}

/** Centre of curvature r + N/kappa; undefined (not infinite) where |kappa| * scale <= KAPPA_EPS. */
export function evolutePoint(r: Vec2, normal: Vec2, kappa: number, scale = 1): Vec2 | undefined {
    if (!Number.isFinite(kappa) || Math.abs(kappa) * scale <= KAPPA_EPS) {
        return undefined;
    }
    return [r[0] + normal[0] / kappa, r[1] + normal[1] / kappa];
}

// ---- Derivative sources ----

/** Planar rows: [x, y], or [x, y, 0]; a nonzero third coordinate (or any other length) is rejected. */
function planarRows(rows: ReadonlyArray<ReadonlyArray<number>>): Vec2[] {
    if (rows.length === 0) {
        throw new Error("Curvature needs at least one control point.");
    }
    return rows.map(row => {
        if (row.length === 2 || (row.length === 3 && row[2] === 0)) {
            return [row[0], row[1]] as Vec2;
        }
        throw new Error("Curvature only supports planar control points [x, y] (nonzero height is not supported).");
    });
}

function extent(rows: ReadonlyArray<Vec2>): number {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of rows) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    }
    const size = Math.hypot(maxX - minX, maxY - minY);
    return size > 0 ? size : 1;
}

function evalRows(t: number, rows: number[][]): number[] {
    const copy = rows.map(r => [...r]);
    deCasteljauInPlace(t, copy);
    return copy[0];
}

function differences(rows: number[][]): number[][] {
    return rows.slice(1).map((row, i) => row.map((v, k) => v - rows[i][k]));
}

/** Value, first and second derivative (hodograph) of a polynomial Bezier in rows of any width. */
function polyDerivatives(rows: number[][], t: number): { p: number[], d1: number[], d2: number[] } {
    const n = rows.length - 1;
    const zero = new Array<number>(rows[0].length).fill(0);
    const p = evalRows(t, rows);
    if (n < 1) {
        return {p, d1: zero, d2: zero};
    }
    const delta = differences(rows);
    const d1 = evalRows(t, delta).map(v => n * v);
    if (n < 2) {
        return {p, d1, d2: zero};
    }
    const d2 = evalRows(t, differences(delta)).map(v => n * (n - 1) * v);
    return {p, d1, d2};
}

/** Source of a polynomial Bezier on [0, 1]: r' = n sum db B^(n-1), r'' = n(n-1) sum d2b B^(n-2). */
export function polynomialBezierSource(controlPoints: ReadonlyArray<ReadonlyArray<number>>): DerivativeSource {
    const pts = planarRows(controlPoints);
    const rows = pts.map(p => [p[0], p[1]]);
    return {
        scale: extent(pts),
        at(t) {
            const {p, d1, d2} = polyDerivatives(rows, t);
            return {point: [p[0], p[1]], d1: [d1[0], d1[1]], d2: [d2[0], d2[1]]};
        },
    };
}

/** Source of a rational Bezier on [0, 1] via the quotient rule on the homogeneous form (A = w*C). */
export function rationalBezierSource(controlPoints: ReadonlyArray<ReadonlyArray<number>>, weights: ReadonlyArray<number>): DerivativeSource {
    const pts = planarRows(controlPoints);
    if (weights.length !== pts.length) {
        throw new Error("Rational curvature needs one weight per control point.");
    }
    const homogeneous = pts.map((p, i) => [weights[i] * p[0], weights[i] * p[1], weights[i]]);
    return {
        scale: extent(pts),
        at(t) {
            const {p: a, d1: a1, d2: a2} = polyDerivatives(homogeneous, t);
            const w = a[2], w1 = a1[2], w2 = a2[2];
            if (!(Math.abs(w) > 0) || !Number.isFinite(w)) {
                return {point: [0, 0], d1: [0, 0], d2: [0, 0]};
            }
            const cx = a[0] / w, cy = a[1] / w;
            const c1x = (a1[0] - w1 * cx) / w, c1y = (a1[1] - w1 * cy) / w;
            const c2x = (a2[0] - 2 * w1 * c1x - w2 * cx) / w, c2y = (a2[1] - 2 * w1 * c1y - w2 * cy) / w;
            return {point: [cx, cy], d1: [c1x, c1y], d2: [c2x, c2y]};
        },
    };
}

/**
 * Source of one spline span given as its plain control rows (optionally weights) over the global
 * parameter interval [tStart, tEnd]: local u = (t - tStart)/(tEnd - tStart), so r' = r_u/h, r'' = r_uu/h^2.
 */
export function splineSpanSource(
    controlPoints: ReadonlyArray<ReadonlyArray<number>>,
    tStart: number,
    tEnd: number,
    weights?: ReadonlyArray<number>,
): DerivativeSource {
    const h = tEnd - tStart;
    if (!(h > 0) || !Number.isFinite(h)) {
        throw new Error("A spline span needs tEnd > tStart.");
    }
    const local = weights ? rationalBezierSource(controlPoints, weights) : polynomialBezierSource(controlPoints);
    return {
        scale: local.scale,
        at(t) {
            const {point, d1, d2} = local.at((t - tStart) / h);
            return {point, d1: [d1[0] / h, d1[1] / h], d2: [d2[0] / (h * h), d2[1] / (h * h)]};
        },
    };
}
