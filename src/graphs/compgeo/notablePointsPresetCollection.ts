import {message, Message} from "../../localization";
import {parsePointSetModel, PointSetModel, serializePointSetModel} from "../../compgeo/pointSetModel";
import {isNotableExampleId} from "../../compgeo/notablePointsModel";
import {isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";
import {pointSetRejection} from "./pointSetPresetCollection";

export const NOTABLE_POINTS_PRESET_KEY = "compgeo-notable-points";
export const NOTABLE_POINT_COUNT = 3;

/**
 * The Preset collection of the notable-points graph. `data` is a `PointSetModel` in points mode at grid step 1 with at
 * most three vertices (integer range checked by `parsePointSetModel`); a collinear or coincident triple is valid state.
 * `graphState` carries `initialized`, the toggles (`overlays`, known ids only) and the optional example id, never the
 * model. Like the point-set key, this key is not yet listed in `presetCollections`; the route that uses the graph registers it.
 */
export function notablePointsPresetCollection(overlayIds: readonly string[]): PresetCollection<PointSetModel> {
    return Object.freeze({
        key: NOTABLE_POINTS_PRESET_KEY,
        checkGraphState(graphState: unknown): Message | undefined {
            if (!isRecord(graphState)) return message("invalid_state");
            const unknown = Object.keys(graphState).find(field => field !== "initialized" && field !== "overlays" && field !== "exampleId");
            if (unknown !== undefined) return message("invalid_value", {value0: unknown});
            if (graphState.initialized !== undefined && typeof graphState.initialized !== "boolean") return message("invalid_state");
            if (graphState.exampleId !== undefined && !isNotableExampleId(graphState.exampleId)) return message("notable_invalid_example");
            const overlays = graphState.overlays;
            if (overlays === undefined) return undefined;
            const valid = isRecord(overlays) && Object.entries(overlays).every(([id, shown]) => overlayIds.includes(id) && typeof shown === "boolean");
            return valid ? undefined : message("pointset_invalid_overlays");
        },
        check(data: unknown): PresetDataCheck<PointSetModel> {
            const parsed = parsePointSetModel(data, {pointLimit: NOTABLE_POINT_COUNT});
            if (!parsed.ok) return {rejection: pointSetRejection(parsed)};
            if (parsed.model.mode !== "points") return {rejection: message("notable_invalid_mode")};
            if (parsed.model.gridStepExponent !== 0) return {rejection: message("notable_invalid_grid_step")};
            return {data: serializePointSetModel(parsed.model)};
        },
    });
}
