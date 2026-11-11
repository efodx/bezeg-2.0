import {message, Message} from "../../localization";
import {isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";
import {LineError, LineGeometryState, parseLineGeometryState} from "./lineGeometryModel";

/**
 * The Preset collection of the line-geometry graph (ADR 0044, ADR 0046). A Preset keeps only the stored fields of the state
 * model (`lineGeometryModel.ts`: the mode, the intersect target and the seven grid points), never derived values, so the scene
 * is recomputed from checked data. `data` carries those fields; `graphState` carries only `initialized`.
 */

/** The localized rejection of a state-model error; it names the offending field so the file can be corrected. */
export function lineRejection(error: LineError): Message {
    if (error.reason === "not-an-object") return message("invalid_state");
    return message("invalid_value", {value0: error.field});
}

export const LINE_GEOMETRY_PRESET_KEY = "line-geometry";

const LINE_GEOMETRY_COLLECTION: PresetCollection<LineGeometryState> = Object.freeze({
    key: LINE_GEOMETRY_PRESET_KEY,
    checkGraphState(graphState: unknown): Message | undefined {
        if (!isRecord(graphState)) return message("invalid_state");
        const unknown = Object.keys(graphState).find(field => field !== "initialized");
        if (unknown !== undefined) return message("invalid_value", {value0: unknown});
        if (graphState.initialized !== undefined && typeof graphState.initialized !== "boolean") return message("invalid_option", {value0: "initialized"});
        return undefined;
    },
    check(data: unknown): PresetDataCheck<LineGeometryState> {
        const parsed = parseLineGeometryState(data);
        return parsed.ok ? {data: parsed.value} : {rejection: lineRejection(parsed.error)};
    },
});

/** One frozen definition per key, shared by the graph and the file importer (`PresetImport.ts`). */
export const lineGeometryPresetCollection = (): PresetCollection<LineGeometryState> => LINE_GEOMETRY_COLLECTION;
