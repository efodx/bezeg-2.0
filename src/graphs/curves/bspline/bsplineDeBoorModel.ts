import {Language, LocalizedError, message, Message, t} from "../../../localization";
import {formatNumber} from "../../../analysis/format";
import {domain, projectHomogeneous} from "../../../bezeg/impl/curve/bspline";
import type {DeBoorEntry, DeBoorTriangle} from "../../../bezeg/impl/curve/bspline";
import type {BSplinePresetData} from "./bsplinePresetCollection";
import {
    BASIS_MAX_DEGREE, BASIS_MIN_DEGREE, DEFAULT_BASIS_DEGREE, DEFAULT_BASIS_KNOTS, knotProblem, lastIndexOf, rebuiltKnots,
} from "./bsplineBasisModel";

/** The animation id of the de Boor level-by-level reveal (registered for lessons by the registration slice, not here). */
export const DEBOOR_ANIMATION_ID = 'deboor';

export const DEBOOR_DEFAULT_DEGREE = DEFAULT_BASIS_DEGREE;
export const DEBOOR_DEFAULT_KNOTS: readonly number[] = DEFAULT_BASIS_KNOTS;
export const DEBOOR_DEFAULT_POINTS: readonly (readonly [number, number])[] = Object.freeze([[0, 0], [1, 2], [3, 2], [4, 0]] as const);
export const DEBOOR_DEFAULT_T = 0.5;
export const DEBOOR_MAX_POINTS = 12;
/** Time between two playback steps (one level per step). */
export const DEBOOR_STEP_INTERVAL_MS = 900;
/** The largest degree the graph offers; it is the iteration limit of the level reveal. */
export const DEBOOR_MAX_LEVELS = 3;

export type ControlPoint = readonly [number, number];

/**
 * The plain state a preset or scene layer carries: the same three fields as {@link BSplinePresetData}, plus the slider t and the
 * revealed level. Nothing else in the graph holds a copy of them.
 */
export interface DeBoorData {
    readonly degree: number;
    readonly knots: readonly number[];
    readonly points: readonly ControlPoint[];
}

export const deBoorPresetData = (data: DeBoorData): BSplinePresetData =>
    ({degree: data.degree, knots: [...data.knots], points: data.points.map(point => [point[0], point[1]] as const)});

export const defaultDeBoorData = (): DeBoorData =>
    ({degree: DEBOOR_DEFAULT_DEGREE, knots: [...DEBOOR_DEFAULT_KNOTS], points: DEBOOR_DEFAULT_POINTS.map(point => [point[0], point[1]] as const)});

/** The point appended by "+": one step beyond the last along x, on the same height. */
export const appendedPoint = (points: readonly ControlPoint[]): ControlPoint => {
    const last = points[points.length - 1];
    const before = points[points.length - 2];
    const step = before && last[0] - before[0] > 0 ? last[0] - before[0] : 1;
    return [last[0] + step, last[1]];
};

/** Knots for `count` control points of the given kind; the caller reads the kind (`isClamped`) from the vector it replaces. */
export const knotsForCount = (degree: number, clamped: boolean, count: number): number[] =>
    rebuiltKnots(degree, count - 1, clamped);

/** The level entry's drawn point: a weighted (homogeneous) row is projected, a plain row is used as it is. */
export const entryPoint = (entry: DeBoorEntry, weighted: boolean): [number, number] => {
    const row = weighted ? projectHomogeneous(entry.point) : entry.point;
    return [row[0], row[1]];
};

export const clampParameter = (knots: readonly number[], degree: number, t: number): number => {
    const [start, end] = domain(knots, degree, knots.length - degree - 2);
    return Math.min(end, Math.max(start, t));
};

const pointText = (point: readonly [number, number], language: Language): string =>
    `(${formatNumber(point[0], language, 3)}; ${formatNumber(point[1], language, 3)})`;

/**
 * The board readout up to `level`: the knot span of t, then for each shown level its points and (from level 1) its blend ratios
 * alpha, and at the last level the curve point. `weighted` projects homogeneous rows to plane points.
 */
export function deBoorReadoutLines(triangle: DeBoorTriangle, knots: readonly number[], degree: number, tValue: number, level: number,
                                   weighted: boolean, language: Language): string[] {
    const {span, levels} = triangle;
    const lines = [t("bsd_readout_head", {
        value0: formatNumber(tValue, language, 3), value1: span, value2: span + 1,
        value3: formatNumber(knots[span], language, 3), value4: formatNumber(knots[span + 1], language, 3),
    })];
    for (let r = 0; r <= Math.min(level, degree); r++) {
        const entries = levels[r];
        lines.push(t("bsd_readout_level", {
            value0: r,
            value1: entries.map(entry => `P${entry.index}${r === 0 ? '' : `^${r}`} = ${pointText(entryPoint(entry, weighted), language)}`).join("   "),
        }));
        if (r > 0) {
            lines.push(t("bsd_readout_alphas", {
                value0: entries.map(entry => `α${entry.index}^${r} = ${formatNumber(entry.alpha ?? NaN, language, 4)}`).join("   "),
            }));
        }
    }
    if (level >= degree) {
        lines.push(t("bsd_readout_result", {value0: pointText(entryPoint(levels[degree][0], weighted), language)}));
    }
    return lines;
}

/**
 * Rejects curve data a point-controlled B-spline graph cannot draw (degree range, point count up to `maxPoints`, knot vector and its
 * length against the points) with a localized error. Shared by the de Boor and insertion graphs' `importPresetData`.
 */
export function drawableRejection(data: BSplinePresetData, maxPoints: number): Message | undefined {
    if (data.degree < BASIS_MIN_DEGREE || data.degree > BASIS_MAX_DEGREE) {
        return message("bsb_degree_out_of_range", {value0: BASIS_MAX_DEGREE});
    }
    if (data.points.length < data.degree + 1) {
        return message("bspline_too_few_points", {value0: data.degree, value1: data.degree + 1, value2: data.points.length});
    }
    if (data.points.length > maxPoints) {
        return message("bspline_too_many_points", {value0: maxPoints, value1: data.points.length});
    }
    const problem = knotProblem(data.knots, data.degree);
    if (problem) return problem;
    if (lastIndexOf(data.knots, data.degree) + 1 !== data.points.length) {
        return message("bspline_knots_wrong_length", {value0: data.points.length + data.degree + 1, value1: data.knots.length});
    }
    return undefined;
}

export function assertDrawableCurve(data: BSplinePresetData, maxPoints: number): void {
    const rejection = drawableRejection(data, maxPoints);
    if (rejection) throw new LocalizedError(rejection);
}
