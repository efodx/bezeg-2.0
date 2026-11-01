import {message, Message} from "../../localization";
import {parsePointSetModel, PointSetModel, serializePointSetModel} from "../../compgeo/pointSetModel";
import {isInscribedExampleId} from "../../compgeo/inscribedAngleModel";
import {isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";
import {pointSetRejection} from "./pointSetPresetCollection";

export const INSCRIBED_ANGLE_PRESET_KEY = "compgeo-inscribed-angle";
export const INSCRIBED_ANGLE_VERTEX_COUNT = 3;

/**
 * The Preset collection of the inscribed-angle graph. `data` is a `PointSetModel` in points mode at grid step 1 with at
 * most three vertices (integer range checked by `parsePointSetModel`); a collinear or coincident triple is valid state.
 * `graphState` carries `initialized`, the toggles (`overlays`, known ids only), the optional example id and the glider
 * parameter `t` in degrees (any finite number; out-of-range values are normalised by the graph, not rejected). Like the
 * point-set key, this key is not yet listed in `presetCollections`; the route that uses the graph registers it.
 */
export function inscribedAnglePresetCollection(overlayIds: readonly string[]): PresetCollection<PointSetModel> {
    return Object.freeze({
        key: INSCRIBED_ANGLE_PRESET_KEY,
        checkGraphState(graphState: unknown): Message | undefined {
            if (!isRecord(graphState)) return message("invalid_state");
            const unknown = Object.keys(graphState).find(field => field !== "initialized" && field !== "overlays" && field !== "exampleId" && field !== "t");
            if (unknown !== undefined) return message("invalid_value", {value0: unknown});
            if (graphState.initialized !== undefined && typeof graphState.initialized !== "boolean") return message("invalid_state");
            if (graphState.exampleId !== undefined && !isInscribedExampleId(graphState.exampleId)) return message("inscribed_invalid_example");
            if (graphState.t !== undefined && (typeof graphState.t !== "number" || !Number.isFinite(graphState.t))) return message("inscribed_invalid_t");
            const overlays = graphState.overlays;
            if (overlays === undefined) return undefined;
            const valid = isRecord(overlays) && Object.entries(overlays).every(([id, shown]) => overlayIds.includes(id) && typeof shown === "boolean");
            return valid ? undefined : message("pointset_invalid_overlays");
        },
        check(data: unknown): PresetDataCheck<PointSetModel> {
            const parsed = parsePointSetModel(data, {pointLimit: INSCRIBED_ANGLE_VERTEX_COUNT});
            if (!parsed.ok) return {rejection: pointSetRejection(parsed)};
            if (parsed.model.mode !== "points") return {rejection: message("notable_invalid_mode")};
            if (parsed.model.gridStepExponent !== 0) return {rejection: message("notable_invalid_grid_step")};
            return {data: serializePointSetModel(parsed.model)};
        },
    });
}
