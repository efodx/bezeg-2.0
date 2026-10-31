import {elevate} from "./bezier-kernels";

/**
 * Degree reduction of a cubic Bézier net to a quadratic (advanced Bézier lessons, D1; ADR 0028).
 * Reduction is an approximation, not an inverse of elevation. Two objectives, both in the L2 norm
 * over t in [0, 1] of the curve difference:
 *  - "fixed": end points kept, q0 = b0 and q2 = b3 (this equals Forrest's q1 = (3(b1+b2) - b0 - b3)/4);
 *  - "free": all three quadratic control points are optimized, so the end points move.
 * Points are plain coordinate tuples of any (equal) dimension.
 */
export type ReductionMode = "fixed" | "free";

/** Relative tolerance of `isExactlyReducible`, measured against the control-point scale. */
export const REDUCIBLE_TOLERANCE = 1e-9;

/** Number of equal intervals used by `maxCurveError` (so 2001 sample parameters). */
export const MAX_ERROR_SAMPLES = 2000;

type Net = number[][];

function validate(rows: Net, count: number, name: string): void {
    if (!Array.isArray(rows) || rows.length !== count) {
        throw new RangeError(`${name} needs exactly ${count} control points, got ${Array.isArray(rows) ? rows.length : "none"}`);
    }
    const dim = rows[0]?.length;
    if (!dim) throw new RangeError(`${name} control points need at least one coordinate`);
    for (const row of rows) {
        if (row.length !== dim) throw new RangeError(`${name} control points must all have the same dimension`);
        if (!row.every(Number.isFinite)) throw new RangeError(`${name} control points must be finite numbers`);
    }
}

function binomial(n: number, k: number): number {
    let r = 1;
    for (let i = 1; i <= k; i++) r = r * (n - k + i) / i;
    return r;
}

/** Gram matrix of the cubic Bernstein basis: integral of B_i B_j over [0, 1]. */
const GRAM: number[][] = [0, 1, 2, 3].map(i => [0, 1, 2, 3].map(j => binomial(3, i) * binomial(3, j) / (binomial(6, i + j) * 7)));

/** Elevation matrix: cubic control point i as a combination of the quadratic's q0, q1, q2. */
const ELEVATION: number[][] = [[1, 0, 0], [1 / 3, 2 / 3, 0], [0, 2 / 3, 1 / 3], [0, 0, 1]];

/** Third forward difference b3 - 3 b2 + 3 b1 - b0; zero exactly when the cubic is a quadratic. */
export function thirdDifference(cubic: Net): number[] {
    validate(cubic, 4, "cubic");
    return cubic[0].map((_, d) => cubic[3][d] - 3 * cubic[2][d] + 3 * cubic[1][d] - cubic[0][d]);
}

/** Control-point scale: the largest bounding-box edge of the net (translation-invariant). */
function extent(cubic: Net): number {
    let e = 0;
    for (let d = 0; d < cubic[0].length; d++) {
        const xs = cubic.map(p => p[d]);
        e = Math.max(e, Math.max(...xs) - Math.min(...xs));
    }
    return e;
}

/**
 * True when |third difference| <= REDUCIBLE_TOLERANCE * extent + 8 eps * max|coordinate|, where the
 * extent is the largest bounding-box edge of the control points. The third difference is
 * translation-invariant (its coefficients sum to 0), so the tolerance is too; the second term only
 * absorbs rounding of coordinates far from the origin. Coincident points (extent 0) are reducible.
 * A tolerance test, not exact equality.
 */
export function isExactlyReducible(cubic: Net): boolean {
    const diff = thirdDifference(cubic);
    const maxAbs = Math.max(...cubic.flat().map(Math.abs));
    return Math.hypot(...diff) <= REDUCIBLE_TOLERANCE * extent(cubic) + 8 * Number.EPSILON * maxAbs;
}

/** Solves the small dense system A x = rhs (Gaussian elimination, partial pivoting). */
function solve(a: number[][], rhs: number[]): number[] {
    const n = rhs.length;
    const m = a.map((row, i) => [...row, rhs[i]]);
    for (let c = 0; c < n; c++) {
        let p = c;
        for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
        [m[c], m[p]] = [m[p], m[c]];
        for (let r = c + 1; r < n; r++) {
            const f = m[r][c] / m[c][c];
            for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
        }
    }
    const x = new Array<number>(n).fill(0);
    for (let r = n - 1; r >= 0; r--) {
        let s = m[r][n];
        for (let k = r + 1; k < n; k++) s -= m[r][k] * x[k];
        x[r] = s / m[r][r];
    }
    return x;
}

/** Normal-equation parts: a = E^T G E (3x3) and w = E^T G (3x4). */
function normalParts(): { a: number[][]; w: number[][] } {
    const w = [0, 1, 2].map(j => [0, 1, 2, 3].map(k => [0, 1, 2, 3].reduce((s, i) => s + ELEVATION[i][j] * GRAM[i][k], 0)));
    const a = [0, 1, 2].map(i => [0, 1, 2].map(j => [0, 1, 2, 3].reduce((s, k) => s + w[i][k] * ELEVATION[k][j], 0)));
    return {a, w};
}

/** The L2-best quadratic (3 control points) for the cubic under the chosen mode's constraints. */
export function reduce(cubic: Net, mode: ReductionMode): Net {
    validate(cubic, 4, "cubic");
    const {a, w} = normalParts();
    const dim = cubic[0].length;
    const q: Net = [[], [], []];
    for (let d = 0; d < dim; d++) {
        const b = cubic.map(row => row[d]);
        if (mode === "fixed") {
            const q0 = b[0];
            const q2 = b[3];
            // Only q1 is free: minimize over the middle column of E.
            const rhs = [0, 1, 2, 3].reduce((s, k) => s + w[1][k] * b[k], 0) - a[1][0] * q0 - a[1][2] * q2;
            q[0].push(q0);
            q[1].push(rhs / a[1][1]);
            q[2].push(q2);
        } else {
            const rhs = [0, 1, 2].map(j => [0, 1, 2, 3].reduce((s, k) => s + w[j][k] * b[k], 0));
            const x = solve(a, rhs);
            x.forEach((v, j) => q[j].push(v));
        }
    }
    return q;
}

/** Cubic net of the quadratic (degree elevation, exact). */
export function elevatedQuadratic(quadratic: Net): Net {
    validate(quadratic, 3, "quadratic");
    return elevate(quadratic);
}

function bernstein(n: number, t: number): number[] {
    return Array.from({length: n + 1}, (_, i) => binomial(n, i) * t ** i * (1 - t) ** (n - i));
}

function evaluate(net: Net, t: number): number[] {
    const basis = bernstein(net.length - 1, t);
    return net[0].map((_, d) => net.reduce((s, row, i) => s + basis[i] * row[d], 0));
}

/** Maximum |B(t) - Q(t)| over MAX_ERROR_SAMPLES + 1 equally spaced parameters (a lower bound, accurate to about 1e-7). */
export function maxCurveError(cubic: Net, quadratic: Net): number {
    validate(cubic, 4, "cubic");
    validate(quadratic, 3, "quadratic");
    let max = 0;
    for (let s = 0; s <= MAX_ERROR_SAMPLES; s++) {
        const t = s / MAX_ERROR_SAMPLES;
        const p = evaluate(cubic, t);
        const r = evaluate(quadratic, t);
        max = Math.max(max, Math.hypot(...p.map((v, d) => v - r[d])));
    }
    return max;
}

/** Exact L2 error (integral over [0,1] of |B - Q|^2)^(1/2), via the cubic Bernstein Gram matrix of the elevated difference. */
export function l2Error(cubic: Net, quadratic: Net): number {
    validate(cubic, 4, "cubic");
    validate(quadratic, 3, "quadratic");
    const elevated = elevate(quadratic);
    let sum = 0;
    for (let d = 0; d < cubic[0].length; d++) {
        const diff = cubic.map((row, i) => row[d] - elevated[i][d]);
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) sum += diff[i] * GRAM[i][j] * diff[j];
    }
    return Math.sqrt(Math.max(0, sum));
}

/** Max distance between corresponding control points of the cubic and the elevated quadratic; bounds the curve error. */
export function controlPointBound(cubic: Net, quadratic: Net): number {
    validate(cubic, 4, "cubic");
    validate(quadratic, 3, "quadratic");
    const elevated = elevate(quadratic);
    return Math.max(...cubic.map((row, i) => Math.hypot(...row.map((v, d) => v - elevated[i][d]))));
}
