import {message, Message} from "../../localization";
import {PointSetModel} from "../../compgeo/pointSetModel";
import {SWEEP_COORD_LIMIT} from "../../compgeo/sweep/limits";
import {isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";
import {parseBezierHullsStep} from "./bezierHullsPresetCollection";
import {curvePairPresetCollection} from "./curvePairPresetCollection";

/** The file contract key of the Bezier clipping graph's own collection: its `graphState` carries `step` and `clipToleranceExponent`. */
export const BEZIER_CLIPPING_PRESET_KEY = "compgeo-bezier-clipping";

/** The tolerance is 10^-k for a whole number k from 3 to 10; the default is 10^-6. */
export const CLIP_TOLERANCE_EXPONENTS = [3, 4, 5, 6, 7, 8, 9, 10] as const;
export const DEFAULT_CLIP_TOLERANCE_EXPONENT = 6;

/** A saved tolerance exponent: an integer from 3 to 10; anything else is undefined (the importer rejects it). */
export function parseClipToleranceExponent(value: unknown): number | undefined {
    return typeof value === "number" && Number.isInteger(value) && value >= 3 && value <= 10 ? value : undefined;
}

/**
 * The Bezier clipping graph's Preset collection (advanced Bezier AB-B-2a1). `data` is the curve pair model, checked as for the
 * Bezier hulls graph. `graphState` adds `step` (a nonnegative integer, clamped to the run on restore) and `clipToleranceExponent`
 * (an integer 3 to 10); a Preset that names no tolerance shows the default 6. Playback status is never part of a Preset.
 */
export function bezierClippingPresetCollection(overlayIds: readonly string[]): PresetCollection<PointSetModel> {
    const base = curvePairPresetCollection(overlayIds, {pointLimit: 8, coordinateLimit: SWEEP_COORD_LIMIT});
    return Object.freeze({
        key: BEZIER_CLIPPING_PRESET_KEY,
        checkGraphState(graphState: unknown): Message | undefined {
            if (!isRecord(graphState)) return message("invalid_state");
            const {step, clipToleranceExponent, ...rest} = graphState;
            if (step !== undefined && parseBezierHullsStep(step) === undefined) return message("bezierhulls_invalid_step");
            if (clipToleranceExponent !== undefined && parseClipToleranceExponent(clipToleranceExponent) === undefined) {
                return message("bezierclipping_invalid_tolerance");
            }
            return base.checkGraphState?.(rest);
        },
        check(data: unknown): PresetDataCheck<PointSetModel> {
            return base.check(data);
        },
    });
}
