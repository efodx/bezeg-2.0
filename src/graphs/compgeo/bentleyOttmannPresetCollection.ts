import {message, Message} from "../../localization";
import {PointSetModel} from "../../compgeo/pointSetModel";
import {SWEEP_COORD_LIMIT, SWEEP_MAX_SEGMENTS} from "../../compgeo/sweep/limits";
import {isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";
import {parseHullStep} from "./hullTraceRun";
import {pointSetPresetCollection} from "./pointSetPresetCollection";

/** The file contract key of the Bentley-Ottmann graph's own Preset collection. Not registered in `presetCollections`: the route that first uses the graph does that. */
export const BENTLEY_OTTMANN_PRESET_KEY = "compgeo-bentley-ottmann";
export const BENTLEY_OTTMANN_OVERLAY_IDS = ["grid", "sweep"] as const;

const segmentsModel = (segments: ReadonlyArray<readonly [number, number, number, number]>): PointSetModel => ({
    mode: "segments", closed: false, gridStepExponent: 0,
    points: segments.flatMap(([ax, ay, bx, by]) => [{x: ax, y: ay}, {x: bx, y: by}]),
});

/** Spec C2 default example: s0 = (0,0)(6,4), s1 = (0,4)(6,0), s2 = (1,-1)(2,5), s3 = (4,5)(5,-1); five crossings, 13 events. */
export const BENTLEY_OTTMANN_EXAMPLE_1: PointSetModel = segmentsModel([[0, 0, 6, 4], [0, 4, 6, 0], [1, -1, 2, 5], [4, 5, 5, -1]]);

/** Spec C2 degenerate example: a, b, c through (2,2) and the vertical d = (2,0)(2,4) through it too (four segments, one point). */
export const BENTLEY_OTTMANN_EXAMPLE_2: PointSetModel = segmentsModel([[0, 0, 4, 4], [0, 4, 4, 0], [0, 2, 4, 2], [2, 0, 2, 4]]);

/**
 * The Bentley-Ottmann graph's Preset collection. `data` is a segments-mode point set with at most 12 segments and coordinates
 * within 2^10 (nothing is clipped), checked as the segment collection of the point-set family checks it; any other mode is rejected.
 * `graphState` adds the step index `step` (any finite number; a stale index is clamped on restore, not rejected) to the overlay
 * switches. Playback status is never part of a Preset.
 */
export function bentleyOttmannPresetCollection(overlayIds: readonly string[]): PresetCollection<PointSetModel> {
    const base = pointSetPresetCollection(BENTLEY_OTTMANN_PRESET_KEY, overlayIds, {
        allowSegments: true, segmentLimit: SWEEP_MAX_SEGMENTS, coordinateLimit: SWEEP_COORD_LIMIT,
    });
    return Object.freeze({
        key: BENTLEY_OTTMANN_PRESET_KEY,
        checkGraphState(graphState: unknown): Message | undefined {
            if (!isRecord(graphState)) return message("invalid_state");
            const {step, ...rest} = graphState;
            if (step !== undefined && parseHullStep(step) === undefined) return message("bentleyottmann_invalid_step");
            return base.checkGraphState?.(rest);
        },
        check(data: unknown): PresetDataCheck<PointSetModel> {
            const checked = base.check(data);
            if ("data" in checked && checked.data.mode !== "segments") return {rejection: message("bentleyottmann_invalid_mode")};
            return checked;
        },
    });
}

export const bentleyOttmannCollection: PresetCollection<PointSetModel> = bentleyOttmannPresetCollection(BENTLEY_OTTMANN_OVERLAY_IDS);
