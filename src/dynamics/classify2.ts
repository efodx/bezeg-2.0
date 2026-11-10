/**
 * Classification of the planar linear system x' = A x from tau = tr A, delta = det A, Delta = tau^2 - 4 delta.
 * Pure TypeScript. Exact on the quarter grid: with entries scaled by 4 to integers, 4 tau, 16 delta and 16 Delta are
 * integers far inside 2^53, so no tolerance ever decides a discrete outcome. Entries off the quarter grid throw a
 * RangeError (the contract of `gridInteger`). The picture of one A is an illustration; the classification is a theorem.
 */
import {classifyEigen, gridInteger} from '../linear/eigen2';
import type {Mat2} from '../linear/matrix2';

export type Stability = 'stable' | 'unstable';

/** Non-isolated equilibria (delta = 0). */
export type NonIsolated = 'line-of-equilibria' | 'shear-flow' | 'all-fixed';

export type PlaneType =
    | { kind: 'saddle' }
    | { kind: 'node'; stability: Stability }
    | { kind: 'star-node'; stability: Stability }
    | { kind: 'degenerate-node'; stability: Stability }
    | { kind: 'spiral'; stability: Stability }
    | { kind: 'centre' }
    | { kind: 'non-isolated'; case: NonIsolated };

export interface PlaneClassification {
    readonly type: PlaneType;
    readonly tau: number;
    readonly delta: number;
    /** Delta = tau^2 - 4 delta (the eigenvalue discriminant). */
    readonly discriminant: number;
}

/** tau, delta, Delta as exact numbers, computed from scaled integers. */
export function traceDeterminant(m: Mat2): { tau: number; delta: number; discriminant: number } {
    const [a, b, c, d] = [m[0][0], m[0][1], m[1][0], m[1][1]].map(gridInteger);
    const tau4 = a + d;
    const delta16 = a * d - b * c;
    return {tau: tau4 / 4 + 0, delta: delta16 / 16 + 0, discriminant: (tau4 * tau4 - 4 * delta16) / 16 + 0}; // + 0: no -0
}

export function classifyPlane(m: Mat2): PlaneClassification {
    const {tau, delta, discriminant} = traceDeterminant(m); // all three are exact multiples of 1/16
    const stability: Stability = tau < 0 ? 'stable' : 'unstable';
    const make = (type: PlaneType): PlaneClassification => ({type, tau, delta, discriminant});
    if (delta < 0) return make({kind: 'saddle'});
    if (delta === 0) {
        if (tau !== 0) return make({kind: 'non-isolated', case: 'line-of-equilibria'});
        const zero = m[0][0] === 0 && m[0][1] === 0 && m[1][0] === 0 && m[1][1] === 0;
        return make({kind: 'non-isolated', case: zero ? 'all-fixed' : 'shear-flow'});
    }
    if (discriminant > 0) return make({kind: 'node', stability});
    if (discriminant === 0) {
        const repeated = classifyEigen(m);
        const scalar = repeated.kind === 'repeated' && repeated.repeated === 'scalar';
        return make({kind: scalar ? 'star-node' : 'degenerate-node', stability});
    }
    return make(tau === 0 ? {kind: 'centre'} : {kind: 'spiral', stability});
}

/** Companion matrix with trace tau and determinant delta; entries stay in range for |tau|, |delta| <= 4. */
export const companionMatrix = (tau: number, delta: number): Mat2 => [[0, 1], [0 - delta, tau]];
