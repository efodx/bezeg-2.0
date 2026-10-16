/**
 * Uniform convergence demonstration: the sequences f_n(x) = x^n and f_n(x) = x/n on the domain [0, r], the pointwise limit,
 * the pointwise error and threshold N(x, epsilon), the supremum error over the whole domain and the uniform threshold.
 * Pure mathematics: no React, JSXGraph or localization imports.
 *
 * The supremum error is analytic (a closed form per example), never a maximum over sampled points. Thresholds are exact: the
 * inputs r, x and epsilon live on decimal grids, so every comparison is carried out on integers (BigInt) and never rounds
 * a quotient or a logarithm.
 *
 * Grids (the domains the model, the controls and the thresholds share):
 * - r in [0.1, 1], step 0.05 (r = r20 / 20 with r20 an integer 2..20);
 * - x in [0, r], step 0.01 (x = x100 / 100);
 * - epsilon in [0.01, 1], step 0.01 (epsilon = e100 / 100);
 * - n an integer 1..UNIFORM_MAX_N.
 */

export const UNIFORM_R_MIN = 0.1;
export const UNIFORM_R_MAX = 1;
export const UNIFORM_R_STEP = 0.05;
export const UNIFORM_X_STEP = 0.01;
export const UNIFORM_EPSILON_MIN = 0.01;
export const UNIFORM_EPSILON_MAX = 1;
export const UNIFORM_EPSILON_STEP = 0.01;
export const UNIFORM_N_MIN = 1;
export const UNIFORM_MAX_N = 50;
/**
 * The default search cap of the pointwise threshold of x^n. On the grids a threshold never exceeds 459 (x = 0.99, epsilon =
 * 0.01), so the cap is a guard: when it is too small the result says "beyond the cap" instead of searching on.
 */
export const UNIFORM_THRESHOLD_CAP = 1000;

export const UNIFORM_EXAMPLE_IDS = ['power', 'scaled'] as const;
export type UniformExampleId = typeof UNIFORM_EXAMPLE_IDS[number];

export const isUniformExampleId = (value: unknown): value is UniformExampleId =>
    typeof value === 'string' && (UNIFORM_EXAMPLE_IDS as readonly string[]).includes(value);

/** The integer k with value = k * step, or undefined when the value is not on that grid (within 1e-9 grid units). */
function gridUnits(value: unknown, step: number): number | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
    const units = Math.round(value / step);
    return Math.abs(value / step - units) <= 1e-9 ? units : undefined;
}

/** r20 = 20 r, an integer 2..20, or undefined unless r is a grid value in [0.1, 1]. */
const unitsOfR = (r: unknown): number | undefined => {
    const units = gridUnits(r, UNIFORM_R_STEP);
    return units !== undefined && units >= 2 && units <= 20 ? units : undefined;
};

/** e100 = 100 epsilon, an integer 1..100, or undefined unless epsilon is a grid value in [0.01, 1]. */
const unitsOfEpsilon = (epsilon: unknown): number | undefined => {
    const units = gridUnits(epsilon, UNIFORM_EPSILON_STEP);
    return units !== undefined && units >= 1 && units <= 100 ? units : undefined;
};

/** x100 = 100 x, an integer 0..5 r20, or undefined unless x is a grid value in [0, r] (r a grid value). */
const unitsOfX = (r: unknown, x: unknown): number | undefined => {
    const r20 = unitsOfR(r);
    const units = gridUnits(x, UNIFORM_X_STEP);
    return r20 !== undefined && units !== undefined && units >= 0 && units <= 5 * r20 ? units : undefined;
};

/** True for r on the grid 0.05 inside [0.1, 1]. */
export const isUniformR = (value: unknown): value is number => unitsOfR(value) !== undefined;

/** True for an integer n in 1..UNIFORM_MAX_N. */
export const isUniformN = (value: unknown): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value >= UNIFORM_N_MIN && value <= UNIFORM_MAX_N;

/** True for epsilon on the grid 0.01 inside [0.01, 1]. */
export const isUniformEpsilon = (value: unknown): value is number => unitsOfEpsilon(value) !== undefined;

/** True for x on the grid 0.01 inside [0, r]; false for a non-grid x, x > r, and also whenever r itself is not a valid r. */
export const isUniformX = (r: unknown, x: unknown): x is number => unitsOfX(r, x) !== undefined;

/** True for a finite x with 0 <= x <= r (any real, no grid) where r is a valid r: the domain of the continuous functions. */
export const isUniformDomainPoint = (r: unknown, x: unknown): x is number =>
    isUniformR(r) && typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= (r as number);

export interface UniformExample {
    readonly id: UniformExampleId;
    /** Undelimited LaTeX of f_n(x). */
    readonly latex: string;
    readonly plain: string;
    /** f_n(x); callers keep n and x in their domains. */
    readonly term: (n: number, x: number) => number;
}

export const UNIFORM_EXAMPLES: Readonly<Record<UniformExampleId, UniformExample>> = {
    power: {id: 'power', latex: 'f_n(x)=x^{n}', plain: 'x^n', term: (n, x) => x ** n},
    scaled: {id: 'scaled', latex: 'f_n(x)=\\frac{x}{n}', plain: 'x/n', term: (n, x) => x / n},
};

export const uniformExample = (id: UniformExampleId): UniformExample => UNIFORM_EXAMPLES[id];

function requireDomain(r: number, x: number): void {
    if (!isUniformR(r)) throw new RangeError('The domain end r must be on the grid 0.05 in [0.1, 1].');
    if (!isUniformDomainPoint(r, x)) throw new RangeError('The point x must lie in [0, r].');
}

function requireN(n: number): void {
    if (!isUniformN(n)) throw new RangeError(`The index n must be an integer from ${UNIFORM_N_MIN} to ${UNIFORM_MAX_N}.`);
}

function requireEpsilon(epsilon: number): void {
    if (!isUniformEpsilon(epsilon)) throw new RangeError('The tolerance epsilon must be on the grid 0.01 in [0.01, 1].');
}

/** f_n(x) for x in [0, r] (any real in the domain, no grid). Throws on arguments outside the domains. */
export function uniformTerm(example: UniformExample, r: number, n: number, x: number): number {
    requireDomain(r, x);
    requireN(n);
    return example.term(n, x);
}

/** The pointwise limit f(x): 0 for `scaled`; for `power` 0 on [0, 1) and 1 at x = 1 (reachable only when r = 1). */
export function uniformLimit(example: UniformExample, r: number, x: number): number {
    requireDomain(r, x);
    return example.id === 'power' && x === 1 ? 1 : 0;
}

/** The pointwise error |f_n(x) - f(x)|; exactly 0 at x = 0 and, for `power`, at x = 1. */
export function uniformPointwiseError(example: UniformExample, r: number, n: number, x: number): number {
    requireDomain(r, x);
    requireN(n);
    return Math.abs(example.term(n, x) - (example.id === 'power' && x === 1 ? 1 : 0));
}

/**
 * The limit function as drawable pieces, so that a graph never joins the two sides of a jump. A segment lies at height y on
 * [from, to] with each end open or closed; a point is an isolated value.
 * - `scaled`, and `power` with r < 1: the single closed segment y = 0 on [0, r];
 * - `power` with r = 1: the segment y = 0 on [0, 1) (open at 1) and the isolated point (1, 1).
 */
export type UniformLimitPiece =
    | {readonly kind: 'segment'; readonly y: number; readonly from: number; readonly to: number; readonly closedTo: boolean}
    | {readonly kind: 'point'; readonly x: number; readonly y: number};

export function uniformLimitPieces(example: UniformExample, r: number): readonly UniformLimitPiece[] {
    if (!isUniformR(r)) throw new RangeError('The domain end r must be on the grid 0.05 in [0.1, 1].');
    if (example.id === 'power' && r === 1) {
        return [{kind: 'segment', y: 0, from: 0, to: 1, closedTo: false}, {kind: 'point', x: 1, y: 1}];
    }
    return [{kind: 'segment', y: 0, from: 0, to: r, closedTo: true}];
}

/** True when the limit has a jump on [0, r] (only `power` with r = 1), so the convergence cannot be uniform. */
export const uniformLimitHasJump = (example: UniformExample, r: number): boolean => {
    if (!isUniformR(r)) throw new RangeError('The domain end r must be on the grid 0.05 in [0.1, 1].');
    return example.id === 'power' && r === 1;
};

/**
 * The supremum of the error over the whole domain [0, r], in closed form.
 * - `power`, r < 1: r^n, attained at x = r;
 * - `power`, r = 1: 1 for every n, never attained (x^n < 1 for x < 1 and the error is 0 at x = 1); `at` = 1 is the point the
 *   error approaches 1 near;
 * - `scaled`: r/n, attained at x = r.
 */
export interface UniformSupremum {
    readonly value: number;
    readonly attained: boolean;
    /** The point where the supremum is attained, or (when not attained) the point the error approaches it near. */
    readonly at: number;
}

export function uniformSupremum(example: UniformExample, r: number, n: number): UniformSupremum {
    if (!isUniformR(r)) throw new RangeError('The domain end r must be on the grid 0.05 in [0.1, 1].');
    requireN(n);
    if (example.id === 'scaled') return {value: r / n, attained: true, at: r};
    if (r === 1) return {value: 1, attained: false, at: 1};
    return {value: r ** n, attained: true, at: r};
}

/** The least n >= 1 such that num^n * 100 < e100 * den^n, i.e. (num/den)^n < e100/100, for 0 < num < den; exact in BigInt. */
function leastPowerBelow(num: number, den: number, e100: number, cap: number): UniformPointwiseThreshold {
    const bigNum = BigInt(num);
    const bigDen = BigInt(den);
    const bigEps = BigInt(e100);
    const hundred = BigInt(100);
    const works = (n: number): boolean => bigNum ** BigInt(n) * hundred < bigEps * bigDen ** BigInt(n);
    // (num/den)^n is strictly decreasing, so `works` is monotone: if the cap fails, no smaller n works.
    if (!works(cap)) return {kind: 'beyond-cap', cap};
    // The logarithm only proposes a start; the exact test below decides, so rounding in it cannot give a wrong answer.
    const estimate = Math.log(e100 / 100) / Math.log(num / den);
    let n = Number.isFinite(estimate) ? Math.min(cap, Math.max(1, Math.floor(estimate))) : 1;
    while (n > 1 && works(n - 1)) n--;
    while (!works(n)) n++;
    return {kind: 'threshold', n};
}

/** The least n with the pointwise error below epsilon, or the cap that was searched without success. */
export type UniformPointwiseThreshold =
    | {readonly kind: 'threshold'; readonly n: number}
    | {readonly kind: 'beyond-cap'; readonly cap: number};

/** Integer floor(a / b) for non-negative integers. */
const integerQuotient = (a: number, b: number): number => (a - (a % b)) / b;

/**
 * N(x, epsilon): the least n >= 1 with |f_n(x) - f(x)| < epsilon (and then for every larger n, as the error is non-increasing).
 * Needs x on the grid 0.01 in [0, r] and epsilon on the grid 0.01 in [0.01, 1]; throws otherwise.
 * - `power`: 1 at x = 0 and x = 1 (the error is 0 there); for 0 < x < 1 the least n with x^n < epsilon, exact on integers
 *   (x100^n * 100 < e100 * 100^n) and verified against its predecessor. It grows without bound as x -> 1 (459 at x = 0.99,
 *   epsilon = 0.01). `cap` (default UNIFORM_THRESHOLD_CAP) bounds the search; if even n = cap fails the result is `beyond-cap`.
 * - `scaled`: floor(x / epsilon) + 1, computed as an integer quotient (the error x/n < epsilon exactly when n > x / epsilon).
 */
export function uniformPointwiseThreshold(
    example: UniformExample, r: number, x: number, epsilon: number, cap: number = UNIFORM_THRESHOLD_CAP,
): UniformPointwiseThreshold {
    const x100 = unitsOfX(r, x);
    if (x100 === undefined) throw new RangeError('The point x must be on the grid 0.01 in [0, r].');
    requireEpsilon(epsilon);
    if (!Number.isInteger(cap) || cap < 1) throw new RangeError('The cap must be a positive integer.');
    const e100 = unitsOfEpsilon(epsilon) as number;
    if (example.id === 'scaled') return {kind: 'threshold', n: integerQuotient(x100, e100) + 1};
    if (x100 === 0 || x100 === 100) return {kind: 'threshold', n: 1};
    return leastPowerBelow(x100, 100, e100, cap);
}

/** The least n with supremum error < epsilon, or `none` when no n has it (power on [0, 1]: the supremum is 1 >= epsilon). */
export type UniformThreshold = {readonly kind: 'threshold'; readonly n: number} | {readonly kind: 'none'};

/**
 * The shared threshold N(epsilon): the least n with sup |f_m - f| < epsilon (then for every m >= n, the supremum being
 * non-increasing). Needs r on the grid 0.05 in [0.1, 1] and epsilon on the grid 0.01 in [0.01, 1]; throws otherwise.
 * - `power`, r < 1: the least n with r^n < epsilon, exact on integers (r20^n * 100 < e100 * 20^n);
 * - `power`, r = 1: `none` for every epsilon <= 1, because the supremum is 1;
 * - `scaled`: floor(r / epsilon) + 1, computed as floor(5 r20 / e100) + 1 on integers.
 */
export function uniformThreshold(example: UniformExample, r: number, epsilon: number): UniformThreshold {
    const r20 = unitsOfR(r);
    if (r20 === undefined) throw new RangeError('The domain end r must be on the grid 0.05 in [0.1, 1].');
    requireEpsilon(epsilon);
    const e100 = unitsOfEpsilon(epsilon) as number;
    if (example.id === 'scaled') return {kind: 'threshold', n: integerQuotient(5 * r20, e100) + 1};
    if (r20 === 20) return {kind: 'none'};
    // r^n decreases to 0 and r^n < epsilon at some n <= 90 on the grids, far below the cap.
    const found = leastPowerBelow(r20, 20, e100, UNIFORM_THRESHOLD_CAP);
    return found.kind === 'threshold' ? found : {kind: 'none'};
}
