import {message, Message} from "../../localization";
import {isGridPoint} from "../../compgeo/grid";
import {parsePointSetModel, PointSetModel, serializePointSetModel} from "../../compgeo/pointSetModel";
import {isSimsonExampleId, isSimsonMode, isSimsonOffset} from "../../compgeo/simsonLineModel";
import {isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";
import {pointSetRejection} from "./pointSetPresetCollection";

export const SIMSON_LINE_PRESET_KEY = "compgeo-simson-line";
export const SIMSON_POINT_COUNT = 3;

/** The overlay ids the graph offers: its grid switch, the triangle, the side lines, the circumcircle, the perpendiculars, the Simson line and the foot triangle. */
export const SIMSON_LINE_OVERLAY_IDS = ["grid", "triangle", "sidelines", "circumcircle", "perpendiculars", "simson", "pedal"] as const;

const GRAPH_STATE_FIELDS = ["initialized", "overlays", "exampleId", "mode", "t", "epsilon", "pPrime"];

/**
 * The Preset collection of the Simson line graph. `data` is a `PointSetModel` in points mode at grid step 1 with at most
 * three vertices (integer range checked by `parsePointSetModel`); a collinear or coincident triple is valid state.
 * `graphState` carries `initialized`, the toggles (known ids only), the optional example id, the mode, the glider angle
 * `t` in degrees (any finite number, normalised by the graph), the offset `epsilon` (one of `SIMSON_OFFSETS`) and the exact
 * point `pPrime` (integer pair within the grid range); never the model. Not yet listed in `presetCollections`; the route
 * that uses the graph registers it.
 */
export function simsonLinePresetCollection(overlayIds: readonly string[]): PresetCollection<PointSetModel> {
    return Object.freeze({
        key: SIMSON_LINE_PRESET_KEY,
        checkGraphState(graphState: unknown): Message | undefined {
            if (!isRecord(graphState)) return message("invalid_state");
            const unknown = Object.keys(graphState).find(field => !GRAPH_STATE_FIELDS.includes(field));
            if (unknown !== undefined) return message("invalid_value", {value0: unknown});
            if (graphState.initialized !== undefined && typeof graphState.initialized !== "boolean") return message("invalid_state");
            if (graphState.exampleId !== undefined && !isSimsonExampleId(graphState.exampleId)) return message("simson_invalid_example");
            if (graphState.mode !== undefined && !isSimsonMode(graphState.mode)) return message("simson_invalid_mode");
            if (graphState.t !== undefined && (typeof graphState.t !== "number" || !Number.isFinite(graphState.t))) return message("simson_invalid_t");
            if (graphState.epsilon !== undefined && !isSimsonOffset(graphState.epsilon)) return message("simson_invalid_epsilon");
            if (graphState.pPrime !== undefined && !isGridPoint(graphState.pPrime)) return message("simson_invalid_pprime");
            const overlays = graphState.overlays;
            if (overlays === undefined) return undefined;
            const valid = isRecord(overlays) && Object.entries(overlays).every(([id, shown]) => overlayIds.includes(id) && typeof shown === "boolean");
            return valid ? undefined : message("pointset_invalid_overlays");
        },
        check(data: unknown): PresetDataCheck<PointSetModel> {
            const parsed = parsePointSetModel(data, {pointLimit: SIMSON_POINT_COUNT});
            if (!parsed.ok) return {rejection: pointSetRejection(parsed)};
            if (parsed.model.mode !== "points") return {rejection: message("notable_invalid_mode")};
            if (parsed.model.gridStepExponent !== 0) return {rejection: message("notable_invalid_grid_step")};
            return {data: serializePointSetModel(parsed.model)};
        },
    });
}

/** The module-level singleton; the Preset catalog compares collections by identity. */
export const simsonLineCollection: PresetCollection<PointSetModel> = simsonLinePresetCollection(SIMSON_LINE_OVERLAY_IDS);
