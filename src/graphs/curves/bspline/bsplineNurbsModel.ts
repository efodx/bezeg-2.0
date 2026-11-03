import {domain, evaluateRational, validateWeights} from "../../../bezeg/impl/curve/bspline";
import type {WeightError} from "../../../bezeg/impl/curve/bspline";
import type {ControlPoint} from "./bsplineDeBoorModel";

/** Pure model of the NURBS circle graph (lesson L5): no React, JSXGraph or graph state. Knots are raw parameter values (ADR 0024). */

export interface NurbsData {
    readonly degree: number;
    readonly knots: readonly number[];
    readonly points: readonly ControlPoint[];
    readonly weights: readonly number[];
}

export type NurbsExampleId = 'circle' | 'unit';
export const NURBS_EXAMPLE_IDS: readonly NurbsExampleId[] = ['circle', 'unit'];

/** Samples of the radial error readout (1001 uniform samples of the domain, both ends included). */
export const NURBS_ERROR_SAMPLES = 1001;
/** The most control points the graph keeps (an imported curve may differ from the nine of the example). */
export const NURBS_MAX_POINTS = 16;

const CORNER_WEIGHT = Math.SQRT1_2;

const CIRCLE_POINTS: readonly ControlPoint[] = Object.freeze([
    [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0],
] as const);

/** The L5 spec defaults; `unit` is the same points and knots with all weights 1 (a polynomial B-spline, not a circle). */
export const nurbsExample = (id: NurbsExampleId): NurbsData => ({
    degree: 2,
    knots: [0, 0, 0, 0.25, 0.25, 0.5, 0.5, 0.75, 0.75, 1, 1, 1],
    points: CIRCLE_POINTS.map(p => [p[0], p[1]] as const),
    weights: CIRCLE_POINTS.map((_, i) => id === 'circle' && i % 2 === 1 ? CORNER_WEIGHT : 1),
});

export const copyNurbs = (data: NurbsData): NurbsData => ({
    degree: data.degree, knots: [...data.knots], points: data.points.map(p => [p[0], p[1]] as const), weights: [...data.weights],
});

/** The curve point at parameter `t` (the NURBS point; with unit weights the polynomial B-spline). */
export const nurbsPointAt = (data: NurbsData, t: number): ControlPoint => {
    const p = evaluateRational(data.knots, data.degree, data.points.map(q => [q[0], q[1]]), data.weights, t);
    return [p[0], p[1]];
};

/** Polar angle of a point in degrees, in [0, 360). */
export const angleDegrees = (point: ControlPoint): number => {
    const angle = Math.atan2(point[1], point[0]) * 180 / Math.PI;
    return angle < 0 ? angle + 360 : angle;
};

/** max |‖C(t)‖ − 1| over {@link NURBS_ERROR_SAMPLES} uniform samples of the domain. */
export function maxRadialError(data: NurbsData): number {
    const [a, b] = domain(data.knots, data.degree, data.points.length - 1);
    let worst = 0;
    for (let i = 0; i < NURBS_ERROR_SAMPLES; i++) {
        const [x, y] = nurbsPointAt(data, a + (b - a) * i / (NURBS_ERROR_SAMPLES - 1));
        worst = Math.max(worst, Math.abs(Math.hypot(x, y) - 1));
    }
    return worst;
}

export interface WeightRefusal {
    readonly reason: Exclude<WeightError, 'wrong_count'>;
    /** Zero-based weight index. */
    readonly index: number;
}

/** The weights with weight `index` replaced by `value`, or the refusal (nonpositive or non-finite) when the kernel rejects them. */
export function planWeight(weights: readonly number[], index: number, value: number): { ok: true, weights: number[] } | { ok: false, refusal: WeightRefusal } {
    const candidate = weights.map((w, i) => i === index ? value : w);
    const check = validateWeights(candidate, weights.length);
    if (check.ok) return {ok: true, weights: candidate};
    return {ok: false, refusal: {reason: check.reason === 'nonpositive' ? 'nonpositive' : 'not_finite', index}};
}
