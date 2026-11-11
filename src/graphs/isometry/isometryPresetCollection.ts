import {message, Message} from "../../localization";
import {isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";
import {IsometryError, IsometryState, parseIsometryState} from "../../isometry/isometryModel";

/**
 * The Preset collection of the isometry graph (ADR 0044, ADR 0047). A Preset keeps only the stored fields of the state model
 * (`src/isometry/isometryModel.ts`: mode, mirrors, dilation, rosette and frieze inputs), never derived values, so the scene is
 * recomputed from checked data. `data` carries those fields; `graphState` carries only `initialized`.
 */

/** The localized rejection of a state-model error; it names the offending field so the file can be corrected. */
export function isometryRejection(error: IsometryError): Message {
    if (error.reason === "not-an-object") return message("invalid_state");
    return message("invalid_value", {value0: error.field});
}

export const ISOMETRY_PRESET_KEY = "isometries";

const ISOMETRY_COLLECTION: PresetCollection<IsometryState> = Object.freeze({
    key: ISOMETRY_PRESET_KEY,
    checkGraphState(graphState: unknown): Message | undefined {
        if (!isRecord(graphState)) return message("invalid_state");
        const unknown = Object.keys(graphState).find(field => field !== "initialized");
        if (unknown !== undefined) return message("invalid_value", {value0: unknown});
        if (graphState.initialized !== undefined && typeof graphState.initialized !== "boolean") return message("invalid_option", {value0: "initialized"});
        return undefined;
    },
    check(data: unknown): PresetDataCheck<IsometryState> {
        const parsed = parseIsometryState(data);
        return parsed.ok ? {data: parsed.value} : {rejection: isometryRejection(parsed.error)};
    },
});

/** One frozen definition per key, shared by the graph and the file importer (`PresetImport.ts`). */
export const isometryPresetCollection = (): PresetCollection<IsometryState> => ISOMETRY_COLLECTION;
