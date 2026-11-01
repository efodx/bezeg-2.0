import {message, Message} from "../../localization";
import {PointSetModel} from "../../compgeo/pointSetModel";
import {EAR_CLIPPING_MAX_VERTICES} from "../../compgeo/earClipping";
import {isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";
import {parseHullStep} from "./hullTraceRun";
import {pointSetPresetCollection} from "./pointSetPresetCollection";

/** The file contract key of the ear clipping graph's own Preset collection. Not yet listed in `presetCollections`: the route that first uses the graph does that. */
export const EAR_CLIPPING_PRESET_KEY = "compgeo-ear-clipping";
export const EAR_CLIPPING_OVERLAY_IDS = ["grid", "trace", "reflex", "triangulation", "colouring", "guards"] as const;

/** Example 1 of spec B1, the notched pentagon: ears clip in the order (6,0)(6,4)(3,2), (0,0)(6,0)(3,2), then (0,0)(3,2)(0,4) remains. */
export const EAR_CLIPPING_EXAMPLE_1: PointSetModel = {
    mode: "polygon", closed: true, gridStepExponent: 0,
    points: [[0, 0], [6, 0], [6, 4], [3, 2], [0, 4]].map(([x, y]) => ({x, y})),
};

/** Example 2 of spec B1, the comb: n = 11, 9 triangles, colour class sizes 4, 4, 3. */
export const EAR_CLIPPING_EXAMPLE_2: PointSetModel = {
    mode: "polygon", closed: true, gridStepExponent: 0,
    points: [[0, 0], [18, 0], [16, 2], [15, 6], [14, 2], [10, 2], [9, 6], [8, 2], [4, 2], [3, 6], [2, 2]].map(([x, y]) => ({x, y})),
};

/**
 * The ear clipping graph's Preset collection. `data` is the polygon, checked like any point set with at most
 * `EAR_CLIPPING_MAX_VERTICES` points. `graphState` adds the step index `step` (any finite number; a stale index is clamped on
 * restore, not rejected) to the overlay switches. Playback status is never part of a Preset.
 */
export function earClippingPresetCollection(overlayIds: readonly string[]): PresetCollection<PointSetModel> {
    const base = pointSetPresetCollection(EAR_CLIPPING_PRESET_KEY, overlayIds, {pointLimit: EAR_CLIPPING_MAX_VERTICES});
    return Object.freeze({
        key: EAR_CLIPPING_PRESET_KEY,
        checkGraphState(graphState: unknown): Message | undefined {
            if (!isRecord(graphState)) return message("invalid_state");
            const {step, ...rest} = graphState;
            if (step !== undefined && parseHullStep(step) === undefined) return message("earclip_invalid_step");
            return base.checkGraphState?.(rest);
        },
        check(data: unknown): PresetDataCheck<PointSetModel> {
            return base.check(data);
        },
    });
}

export const earClippingCollection: PresetCollection<PointSetModel> = earClippingPresetCollection(EAR_CLIPPING_OVERLAY_IDS);
