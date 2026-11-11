import {message, Message} from "../../localization";
import {isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";
import {parseRandomState, RandomError, RandomState} from "../../random/randomModel";

/**
 * The Preset collection of the simulation graph (ADR 0044, ADR 0045, ADR 0049, ADR 0050). A Preset keeps only the stored fields of
 * the state model (`randomModel.ts`: generator tag, mode, seeds, trial counts and playback position, parameters), never tallies,
 * curves or the playing flag, so the run is recomputed from the checked seed. `data` carries those fields; `graphState` carries only `initialized`.
 */

/** The localized rejection of a state-model error; it names the offending field so the file can be corrected. */
export function randomRejection(error: RandomError): Message {
    if (error.reason === "not-an-object") return message("invalid_state");
    return message("invalid_value", {value0: error.field});
}

export const RANDOM_PRESET_KEY = "prob-simulation";

const RANDOM_COLLECTION: PresetCollection<RandomState> = Object.freeze({
    key: RANDOM_PRESET_KEY,
    checkGraphState(graphState: unknown): Message | undefined {
        if (!isRecord(graphState)) return message("invalid_state");
        const unknown = Object.keys(graphState).find(field => field !== "initialized");
        if (unknown !== undefined) return message("invalid_value", {value0: unknown});
        if (graphState.initialized !== undefined && typeof graphState.initialized !== "boolean") return message("invalid_option", {value0: "initialized"});
        return undefined;
    },
    check(data: unknown): PresetDataCheck<RandomState> {
        const parsed = parseRandomState(data);
        return parsed.ok ? {data: parsed.value} : {rejection: randomRejection(parsed.error)};
    },
});

/** One frozen definition per key, shared by the graph and the file importer (`PresetImport.ts`). */
export const randomPresetCollection = (): PresetCollection<RandomState> => RANDOM_COLLECTION;
