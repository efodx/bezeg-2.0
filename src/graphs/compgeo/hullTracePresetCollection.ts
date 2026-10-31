import {message, Message} from "../../localization";
import {PointSetModel} from "../../compgeo/pointSetModel";
import {isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";
import {parseHullAlgorithm, parseHullStep} from "./hullTraceRun";
import {pointSetPresetCollection} from "./pointSetPresetCollection";

/** The file contract key of the hull trace graph's own Preset collection. It is not listed in `presetCollections` (no route yet). */
export const HULL_TRACE_PRESET_KEY = "compgeo-hull-trace";

/**
 * The hull trace graph's Preset collection. `data` is the point-set model, checked like any point set. `graphState` adds the
 * saved `algorithm` (one of the three ids; anything else is rejected) and the step index `step` (any finite number: a stale or
 * out-of-range index is clamped when the Preset is restored, not rejected). Playback status is never part of a Preset.
 */
export function hullTracePresetCollection(overlayIds: readonly string[]): PresetCollection<PointSetModel> {
    const base = pointSetPresetCollection(HULL_TRACE_PRESET_KEY, overlayIds);
    return Object.freeze({
        key: HULL_TRACE_PRESET_KEY,
        checkGraphState(graphState: unknown): Message | undefined {
            if (!isRecord(graphState)) return message("invalid_state");
            const {algorithm, step, ...rest} = graphState;
            if (algorithm !== undefined && parseHullAlgorithm(algorithm) === undefined) return message("hulltrace_invalid_algorithm");
            if (step !== undefined && parseHullStep(step) === undefined) return message("hulltrace_invalid_step");
            return base.checkGraphState?.(rest);
        },
        check(data: unknown): PresetDataCheck<PointSetModel> {
            return base.check(data);
        },
    });
}
