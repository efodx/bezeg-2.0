/**
 * Arc-length kernel (AB-1b, spec D3 in docs/specs/advanced-bezier-lessons.md; ADR 0028 item 4).
 *
 * Pure numerics on a {@link DerivativeSource}: s(t) = integral of |r'(u)| du by composite Gauss-Legendre
 * quadrature, an s(t) table, the inverse t(s) (Newton safeguarded by bisection) and equal-arc parameters.
 * The exact PH s(t) in ph-bezier-curve.ts is not used here; it is only a test oracle.
 * A cusp (|r'| <= SPEED_EPS * scale at some parameter) is reported in the result `status`, never divided by.
 */
import {type DerivativeSource, polynomialBezierSource, SPEED_EPS, type Vec2} from "../curve/curvature";

/** Default Gauss-Legendre order per subinterval; show it next to numerical lengths (spec D3 acceptance 5). */
export const GAUSS_LEGENDRE_ORDER = 24;
/** Default number of subintervals of the s(t) table. */
export const TABLE_SUBINTERVALS = 32;
/** Inversion tolerance on the residual |s(t) - target|, relative to max(1, L). */
export const INVERSION_TOLERANCE = 1e-12;
const MAX_ORDER = 64;
const MAX_SUBINTERVALS = 4096;
const MAX_PIECES = 4096;

export interface QuadratureOptions {
    /** Gauss-Legendre points per subinterval (default {@link GAUSS_LEGENDRE_ORDER}). */
    order?: number;
    /** Equal subintervals of the integration range (default 1). */
    subintervals?: number;
}

export interface GaussLegendreRule {
    /** Nodes on [-1, 1], ascending. */
    nodes: number[];
    weights: number[];
}

const ruleCache = new Map<number, GaussLegendreRule>();

function checkInt(name: string, v: number, min: number, max: number): void {
    if (!Number.isInteger(v) || v < min || v > max) {
        throw new RangeError(`${name} must be an integer in [${min}, ${max}], got ${v}.`);
    }
}

/** n-point Gauss-Legendre nodes and weights (roots of P_n by Newton iteration), exact for degree 2n-1. */
export function gaussLegendre(n: number = GAUSS_LEGENDRE_ORDER): GaussLegendreRule {
    checkInt("Gauss-Legendre order", n, 1, MAX_ORDER);
    const cached = ruleCache.get(n);
    if (cached) {
        return cached;
    }
    const nodes: number[] = new Array(n);
    const weights: number[] = new Array(n);
    for (let i = 0; i < Math.ceil(n / 2); i++) {
        let x = Math.cos(Math.PI * (i + 0.75) / (n + 0.5));
        let dp = 1;
        for (let iter = 0; iter < 100; iter++) {
            let p0 = 1, p1 = x;
            for (let k = 2; k <= n; k++) {
                const p2 = ((2 * k - 1) * x * p1 - (k - 1) * p0) / k;
                p0 = p1;
                p1 = p2;
            }
            // p1 = P_n(x), p0 = P_(n-1)(x) (for n = 1: P_1 = x, P_0 = 1)
            dp = n * (x * p1 - p0) / (x * x - 1);
            const dx = p1 / dp;
            x -= dx;
            if (Math.abs(dx) < 1e-16) {
                break;
            }
        }
        const w = 2 / ((1 - x * x) * dp * dp);
        nodes[i] = -x;
        nodes[n - 1 - i] = x;
        weights[i] = w;
        weights[n - 1 - i] = w;
    }
    const rule = {nodes, weights};
    ruleCache.set(n, rule);
    return rule;
}

/** |r'(t)|. */
export function speedAt(source: DerivativeSource, t: number): number {
    const [x, y] = source.at(t).d1;
    return Math.hypot(x, y);
}

/** Integral of the speed over [a, b] (a <= b), composite Gauss-Legendre. */
export function arcLengthBetween(source: DerivativeSource, a: number, b: number, options: QuadratureOptions = {}): number {
    const order = options.order ?? GAUSS_LEGENDRE_ORDER;
    const m = options.subintervals ?? 1;
    checkInt("Subintervals", m, 1, MAX_SUBINTERVALS);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) {
        throw new RangeError(`Arc length needs finite a <= b, got [${a}, ${b}].`);
    }
    const {nodes, weights} = gaussLegendre(order);
    const h = (b - a) / m;
    let total = 0;
    for (let j = 0; j < m; j++) {
        const mid = a + (j + 0.5) * h;
        let sub = 0;
        for (let i = 0; i < nodes.length; i++) {
            sub += weights[i] * speedAt(source, mid + 0.5 * h * nodes[i]);
        }
        total += 0.5 * h * sub;
    }
    return total;
}

export type ArcLengthStatus =
    | { kind: 'regular' }
    /** Parameters where |r'| <= SPEED_EPS * scale (isolated speed zeros: a cusp or a stop). */
    | { kind: 'cusp', parameters: number[] };

/**
 * Finds parameters in [0, 1] where the speed vanishes within SPEED_EPS * scale: scans `samples` points and
 * refines each local minimum of the speed by golden-section search.
 */
export function findCusps(source: DerivativeSource, samples = 256): number[] {
    checkInt("Samples", samples, 2, 65536);
    const tol = SPEED_EPS * source.scale;
    const v: number[] = [];
    for (let i = 0; i <= samples; i++) {
        v.push(speedAt(source, i / samples));
    }
    const found: number[] = [];
    const phi = (Math.sqrt(5) - 1) / 2;
    for (let i = 0; i <= samples; i++) {
        const isMin = (i === 0 || v[i] <= v[i - 1]) && (i === samples || v[i] <= v[i + 1]);
        if (!isMin) {
            continue;
        }
        let best = i / samples;
        let bestV = v[i];
        if (bestV > tol) {
            let lo = Math.max(0, (i - 1) / samples), hi = Math.min(1, (i + 1) / samples);
            for (let k = 0; k < 80; k++) {
                const x1 = hi - phi * (hi - lo), x2 = lo + phi * (hi - lo);
                if (speedAt(source, x1) < speedAt(source, x2)) {
                    hi = x2;
                } else {
                    lo = x1;
                }
            }
            best = 0.5 * (lo + hi);
            bestV = speedAt(source, best);
        }
        if (bestV <= tol && !found.some(f => Math.abs(f - best) < 2 / samples)) {
            found.push(best);
        }
    }
    return found;
}

/** s(t) table on equal knots of [0, 1]; `cumulative[i]` = s(knot i) and `cumulative[last]` = L. */
export interface ArcLengthTable {
    source: DerivativeSource;
    order: number;
    subintervals: number;
    knots: number[];
    cumulative: number[];
    length: number;
    status: ArcLengthStatus;
}

/** Builds the table: one Gauss-Legendre panel of `order` points per subinterval. */
export function buildArcLengthTable(source: DerivativeSource, options: QuadratureOptions = {}): ArcLengthTable {
    const order = options.order ?? GAUSS_LEGENDRE_ORDER;
    const subintervals = options.subintervals ?? TABLE_SUBINTERVALS;
    checkInt("Subintervals", subintervals, 1, MAX_SUBINTERVALS);
    gaussLegendre(order);
    const knots: number[] = [];
    const cumulative: number[] = [0];
    for (let i = 0; i <= subintervals; i++) {
        knots.push(i / subintervals);
    }
    for (let i = 0; i < subintervals; i++) {
        cumulative.push(cumulative[i] + arcLengthBetween(source, knots[i], knots[i + 1], {order}));
    }
    const cusps = findCusps(source);
    return {
        source, order, subintervals, knots, cumulative,
        length: cumulative[subintervals],
        status: cusps.length > 0 ? {kind: 'cusp', parameters: cusps} : {kind: 'regular'},
    };
}

/** Table for a polynomial Bezier given by its control points (planar). */
export function arcLengthTableOfBezier(controlPoints: ReadonlyArray<ReadonlyArray<number>>, options: QuadratureOptions = {}): ArcLengthTable {
    return buildArcLengthTable(polynomialBezierSource(controlPoints), options);
}

/** s(t) for t in [0, 1]: table value at the knot below plus one panel. */
export function arcLengthAt(table: ArcLengthTable, t: number): number {
    if (!Number.isFinite(t) || t < 0 || t > 1) {
        throw new RangeError(`Parameter must lie in [0, 1], got ${t}.`);
    }
    const i = Math.min(table.subintervals - 1, Math.floor(t * table.subintervals));
    return table.cumulative[i] + arcLengthBetween(table.source, table.knots[i], t, {order: table.order});
}

/**
 * Inverse t(s) for s in [0, L]: Newton on s(t) - target inside a bracket, falling back to bisection when the
 * step leaves the bracket or the speed is below SPEED_EPS * scale (so an isolated speed zero does not stop it).
 * Stops when |s(t) - target| <= INVERSION_TOLERANCE * max(1, L) or the bracket is exhausted.
 */
export function parameterAtArcLength(table: ArcLengthTable, target: number): number {
    const L = table.length;
    if (!Number.isFinite(target) || target < 0 || target > L * (1 + 1e-12)) {
        throw new RangeError(`Arc length must lie in [0, ${L}], got ${target}.`);
    }
    if (target <= 0) {
        return 0;
    }
    if (target >= L) {
        return 1;
    }
    let k = 0;
    while (k < table.subintervals - 1 && table.cumulative[k + 1] < target) {
        k++;
    }
    let lo = table.knots[k], hi = table.knots[k + 1];
    let t = lo + (hi - lo) * (target - table.cumulative[k]) / Math.max(table.cumulative[k + 1] - table.cumulative[k], Number.MIN_VALUE);
    const tol = INVERSION_TOLERANCE * Math.max(1, L);
    const minSpeed = SPEED_EPS * table.source.scale;
    for (let iter = 0; iter < 200; iter++) {
        const r = table.cumulative[k] + arcLengthBetween(table.source, table.knots[k], t, {order: table.order}) - target;
        if (Math.abs(r) <= tol || hi - lo <= 1e-16) {
            return t;
        }
        if (r > 0) {
            hi = t;
        } else {
            lo = t;
        }
        const speed = speedAt(table.source, t);
        let next = speed > minSpeed ? t - r / speed : NaN;
        if (!(next > lo && next < hi)) {
            next = 0.5 * (lo + hi);
        }
        t = next;
    }
    return t;
}

export interface EqualArcResult {
    status: ArcLengthStatus;
    length: number;
    /** N + 1 parameters t_0 = 0, ..., t_N = 1 with s(t_i) = i L / N. */
    parameters: number[];
}

/** Parameters of N equal-arc pieces. */
export function equalArcParameters(table: ArcLengthTable, pieces: number): EqualArcResult {
    checkInt("Pieces", pieces, 1, MAX_PIECES);
    const parameters: number[] = [];
    for (let i = 0; i <= pieces; i++) {
        parameters.push(parameterAtArcLength(table, table.length * i / pieces));
    }
    return {status: table.status, length: table.length, parameters};
}

/** N + 1 equally spaced parameters 0, 1/N, ..., 1. */
export function equalParameterSteps(pieces: number): number[] {
    checkInt("Pieces", pieces, 1, MAX_PIECES);
    return Array.from({length: pieces + 1}, (_, i) => i / pieces);
}

/** Lengths of the chords between consecutive points r(parameters[i]). */
export function chordLengths(source: DerivativeSource, parameters: ReadonlyArray<number>): number[] {
    if (parameters.length < 2) {
        throw new RangeError("Chords need at least two parameters.");
    }
    const pts: Vec2[] = parameters.map(t => source.at(t).point);
    const out: number[] = [];
    for (let i = 0; i + 1 < pts.length; i++) {
        out.push(Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]));
    }
    return out;
}

/** Length of the inscribed polyline with N chords at equal parameter steps. */
export function inscribedPolylineLength(source: DerivativeSource, pieces: number): number {
    return chordLengths(source, equalParameterSteps(pieces)).reduce((a, b) => a + b, 0);
}

/** Bracket |b_n - b_0| <= L <= control polygon length. */
export function lengthBracket(controlPoints: ReadonlyArray<ReadonlyArray<number>>): { chord: number, polygon: number } {
    if (controlPoints.length < 2) {
        throw new RangeError("A curve needs at least two control points.");
    }
    const d = (a: ReadonlyArray<number>, b: ReadonlyArray<number>) => Math.hypot(b[0] - a[0], b[1] - a[1]);
    let polygon = 0;
    for (let i = 0; i + 1 < controlPoints.length; i++) {
        polygon += d(controlPoints[i], controlPoints[i + 1]);
    }
    return {chord: d(controlPoints[0], controlPoints[controlPoints.length - 1]), polygon};
}
