/**
 * Subdivision kernel for the Chaikin / four-point lesson (I5). Chaikin and the uniform quadratic B-spline are
 * imported from the B-spline kernel, never reimplemented. Rows are coordinate arrays of equal length.
 */
import {chaikinStep} from '../bezeg/impl/curve/bspline';

export type SubdivisionRule = 'chaikin' | 'four-point';

/** Round cap stated in the lesson (spec I5 acceptance 3). */
export const MAX_SUBDIVISION_ROUNDS = 6;

/** Dyn-Levin-Gregory tension of the classic four-point scheme: (-1, 9, 9, -1) / 16. */
export const FOUR_POINT_DEFAULT_W = 1 / 16;

function validate(polygon: readonly (readonly number[])[], closed: boolean): void {
    const minimum = closed ? 3 : 2;
    if (polygon.length < minimum) {
        throw new RangeError(`Four-point needs at least ${minimum} points, got ${polygon.length}`);
    }
    const dimension = polygon[0].length;
    if (dimension < 1 || polygon.some(row => row.length !== dimension || !row.every(Number.isFinite))) {
        throw new RangeError('Points must be finite and have the same number of coordinates');
    }
}

/**
 * One interpolating four-point step. Every old vertex is kept; each edge P_i P_{i+1} gains
 * -w P_{i-1} + (1/2 + w)(P_i + P_{i+1}) - w P_{i+2}.
 * Closed (at least 3 points): indices wrap, 2n points. Open (at least 2 points): the rule needs P_{i-1} and
 * P_{i+2}, so the two end edges (and a lone edge) get the plain midpoint instead; 2n - 1 points, ends fixed.
 */
export function fourPointStep(polygon: readonly (readonly number[])[], closed: boolean, w: number = FOUR_POINT_DEFAULT_W): number[][] {
    if (!Number.isFinite(w)) {
        throw new RangeError('Four-point tension w must be finite');
    }
    validate(polygon, closed);
    const n = polygon.length;
    const edges = closed ? n : n - 1;
    const result: number[][] = [];
    for (let i = 0; i < edges; i++) {
        result.push([...polygon[i]]);
        const a = polygon[i];
        const b = polygon[(i + 1) % n];
        if (closed || (i >= 1 && i + 2 <= n - 1)) {
            const before = polygon[(i - 1 + n) % n];
            const after = polygon[(i + 2) % n];
            result.push(a.map((value, d) => -w * before[d] + (0.5 + w) * (value + b[d]) - w * after[d]));
        } else {
            result.push(a.map((value, d) => (value + b[d]) / 2));
        }
    }
    if (!closed) {
        result.push([...polygon[n - 1]]);
    }
    return result;
}

/** Applies `rounds` (0..MAX_SUBDIVISION_ROUNDS) steps of one rule; returns every stage, index 0 = input. */
export function subdivisionRounds(
    polygon: readonly (readonly number[])[],
    closed: boolean,
    rule: SubdivisionRule,
    rounds: number,
    w: number = FOUR_POINT_DEFAULT_W,
): number[][][] {
    if (!Number.isInteger(rounds) || rounds < 0 || rounds > MAX_SUBDIVISION_ROUNDS) {
        throw new RangeError(`Rounds must be an integer in 0..${MAX_SUBDIVISION_ROUNDS}, got ${rounds}`);
    }
    const stages: number[][][] = [polygon.map(row => [...row])];
    for (let k = 0; k < rounds; k++) {
        const last = stages[k];
        stages.push(rule === 'chaikin' ? chaikinStep(last, closed) : fourPointStep(last, closed, w));
    }
    return stages;
}
