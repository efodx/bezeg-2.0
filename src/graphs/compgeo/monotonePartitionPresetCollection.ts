import {message, Message} from "../../localization";
import {PointSetModel} from "../../compgeo/pointSetModel";
import {SWEEP_COORD_LIMIT, SWEEP_MAX_POLYGON_VERTICES} from "../../compgeo/sweep/limits";
import {isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";
import {parseHullStep} from "./hullTraceRun";
import {pointSetPresetCollection} from "./pointSetPresetCollection";

/** The file contract key of the monotone partition graph's own Preset collection. Not registered in `presetCollections`: the route that first uses the graph does that. */
export const MONOTONE_PARTITION_PRESET_KEY = "compgeo-monotone-partition";
export const MONOTONE_PARTITION_OVERLAY_IDS = ["grid", "sweep"] as const;

const polygonModel = (points: ReadonlyArray<readonly [number, number]>): PointSetModel => ({
    mode: "polygon", closed: true, gridStepExponent: 0, points: points.map(([x, y]) => ({x, y})),
});

/** Spec C3 default example: one split vertex (4,3) whose helper is the merge vertex (8,5); one diagonal, two pieces. */
export const MONOTONE_PARTITION_EXAMPLE_1: PointSetModel = polygonModel([[0, 0], [4, 3], [8, 0], [12, 8], [8, 5], [4, 8]]);

/** Spec C3 second example: two merge vertices and no split; the merge vertices alone need diagonals. */
export const MONOTONE_PARTITION_EXAMPLE_2: PointSetModel = polygonModel([[4, 0], [10, 2], [8, 5], [12, 9], [7, 7], [5, 12], [3, 7], [0, 9], [2, 4]]);

/**
 * The monotone partition graph's Preset collection. `data` is the polygon, checked like any point set with at most
 * `SWEEP_MAX_POLYGON_VERTICES` points and coordinates within 2^10 (the graph coerces a restored model to a closed polygon,
 * as the ear clipping graph does). `graphState` adds the step index `step` (any finite number; a stale index is clamped on
 * restore, not rejected) to the overlay switches. Playback status is never part of a Preset.
 */
export function monotonePartitionPresetCollection(overlayIds: readonly string[]): PresetCollection<PointSetModel> {
    const base = pointSetPresetCollection(MONOTONE_PARTITION_PRESET_KEY, overlayIds, {
        pointLimit: SWEEP_MAX_POLYGON_VERTICES, coordinateLimit: SWEEP_COORD_LIMIT,
    });
    return Object.freeze({
        key: MONOTONE_PARTITION_PRESET_KEY,
        checkGraphState(graphState: unknown): Message | undefined {
            if (!isRecord(graphState)) return message("invalid_state");
            const {step, ...rest} = graphState;
            if (step !== undefined && parseHullStep(step) === undefined) return message("monotonepartition_invalid_step");
            return base.checkGraphState?.(rest);
        },
        check(data: unknown): PresetDataCheck<PointSetModel> {
            return base.check(data);
        },
    });
}

export const monotonePartitionCollection: PresetCollection<PointSetModel> = monotonePartitionPresetCollection(MONOTONE_PARTITION_OVERLAY_IDS);
