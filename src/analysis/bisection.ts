/**
 * The bisection method on a bracket [a, b] of a named example function (intermediate value theorem lesson).
 * Pure mathematics: no React, JSXGraph or localization imports.
 *
 * The history is always recomputed from the example, the endpoints and the step count; a stored history is never trusted.
 */

/** Endpoints a and b may be chosen in [BISECTION_BOUND_MIN, BISECTION_BOUND_MAX]; the same range holds for every example. */
export const BISECTION_BOUND_MIN = -4;
export const BISECTION_BOUND_MAX = 4;

/**
 * The documented iteration limit. Halving a width of order 1 reaches the double precision spacing after about 52 steps,
 * so a limit of 60 lets floating-point stagnation show up before the limit does.
 */
export const BISECTION_MAX_STEPS = 60;

export const BISECTION_EXAMPLE_IDS = ['square-minus-two', 'sign-step', 'cubic'] as const;
export type BisectionExampleId = typeof BISECTION_EXAMPLE_IDS[number];

export interface BisectionExample {
    readonly id: BisectionExampleId;
    /** Plain-text formula for labels and accessible names. */
    readonly plain: string;
    /** Undelimited LaTeX of the formula. */
    readonly latex: string;
    readonly value: (x: number) => number;
    /** False when the function has a jump on the real line. */
    readonly continuous: boolean;
    /**
     * The location of the jump of a discontinuous example. The value at the jump belongs to the right branch,
     * so the function is discontinuous on [a, b] exactly when a < discontinuity <= b.
     */
    readonly discontinuity?: number;
    /** The bracket the example starts with. */
    readonly defaultA: number;
    readonly defaultB: number;
}

export const BISECTION_EXAMPLES: Readonly<Record<BisectionExampleId, BisectionExample>> = {
    // The root sqrt(2) is irrational, so no double precision midpoint is an exact root: x * x - 2 is never exactly 0.
    'square-minus-two': {
        id: 'square-minus-two', plain: 'x^2 - 2', latex: 'x^2-2',
        value: x => x * x - 2, continuous: true, defaultA: 1, defaultB: 2,
    },
    // The sign step has no zero at all: it jumps from -1 to 1 at 0 without taking the value 0.
    'sign-step': {
        id: 'sign-step', plain: '-1 for x < 0, 1 otherwise',
        latex: String.raw`\begin{cases}-1 & x<0\\ 1 & x\ge 0\end{cases}`,
        value: x => x < 0 ? -1 : 1, continuous: false, discontinuity: 0, defaultA: -1, defaultB: 1,
    },
    // Three roots -1, 0, 1 (all exactly representable): a bracket guarantees at least one root, not exactly one.
    'cubic': {
        id: 'cubic', plain: 'x^3 - x', latex: 'x^3-x',
        value: x => x * x * x - x, continuous: true, defaultA: 0.5, defaultB: 2,
    },
};

export const isBisectionExampleId = (value: unknown): value is BisectionExampleId =>
    typeof value === 'string' && (BISECTION_EXAMPLE_IDS as readonly string[]).includes(value);

export function bisectionExample(id: BisectionExampleId): BisectionExample {
    if (!isBisectionExampleId(id)) throw new RangeError('Unknown bisection example.');
    return BISECTION_EXAMPLES[id];
}

/** An endpoint must be finite and inside the shared range. */
export const isBisectionEndpoint = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= BISECTION_BOUND_MIN && value <= BISECTION_BOUND_MAX;

/** A bracket needs two valid endpoints with a < b. */
export const isBisectionBracket = (a: unknown, b: unknown): boolean =>
    isBisectionEndpoint(a) && isBisectionEndpoint(b) && a < b;

/** A step count is an integer in [0, BISECTION_MAX_STEPS]. */
export const isBisectionStepCount = (value: unknown): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= BISECTION_MAX_STEPS;

/** Whether the example is continuous on the closed interval [a, b] (a jump counts when a < d <= b). */
export function isContinuousOn(example: BisectionExample, a: number, b: number): boolean {
    if (example.continuous || example.discontinuity === undefined) return true;
    return !(a < example.discontinuity && example.discontinuity <= b);
}

export type BisectionBracketKind =
    /** f(a) and f(b) have strictly opposite signs. */
    | 'opposite-signs'
    /** f(a) and f(b) are both positive or both negative: the theorem gives no root. */
    | 'same-sign'
    /** f(a) = 0 or f(b) = 0 exactly. */
    | 'endpoint-root';

export type BisectionTermination =
    /** The initial bracket cannot be bisected: same signs. */
    | 'invalid-bracket'
    /** An endpoint is an exact zero already. */
    | 'endpoint-root'
    /** A midpoint value is exactly 0. */
    | 'exact-midpoint-root'
    /** The midpoint equals an endpoint in floating point: the bracket cannot shrink any further. */
    | 'stagnation'
    /** BISECTION_MAX_STEPS steps have been taken. */
    | 'iteration-limit';

/** Which half the step keeps; 'none' when the midpoint is an exact root. */
export type BisectionRetained = 'left' | 'right' | 'none';

/** One bisection step, 1-based. The bracket before the step is [a, b]; the bracket after it is [nextA, nextB]. */
export interface BisectionStep {
    readonly index: number;
    readonly a: number;
    readonly b: number;
    readonly fa: number;
    readonly fb: number;
    readonly mid: number;
    readonly fMid: number;
    /** Width b - a before the step. */
    readonly width: number;
    readonly retained: BisectionRetained;
    /** The bracket after the step; for an exact midpoint root it collapses to [mid, mid]. */
    readonly nextA: number;
    readonly nextB: number;
    /** nextB - nextA; half of `width` for a proper step, 0 for an exact midpoint root. */
    readonly nextWidth: number;
}

export interface BisectionHistory {
    readonly example: BisectionExampleId;
    /** The initial bracket. */
    readonly a: number;
    readonly b: number;
    readonly fa: number;
    readonly fb: number;
    readonly bracket: BisectionBracketKind;
    /** Whether the example is continuous on [a, b]. */
    readonly continuous: boolean;
    /** Continuity on [a, b] and strictly opposite endpoint signs: the intermediate value theorem then guarantees a root. */
    readonly hypothesisSatisfied: boolean;
    /** The steps taken; at most the requested number (fewer when the iteration terminated earlier). */
    readonly steps: readonly BisectionStep[];
    /** The bracket after the last step (the initial one when no step was taken). */
    readonly currentA: number;
    readonly currentB: number;
    readonly currentWidth: number;
    /** Why no further step is possible; undefined while the iteration can continue. */
    readonly termination?: BisectionTermination;
    /** An exact root: a point where the function value is exactly 0. Never set for a merely small value. */
    readonly exactRoot?: number;
}

const signOf = (value: number): number => value > 0 ? 1 : value < 0 ? -1 : 0;

export function bracketKind(fa: number, fb: number): BisectionBracketKind {
    if (fa === 0 || fb === 0) return 'endpoint-root';
    return signOf(fa) === signOf(fb) ? 'same-sign' : 'opposite-signs';
}

/** The midpoint a + (b - a) / 2. */
export const bisectionMidpoint = (a: number, b: number): number => a + (b - a) / 2;

/**
 * The first `steps` bisection steps for the example on [a, b], stopping early at a termination.
 * Throws RangeError for an invalid bracket (a < b required, both inside the shared range) or a step count outside [0, BISECTION_MAX_STEPS].
 */
export function bisectionHistory(exampleId: BisectionExampleId, a: number, b: number, steps: number): BisectionHistory {
    const example = bisectionExample(exampleId);
    if (!isBisectionBracket(a, b)) throw new RangeError('The endpoints must be finite, inside the allowed range and satisfy a < b.');
    if (!isBisectionStepCount(steps)) throw new RangeError(`The step count must be an integer from 0 to ${BISECTION_MAX_STEPS}.`);

    const fa = example.value(a);
    const fb = example.value(b);
    const bracket = bracketKind(fa, fb);
    const continuous = isContinuousOn(example, a, b);
    const base = {example: exampleId, a, b, fa, fb, bracket, continuous, hypothesisSatisfied: continuous && bracket === 'opposite-signs'};

    if (bracket !== 'opposite-signs') {
        const endpointRoot = bracket === 'endpoint-root';
        return {
            ...base, steps: [], currentA: a, currentB: b, currentWidth: b - a,
            termination: endpointRoot ? 'endpoint-root' : 'invalid-bracket',
            ...(endpointRoot ? {exactRoot: fa === 0 ? a : b} : {}),
        };
    }

    const taken: BisectionStep[] = [];
    let curA = a, curB = b, curFa = fa, curFb = fb;
    let termination: BisectionTermination | undefined;
    let exactRoot: number | undefined;

    while (termination === undefined && taken.length < steps) {
        const mid = bisectionMidpoint(curA, curB);
        if (!(mid > curA && mid < curB)) {
            termination = 'stagnation';
            break;
        }
        const fMid = example.value(mid);
        const width = curB - curA;
        let retained: BisectionRetained;
        let nextA = curA, nextB = curB, nextFa = curFa, nextFb = curFb;
        if (fMid === 0) {
            retained = 'none';
            nextA = mid; nextB = mid; nextFa = fMid; nextFb = fMid;
            termination = 'exact-midpoint-root';
            exactRoot = mid;
        } else if (signOf(fMid) === signOf(curFa)) {
            retained = 'right';
            nextA = mid; nextFa = fMid;
        } else {
            retained = 'left';
            nextB = mid; nextFb = fMid;
        }
        taken.push({
            index: taken.length + 1, a: curA, b: curB, fa: curFa, fb: curFb, mid, fMid, width, retained,
            nextA, nextB, nextWidth: nextB - nextA,
        });
        curA = nextA; curB = nextB; curFa = nextFa; curFb = nextFb;
        if (termination === undefined && taken.length >= BISECTION_MAX_STEPS) termination = 'iteration-limit';
    }

    // The state after the requested steps may already be final without a further step being asked for.
    if (termination === undefined) {
        const mid = bisectionMidpoint(curA, curB);
        if (!(mid > curA && mid < curB)) termination = 'stagnation';
    }

    return {
        ...base, steps: taken, currentA: curA, currentB: curB, currentWidth: curB - curA,
        ...(termination !== undefined ? {termination} : {}),
        ...(exactRoot !== undefined ? {exactRoot} : {}),
    };
}
