/**
 * Closed catalogue of planar systems with analytic Jacobians: `linear` (x' = A x), `pendulum` and `weak-spiral`.
 * Pure TypeScript. Hyperbolicity is decided exactly, and only at the listed equilibria, where the Jacobians are
 * integer matrices (cos(pi) = -1 exactly in doubles). Elsewhere a Jacobian is not an integer matrix and this test
 * must not be applied.
 */
import {gridInteger} from '../linear/eigen2';
import type {Mat2, Vec2} from '../linear/matrix2';
import type {VectorField} from './rk4';

export const SYSTEM_IDS = ['linear', 'pendulum', 'weak-spiral'] as const;
export type SystemId = typeof SYSTEM_IDS[number];

export const isSystemId = (value: unknown): value is SystemId =>
    typeof value === 'string' && (SYSTEM_IDS as readonly string[]).includes(value);

const plusZero = (v: number): number => v + 0; // -0 -> 0

/** The vector field of a system; `matrix` is used by `linear` only. */
export function systemField(id: SystemId, matrix: Mat2): VectorField {
    switch (id) {
        case 'linear':
            return ([x, y]) => [matrix[0][0] * x + matrix[0][1] * y, matrix[1][0] * x + matrix[1][1] * y];
        case 'pendulum':
            return ([theta, omega]) => [omega, -Math.sin(theta)];
        case 'weak-spiral':
            return ([x, y]) => {
                const r2 = x * x + y * y;
                return [-y - x * r2, x - y * r2];
            };
    }
}

/** Analytic Jacobian of the system at `point`; `matrix` is used by `linear` only. */
export function systemJacobian(id: SystemId, point: Vec2, matrix: Mat2): Mat2 {
    const [x, y] = point;
    switch (id) {
        case 'linear':
            return matrix;
        case 'pendulum':
            return [[0, 1], [plusZero(-Math.cos(x)), 0]];
        case 'weak-spiral':
            return [
                [plusZero(-(3 * x * x + y * y)), plusZero(-1 - 2 * x * y)],
                [plusZero(1 - 2 * x * y), plusZero(-(x * x + 3 * y * y))],
            ];
    }
}

/** Listed equilibria; the origin first. The pendulum has (+-pi, 0) too (the same point on the cylinder). */
export function systemEquilibria(id: SystemId): readonly Vec2[] {
    return id === 'pendulum' ? [[0, 0], [Math.PI, 0], [-Math.PI, 0]] : [[0, 0]];
}

/**
 * No eigenvalue with real part 0, i.e. delta != 0 and not (delta > 0 and tau = 0). Exact for integer-scaled entries;
 * throws RangeError for entries off the quarter grid, so it cannot be applied by mistake at a general point.
 */
export function isHyperbolic(jacobian: Mat2): boolean {
    const [a, b, c, d] = [jacobian[0][0], jacobian[0][1], jacobian[1][0], jacobian[1][1]].map(gridInteger);
    const tau4 = a + d;
    const delta16 = a * d - b * c;
    return delta16 !== 0 && !(delta16 > 0 && tau4 === 0);
}

/** Jacobian at the listed equilibrium with the given index. */
export function equilibriumJacobian(id: SystemId, index: number, matrix: Mat2): Mat2 {
    const point = systemEquilibria(id)[index];
    if (!point) throw new RangeError(`System ${id} has no equilibrium ${index}`);
    return systemJacobian(id, point, matrix);
}

/** Hyperbolicity at a listed equilibrium. */
export const isHyperbolicEquilibrium = (id: SystemId, index: number, matrix: Mat2): boolean =>
    isHyperbolic(equilibriumJacobian(id, index, matrix));
