import {message, Message} from "../../localization";
import {isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";
import {
    LogisticState, parseLogisticState, parsePhaseState, PhaseError, PhaseState,
} from "../../dynamics/phaseModel";

/**
 * The Preset collections of the phase-portrait and logistic-map graphs (ADR 0044, ADR 0045, ADR 0049, ADR 0050, ADR 0054). A Preset
 * keeps only the stored fields of the state model (`phaseModel.ts`: the system, the integer-coded matrix entries, seeds, equilibrium
 * and zoom; for the logistic map R, X and the number of drawn steps), never playback, time or derived values (classification,
 * orbits, periods), so the scene is recomputed from checked data. `data` carries those fields; `graphState` carries only `initialized`.
 */

/** The localized rejection of a state-model error; it names the offending field so the file can be corrected. */
export function dynamicsRejection(error: PhaseError): Message {
    if (error.reason === "not-an-object") return message("invalid_state");
    return message("invalid_value", {value0: error.field});
}

export const PHASE_PORTRAIT_PRESET_KEY = "phase-portrait";
export const LOGISTIC_MAP_PRESET_KEY = "logistic-map";

function checkGraphState(graphState: unknown): Message | undefined {
    if (!isRecord(graphState)) return message("invalid_state");
    const unknown = Object.keys(graphState).find(field => field !== "initialized");
    if (unknown !== undefined) return message("invalid_value", {value0: unknown});
    if (graphState.initialized !== undefined && typeof graphState.initialized !== "boolean") return message("invalid_option", {value0: "initialized"});
    return undefined;
}

const PHASE_COLLECTION: PresetCollection<PhaseState> = Object.freeze({
    key: PHASE_PORTRAIT_PRESET_KEY,
    checkGraphState,
    check(data: unknown): PresetDataCheck<PhaseState> {
        const parsed = parsePhaseState(data);
        return parsed.ok ? {data: parsed.value} : {rejection: dynamicsRejection(parsed.error)};
    },
});

const LOGISTIC_COLLECTION: PresetCollection<LogisticState> = Object.freeze({
    key: LOGISTIC_MAP_PRESET_KEY,
    checkGraphState,
    check(data: unknown): PresetDataCheck<LogisticState> {
        const parsed = parseLogisticState(data);
        return parsed.ok ? {data: parsed.value} : {rejection: dynamicsRejection(parsed.error)};
    },
});

/** One frozen definition per key, shared by the graphs and the file importer (`PresetImport.ts`). */
export const phasePortraitPresetCollection = (): PresetCollection<PhaseState> => PHASE_COLLECTION;
export const logisticMapPresetCollection = (): PresetCollection<LogisticState> => LOGISTIC_COLLECTION;
