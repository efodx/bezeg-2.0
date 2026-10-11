/**
 * Area between two fixed curves (area-between-curves demonstration):
 *
 *     f(x) = (x - 2)^2        g(x) = 3 - (x - 2)^2        g - f = 3 - 2(x - 2)^2
 *
 * Pure mathematics: no React, JSXGraph or localization imports. Both curves are polynomials, so every integral is exact
 * (antiderivatives F, G, D = G - F) and the unsigned area is exact too: [a, b] is split at the two intersections
 * x = 2 -+ sqrt(3/2) that lie inside it, and the signed integral of g - f is taken on each piece in absolute value.
 *
 * Conventions: everything signed is oriented (swapping a and b flips the sign of integralF, integralG and
 * signedBetween). The unsigned area and the drawn shading do not depend on the order: the area is always >= 0.
 */

export const AREA_MODES = ['under-f', 'under-g', 'between'] as const;
export type AreaMode = typeof AREA_MODES[number];

export const isAreaMode = (value: unknown): value is AreaMode =>
    typeof value === 'string' && (AREA_MODES as readonly string[]).includes(value);

/** Both bounds lie in [BOUND_MIN, BOUND_MAX], which contains the intersections and the lesson's [0, 4]. Dragged and typed bounds are rounded to BOUND_STEP by the graph. */
export const BOUND_MIN = -1;
export const BOUND_MAX = 5;
export const BOUND_STEP = 0.01;

export const isBound = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= BOUND_MIN && value <= BOUND_MAX;

export const f = (x: number): number => (x - 2) * (x - 2);
export const g = (x: number): number => 3 - (x - 2) * (x - 2);
/** g - f = 3 - 2(x - 2)^2. */
export const difference = (x: number): number => g(x) - f(x);

/** Antiderivatives: F' = f, G' = g, D' = g - f (D = G - F). */
export const antiderivativeF = (x: number): number => Math.pow(x - 2, 3) / 3;
export const antiderivativeG = (x: number): number => 3 * x - Math.pow(x - 2, 3) / 3;
export const antiderivativeDifference = (x: number): number => 3 * x - 2 * Math.pow(x - 2, 3) / 3;

/** The x-coordinates where f = g, i.e. (x - 2)^2 = 3/2, in increasing order. */
export const INTERSECTION_OFFSET = Math.sqrt(1.5);
export const INTERSECTIONS: readonly [number, number] = [2 - INTERSECTION_OFFSET, 2 + INTERSECTION_OFFSET];
/** The common height f = g = 3/2 at both intersections. */
export const INTERSECTION_HEIGHT = 1.5;

/** The x-coordinates where g = 0, i.e. (x - 2)^2 = 3 (f only touches 0 at x = 2 and never changes sign). */
export const ZEROS_OF_G: readonly [number, number] = [2 - Math.sqrt(3), 2 + Math.sqrt(3)];

/** The signed integral of f from a to b (oriented: negative for a > b). */
export const integralF = (a: number, b: number): number => antiderivativeF(b) - antiderivativeF(a) + 0;

/** The signed integral of g from a to b. */
export const integralG = (a: number, b: number): number => antiderivativeG(b) - antiderivativeG(a) + 0;

/** The signed integral of g - f from a to b: parts where f is on top count negative. */
export const signedBetween = (a: number, b: number): number => antiderivativeDifference(b) - antiderivativeDifference(a) + 0;

/** The points that cut [lo, hi] into pieces on which `separators` does not change the sign of the integrand. */
function pieces(lo: number, hi: number, separators: readonly number[]): [number, number][] {
    const cuts = [lo, ...separators.filter(x => x > lo && x < hi), hi];
    const result: [number, number][] = [];
    for (let i = 0; i + 1 < cuts.length; i++) result.push([cuts[i], cuts[i + 1]]);
    return result;
}

/**
 * The unsigned area between the curves, the integral of |g - f|, exact: [min(a, b), max(a, b)] is split at the
 * intersections inside it and the pieces' integrals of g - f are added in absolute value. Always >= 0 and the same for (a, b)
 * and (b, a); exactly 0 for a = b.
 */
export function unsignedBetween(a: number, b: number): number {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    let area = 0;
    for (const [from, to] of pieces(lo, hi, INTERSECTIONS)) area += Math.abs(signedBetween(from, to));
    return area + 0;
}

/**
 * The quantity the shading of a mode stands for: the signed integral of f (under-f) or of g (under-g), or the unsigned
 * area between the curves (between), which is what the shaded region measures.
 */
export function shadedQuantity(mode: AreaMode, a: number, b: number): number {
    switch (mode) {
        case 'under-f':
            return integralF(a, b);
        case 'under-g':
            return integralG(a, b);
        case 'between':
            return unsignedBetween(a, b);
    }
}

/** Which curve is on top at x: 'g' when g > f, 'f' when f > g, 'equal' at an intersection. */
export function topCurve(x: number): 'f' | 'g' | 'equal' {
    const d = difference(x);
    return d > 0 ? 'g' : d < 0 ? 'f' : 'equal';
}

/** The two boundary functions of the shaded region of a mode: upper(x) >= lower(x) except where the sign changes. */
interface Boundaries {
    readonly upper: (x: number) => number;
    readonly lower: (x: number) => number;
    /** Where upper - lower changes sign, in increasing order. */
    readonly crossings: readonly number[];
}

function boundaries(mode: AreaMode): Boundaries {
    switch (mode) {
        case 'under-f':
            return {upper: f, lower: () => 0, crossings: []};
        case 'under-g':
            return {upper: g, lower: () => 0, crossings: ZEROS_OF_G};
        case 'between':
            return {upper: g, lower: f, crossings: INTERSECTIONS};
    }
}

/** The shape is drawn from SAMPLES_PER_SPAN points per full domain width on each boundary (the curves are quadratics). */
const SAMPLES_PER_SPAN = 120;

export interface AreaFill {
    readonly positive: { readonly x: number[]; readonly y: number[] };
    readonly negative: { readonly x: number[]; readonly y: number[] };
}

/**
 * The shading of a mode over [a, b] (either order) as two NaN-separated point lists, ready to be one JSXGraph curve each, so
 * the object count does not depend on the mode or the bounds. `positive` holds the pieces on which the upper boundary is
 * above the lower one (g on top of f, or a curve above the x-axis) and `negative` the pieces on which it is below (f on top of g,
 * or a curve below the axis). Each piece is a closed polygon that follows the upper boundary left to right and the lower
 * boundary right to left. Nothing is drawn for a = b.
 */
export function areaFill(mode: AreaMode, a: number, b: number): AreaFill {
    const positive = {x: [] as number[], y: [] as number[]};
    const negative = {x: [] as number[], y: [] as number[]};
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    if (!(hi > lo)) return {positive, negative};
    const {upper, lower, crossings} = boundaries(mode);
    for (const [from, to] of pieces(lo, hi, crossings)) {
        const middle = (from + to) / 2;
        const target = upper(middle) - lower(middle) >= 0 ? positive : negative;
        const count = Math.max(2, Math.ceil(SAMPLES_PER_SPAN * (to - from) / (BOUND_MAX - BOUND_MIN)));
        const xs = Array.from({length: count + 1}, (_, i) => i === count ? to : from + (to - from) * i / count);
        if (target.x.length > 0) {
            target.x.push(NaN);
            target.y.push(NaN);
        }
        for (const x of xs) {
            target.x.push(x);
            target.y.push(upper(x));
        }
        for (const x of [...xs].reverse()) {
            target.x.push(x);
            target.y.push(lower(x));
        }
        target.x.push(xs[0]);
        target.y.push(upper(xs[0]));
    }
    return {positive, negative};
}
