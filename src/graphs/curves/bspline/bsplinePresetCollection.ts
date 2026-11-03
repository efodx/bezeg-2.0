import {message, Message} from "../../../localization";
import {checkSceneState, isFiniteNumber, isIntegerAtLeast, isRecord, PresetCollection, PresetDataCheck} from "../../base/presets/PresetCollection";
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
 * The Preset collection shared by both B-spline Demonstrations (registered once in `PresetImport.ts`). The data is one
 * curve; its knot vector is checked by the kernel's `validateKnotVector` for the DTO's own point count, its weights by
 * `validateWeights`. `check` keeps only the four stored fields.
 */
export const bsplinePresetCollection: PresetCollection<BSplinePresetData> = Object.freeze({
    key: BSPLINE_COLLECTION_KEY,
    /**
     * The graphs keep `degree`, `knots` and `points` in their scene state, so a stored `graphState` holds the two arrays; the flat
     * scene-state check would refuse them. They are checked for shape here, and a restored Preset takes them from `data`.
     */
    checkGraphState(graphState: unknown): Message | undefined {
        if (!isRecord(graphState)) return message("invalid_state");
        const {knots, points, origin, ghost, refusal, moved, ...rest} = graphState;
        if (knots !== undefined && !(Array.isArray(knots) && knots.every(isFiniteNumber))) return message("invalid_value", {value0: "knots"});
        if (points !== undefined && !(Array.isArray(points) && points.every(isPoint))) return message("invalid_value", {value0: "points"});
        // The insertion graph also keeps its Reset target (`origin`), the pre-insertion polygon (`ghost`) and the latest refusal; a restored Preset
        // rebuilds all three from `data`, so they are only checked for shape.
        if (origin !== undefined && !isRecord(origin)) return message("invalid_value", {value0: "origin"});
        if (ghost !== undefined && !(Array.isArray(ghost) && ghost.every(isPoint))) return message("invalid_value", {value0: "ghost"});
        if (refusal !== undefined && refusal !== null && !isRecord(refusal)) return message("invalid_value", {value0: "refusal"});
        // The extraction graph keeps the indices of the last drag (`moved`); a restore resets them to none.
        if (moved !== undefined && !(Array.isArray(moved) && moved.every(isFiniteNumber))) return message("invalid_value", {value0: "moved"});
        return checkSceneState(rest);
    },
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
