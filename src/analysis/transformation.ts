import {schoolFunctionModel, TRANSFORM_BOUNDS, type SchoolBaseFunction, type TransformedFunction} from './schoolFunctions';

export interface TransformParams {
    readonly a: number;
    readonly b: number;
    readonly c: number;
    readonly d: number;
}

export interface Point2 {
    readonly x: number;
    readonly y: number;
}

export type TransformRejection = 'b-zero' | 'not-finite' | 'out-of-range';

const within = (v: number, [lo, hi]: readonly [number, number]): boolean => v >= lo && v <= hi;

/** Parameter check for y = a f(b(x - c)) + d: b = 0 is rejected, others must lie in TRANSFORM_BOUNDS. */
export const checkTransformParams = (p: TransformParams): TransformRejection | undefined => {
    if (![p.a, p.b, p.c, p.d].every(Number.isFinite)) return 'not-finite';
    if (p.b === 0) return 'b-zero';
    const t = TRANSFORM_BOUNDS;
    return within(p.a, t.a) && within(p.b, t.b) && within(p.c, t.c) && within(p.d, t.d) ? undefined : 'out-of-range';
};

/** Image of the point (u, v) of the base graph: (u/b + c, a v + d). Undefined for rejected parameters. */
export const mapPoint = (p: TransformParams, u: number, v: number): Point2 | undefined => {
    if (checkTransformParams(p) !== undefined) return undefined;
    const x = u / p.b + p.c;
    const y = p.a * v + p.d;
    return Number.isFinite(x) && Number.isFinite(y) ? {x, y} : undefined;
};

export interface TrackedPoint {
    readonly base: Point2;
    readonly image: Point2;
}

/** The tracked point for base abscissa u (undefined outside the base domain or for rejected parameters). */
export const trackedPoint = (base: SchoolBaseFunction, p: TransformParams, u: number): TrackedPoint | undefined => {
    const v = schoolFunctionModel(base).value(u);
    if (v === undefined) return undefined;
    const image = mapPoint(p, u, v);
    return image && {base: {x: u, y: v}, image};
};

export const transformedFunction = (base: SchoolBaseFunction, p: TransformParams): TransformedFunction =>
    ({kind: 'transformed', base, a: p.a, b: p.b, c: p.c, d: p.d});

/**
 * Order of operations for y = a f(b(x - c)) + d, as structured steps (no localized text).
 * Inside: subtract c first, then multiply by b; then f; outside: multiply by a, then add d.
 * Seen from the graph, c is divided by b only in the point map (x = u/b + c).
 */
export type RuleStep =
    | {readonly kind: 'shift-inside'; readonly c: number}
    | {readonly kind: 'scale-inside'; readonly b: number; readonly mirrorsAboutVertical: boolean}
    | {readonly kind: 'apply-base'}
    | {readonly kind: 'scale-outside'; readonly a: number; readonly mirrorsAboutHorizontal: boolean}
    | {readonly kind: 'shift-outside'; readonly d: number};

/** Steps in evaluation order; identity steps (c = 0, b = 1, a = 1, d = 0) are omitted. Undefined for rejected parameters. */
export const composedRule = (p: TransformParams): readonly RuleStep[] | undefined => {
    if (checkTransformParams(p) !== undefined) return undefined;
    const steps: RuleStep[] = [];
    if (p.c !== 0) steps.push({kind: 'shift-inside', c: p.c});
    if (p.b !== 1) steps.push({kind: 'scale-inside', b: p.b, mirrorsAboutVertical: p.b < 0});
    steps.push({kind: 'apply-base'});
    if (p.a !== 1) steps.push({kind: 'scale-outside', a: p.a, mirrorsAboutHorizontal: p.a < 0});
    if (p.d !== 0) steps.push({kind: 'shift-outside', d: p.d});
    return steps;
};
