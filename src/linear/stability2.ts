/**
 * Stability of the iteration v -> Av (the triangle of lesson L7), the flow criterion and the companion matrix.
 * Free of React, JSXGraph, localization and graph state. Exact on quarter-grid entries: trace and determinant are
 * multiples of 1/16, hence exact doubles, and the classes are decided by comparisons without any tolerance.
 * The continuous-time type names (node, saddle, spiral, ...) belong to the phase-portraits kernel and are not here.
 */
import {gridInteger} from './eigen2';
import {Mat2} from './matrix2';

/** The three edges of the stability triangle with vertices (-2, 1), (2, 1), (0, -1) in the (tau, delta) plane. */
export type TriangleEdge = 'determinant-one' | 'eigenvalue-one' | 'eigenvalue-minus-one';

export type DiscreteStability =
    | { kind: 'inside' }
    /** `edge` is the first matching edge; `edges` lists all (a vertex lies on two). */
    | { kind: 'edge'; edge: TriangleEdge; edges: readonly TriangleEdge[] }
    | { kind: 'outside' };

/** Trace and determinant of a quarter-grid matrix as exact doubles (throws RangeError off the quarter grid). */
export function exactTraceDet(m: Mat2): { tau: number; delta: number } {
    const [a, b, c, d] = [m[0][0], m[0][1], m[1][0], m[1][1]].map(gridInteger);
    return {tau: (a + d) / 4, delta: (a * d - b * c) / 16};
}

function requireFinite(tau: number, delta: number): void {
    if (!Number.isFinite(tau) || !Number.isFinite(delta)) throw new RangeError('tau and delta must be finite numbers.');
}

/**
 * Classification of a (tau, delta) pair; exact when both are multiples of 1/16 (no tolerance). Any finite doubles are
 * accepted on purpose, for points of the tau-delta plane that need not come from a quarter-grid matrix; non-finite
 * input throws a RangeError.
 */
export function discreteStabilityTD(tau: number, delta: number): DiscreteStability {
    requireFinite(tau, delta);
    if (delta < 1 && Math.abs(tau) < 1 + delta) {
        return {kind: 'inside'};
    }
    const edges: TriangleEdge[] = [];
    if (delta === 1 && Math.abs(tau) <= 2) edges.push('determinant-one');
    if (tau === 1 + delta && delta >= -1 && delta <= 1) edges.push('eigenvalue-one');
    if (tau === -(1 + delta) && delta >= -1 && delta <= 1) edges.push('eigenvalue-minus-one');
    return edges.length > 0 ? {kind: 'edge', edge: edges[0], edges} : {kind: 'outside'};
}

/** inside: all orbits tend to 0; edge: neutral (an eigenvalue of modulus 1); outside: some orbit grows. */
export function discreteStability(m: Mat2): DiscreteStability {
    const {tau, delta} = exactTraceDet(m);
    return discreteStabilityTD(tau, delta);
}

/** Stability of the flow x' = Ax: all solutions tend to 0 iff tau < 0 and delta > 0. */
export function flowStabilityTD(tau: number, delta: number): boolean {
    requireFinite(tau, delta);
    return tau < 0 && delta > 0;
}

export function flowStability(m: Mat2): boolean {
    const {tau, delta} = exactTraceDet(m);
    return flowStabilityTD(tau, delta);
}

/**
 * The matrix ((0, 1), (-delta, tau)) with trace tau and determinant delta (never -0). Accepts any finite doubles on
 * purpose (points of the tau-delta plane); non-finite input throws a RangeError.
 */
export function companion(tau: number, delta: number): Mat2 {
    requireFinite(tau, delta);
    return [[0, 1], [0 - delta, tau]];
}
