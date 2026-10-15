/**
 * Taylor approximation demonstration: the Taylor polynomial T_n of a few named functions about a center c, its error at an
 * evaluation point x and, where one is justified, a Lagrange remainder bound.
 * Every Taylor coefficient is a closed form (no symbolic differentiation). Pure mathematics: no React, JSXGraph or
 * localization imports.
 *
 * T_n is a finite polynomial and always exists. Whether the infinite Taylor series converges, and to what, is a separate
 * question (see `seriesBehavior`): finite-polynomial approximation and series convergence must not be conflated.
 */

/** The polynomial degree n runs over the integers TAYLOR_DEGREE_MIN..TAYLOR_DEGREE_MAX. */
export const TAYLOR_DEGREE_MIN = 0;
export const TAYLOR_DEGREE_MAX = 10;

export const TAYLOR_EXAMPLE_IDS = ['exp', 'sine', 'geometric', 'flat'] as const;
export type TaylorExampleId = typeof TAYLOR_EXAMPLE_IDS[number];

export const isTaylorExampleId = (value: unknown): value is TaylorExampleId =>
    typeof value === 'string' && (TAYLOR_EXAMPLE_IDS as readonly string[]).includes(value);

export const isTaylorDegree = (value: unknown): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value >= TAYLOR_DEGREE_MIN && value <= TAYLOR_DEGREE_MAX;

/**
 * What the infinite Taylor series about the center does (distinct from how well the finite T_n fits):
 * - `converges-everywhere`: the series converges to f for every real x (e^x, sin x);
 * - `converges-in-interval`: the series converges to f exactly for |x - c| < 1 - c and diverges outside (1/(1 - x));
 * - `converges-to-zero`: the series is identically zero, so it converges everywhere but to f only for x <= 0 (flat function).
 */
export type SeriesBehavior = 'converges-everywhere' | 'converges-in-interval' | 'converges-to-zero';

/**
 * The Lagrange remainder bound |f(x) - T_n(x)| <= M |x - c|^(n+1) / (n+1)! where M bounds |f^(n+1)| between c and x.
 * `no-derivative-bound` means the example offers none: the flat function has no useful derivative bound to state
 * (its derivatives at 0 vanish, yet the function is positive, so the bound would have to come from derivatives elsewhere
 * that this demonstration does not model).
 */
export type TaylorBound =
    | {readonly kind: 'bound'; readonly value: number}
    | {readonly kind: 'unavailable'; readonly reason: 'no-derivative-bound'};

export interface TaylorExample {
    readonly id: TaylorExampleId;
    /** Undelimited LaTeX of the formula. */
    readonly latex: string;
    readonly plain: string;
    readonly seriesBehavior: SeriesBehavior;
    /** The center c may move in [centerMin, centerMax] (equal for a fixed center). */
    readonly centerMin: number;
    readonly centerMax: number;
    readonly centerStep: number;
    /** The evaluation point x may move in [xMin, xMax]. */
    readonly xMin: number;
    readonly xMax: number;
    readonly xStep: number;
    /** f(x); callers keep x in the example's x domain. */
    readonly value: (x: number) => number;
    /** The k-th Taylor coefficient f^(k)(c) / k!, a closed form; callers keep c in the center domain. */
    readonly coefficient: (center: number, k: number) => number;
    /** The Lagrange remainder bound for degree n, center c and point x. */
    readonly bound: (center: number, degree: number, x: number) => TaylorBound;
}

/** 0! .. (TAYLOR_DEGREE_MAX + 1)!, all exactly representable. */
const FACTORIALS: readonly number[] = (() => {
    const table = [1];
    for (let k = 1; k <= TAYLOR_DEGREE_MAX + 1; k++) table.push(table[k - 1] * k);
    return table;
})();

/** Turns -0 into 0 (sin 0 negated is -0 and would otherwise print as "-0"). */
const plusZero = (value: number): number => value + 0;

const lagrange = (m: number, center: number, degree: number, x: number): TaylorBound =>
    ({kind: 'bound', value: m * Math.abs(x - center) ** (degree + 1) / FACTORIALS[degree + 1]});

export const TAYLOR_EXAMPLES: Readonly<Record<TaylorExampleId, TaylorExample>> = {
    // f^(k)(c) = e^c; between c and x, |f^(n+1)| <= max(e^c, e^x) because e^t is increasing.
    exp: {
        id: 'exp',
        latex: 'e^{x}',
        plain: 'e^x',
        seriesBehavior: 'converges-everywhere',
        centerMin: -2, centerMax: 2, centerStep: 0.1,
        xMin: -3, xMax: 3, xStep: 0.01,
        value: x => Math.exp(x),
        coefficient: (center, k) => Math.exp(center) / FACTORIALS[k],
        bound: (center, degree, x) => lagrange(Math.max(Math.exp(center), Math.exp(x)), center, degree, x),
    },
    // The derivatives of sin cycle sin, cos, -sin, -cos, so every derivative is bounded by 1.
    sine: {
        id: 'sine',
        latex: '\\sin x',
        plain: 'sin x',
        seriesBehavior: 'converges-everywhere',
        centerMin: -4, centerMax: 4, centerStep: 0.1,
        xMin: -7, xMax: 7, xStep: 0.01,
        value: x => Math.sin(x),
        coefficient: (center, k) => {
            const derivative = [Math.sin(center), Math.cos(center), -Math.sin(center), -Math.cos(center)][k % 4];
            return plusZero(derivative / FACTORIALS[k]);
        },
        bound: (center, degree, x) => lagrange(1, center, degree, x),
    },
    // f^(k)(x) = k! / (1 - x)^(k + 1), so the coefficient is 1 / (1 - c)^(k + 1). f^(n+1) is increasing on x < 1, hence
    // M = (n+1)! / (1 - max(c, x))^(n+2) and the factorials cancel in the bound.
    geometric: {
        id: 'geometric',
        latex: '\\frac{1}{1-x}',
        plain: '1/(1 - x)',
        seriesBehavior: 'converges-in-interval',
        centerMin: -1, centerMax: 0.5, centerStep: 0.05,
        xMin: -2, xMax: 0.95, xStep: 0.01,
        value: x => 1 / (1 - x),
        coefficient: (center, k) => 1 / (1 - center) ** (k + 1),
        bound: (center, degree, x) => ({
            kind: 'bound',
            value: Math.abs(x - center) ** (degree + 1) / (1 - Math.max(center, x)) ** (degree + 2),
        }),
    },
    // f is smooth with f^(k)(0) = 0 for every k, so every Taylor coefficient at the fixed center 0 vanishes.
    flat: {
        id: 'flat',
        latex: 'f(x)=\\begin{cases}e^{-1/x}&x>0\\\\0&x\\le 0\\end{cases}',
        plain: 'e^(-1/x) for x > 0, 0 for x <= 0',
        seriesBehavior: 'converges-to-zero',
        centerMin: 0, centerMax: 0, centerStep: 0.1,
        xMin: -1, xMax: 3, xStep: 0.01,
        value: x => (x > 0 ? Math.exp(-1 / x) : 0),
        coefficient: () => 0,
        bound: () => ({kind: 'unavailable', reason: 'no-derivative-bound'}),
    },
};

export const taylorExample = (id: TaylorExampleId): TaylorExample => TAYLOR_EXAMPLES[id];

const isFiniteIn = (value: unknown, min: number, max: number): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

/** True for a finite center in the example's center domain. */
export const isTaylorCenter = (example: TaylorExample, value: unknown): value is number =>
    isFiniteIn(value, example.centerMin, example.centerMax);

/** True for a finite evaluation point in the example's x domain. */
export const isTaylorX = (example: TaylorExample, value: unknown): value is number =>
    isFiniteIn(value, example.xMin, example.xMax);

function requireArguments(example: TaylorExample, center: number, degree: number, x: number): void {
    if (!isTaylorCenter(example, center)) throw new RangeError('The center is outside the domain of the example.');
    if (!isTaylorDegree(degree)) throw new RangeError('The degree must be an integer from 0 to 10.');
    if (!isTaylorX(example, x)) throw new RangeError('The evaluation point is outside the domain of the example.');
}

/** The k-th Taylor coefficient f^(k)(c) / k!. Throws unless the center is in its domain and k is an integer 0..11. */
export function taylorCoefficient(example: TaylorExample, center: number, k: number): number {
    if (!isTaylorCenter(example, center)) throw new RangeError('The center is outside the domain of the example.');
    if (!Number.isInteger(k) || k < 0 || k > TAYLOR_DEGREE_MAX + 1) throw new RangeError('The coefficient index must be an integer from 0 to 11.');
    return example.coefficient(center, k);
}

/** f(x). Throws unless x is in the example's x domain. */
export function taylorFunctionValue(example: TaylorExample, x: number): number {
    if (!isTaylorX(example, x)) throw new RangeError('The evaluation point is outside the domain of the example.');
    return example.value(x);
}

/** T_n(x) = sum of a_k (x - c)^k for k = 0..n, evaluated in Horner form in (x - c). Throws on arguments outside the domains. */
export function taylorPolynomial(example: TaylorExample, center: number, degree: number, x: number): number {
    requireArguments(example, center, degree, x);
    const offset = x - center;
    let result = example.coefficient(center, degree);
    for (let k = degree - 1; k >= 0; k--) result = result * offset + example.coefficient(center, k);
    return result;
}

/** The signed error f(x) - T_n(x): positive where the polynomial lies below the function. */
export function taylorSignedError(example: TaylorExample, center: number, degree: number, x: number): number {
    return taylorFunctionValue(example, x) - taylorPolynomial(example, center, degree, x);
}

/** The absolute error |f(x) - T_n(x)|. */
export function taylorAbsoluteError(example: TaylorExample, center: number, degree: number, x: number): number {
    return Math.abs(taylorSignedError(example, center, degree, x));
}

/**
 * The Lagrange remainder bound M |x - c|^(n+1) / (n+1)! with M a bound of |f^(n+1)| between c and x, or the reason there
 * is none. Valid for x on either side of c. Throws on arguments outside the domains.
 */
export function taylorErrorBound(example: TaylorExample, center: number, degree: number, x: number): TaylorBound {
    requireArguments(example, center, degree, x);
    return example.bound(center, degree, x);
}

/**
 * The open interval of x for which the Taylor series of 1/(1 - x) about c converges: |x - c| < 1 - c, that is
 * (2c - 1, 1). Throws unless c < 1.
 */
export function geometricConvergenceInterval(center: number): {readonly from: number; readonly to: number} {
    if (!Number.isFinite(center) || center >= 1) throw new RangeError('The center must be a finite number below 1.');
    return {from: 2 * center - 1, to: 1};
}

/** True when |x - c| < 1 - c, the strict convergence condition of the Taylor series of 1/(1 - x) about c. */
export function isInsideGeometricConvergence(center: number, x: number): boolean {
    const {from, to} = geometricConvergenceInterval(center);
    return Number.isFinite(x) && x > from && x < to;
}
