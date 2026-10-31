/**
 * Direction field and Euler's method for a closed list of first-order examples y' = F(x, y) (numerical methods lesson).
 * Pure mathematics: no React, JSXGraph or localization imports. No formula parser: every F and exact solution is written by hand.
 *
 * The polyline is always recomputed from the example, the initial point, the step and the end; a stored path is never trusted.
 */

export const EULER_EXAMPLE_IDS = ['exponential', 'linear-relaxation', 'blow-up'] as const;
export type EulerExampleId = typeof EULER_EXAMPLE_IDS[number];

/** The discrete step sizes offered by the lesson; each is a power of two, so x_k = x0 + k*h is exact in floating point. */
export const STEP_SIZES = [1, 0.5, 0.25, 0.125, 0.0625] as const;
export type EulerStep = typeof STEP_SIZES[number];

export const isEulerStep = (value: unknown): value is EulerStep =>
    typeof value === 'number' && (STEP_SIZES as readonly number[]).includes(value);

/**
 * The termination bound for `left-window`: a run stops as soon as the next node would have |y| above this value.
 * It is far outside any window the lesson shows (a few units), so ordinary solutions never reach it, while a blow-up such
 * as y' = y^2 leaves it after a handful of steps instead of running on to overflow. The offending node is not returned.
 */
export const EULER_Y_BOUND = 1000;

/** x0 and xEnd lie in [EULER_X_MIN, EULER_X_MAX]; with the smallest step this caps a path at 320 steps. */
export const EULER_X_MIN = -10;
export const EULER_X_MAX = 10;
export const EULER_MAX_STEPS = 320;

/** The upper limit for the field grid in either direction. */
export const EULER_FIELD_MAX = 40;

export interface EulerPoint {
    readonly x: number;
    readonly y: number;
}

export interface EulerExample {
    readonly id: EulerExampleId;
    /** Plain-text right-hand side for labels and accessible names. */
    readonly plain: string;
    /** Undelimited LaTeX of the equation y' = F(x, y). */
    readonly latex: string;
    /** Undelimited LaTeX of the exact solution through the default initial point. */
    readonly exactLatex: string;
    /** F(x, y). */
    readonly F: (x: number, y: number) => number;
    /**
     * The exact solution of y' = F(x, y) through (x0, y0) as a function of x, used as a reference independent of the
     * Euler steps. It may return a non-finite number where the solution does not exist (y' = y^2 beyond the pole).
     */
    readonly exact: (x0: number, y0: number) => (x: number) => number;
    readonly defaultInitial: EulerPoint;
}

export const EULER_EXAMPLES: Readonly<Record<EulerExampleId, EulerExample>> = {
    exponential: {
        id: 'exponential',
        plain: "y' = y",
        latex: "y' = y",
        exactLatex: 'y = e^{x}',
        F: (_x, y) => y,
        exact: (x0, y0) => x => y0 * Math.exp(x - x0),
        defaultInitial: {x: 0, y: 1},
    },
    'linear-relaxation': {
        id: 'linear-relaxation',
        plain: "y' = x − y",
        latex: "y' = x - y",
        exactLatex: 'y = x - 1 + 2e^{-x}',
        F: (x, y) => x - y,
        // General solution y = x - 1 + C e^{-x}; C is fixed by y(x0) = y0.
        exact: (x0, y0) => x => x - 1 + (y0 - x0 + 1) * Math.exp(x0 - x),
        defaultInitial: {x: 0, y: 1},
    },
    'blow-up': {
        id: 'blow-up',
        plain: "y' = y²",
        latex: "y' = y^{2}",
        exactLatex: 'y = \\frac{1}{1 - x}',
        F: (_x, y) => y * y,
        // y = 1 / (1/y0 - (x - x0)) for y0 != 0, with a pole at x0 + 1/y0; y0 = 0 gives the zero solution.
        exact: (x0, y0) => x => {
            if (y0 === 0) return 0;
            const denominator = 1 / y0 - (x - x0);
            return denominator === 0 ? NaN : 1 / denominator;
        },
        defaultInitial: {x: 0, y: 1},
    },
};

export const eulerExample = (id: EulerExampleId): EulerExample => EULER_EXAMPLES[id];

export const isEulerExampleId = (value: unknown): value is EulerExampleId =>
    typeof value === 'string' && (EULER_EXAMPLE_IDS as readonly string[]).includes(value);

export type EulerTermination = 'reached-end' | 'non-finite' | 'left-window';

export interface EulerPath {
    /** The polyline nodes, starting at the initial point; every coordinate is finite and |y| <= EULER_Y_BOUND. */
    readonly nodes: readonly EulerPoint[];
    readonly termination: EulerTermination;
}

const inXRange = (x: number): boolean => Number.isFinite(x) && x >= EULER_X_MIN && x <= EULER_X_MAX;

/**
 * Euler's polyline y_{k+1} = y_k + h F(x_k, y_k), x_{k+1} = x_k + h, from (x0, y0) to xEnd >= x0. The last step is shortened
 * when xEnd is not on the grid. A node that is not finite or has |y| above EULER_Y_BOUND is dropped and ends the path.
 * Throws RangeError for an invalid step, a non-finite or out-of-range x0, xEnd or y0, xEnd < x0, or too many steps.
 */
export function eulerPath(example: EulerExample, x0: number, y0: number, h: number, xEnd: number): EulerPath {
    if (!isEulerStep(h)) throw new RangeError(`The step must be one of ${STEP_SIZES.join(', ')}.`);
    if (!inXRange(x0) || !inXRange(xEnd) || xEnd < x0) {
        throw new RangeError(`x0 and xEnd must be finite, within [${EULER_X_MIN}, ${EULER_X_MAX}], with x0 <= xEnd.`);
    }
    if (!Number.isFinite(y0) || Math.abs(y0) > EULER_Y_BOUND) {
        throw new RangeError(`y0 must be finite with |y0| <= ${EULER_Y_BOUND}.`);
    }
    const steps = Math.ceil((xEnd - x0) / h);
    if (steps > EULER_MAX_STEPS) throw new RangeError(`At most ${EULER_MAX_STEPS} steps are allowed.`);

    const nodes: EulerPoint[] = [{x: x0, y: y0}];
    let y = y0;
    for (let k = 0; k < steps; k++) {
        const x = x0 + k * h;
        const xNext = k === steps - 1 ? xEnd : x0 + (k + 1) * h;
        const yNext = y + (xNext - x) * example.F(x, y);
        if (!Number.isFinite(yNext)) return {nodes, termination: 'non-finite'};
        if (Math.abs(yNext) > EULER_Y_BOUND) return {nodes, termination: 'left-window'};
        nodes.push({x: xNext, y: yNext});
        y = yNext;
    }
    return {nodes, termination: 'reached-end'};
}

export interface FieldWindow {
    readonly xMin: number;
    readonly xMax: number;
    readonly yMin: number;
    readonly yMax: number;
}

/** A field sample: the centre of a grid cell and the slope F(x, y) there. */
export interface FieldSegment {
    readonly x: number;
    readonly y: number;
    readonly slope: number;
}

export interface DirectionField {
    readonly segments: readonly FieldSegment[];
    /** Cells whose slope was not finite; they are omitted from `segments`. */
    readonly omitted: number;
}

/** The cols x rows cell centres of the window with slopes; throws RangeError for an empty window or a grid outside 1..EULER_FIELD_MAX. */
export function directionField(example: EulerExample, window: FieldWindow, cols: number, rows: number): DirectionField {
    const finite = [window.xMin, window.xMax, window.yMin, window.yMax].every(Number.isFinite);
    if (!finite || window.xMin >= window.xMax || window.yMin >= window.yMax) {
        throw new RangeError('The window must be finite with xMin < xMax and yMin < yMax.');
    }
    for (const count of [cols, rows]) {
        if (!Number.isInteger(count) || count < 1 || count > EULER_FIELD_MAX) {
            throw new RangeError(`The grid size must be an integer from 1 to ${EULER_FIELD_MAX}.`);
        }
    }
    const segments: FieldSegment[] = [];
    let omitted = 0;
    for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
            const x = window.xMin + (i + 0.5) * (window.xMax - window.xMin) / cols;
            const y = window.yMin + (j + 0.5) * (window.yMax - window.yMin) / rows;
            const slope = example.F(x, y);
            if (Number.isFinite(slope)) segments.push({x, y, slope});
            else omitted++;
        }
    }
    return {segments, omitted};
}
