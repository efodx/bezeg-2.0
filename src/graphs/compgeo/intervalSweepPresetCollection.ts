import {message, Message} from "../../localization";
import {PointSetModel} from "../../compgeo/pointSetModel";
import {SWEEP_COORD_LIMIT, SWEEP_MAX_INTERVALS} from "../../compgeo/sweep/limits";
import {isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";
import {parseHullStep} from "./hullTraceRun";
import {pointSetPresetCollection} from "./pointSetPresetCollection";

/** The file contract key of the interval sweep graph's own Preset collection. Not registered in `presetCollections`: the route that first uses the graph does that. */
export const INTERVAL_SWEEP_PRESET_KEY = "compgeo-interval-sweep";
export const INTERVAL_SWEEP_OVERLAY_IDS = ["grid", "sweep"] as const;

const intervalsModel = (pairs: ReadonlyArray<readonly [number, number]>): PointSetModel => ({
    mode: "intervals", closed: false, gridStepExponent: 0,
    points: pairs.flatMap(([a, b], k) => [{x: a, y: k + 1}, {x: b, y: k + 1}]),
});

/** Spec C1: a=[0,4], b=[2,7], c=[3,5], d=[6,9], e=[8,10]; open counts 1,2,3,2,1,2,1,2,1,0, maximum 3 on [3,4], pairs ab ac bc bd de. */
export const INTERVAL_SWEEP_EXAMPLE_1: PointSetModel = intervalsModel([[0, 4], [2, 7], [3, 5], [6, 9], [8, 10]]);

/** Ties: a=[0,3], b=[3,6] share the endpoint 3; c=[3,3] has length zero; d=[5,8] overlaps b. Pairs ab, ac, bc (touching), bd. */
export const INTERVAL_SWEEP_EXAMPLE_2: PointSetModel = intervalsModel([[0, 3], [3, 6], [3, 3], [5, 8]]);

/**
 * The interval sweep graph's Preset collection. `data` is an intervals-mode point set with at most 10 intervals and
 * coordinates within 2^10 (nothing is clipped); any other mode is rejected. `graphState` adds the step index `step` (any finite
 * number; a stale index is clamped on restore, not rejected) to the overlay switches. Playback status is never part of a Preset.
 */
export function intervalSweepPresetCollection(overlayIds: readonly string[]): PresetCollection<PointSetModel> {
    const base = pointSetPresetCollection(INTERVAL_SWEEP_PRESET_KEY, overlayIds, {
        allowIntervals: true, intervalLimit: SWEEP_MAX_INTERVALS, coordinateLimit: SWEEP_COORD_LIMIT,
    });
    return Object.freeze({
        key: INTERVAL_SWEEP_PRESET_KEY,
        checkGraphState(graphState: unknown): Message | undefined {
            if (!isRecord(graphState)) return message("invalid_state");
            const {step, ...rest} = graphState;
            if (step !== undefined && parseHullStep(step) === undefined) return message("intervalsweep_invalid_step");
            return base.checkGraphState?.(rest);
        },
        check(data: unknown): PresetDataCheck<PointSetModel> {
            const checked = base.check(data);
            if ("data" in checked && checked.data.mode !== "intervals") return {rejection: message("intervalsweep_invalid_mode")};
            return checked;
        },
    });
}

export const intervalSweepCollection: PresetCollection<PointSetModel> = intervalSweepPresetCollection(INTERVAL_SWEEP_OVERLAY_IDS);
