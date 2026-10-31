/**
 * Rational functions p/q of two product-form polynomials (school function graphs, concept S4). Holes are the common
 * zeros, found exactly from the factor structure (equal zero values); poles are the zeros of the reduced
 * denominator. Pure mathematics, no UI imports.
 */
import {dividePolynomials, evalCoefficients, mergeZeros, polyCoefficients, polyDegree, polyValue} from './polynomial';
import type {PolySpec} from './schoolFunctions';

export interface RationalHole {readonly x: number; /** Limit value of the function at the hole. */ readonly y: number}
export interface RationalPole {readonly x: number; readonly multiplicity: number}

export type RationalAsymptote =
    | {readonly kind: 'horizontal'; readonly y: number}
    /** y = slope * x + intercept; only when deg p = deg q + 1. */
    | {readonly kind: 'oblique'; readonly slope: number; readonly intercept: number}
    | {readonly kind: 'none'};

export interface RationalAnalysis {
    /** Inputs with equal zeros merged. */
    readonly numerator: PolySpec;
    readonly denominator: PolySpec;
    readonly mergedNumerator: boolean;
    readonly mergedDenominator: boolean;
    /** After cancelling the common factors. */
    readonly reducedNumerator: PolySpec;
    readonly reducedDenominator: PolySpec;
    readonly holes: readonly RationalHole[];
    readonly poles: readonly RationalPole[];
    readonly asymptote: RationalAsymptote;
    /** reduced p = quotient * reduced q + remainder (ascending coefficients, exact division). */
    readonly quotient: readonly number[];
    readonly remainder: readonly number[];
}

export const analyzeRational = (numerator: PolySpec, denominator: PolySpec): RationalAnalysis => {
    const n = mergeZeros(numerator);
    const d = mergeZeros(denominator);
    const nz = n.spec.zeros.map(e => ({...e}));
    const dz = d.spec.zeros.map(e => ({...e}));
    const holes: {x: number; y: number}[] = [];
    const poles: RationalPole[] = [];
    const rn: {z: number; m: number}[] = [];
    const rd: {z: number; m: number}[] = [];
    // Both lists are sorted and merged, so equal zero values pair up.
    for (const e of nz) {
        const other = dz.find(f => f.z === e.z);
        const cancelled = other ? Math.min(e.m, other.m) : 0;
        if (e.m - cancelled > 0) rn.push({z: e.z, m: e.m - cancelled});
    }
    for (const e of dz) {
        const other = nz.find(f => f.z === e.z);
        const cancelled = other ? Math.min(e.m, other.m) : 0;
        if (e.m - cancelled > 0) rd.push({z: e.z, m: e.m - cancelled});
    }
    const reducedNumerator = {k: n.spec.k, zeros: rn} as unknown as PolySpec;
    const reducedDenominator = {k: d.spec.k, zeros: rd} as unknown as PolySpec;
    for (const e of dz) {
        const other = nz.find(f => f.z === e.z);
        if (other && other.m >= e.m) {
            holes.push({x: e.z, y: polyValue(reducedNumerator, e.z) / polyValue(reducedDenominator, e.z)});
        }
    }
    for (const e of rd) poles.push({x: e.z, multiplicity: e.m});
    const pc = polyCoefficients(reducedNumerator);
    const qc = polyCoefficients(reducedDenominator);
    const {quotient, remainder} = dividePolynomials(pc, qc);
    const dp = polyDegree(reducedNumerator);
    const dq = polyDegree(reducedDenominator);
    let asymptote: RationalAsymptote;
    if (dp <= dq) asymptote = {kind: 'horizontal', y: dp === dq ? quotient[0] : 0};
    else if (dp === dq + 1) asymptote = {kind: 'oblique', slope: quotient[1], intercept: quotient[0]};
    else asymptote = {kind: 'none'};
    return {
        numerator: n.spec, denominator: d.spec, mergedNumerator: n.merged, mergedDenominator: d.merged,
        reducedNumerator, reducedDenominator, holes, poles, asymptote, quotient, remainder,
    };
};

/** The remainder term r(x)/q(x) of p/q = quotient + r/q for the reduced fraction; 0.375 for (x^2-1)/(x-2) at 10. */
export const rationalRemainderAt = (a: RationalAnalysis, x: number): number =>
    evalCoefficients(a.remainder, x) / polyValue(a.reducedDenominator, x);
