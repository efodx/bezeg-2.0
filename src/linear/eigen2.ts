/**
 * Eigen classification of a 2x2 matrix and the "approximately parallel" test of lesson L3.
 * Free of React, JSXGraph, localization and graph state. Contract (stable, reusable by a phase-portrait family):
 * - Input entries must lie on the quarter grid (multiples of 1/4); anything else throws a RangeError. The class is
 *   decided by the exact integer sign of the discriminant, so no tolerance ever decides a discrete outcome.
 * - Eigenvalues and eigenvectors are computed in floating point (displayed rounded, labelled computed).
 */
import {Mat2, MATRIX_ENTRY_STEP, Vec2} from './matrix2';

/** L3 "approximately parallel" window: |sin angle(v, Av)| < this. A stated tolerance, never an exactness claim. */
export const EIGEN_PARALLEL_TOLERANCE = 0.01;

const GRID = 1 / MATRIX_ENTRY_STEP; // 4
const MAX_GRID_INTEGER = 2 ** 20; // keeps all integer products far inside 2^53

/** Entry times 4 as an exact integer; throws when the value is not on the quarter grid. */
export function gridInteger(value: number): number {
    const scaled = value * GRID; // exact: multiplication by a power of two
    if (!Number.isFinite(scaled) || !Number.isInteger(scaled) || Math.abs(scaled) > MAX_GRID_INTEGER) {
        throw new RangeError(`Value ${value} is not a quarter-grid number`);
    }
    return scaled;
}

/** Sign of the eigenvalue discriminant tr^2 - 4 det, computed exactly in integers (scaled by 16). */
export function discriminantSign(m: Mat2): -1 | 0 | 1 {
    const [a, b, c, d] = [m[0][0], m[0][1], m[1][0], m[1][1]].map(gridInteger);
    const delta16 = (a + d) ** 2 - 4 * (a * d - b * c);
    return delta16 > 0 ? 1 : delta16 < 0 ? -1 : 0;
}

export type EigenClassification =
    | {
    kind: 'distinct-real';
    /** Descending: eigenvalues[0] > eigenvalues[1]. */
    eigenvalues: readonly [number, number];
    /** Unit vectors, eigenvectors[i] belongs to eigenvalues[i]; sign normalised (x > 0, or x = 0 and y > 0). */
    eigenvectors: readonly [Vec2, Vec2];
    discriminant: number;
}
    | { kind: 'repeated'; repeated: 'scalar'; eigenvalue: number; discriminant: 0 }
    | { kind: 'repeated'; repeated: 'defective'; eigenvalue: number; eigenvector: Vec2; discriminant: 0 }
    | {
    kind: 'complex';
    /** tau/2 */
    real: number;
    /** sqrt(-Delta)/2 > 0; the eigenvalues are real +- i imaginary. */
    imaginary: number;
    discriminant: number;
};

/** Unit vector spanning the kernel of A - lambda I, assuming that matrix is not zero. Never divides by zero. */
function kernelDirection(m: Mat2, lambda: number): Vec2 {
    const rows: readonly Vec2[] = [[m[0][0] - lambda, m[0][1]], [m[1][0], m[1][1] - lambda]];
    const row = Math.hypot(rows[0][0], rows[0][1]) >= Math.hypot(rows[1][0], rows[1][1]) ? rows[0] : rows[1];
    const length = Math.hypot(row[0], row[1]);
    let x = row[1] / length;
    let y = -row[0] / length; // (q, -p) is orthogonal to the row (p, q)
    if (x < 0 || (x === 0 && y < 0)) {
        x = -x;
        y = -y;
    }
    return [x + 0, y + 0]; // + 0 turns -0 into 0
}

export function classifyEigen(m: Mat2): EigenClassification {
    const sign = discriminantSign(m);
    const tau = m[0][0] + m[1][1];
    const delta = tau * tau - 4 * (m[0][0] * m[1][1] - m[0][1] * m[1][0]); // exact on the quarter grid
    if (sign > 0) {
        const root = Math.sqrt(delta);
        const eigenvalues: [number, number] = [(tau + root) / 2, (tau - root) / 2];
        return {
            kind: 'distinct-real',
            eigenvalues,
            eigenvectors: [kernelDirection(m, eigenvalues[0]), kernelDirection(m, eigenvalues[1])],
            discriminant: delta,
        };
    }
    if (sign < 0) {
        return {kind: 'complex', real: tau / 2, imaginary: Math.sqrt(-delta) / 2, discriminant: delta};
    }
    const eigenvalue = tau / 2;
    if (m[0][1] === 0 && m[1][0] === 0 && m[0][0] === m[1][1]) {
        return {kind: 'repeated', repeated: 'scalar', eigenvalue, discriminant: 0};
    }
    return {kind: 'repeated', repeated: 'defective', eigenvalue, eigenvector: kernelDirection(m, eigenvalue), discriminant: 0};
}

/**
 * Signed sine of the angle from v to A v, for the unit vector v = (cos angle, sin angle) (angle in radians):
 * det(v, Av) / |Av|. Returns 0 when Av = 0 (the zero vector is parallel to everything). Use the absolute value
 * against EIGEN_PARALLEL_TOLERANCE.
 */
export function parallelSine(m: Mat2, angle: number): number {
    const vx = Math.cos(angle);
    const vy = Math.sin(angle);
    const wx = m[0][0] * vx + m[0][1] * vy;
    const wy = m[1][0] * vx + m[1][1] * vy;
    const length = Math.hypot(wx, wy);
    return length === 0 ? 0 : (vx * wy - vy * wx) / length;
}

export const isApproximatelyParallel = (m: Mat2, angle: number): boolean =>
    Math.abs(parallelSine(m, angle)) < EIGEN_PARALLEL_TOLERANCE;

/**
 * Exact parallelism of a quarter-grid vector v and A v: det(v, Av) = 0 in exact arithmetic (integer arithmetic on
 * the entries scaled by 4). The zero vector is not a direction: returns false.
 * Throws a RangeError when v or A is not on the quarter grid.
 */
export function exactlyParallel(v: Vec2, m: Mat2): boolean {
    const [x, y] = [v[0], v[1]].map(gridInteger);
    const [a, b, c, d] = [m[0][0], m[0][1], m[1][0], m[1][1]].map(gridInteger);
    if (x === 0 && y === 0) {
        return false;
    }
    return x * (c * x + d * y) - y * (a * x + b * y) === 0;
}
