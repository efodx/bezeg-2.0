/** Iteration of a map x_{k+1} = f(x_k). Doubles, labelled computed: no label (converges, 2-cycle, diverges) is decided from these values. */

export const ITERATION_MAX_STEPS = 60;

/** One step, 1-based: x_{index} = f(from). Same shape as `FixedPointStep` in analysis/fixedPoint.ts, shared in spirit, not by import. */
export interface IterationStep {
    readonly index: number;
    readonly from: number;
    readonly to: number;
}

export interface Iteration {
    /** x_0, ..., x_n. */
    readonly points: readonly number[];
    readonly steps: readonly IterationStep[];
}

/** The first n iterates of `map` from x0. Throws RangeError for a non-finite x0 or n not an integer in [0, 60]. */
export function iterate(map: (x: number) => number, x0: number, n: number): Iteration {
    if (!Number.isFinite(x0)) throw new RangeError('The start x0 must be a finite number.');
    if (!Number.isInteger(n) || n < 0 || n > ITERATION_MAX_STEPS) {
        throw new RangeError(`The step count must be an integer from 0 to ${ITERATION_MAX_STEPS}.`);
    }
    const points = [x0];
    const steps: IterationStep[] = [];
    let x = x0;
    for (let index = 1; index <= n; index++) {
        const to = map(x);
        steps.push({index, from: x, to});
        points.push(to);
        x = to;
    }
    return {points, steps};
}
