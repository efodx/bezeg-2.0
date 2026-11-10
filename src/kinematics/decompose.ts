/**
 * Tangential/normal decomposition of the acceleration. Contract: docs/specs/kinematics-lessons.md,
 * "Kinematics kernel" item 2. a_N is signed on the LEFT normal, the convention of curvatureAt.
 */
import {curvatureAt, type Vec2} from "../bezeg/impl/curve/curvature";

export type Decomposition =
    | { kind: 'regular', speed: number, aT: number, aN: number, kappa: number }
    | { kind: 'singular', speed: number };

/**
 * v = |r'|, a_T = r'.r''/v, a_N = (r' x r'')/v, kappa = a_N / v^2 (from curvatureAt).
 * Zero speed (|r'| <= 1e-9 scale) returns `singular`: no components, never zeros.
 */
export function decompose(d1: Vec2, d2: Vec2, scale = 1): Decomposition {
    const c = curvatureAt(d1, d2, scale);
    if (c.kind === 'singular') {
        return {kind: 'singular', speed: c.speed};
    }
    const v = c.speed;
    return {
        kind: 'regular',
        speed: v,
        aT: (d1[0] * d2[0] + d1[1] * d2[1]) / v,
        aN: (d1[0] * d2[1] - d1[1] * d2[0]) / v,
        kappa: c.kappa,
    };
}
