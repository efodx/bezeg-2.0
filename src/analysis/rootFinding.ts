/**
 * Newton's and the secant method on a named example function (numerical methods lessons N1 to N3).
 * Pure mathematics: no React, JSXGraph or localization imports.
 *
 * The history is always recomputed from the example, the start(s) and the step count; a stored history is never trusted.
 */

/** Starts may be chosen in [ROOT_START_MIN, ROOT_START_MAX], the same range as the bisection endpoints; it holds for every example. */
export const ROOT_START_MIN = -4;
export const ROOT_START_MAX = 4;

/** The documented iteration limit, as for bisection. Convergent runs of the examples need fewer than 10 steps. */
export const ROOT_FINDING_MAX_STEPS = 60;

export const ROOT_FINDING_EXAMPLE_IDS = ['square-minus-two', 'cubic-two-cycle', 'cubic-three-roots'] as const;
export type RootFindingExampleId = typeof ROOT_FINDING_EXAMPLE_IDS[number];

export interface RootFindingExample {
    readonly id: RootFindingExampleId;
    /** Plain-text formula for labels and accessible names. */
    readonly plain: string;
    /** Undelimited LaTeX of the formula. */
    readonly latex: string;
    readonly value: (x: number) => number;
    /** The hand-written exact derivative (no symbolic differentiation, ADR 0007). */
    readonly derivative: (x: number) => number;
    readonly derivativeLatex: string;
    /** The start of Newton's method and the first start of the secant method. */
    readonly defaultStart: number;
    /** The second start of the secant method. */
    readonly defaultSecondStart: number;
    /**
     * The root the default start converges to. It is a stored literal, never produced by the iterations in this module,
     * so convergence readouts compare against an independent value; the unit tests confirm it by bisection.
     */
    readonly referenceRoot: number;
    readonly referenceRootSource: string;
}

const STORED = 'stored literal, confirmed by bisection in the unit tests';

export const ROOT_FINDING_EXAMPLES: Readonly<Record<RootFindingExampleId, RootFindingExample>> = {
    'square-minus-two': {
        id: 'square-minus-two', plain: 'x^2 - 2', latex: 'x^2-2',
        value: x => x * x - 2,
        derivative: x => 2 * x, derivativeLatex: '2x',
        defaultStart: 1, defaultSecondStart: 2,
        referenceRoot: 1.4142135623730951, referenceRootSource: STORED,
    },
    // Newton from 0 cycles 0, 1, 0, ...; the only real root is near -1.7693 (N2).
    'cubic-two-cycle': {
        id: 'cubic-two-cycle', plain: 'x^3 - 2x + 2', latex: 'x^3-2x+2',
        value: x => x * x * x - 2 * x + 2,
        derivative: x => 3 * x * x - 2, derivativeLatex: '3x^2-2',
        defaultStart: 0, defaultSecondStart: 1,
        referenceRoot: -1.769292354238631, referenceRootSource: STORED,
    },
    // Roots -1, 0, 1; the default start 2 converges to the root 1.
    'cubic-three-roots': {
        id: 'cubic-three-roots', plain: 'x^3 - x', latex: 'x^3-x',
        value: x => x * x * x - x,
        derivative: x => 3 * x * x - 1, derivativeLatex: '3x^2-1',
        defaultStart: 2, defaultSecondStart: 1.5,
        referenceRoot: 1, referenceRootSource: STORED,
    },
};

export const isRootFindingExampleId = (value: unknown): value is RootFindingExampleId =>
    typeof value === 'string' && (ROOT_FINDING_EXAMPLE_IDS as readonly string[]).includes(value);

export function rootFindingExample(id: RootFindingExampleId): RootFindingExample {
    if (!isRootFindingExampleId(id)) throw new RangeError('Unknown root-finding example.');
    return ROOT_FINDING_EXAMPLES[id];
}

/** A start must be finite and inside the shared range. */
export const isRootStart = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= ROOT_START_MIN && value <= ROOT_START_MAX;

/** Secant starts must both be valid and different: equal starts give the undefined slope 0/0. */
export const isSecantStartPair = (first: unknown, second: unknown): boolean =>
    isRootStart(first) && isRootStart(second) && first !== second;

export const isRootFindingStepCount = (value: unknown): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= ROOT_FINDING_MAX_STEPS;

export type RootFindingTermination =
    | 'root-found' | 'flat-tangent' | 'flat-secant' | 'repeated-iterate' | 'non-finite' | 'step-cap' | 'running';

export interface RootFindingHistory {
    readonly example: RootFindingExample;
    /** The iterates x_0, x_1, ... (the secant method lists both starts first). Never contains a non-finite value. */
    readonly iterates: readonly number[];
    /** The number of iteration steps taken: iterates.length - 1 for Newton, iterates.length - 2 for secant. */
    readonly stepsTaken: number;
    readonly termination: RootFindingTermination;
}

/**
 * Repeated-iterate rule: a new iterate that equals (===) an earlier iterate of any period >= 1 stops the run. The
 * deterministic update then repeats forever, so the run cannot converge unless it sits on a fixed point; the repeated
 * iterate is kept as the last entry. Only exact equality counts, which suffices for the exact cycle 0, 1, 0.
 * (For the secant method the update depends on two iterates, so equality of one value is a heuristic stop, not a proof.)
 */
const repeats = (iterates: readonly number[], next: number): boolean => iterates.includes(next);

function validateExample(id: RootFindingExampleId, steps: number): RootFindingExample {
    const example = rootFindingExample(id);
    if (!isRootFindingStepCount(steps)) throw new RangeError('The step count must be an integer in [0, 60].');
    return example;
}

/**
 * Newton's method x_{k+1} = x_k - f(x_k) / f'(x_k) after at most `steps` steps. The termination of the last iterate is
 * always reported (an exact root or a flat tangent is found without taking a further step); no division by zero is attempted.
 */
export function newtonHistory(id: RootFindingExampleId, start: number, steps: number): RootFindingHistory {
    const example = validateExample(id, steps);
    if (!isRootStart(start)) throw new RangeError('The start must be a finite number in [-4, 4].');
    const iterates = [start];
    const finish = (termination: RootFindingTermination): RootFindingHistory =>
        ({example, iterates, stepsTaken: iterates.length - 1, termination});
    for (let k = 0; ; k++) {
        const x = iterates[k];
        const fx = example.value(x);
        if (!Number.isFinite(fx)) return finish('non-finite');
        if (fx === 0) return finish('root-found');
        const slope = example.derivative(x);
        if (!Number.isFinite(slope)) return finish('non-finite');
        if (slope === 0) return finish('flat-tangent');
        if (k === steps) return finish(steps >= ROOT_FINDING_MAX_STEPS ? 'step-cap' : 'running');
        const next = x - fx / slope;
        if (!Number.isFinite(next)) return finish('non-finite');
        const again = repeats(iterates, next);
        iterates.push(next);
        if (again) return finish('repeated-iterate');
    }
}

/**
 * The secant method x_{k+1} = x_k - f(x_k) (x_k - x_{k-1}) / (f(x_k) - f(x_{k-1})) from two different starts. The
 * iterates list begins with both starts. f(x_k) = f(x_{k-1}) gives the termination flat-secant without a division.
 */
export function secantHistory(id: RootFindingExampleId, first: number, second: number, steps: number): RootFindingHistory {
    const example = validateExample(id, steps);
    if (!isSecantStartPair(first, second)) throw new RangeError('The starts must be two different finite numbers in [-4, 4].');
    const iterates = [first, second];
    const finish = (termination: RootFindingTermination): RootFindingHistory =>
        ({example, iterates, stepsTaken: iterates.length - 2, termination});
    for (let k = 1; ; k++) {
        const x = iterates[k];
        const previous = iterates[k - 1];
        const fx = example.value(x);
        const fPrevious = example.value(previous);
        if (!Number.isFinite(fx) || !Number.isFinite(fPrevious)) return finish('non-finite');
        if (fx === 0) return finish('root-found');
        if (fx === fPrevious) return finish('flat-secant');
        if (k - 1 === steps) return finish(steps >= ROOT_FINDING_MAX_STEPS ? 'step-cap' : 'running');
        const next = x - fx * (x - previous) / (fx - fPrevious);
        if (!Number.isFinite(next)) return finish('non-finite');
        const again = repeats(iterates, next);
        iterates.push(next);
        if (again) return finish('repeated-iterate');
    }
}
