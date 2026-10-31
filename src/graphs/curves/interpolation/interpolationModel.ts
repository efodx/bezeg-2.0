import {Message, message, t} from "../../../localization";
import {formatNumber} from "../../../analysis/format";
import type {Language} from "../../../localization";
import {
    barycentricWeights, bezierCurvePoint, curveParameters, INTERPOLATION_POINTS_MAX, INTERPOLATION_POINTS_MIN, lagrangeCurvePoint,
    ParameterRule, Point2,
} from "../../../analysis/interpolation";

export const INTERPOLATION_COORDINATE_LIMIT = 1000;

export type {ParameterRule};

/** Preset data of the Lagrange versus Bezier Demonstration (lesson I1). `t` is the shared position s in [0, 1]. */
export interface InterpolationPresetData {
    readonly points: readonly (readonly [number, number])[];
    readonly parameterRule: ParameterRule;
    readonly showHull: boolean;
    readonly showBezier: boolean;
    /** Whether the Lagrange and Bernstein basis plots are shown (Presets saved before the plot existed import as false). */
    readonly showBasis: boolean;
    /** Shared position s in [0, 1]: the Lagrange parameter is t = t_0 + s (t_n - t_0), the Bezier parameter is u = s. */
    readonly t: number;
}

export const DEFAULT_INTERPOLATION_PRESET: InterpolationPresetData = Object.freeze({
    points: Object.freeze([[0, 0], [1, 2], [3, 3], [4, 0]] as const) as InterpolationPresetData['points'],
    parameterRule: 'uniform',
    showHull: false,
    showBezier: true,
    showBasis: false,
    t: 0.5,
});

export const isParameterRule = (value: unknown): value is ParameterRule => value === 'uniform' || value === 'chord';

/** Parameters strictly increasing (so no weight divides by zero); `curveParameters` starts at 0. */
export const parametersOf = (points: readonly Point2[], rule: ParameterRule): number[] => curveParameters(points, rule);

/** The localized reason these points cannot be interpolated under the rule, or undefined when they can. */
export function interpolationRejection(points: readonly Point2[], rule: ParameterRule): Message | undefined {
    if (points.length < INTERPOLATION_POINTS_MIN || points.length > INTERPOLATION_POINTS_MAX) {
        return message("interp_points_range", {value0: INTERPOLATION_POINTS_MIN, value1: INTERPOLATION_POINTS_MAX});
    }
    for (const point of points) {
        if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])
            || Math.abs(point[0]) > INTERPOLATION_COORDINATE_LIMIT || Math.abs(point[1]) > INTERPOLATION_COORDINATE_LIMIT) {
            return message("interp_coordinate_invalid", {value0: INTERPOLATION_COORDINATE_LIMIT});
        }
    }
    const parameters = parametersOf(points, rule);
    for (let i = 1; i < parameters.length; i++) {
        if (!(parameters[i] > parameters[i - 1])) return message("interp_coincident_points", {value0: i, value1: i + 1});
    }
    // Nearly coincident parameters can overflow the barycentric weights; that is a rejection, never a thrown draw.
    try {
        barycentricWeights(parameters);
    } catch {
        return message("interp_nodes_too_close");
    }
    return undefined;
}

/** Parameters of the Lagrange curve at the shared position s: t = t_n s (t_0 = 0). */
export function lagrangeParameterAt(points: readonly Point2[], rule: ParameterRule, s: number): number {
    const parameters = parametersOf(points, rule);
    return parameters[parameters.length - 1] * s;
}

export interface CurveReadout {
    readonly parameter: number;
    readonly point: [number, number];
    readonly weights: number[];
}

export function readoutAt(points: readonly Point2[], rule: ParameterRule, s: number): {lagrange: CurveReadout; bezier: CurveReadout} {
    const parameters = parametersOf(points, rule);
    const tL = parameters[parameters.length - 1] * s;
    const lagrange = lagrangeCurvePoint(points, parameters, tL);
    const bezier = bezierCurvePoint(points, s);
    return {lagrange: {parameter: tL, ...lagrange}, bezier: {parameter: s, ...bezier}};
}

/** Lines of the weights readout (board text and the side panel's status). */
export function readoutLines(points: readonly Point2[], rule: ParameterRule, s: number, showBezier: boolean, language: Language): string[] {
    if (interpolationRejection(points, rule)) return [];
    const num = (value: number) => formatNumber(value, language, 4);
    const list = (values: readonly number[]) => values.map(num).join("; ");
    const {lagrange, bezier} = readoutAt(points, rule, s);
    const parameters = parametersOf(points, rule);
    const lines = [
        t("interp_readout_lagrange", {value0: num(lagrange.parameter), value1: num(parameters[parameters.length - 1]),
            value2: list(lagrange.weights), value3: num(lagrange.point[0]), value4: num(lagrange.point[1])}),
    ];
    if (showBezier) {
        lines.push(t("interp_readout_bezier", {value0: num(bezier.parameter), value1: list(bezier.weights),
            value2: num(bezier.point[0]), value3: num(bezier.point[1])}));
    }
    return lines;
}

/** Convex hull vertices (monotone chain, counter-clockwise, collinear points dropped); fewer than 3 distinct points give them back. */
export function convexHullOf(points: readonly Point2[]): [number, number][] {
    const sorted = points.map(p => [p[0], p[1]] as [number, number]).sort((a, b) => a[0] - b[0] || a[1] - b[1])
        .filter((p, i, all) => i === 0 || p[0] !== all[i - 1][0] || p[1] !== all[i - 1][1]);
    if (sorted.length < 3) return sorted;
    const cross = (o: Point2, a: Point2, b: Point2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const build = (input: [number, number][]) => {
        const chain: [number, number][] = [];
        for (const p of input) {
            while (chain.length >= 2 && cross(chain[chain.length - 2], chain[chain.length - 1], p) <= 0) chain.pop();
            chain.push(p);
        }
        chain.pop();
        return chain;
    };
    return build(sorted).concat(build([...sorted].reverse()));
}

/** True when the point lies in the closed convex hull of the given points (tolerance in the cross product). */
export function insideHull(point: Point2, points: readonly Point2[], tolerance = 1e-9): boolean {
    const hull = convexHullOf(points);
    if (hull.length === 0) return false;
    if (hull.length < 3) {
        // One point or a segment: distance to the segment (projection clamped to [0, 1]).
        const a = hull[0];
        const b = hull[hull.length - 1];
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const length2 = dx * dx + dy * dy;
        const u = length2 === 0 ? 0 : Math.min(1, Math.max(0, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / length2));
        return Math.hypot(a[0] + u * dx - point[0], a[1] + u * dy - point[1]) <= tolerance;
    }
    return hull.every((a, i) => {
        const b = hull[(i + 1) % hull.length];
        return (b[0] - a[0]) * (point[1] - a[1]) - (b[1] - a[1]) * (point[0] - a[0]) >= -tolerance;
    });
}
