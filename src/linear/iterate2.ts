/**
 * Iteration v -> Av of a 2x2 matrix: the orbit with a step cap and overflow result, the power-method readouts and the
 * exact outcome class of lesson L6. Free of React, JSXGraph, localization and graph state.
 * Contract: the discrete classes (`iterationOutcome`, `startsOnOtherEigenvector`) require quarter-grid entries and
 * throw a RangeError otherwise; they are decided by exact integer arithmetic. Orbits and readouts are floating point.
 */
import {classifyEigen, gridInteger} from './eigen2';
import {apply, Mat2, Vec2} from './matrix2';

/** Largest number of steps `orbit` computes; a larger request is clamped and reported as `capped`. */
export const ORBIT_MAX_STEPS = 1000;
/** An iterate whose norm exceeds this is not stored; the orbit reports `overflow` instead of Infinity. */
export const ORBIT_OVERFLOW_NORM = 1e150;
/** "Settled" tolerance of lesson L6 (degrees): a stated tolerance, never an exactness claim. */
export const SETTLED_ANGLE_DEGREES = 1;

export type IterationOutcome = 'dominant' | 'equal-moduli' | 'rotating' | 'scalar' | 'defective';

/**
 * The class of L6 from tau and the discriminant D = tau^2 - 4 delta (delta is the determinant): D > 0 with tau != 0 is
 * `dominant`, D > 0 with tau = 0 is `equal-moduli` (lambda_2 = -lambda_1), D < 0 is `rotating`, D = 0 is `scalar` or
 * `defective`; the entries are needed only to separate `scalar` from `defective` when D = 0.
 * Exact; throws a RangeError off the quarter grid.
 */
export function iterationOutcome(m: Mat2): IterationOutcome {
    const [a, b, c, d] = [m[0][0], m[0][1], m[1][0], m[1][1]].map(gridInteger);
    const tau = a + d;
    const delta = tau * tau - 4 * (a * d - b * c); // 16 Delta, exact integer
    if (delta > 0) return tau === 0 ? 'equal-moduli' : 'dominant';
    if (delta < 0) return 'rotating';
    return b === 0 && c === 0 && a === d ? 'scalar' : 'defective';
}

/** True when A^2 = 0 (tau = 0 and det = 0, Cayley-Hamilton): the orbit collapses and no direction exists. */
export function collapses(m: Mat2): boolean {
    const [a, b, c, d] = [m[0][0], m[0][1], m[1][0], m[1][1]].map(gridInteger);
    return a + d === 0 && a * d - b * c === 0;
}

/** Unit direction (sign normalised) of the eigenvalue of largest modulus (or the defective eigenvector), as a line. */
export function dominantDirection(m: Mat2): Vec2 | undefined {
    if (collapses(m)) return undefined;
    const outcome = iterationOutcome(m);
    const eigen = classifyEigen(m);
    if (outcome === 'dominant' && eigen.kind === 'distinct-real') {
        return Math.abs(eigen.eigenvalues[0]) > Math.abs(eigen.eigenvalues[1]) ? eigen.eigenvectors[0] : eigen.eigenvectors[1];
    }
    return eigen.kind === 'repeated' && eigen.repeated === 'defective' ? eigen.eigenvector : undefined;
}

/** |lambda_2 / lambda_1| (the error factor per step); 1 when there is no strictly dominant eigenvalue; undefined for A^2 = 0. */
export function modulusRatio(m: Mat2): number | undefined {
    const eigen = classifyEigen(m);
    if (eigen.kind === 'distinct-real') {
        const [big, small] = [Math.abs(eigen.eigenvalues[0]), Math.abs(eigen.eigenvalues[1])].sort((p, q) => q - p);
        return big === 0 ? undefined : small / big;
    }
    if (eigen.kind === 'complex') return 1;
    return eigen.eigenvalue === 0 ? undefined : 1;
}

/**
 * Exact: v0 is an eigenvector of A that is not in the dominant direction (only meaningful for `dominant`; false
 * otherwise). With A v = mu v and tau = mu + mu', v is the weaker one iff tau (tau - 2 mu) > 0.
 * Throws a RangeError off the quarter grid.
 */
export function startsOnOtherEigenvector(m: Mat2, v0: Vec2): boolean {
    if (iterationOutcome(m) !== 'dominant') return false;
    const [x, y] = [v0[0], v0[1]].map(gridInteger);
    const [a, b, c, d] = [m[0][0], m[0][1], m[1][0], m[1][1]].map(gridInteger);
    if (x === 0 && y === 0) return false;
    if (x * (c * x + d * y) - y * (a * x + b * y) !== 0) return false; // not an eigenvector
    const T = a + d; // 4 tau
    const P = x * (a * x + b * y) + y * (c * x + d * y); // v . Av
    const Q = x * x + y * y; // |v|^2; mu = P / (4 Q)
    return T * (T * Q - 2 * P) > 0;
}

/** Acute angle in degrees between the lines spanned by v and direction d; undefined for the zero vector. */
export function lineAngleDegrees(v: Vec2, d: Vec2): number | undefined {
    if (v[0] === 0 && v[1] === 0) return undefined;
    return Math.atan2(Math.abs(v[0] * d[1] - v[1] * d[0]), Math.abs(v[0] * d[0] + v[1] * d[1])) * 180 / Math.PI;
}

export interface Orbit {
    /** points[k] = A^k v0, for k = 0 .. steps; an iterate beyond the overflow norm is not stored. */
    points: readonly Vec2[];
    steps: number;
    /** A norm exceeded ORBIT_OVERFLOW_NORM (or became non-finite); the orbit stops before that iterate. */
    overflow: boolean;
    /** The request exceeded ORBIT_MAX_STEPS and was clamped. */
    capped: boolean;
    /** Some stored iterate is exactly the zero vector. */
    collapsed: boolean;
    /** Power-method readouts; undefined where they have no meaning (no dominant direction, zero vector). */
    dominantDirection: Vec2 | undefined;
    modulusRatio: number | undefined;
    /** angleErrors[k]: degrees between the line of points[k] and the dominant direction. */
    angleErrors: readonly (number | undefined)[];
    /** stretches[k] = |points[k+1]| / |points[k]|, for k < steps. */
    stretches: readonly (number | undefined)[];
}

/**
 * The orbit v0, Av0, ..., A^n v0 in doubles. A has any finite entries; the readouts need quarter-grid entries and are
 * undefined otherwise. n must be a non-negative integer; v0 must be finite with norm at most ORBIT_OVERFLOW_NORM
 * (RangeError otherwise).
 */
export function orbit(m: Mat2, v0: Vec2, n: number): Orbit {
    if (!Number.isInteger(n) || n < 0) throw new RangeError('The number of steps must be a non-negative integer.');
    const startNorm = Math.hypot(v0[0], v0[1]);
    if (!Number.isFinite(startNorm) || startNorm > ORBIT_OVERFLOW_NORM) {
        throw new RangeError('The start vector must be finite with norm at most ORBIT_OVERFLOW_NORM.');
    }
    const capped = n > ORBIT_MAX_STEPS;
    const limit = Math.min(n, ORBIT_MAX_STEPS);
    const points: Vec2[] = [v0];
    let overflow = false;
    for (let k = 0; k < limit; k++) {
        const next = apply(m, points[k]);
        const norm = Math.hypot(next[0], next[1]);
        if (!Number.isFinite(norm) || norm > ORBIT_OVERFLOW_NORM) {
            overflow = true;
            break;
        }
        points.push(next);
    }
    const onGrid = m.every((row) => row.every((e) => Number.isInteger(e * 4) && Math.abs(e) <= 2 ** 18));
    const direction = onGrid ? dominantDirection(m) : undefined;
    const norms = points.map((p) => Math.hypot(p[0], p[1]));
    return {
        points,
        steps: points.length - 1,
        overflow,
        capped,
        collapsed: norms.some((norm) => norm === 0),
        dominantDirection: direction,
        modulusRatio: onGrid ? modulusRatio(m) : undefined,
        angleErrors: points.map((p) => (direction ? lineAngleDegrees(p, direction) : undefined)),
        stretches: norms.slice(0, -1).map((norm, k) => (norm === 0 ? undefined : norms[k + 1] / norm)),
    };
}
