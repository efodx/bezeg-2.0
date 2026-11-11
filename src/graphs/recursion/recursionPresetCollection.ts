import {message, Message} from "../../localization";
import {isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";
import {
    CobwebState, GrowthState, parseCobwebState, parseGrowthState, RecursionError,
} from "../../recursion/recursionModel";

/**
 * The Preset collections of the two recursion graphs (ADR 0044, ADR 0045, ADR 0049, ADR 0050, ADR 0052). A Preset keeps only the
 * stored fields of the state model (`recursionModel.ts`: whole-number parameters, the map or panel name and, for the cobweb, the
 * number of drawn steps), never playback, the speed or derived values (classification, fixed point, iterates, sums), so the scene
 * is recomputed from checked data. `data` carries those fields; `graphState` carries only `initialized`.
 */

/** The localized rejection of a state-model error; it names the offending field so the file can be corrected. */
export function recursionRejection(error: RecursionError): Message {
    if (error.reason === "not-an-object") return message("invalid_state");
    return message("invalid_value", {value0: error.field});
}

export const RECURSION_COBWEB_PRESET_KEY = "recursion-cobweb";
export const RECURSION_GROWTH_PRESET_KEY = "recursion-growth";

function checkGraphState(graphState: unknown): Message | undefined {
    if (!isRecord(graphState)) return message("invalid_state");
    const unknown = Object.keys(graphState).find(field => field !== "initialized");
    if (unknown !== undefined) return message("invalid_value", {value0: unknown});
    if (graphState.initialized !== undefined && typeof graphState.initialized !== "boolean") return message("invalid_option", {value0: "initialized"});
    return undefined;
}

const COBWEB_COLLECTION: PresetCollection<CobwebState> = Object.freeze({
    key: RECURSION_COBWEB_PRESET_KEY,
    checkGraphState,
    check(data: unknown): PresetDataCheck<CobwebState> {
        const parsed = parseCobwebState(data);
        return parsed.ok ? {data: parsed.value} : {rejection: recursionRejection(parsed.error)};
    },
});

const GROWTH_COLLECTION: PresetCollection<GrowthState> = Object.freeze({
    key: RECURSION_GROWTH_PRESET_KEY,
    checkGraphState,
    check(data: unknown): PresetDataCheck<GrowthState> {
        const parsed = parseGrowthState(data);
        return parsed.ok ? {data: parsed.value} : {rejection: recursionRejection(parsed.error)};
    },
});

/** One frozen definition per key, shared by the graphs and the file importer (`PresetImport.ts`). */
export const recursionCobwebPresetCollection = (): PresetCollection<CobwebState> => COBWEB_COLLECTION;
export const growthPresetCollection = (): PresetCollection<GrowthState> => GROWTH_COLLECTION;
