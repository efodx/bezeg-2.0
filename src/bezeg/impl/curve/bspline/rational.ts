/**
 * NURBS through the polynomial kernel: lift (w_i P_i, w_i), run the polynomial B-spline code, project by the last
 * coordinate. Weights must be finite and strictly positive (the convex-hull and positive-denominator arguments
 * need w_i > 0), so zero or negative weights are rejected with a reason code.
 */
import {evaluate} from './deboor';
import {assertPointRows} from './insertion';

export type WeightError = 'wrong_count' | 'not_finite' | 'nonpositive';
export type WeightValidation = { ok: true } | { ok: false, reason: WeightError, index?: number };

/** Checks `count` weights: wrong_count, then per weight not_finite / nonpositive (first offender's index is reported). */
export function validateWeights(weights: readonly number[], count: number): WeightValidation {
    if (weights.length !== count) {
        return {ok: false, reason: 'wrong_count'};
    }
    for (let i = 0; i < weights.length; i++) {
        if (!Number.isFinite(weights[i])) {
            return {ok: false, reason: 'not_finite', index: i};
        }
    }
    for (let i = 0; i < weights.length; i++) {
        if (!(weights[i] > 0)) {
            return {ok: false, reason: 'nonpositive', index: i};
        }
    }
    return {ok: true};
}

/** Homogeneous rows (w_i P_i, w_i). Throws a RangeError naming the reason when the weights are rejected. */
export function liftToHomogeneous(P: readonly (readonly number[])[], weights: readonly number[]): number[][] {
    const check = validateWeights(weights, P.length);
    if (!check.ok) {
        throw new RangeError(`Invalid weights: ${check.reason}${check.index === undefined ? '' : ` at index ${check.index}`}`);
    }
    assertPointRows(P, P.length);
    return P.map((row, i) => [...row.map(value => weights[i] * value), weights[i]]);
}

/** Divides the leading coordinates by the last one (the weight). */
export function projectHomogeneous(row: readonly number[]): number[] {
    const w = row[row.length - 1];
    return row.slice(0, -1).map(value => value / w);
}

/** NURBS point at `t`. Throws a RangeError for an invalid vector, rows, weights or parameter. */
export function evaluateRational(u: readonly number[], k: number, P: readonly (readonly number[])[], weights: readonly number[], t: number): number[] {
    return projectHomogeneous(evaluate(u, k, liftToHomogeneous(P, weights), t));
}
