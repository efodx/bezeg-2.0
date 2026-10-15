/**
 * Darboux (lower and upper) sums of a named example on an equal partition of [a, b], a < b.
 * The infimum and supremum of every subinterval are exact: the minimum and maximum of f over the endpoint values and the
 * values at the critical points inside the subinterval (listed analytically per example); nothing is sampled.
 * Pure mathematics: no React, JSXGraph or localization imports.
 */

/** Both endpoints lie in [DARBOUX_X_MIN, DARBOUX_X_MAX], which contains [0, 2 pi]. Typed and dragged values are rounded by the graph. */
export const DARBOUX_X_MIN = -7;
export const DARBOUX_X_MAX = 7;
export const DARBOUX_X_STEP = 0.01;

/** The number of equal subintervals is an integer in [DARBOUX_N_MIN, DARBOUX_N_MAX]. */
export const DARBOUX_N_MIN = 1;
export const DARBOUX_N_MAX = 128;

export const isDarbouxX = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= DARBOUX_X_MIN && value <= DARBOUX_X_MAX;

export const isDarbouxCount = (value: unknown): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value >= DARBOUX_N_MIN && value <= DARBOUX_N_MAX;

/** True for finite numbers with a < b (the interval is not oriented here). */
export const isDarbouxInterval = (a: number, b: number): boolean => Number.isFinite(a) && Number.isFinite(b) && a < b;

export const DARBOUX_EXAMPLE_IDS = ['square', 'sine'] as const;
export type DarbouxExampleId = typeof DARBOUX_EXAMPLE_IDS[number];

export const isDarbouxExampleId = (value: unknown): value is DarbouxExampleId =>
    typeof value === 'string' && (DARBOUX_EXAMPLE_IDS as readonly string[]).includes(value);

export interface DarbouxExample {
    readonly id: DarbouxExampleId;
    /** Undelimited LaTeX of the formula. */
    readonly latex: string;
    readonly value: (x: number) => number;
    /** An antiderivative F, so that the exact integral over [a, b] is F(b) - F(a). */
    readonly antiderivative: (x: number) => number;
    /** The points of the closed interval [from, to] where f' = 0, ascending, computed analytically. */
    readonly criticalPoints: (from: number, to: number) => number[];
}

export const DARBOUX_EXAMPLES: Readonly<Record<DarbouxExampleId, DarbouxExample>> = {
    square: {
        id: 'square',
        latex: 'x^2',
        value: x => x * x,
        antiderivative: x => (x * x * x) / 3,
        criticalPoints: (from, to) => (from <= 0 && 0 <= to ? [0] : []),
    },
    // f' = cos x vanishes at pi/2 + k pi, where f = +-1.
    sine: {
        id: 'sine',
        latex: '\\sin x',
        value: x => Math.sin(x),
        antiderivative: x => -Math.cos(x),
        criticalPoints: (from, to) => {
            const points: number[] = [];
            const kMin = Math.ceil((from - Math.PI / 2) / Math.PI);
            const kMax = Math.floor((to - Math.PI / 2) / Math.PI);
            for (let k = kMin; k <= kMax; k++) {
                const x = Math.PI / 2 + k * Math.PI;
                if (x >= from && x <= to) points.push(x);
            }
            return points;
        },
    },
};

export const darbouxExample = (id: DarbouxExampleId): DarbouxExample => DARBOUX_EXAMPLES[id];

/** One subinterval [x0, x1] with the exact infimum and supremum of f on it. */
export interface DarbouxSubinterval {
    readonly x0: number;
    readonly x1: number;
    readonly inf: number;
    readonly sup: number;
}

function requirePartition(a: number, b: number, n: number): void {
    if (!isDarbouxInterval(a, b)) throw new RangeError('The endpoints must be finite numbers with a < b.');
    if (!isDarbouxCount(n)) throw new RangeError(`The number of subintervals must be an integer from ${DARBOUX_N_MIN} to ${DARBOUX_N_MAX}.`);
}

/**
 * The node a + (b - a) i / n (the last node is exactly b). Doubling n and i scales numerator and denominator by 2,
 * which is exact in binary floating point, so node(a, b, 2n, 2i) === node(a, b, n, i): refinement is exactly nested.
 */
function node(a: number, b: number, n: number, i: number): number {
    if (i === 0) return a;
    if (i === n) return b;
    return a + ((b - a) * i) / n;
}

/** The n + 1 partition nodes, ascending, from exactly a to exactly b. Throws unless a < b and n is valid. */
export function partitionNodes(a: number, b: number, n: number): number[] {
    requirePartition(a, b, n);
    return Array.from({length: n + 1}, (_, i) => node(a, b, n, i));
}

/** The n subintervals with exact infimum and supremum; x1 of one equals x0 of the next exactly. */
export function darbouxSubintervals(example: DarbouxExample, a: number, b: number, n: number): DarbouxSubinterval[] {
    const nodes = partitionNodes(a, b, n);
    const result: DarbouxSubinterval[] = [];
    for (let i = 0; i < n; i++) {
        const x0 = nodes[i];
        const x1 = nodes[i + 1];
        const values = [example.value(x0), example.value(x1), ...example.criticalPoints(x0, x1).map(example.value)];
        result.push({x0, x1, inf: Math.min(...values), sup: Math.max(...values)});
    }
    return result;
}

/** The lower sum, upper sum, exact integral and gap U - L of one partition. */
export interface DarbouxTotals {
    readonly lower: number;
    readonly upper: number;
    readonly integral: number;
    readonly gap: number;
}

export function darbouxTotals(example: DarbouxExample, a: number, b: number, n: number): DarbouxTotals {
    let lower = 0;
    let upper = 0;
    for (const {x0, x1, inf, sup} of darbouxSubintervals(example, a, b, n)) {
        lower += inf * (x1 - x0);
        upper += sup * (x1 - x0);
    }
    return {lower, upper, integral: exactIntegral(example, a, b), gap: upper - lower};
}

/** The exact integral F(b) - F(a). Throws unless a < b. */
export function exactIntegral(example: DarbouxExample, a: number, b: number): number {
    if (!isDarbouxInterval(a, b)) throw new RangeError('The endpoints must be finite numbers with a < b.');
    return example.antiderivative(b) - example.antiderivative(a);
}

/** True when the partition can be refined (2n is still at most DARBOUX_N_MAX). */
export const canRefine = (n: number): boolean => isDarbouxCount(n) && 2 * n <= DARBOUX_N_MAX;

/**
 * The nested refinement: bisecting every subinterval gives 2n equal subintervals whose even-indexed nodes are exactly the
 * previous nodes. Returns undefined (never clamps) when 2n would exceed DARBOUX_N_MAX or n is invalid.
 */
export const refine = (n: number): number | undefined => (canRefine(n) ? 2 * n : undefined);
