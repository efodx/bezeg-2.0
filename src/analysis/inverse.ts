import {BASE_MAX, BASE_MIN, schoolFunctionModel, type SchoolBaseFunction} from './schoolFunctions';
import type {Point2} from './transformation';


/** The closed list of one-to-one restrictions: x^2 on x >= 0, a^x, and e^x (base e). */
export type InverseRestriction =
    | {readonly kind: 'square'}
    | {readonly kind: 'exp'; readonly base: number}
    | {readonly kind: 'natural'};

export type InverseRejection = 'base-one' | 'base-out-of-range' | 'not-finite';

export const INVERSE_RESTRICTIONS: readonly InverseRestriction[] = [{kind: 'square'}, {kind: 'exp', base: 2}, {kind: 'natural'}];

export type SlopeResult =
    | {readonly kind: 'slope'; readonly value: number}
    /** The tangent is vertical: no slope value exists. */
    | {readonly kind: 'vertical'}
    | {readonly kind: 'undefined'};

export interface InverseCurve {
    readonly value: (x: number) => number | undefined;
    readonly derivative: (x: number) => number | undefined;
    readonly slope: (x: number) => SlopeResult;
}

export interface InversePair {
    readonly restriction: InverseRestriction;
    readonly forward: InverseCurve;
    readonly inverse: InverseCurve;
}

const curve = (fn: SchoolBaseFunction, domainOk: (x: number) => boolean = () => true): InverseCurve => {
    const m = schoolFunctionModel(fn);
    const value = (x: number) => domainOk(x) ? m.value(x) : undefined;
    const derivative = (x: number) => domainOk(x) ? m.derivative(x) : undefined;
    const slope = (x: number): SlopeResult => {
        if (value(x) === undefined) return {kind: 'undefined'};
        const s = derivative(x);
        // In-domain point without a finite derivative is labelled vertical. This holds only because sqrt at 0 is the
        // sole such point of the closed list; a corner (|x| at 0) would be mislabelled if the list grows.
        return s === undefined ? {kind: 'vertical'} : {kind: 'slope', value: s};
    };
    return {value, derivative, slope};
};

/** Pair a restriction with its inverse. Base 1 (and bases outside the catalogue range) are rejected. */
export const inversePair = (r: InverseRestriction): InversePair | InverseRejection => {
    if (r.kind === 'square') {
        return {
            restriction: r,
            forward: curve({kind: 'power', shape: 'square'}, x => x >= 0),
            inverse: curve({kind: 'power', shape: 'sqrt'}),
        };
    }
    const base = r.kind === 'natural' ? Math.E : r.base;
    if (!Number.isFinite(base)) return 'not-finite';
    if (base === 1) return 'base-one';
    if (base < BASE_MIN || base > BASE_MAX) return 'base-out-of-range';
    return {
        restriction: r,
        forward: curve({kind: 'exp', base}),
        inverse: curve({kind: 'log', base}),
    };
};

/** Reflection in y = x: coordinates swap exactly. */
export const mirrorPoint = (p: Point2): Point2 => ({x: p.y, y: p.x});

export interface MirroredSlopes {
    readonly point: Point2;
    readonly mirror: Point2;
    readonly forwardSlope: SlopeResult;
    readonly inverseSlope: SlopeResult;
    /** Product of the two slopes when both exist, else undefined. */
    readonly product?: number;
}

/** Point (x, f(x)), its mirror and the slopes of f and of the inverse there. Where f' = 0 the inverse is vertical. */
export const mirroredSlopes = (pair: InversePair, x: number): MirroredSlopes | undefined => {
    const y = pair.forward.value(x);
    if (y === undefined) return undefined;
    const point = {x, y};
    const mirror = mirrorPoint(point);
    const forwardSlope = pair.forward.slope(x);
    let inverseSlope: SlopeResult;
    if (forwardSlope.kind === 'slope' && forwardSlope.value === 0) inverseSlope = {kind: 'vertical'};
    else if (forwardSlope.kind === 'vertical') inverseSlope = {kind: 'slope', value: 0};
    else inverseSlope = pair.inverse.slope(mirror.x);
    const product = forwardSlope.kind === 'slope' && inverseSlope.kind === 'slope' ? forwardSlope.value * inverseSlope.value : undefined;
    return {point, mirror, forwardSlope, inverseSlope, product};
};
