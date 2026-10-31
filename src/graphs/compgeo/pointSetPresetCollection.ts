import {message, Message} from "../../localization";
import {
    MAX_GRID_STEP_EXPONENT, MIN_GRID_STEP_EXPONENT, parsePointSetModel, PointSetModel, PointSetOptions, PointSetParseResult,
    serializePointSetModel,
} from "../../compgeo/pointSetModel";
import {isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";

/** The localized, actionable reason a point-set parse refused its data. Exhaustive over `PointSetParseReason`. */
export function pointSetRejection(result: Extract<PointSetParseResult, {ok: false}>): Message {
    switch (result.reason) {
        case "not-an-object": return message("pointset_invalid_not_an_object");
        case "unknown-mode": return message("pointset_invalid_unknown_mode");
        case "points-not-array": return message("pointset_invalid_points_not_array");
        case "too-many-points": return message("pointset_invalid_too_many_points", {value0: result.limit ?? 0});
        case "point-not-object": return message("pointset_invalid_point_not_object");
        case "non-integer-coordinate": return message("pointset_invalid_non_integer_coordinate");
        case "coordinate-out-of-range": return message("pointset_invalid_coordinate_out_of_range", {value0: result.bound ?? 0});
        case "invalid-grid-step": return message("pointset_invalid_grid_step", {value0: MIN_GRID_STEP_EXPONENT, value1: MAX_GRID_STEP_EXPONENT});
        case "closed-not-boolean": return message("pointset_invalid_closed_not_boolean");
        case "closed-in-points-mode": return message("pointset_invalid_closed_in_points_mode");
    }
}

/**
 * The Preset collection of the point-set/polygon graph family. `data` is a `PointSetModel` checked by
 * `parsePointSetModel`; `graphState` carries only `initialized` and the overlay switches (`overlays`, known ids only),
 * never the model, so a file cannot smuggle an unchecked model through the scene state.
 * The key is a file contract. It is not yet listed in `presetCollections` (`PresetImport.ts`): that registration belongs
 * to the route that first uses the graph, so the file importer does not know the key until then.
 */
export function pointSetPresetCollection(key: string, overlayIds: readonly string[], options: PointSetOptions = {}): PresetCollection<PointSetModel> {
    return Object.freeze({
        key,
        checkGraphState(graphState: unknown): Message | undefined {
            if (!isRecord(graphState)) return message("invalid_state");
            const unknown = Object.keys(graphState).find(field => field !== "initialized" && field !== "overlays");
            if (unknown !== undefined) return message("invalid_value", {value0: unknown});
            if (graphState.initialized !== undefined && typeof graphState.initialized !== "boolean") return message("invalid_state");
            const overlays = graphState.overlays;
            if (overlays === undefined) return undefined;
            const valid = isRecord(overlays) && Object.entries(overlays).every(([id, shown]) => overlayIds.includes(id) && typeof shown === "boolean");
            return valid ? undefined : message("pointset_invalid_overlays");
        },
        check(data: unknown): PresetDataCheck<PointSetModel> {
            const parsed = parsePointSetModel(data, options);
            return parsed.ok ? {data: serializePointSetModel(parsed.model)} : {rejection: pointSetRejection(parsed)};
        },
    });
}
