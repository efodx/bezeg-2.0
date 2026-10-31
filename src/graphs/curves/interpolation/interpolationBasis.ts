import {bezierCurvePoint, lagrangeBasis, barycentricWeights, Point2} from "../../../analysis/interpolation";
import {parametersOf, ParameterRule} from "./interpolationModel";

export const BASIS_SAMPLES = 160;

/** One sampled basis function: pairs [x, value] on its interval. */
export type BasisSamples = readonly (readonly [number, number])[];

export interface BasisPlotData {
    /** Degree n = number of points - 1; both plots show n + 1 curves, index i is the same colour in each. */
    readonly n: number;
    /** End of the Lagrange interval [0, t_n]. */
    readonly tEnd: number;
    readonly lagrange: readonly BasisSamples[];
    readonly bernstein: readonly BasisSamples[];
    /** The marker at the shared position s: Lagrange at t = s t_n, Bernstein at s, one value per curve index. */
    readonly lagrangeMarker: {readonly x: number; readonly values: readonly number[]};
    readonly bernsteinMarker: {readonly x: number; readonly values: readonly number[]};
}

/** The Bernstein basis B_{i,n}(s) at s, taken from the Bezier weights of n + 1 points (the same function the Bezier curve uses). */
export const bernsteinBasisAt = (n: number, s: number): number[] =>
    bezierCurvePoint(Array.from({length: n + 1}, () => [0, 0] as const), s).weights;

/**
 * The Lagrange basis polynomials on [0, t_n] (parameters of the points under the rule) and the Bernstein basis on [0, 1],
 * sampled uniformly, with the markers at the position s. Throws when the parameters are not distinct, like the curve itself.
 */
export function basisPlotData(points: readonly Point2[], rule: ParameterRule, s: number, samples = BASIS_SAMPLES): BasisPlotData {
    const nodes = parametersOf(points, rule);
    const weights = barycentricWeights(nodes);
    const n = nodes.length - 1;
    const tEnd = nodes[n];
    const lagrangeAt = (t: number) => lagrangeBasis(nodes, t, weights);
    const sampled = (end: number, at: (x: number) => number[]) => {
        const rows = Array.from({length: samples + 1}, (_, k) => {
            const x = end * k / samples;
            return {x, values: at(x)};
        });
        return Array.from({length: n + 1}, (_, i) => rows.map(row => [row.x, row.values[i]] as const));
    };
    return {
        n, tEnd,
        lagrange: sampled(tEnd, lagrangeAt),
        bernstein: sampled(1, x => bernsteinBasisAt(n, x)),
        lagrangeMarker: {x: tEnd * s, values: lagrangeAt(tEnd * s)},
        bernsteinMarker: {x: s, values: bernsteinBasisAt(n, s)},
    };
}
