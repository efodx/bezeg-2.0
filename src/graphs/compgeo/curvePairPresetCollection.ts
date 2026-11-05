import {message} from "../../localization";
import {splitCurvePair} from "../../compgeo/curvePairNets";
import {PointSetModel, PointSetOptions} from "../../compgeo/pointSetModel";
import {PresetCollection} from "../base/presets/PresetCollection";
import {pointSetPresetCollection} from "./pointSetPresetCollection";

/**
 * The curve pair Preset collection and its keys, kept apart from CurvePairGraph so `compgeoPresetCollections` (imported by
 * PointSetGraph's module graph) can list the Bezier hulls collection without importing a graph module (convexity task 27).
 */
export const CURVE_PAIR_PRESET_KEY = "compgeo-curve-pair";

export const CURVE_PAIR_OVERLAY_IDS = ["grid", "control", "hull"] as const;

/** True when `model` is a pair of Bezier nets of degree 2 or 3 in points mode: 6 or 8 points. */
export function isCurvePairModel(model: PointSetModel): boolean {
    return model.mode === "points" && !model.closed && splitCurvePair(model.points) !== undefined;
}

/**
 * The Preset collection of a curve pair graph: the point-set checks (grid coordinates within 2^10) plus the shape of the pair.
 */
export function curvePairPresetCollection(overlayIds: readonly string[], options: PointSetOptions = {}): PresetCollection<PointSetModel> {
    const base = pointSetPresetCollection(CURVE_PAIR_PRESET_KEY, overlayIds, options);
    return Object.freeze({
        ...base,
        check(data: unknown) {
            const checked = base.check(data);
            if ("data" in checked && !isCurvePairModel(checked.data)) return {rejection: message("curvepair_invalid_point_count")};
            return checked;
        },
    });
}
