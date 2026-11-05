import {message, Message} from "../../localization";
import {PointSetModel} from "../../compgeo/pointSetModel";
import {SWEEP_COORD_LIMIT} from "../../compgeo/sweep/limits";
import {isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";
import {curvePairPresetCollection} from "./CurvePairGraph";

/** The file contract key of this graph's own collection: its `graphState` carries `step`, which the Curves D2 graph's does not. */
export const BEZIER_HULLS_PRESET_KEY = "compgeo-bezier-hulls";

/** A saved step index: a nonnegative integer; anything else is undefined (the importer rejects it). */
export function parseBezierHullsStep(value: unknown): number | undefined {
    return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
}

/**
 * The Bezier hulls graph's Preset collection (convexity task 26; task 27 lists the key). `data` is the curve pair model: the
 * point-set checks (integer grid coordinates within 2^10, at most 8 points) plus points mode and 6 or 8 points. `graphState`
 * adds the step index `step`, a nonnegative integer; a stale index beyond the run is clamped when the Preset is restored, not
 * rejected. Playback status is never part of a Preset. Its key is its own, not the curve pair key.
 */
export function bezierHullsPresetCollection(overlayIds: readonly string[]): PresetCollection<PointSetModel> {
    const base = curvePairPresetCollection(overlayIds, {pointLimit: 8, coordinateLimit: SWEEP_COORD_LIMIT});
    return Object.freeze({
        key: BEZIER_HULLS_PRESET_KEY,
        checkGraphState(graphState: unknown): Message | undefined {
            if (!isRecord(graphState)) return message("invalid_state");
            const {step, ...rest} = graphState;
            if (step !== undefined && parseBezierHullsStep(step) === undefined) return message("bezierhulls_invalid_step");
            return base.checkGraphState?.(rest);
        },
        check(data: unknown): PresetDataCheck<PointSetModel> {
            return base.check(data);
        },
    });
}
