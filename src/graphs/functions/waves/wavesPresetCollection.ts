import {message, Message} from "../../../localization";
import {isRecord, PresetCollection, PresetDataCheck} from "../../base/presets/PresetCollection";
import {WavesError, WavesState, parseWavesState} from "../../../waves/wavesModel";

/**
 * The Preset collection of the waves graph (ADR 0044, ADR 0045, ADR 0049, ADR 0050). A Preset keeps only the stored fields of
 * the state model (`wavesModel.ts`: the mode, amplitudes, phases, integer frequencies, rate, half waves and the display switches), never the time, the
 * playing flag or derived values (curves, alias, readout numbers), so the scene is recomputed from checked data. `data` carries those fields; `graphState` carries only `initialized`.
 */

/** The localized rejection of a state-model error; it names the offending field so the file can be corrected. */
export function wavesRejection(error: WavesError): Message {
    if (error.reason === "not-an-object") return message("invalid_state");
    if (error.reason === "not-boolean") return message("invalid_option", {value0: error.field});
    return message("invalid_value", {value0: error.field});
}

export const WAVES_PRESET_KEY = "waves";

const WAVES_COLLECTION: PresetCollection<WavesState> = Object.freeze({
    key: WAVES_PRESET_KEY,
    checkGraphState(graphState: unknown): Message | undefined {
        if (!isRecord(graphState)) return message("invalid_state");
        const unknown = Object.keys(graphState).find(field => field !== "initialized");
        if (unknown !== undefined) return message("invalid_value", {value0: unknown});
        if (graphState.initialized !== undefined && typeof graphState.initialized !== "boolean") return message("invalid_option", {value0: "initialized"});
        return undefined;
    },
    check(data: unknown): PresetDataCheck<WavesState> {
        const parsed = parseWavesState(data);
        return parsed.ok ? {data: parsed.value} : {rejection: wavesRejection(parsed.error)};
    },
});

/** One frozen definition per key, shared by the graph and the file importer (`PresetImport.ts`). */
export const wavesPresetCollection = (): PresetCollection<WavesState> => WAVES_COLLECTION;
