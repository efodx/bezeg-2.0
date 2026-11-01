import {message, Message} from "../../../localization";
import {isFiniteNumber, isIntegerAtLeast, isRecord, PresetCollection, PresetDataCheck} from "../../base/presets/PresetCollection";
import {validateKnotVector, validateWeights} from "../../../bezeg/impl/curve/bspline";
import {knotRejectionMessage} from "./bsplineKnotMessages";

export const BSPLINE_COLLECTION_KEY = 'bspline-curve';

/** Stored B-spline curve (ADR 0024): degree k, raw knots, planar control points and optional NURBS weights. */
export interface BSplinePresetData {
    readonly degree: number;
    readonly knots: ReadonlyArray<number>;
    readonly points: ReadonlyArray<readonly [number, number]>;
    readonly weights?: ReadonlyArray<number>;
}

const isPoint = (value: unknown): value is [number, number] =>
    Array.isArray(value) && value.length === 2 && isFiniteNumber(value[0]) && isFiniteNumber(value[1]);

/** The rejection for a record, or undefined when it is a valid curve. Kernel codes map to one message each. */
function rejectionOf(value: unknown): Message | undefined {
    if (!isRecord(value)) return message("bspline_invalid_data");
    const {degree, knots, points, weights} = value;
    if (!isIntegerAtLeast(degree, 1)) return message("bspline_invalid_degree");
    if (!Array.isArray(points) || !points.every(isPoint) || points.length === 0) return message("control_points_must_be_pairs_of_finite_numbers");
    if (points.length < degree + 1) return message("bspline_too_few_points", {value0: degree, value1: degree + 1, value2: points.length});
    if (!Array.isArray(knots)) return message("bspline_invalid_data");
    const check = validateKnotVector(knots, degree, points.length - 1);
    if (!check.ok) return knotRejectionMessage(check.reason, knots, degree, points.length - 1);
    if (weights === undefined) return undefined;
    if (!Array.isArray(weights)) return message("bspline_weights_wrong_count", {value0: points.length});
    const weightCheck = validateWeights(weights, points.length);
    if (weightCheck.ok) return undefined;
    switch (weightCheck.reason) {
        case "wrong_count": return message("bspline_weights_wrong_count", {value0: points.length});
        case "not_finite": return message("bspline_weight_not_finite", {value0: (weightCheck.index ?? 0) + 1});
        case "nonpositive": return message("bspline_weight_nonpositive", {value0: (weightCheck.index ?? 0) + 1});
    }
}

/**
 * The Preset collection of the B-spline Demonstrations (not yet registered in `curvePresetCollections`). The data is one
 * curve; its knot vector is checked by the kernel's `validateKnotVector` for the DTO's own point count, its weights by
 * `validateWeights`. `check` keeps only the four stored fields.
 */
export const bsplinePresetCollection: PresetCollection<BSplinePresetData> = Object.freeze({
    key: BSPLINE_COLLECTION_KEY,
    check(data: unknown): PresetDataCheck<BSplinePresetData> {
        const rejection = rejectionOf(data);
        if (rejection) return {rejection};
        const {degree, knots, points, weights} = data as {degree: number, knots: number[], points: [number, number][], weights?: number[]};
        return {data: {
            degree,
            knots: [...knots],
            points: points.map(point => [point[0], point[1]] as const),
            ...(weights ? {weights: [...weights]} : {}),
        }};
    },
});
