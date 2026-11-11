import {message, Message} from "../../localization";
import {isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";
import {DescentState, parseDescentState, TrackError} from "../../mechanics/trackModel";

/**
 * The Preset collection of the descent graph (ADR 0044, ADR 0045, ADR 0049, ADR 0050, ADR 0056). A Preset keeps only the stored
 * fields of the state model (`trackModel.ts`: the mode, the grid-valued parameters and the two display switches), never the elapsed
 * time, the playing flag or derived values (descent times, tracks), so the scene is recomputed from checked data. `data` carries
 * those fields; `graphState` carries only `initialized`.
 */

/** The localized rejection of a state-model error; it names the offending field so the file can be corrected. */
export function descentRejection(error: TrackError): Message {
    if (error.reason === "not-an-object") return message("invalid_state");
    if (error.reason === "not-boolean") return message("invalid_option", {value0: error.field});
    return message("invalid_value", {value0: error.field});
}

export const DESCENT_PRESET_KEY = "mechanics-descent";

const DESCENT_COLLECTION: PresetCollection<DescentState> = Object.freeze({
    key: DESCENT_PRESET_KEY,
    checkGraphState(graphState: unknown): Message | undefined {
        if (!isRecord(graphState)) return message("invalid_state");
        const unknown = Object.keys(graphState).find(field => field !== "initialized");
        if (unknown !== undefined) return message("invalid_value", {value0: unknown});
        if (graphState.initialized !== undefined && typeof graphState.initialized !== "boolean") return message("invalid_option", {value0: "initialized"});
        return undefined;
    },
    check(data: unknown): PresetDataCheck<DescentState> {
        const parsed = parseDescentState(data);
        return parsed.ok ? {data: parsed.value} : {rejection: descentRejection(parsed.error)};
    },
});

/** One frozen definition per key, shared by the graph and the file importer (`PresetImport.ts`). */
export const descentPresetCollection = (): PresetCollection<DescentState> => DESCENT_COLLECTION;
