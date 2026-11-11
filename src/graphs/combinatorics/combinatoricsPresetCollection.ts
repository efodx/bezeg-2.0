import {message, Message} from "../../localization";
import {isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";
import {
    CombinatoricsError, CountingState, LatticeState, parseCountingState, parseLatticeState,
} from "../../combinatorics/combinatoricsModel";

/**
 * The Preset collections of the two combinatorics graphs (ADR 0044, ADR 0048). A Preset keeps only the stored fields of the
 * state model (`combinatoricsModel.ts`), never counts or other derived values, so the scene is recomputed from checked data.
 * `data` carries those fields; `graphState` carries only `initialized`.
 */

/** The localized rejection of a state-model error; it names the offending field so the file can be corrected. */
export function combinatoricsRejection(error: CombinatoricsError): Message {
    if (error.reason === "not-an-object") return message("invalid_state");
    if (error.reason === "not-boolean") return message("invalid_option", {value0: error.field});
    return message("invalid_value", {value0: error.field});
}

export const LATTICE_PATHS_PRESET_KEY = "lattice-paths";
export const COUNTING_TREE_PRESET_KEY = "counting-tree";

function checkGraphState(graphState: unknown): Message | undefined {
    if (!isRecord(graphState)) return message("invalid_state");
    const unknown = Object.keys(graphState).find(field => field !== "initialized");
    if (unknown !== undefined) return message("invalid_value", {value0: unknown});
    if (graphState.initialized !== undefined && typeof graphState.initialized !== "boolean") return message("invalid_option", {value0: "initialized"});
    return undefined;
}

const LATTICE_PATHS_COLLECTION: PresetCollection<LatticeState> = Object.freeze({
    key: LATTICE_PATHS_PRESET_KEY,
    checkGraphState,
    check(data: unknown): PresetDataCheck<LatticeState> {
        const parsed = parseLatticeState(data);
        return parsed.ok ? {data: parsed.value} : {rejection: combinatoricsRejection(parsed.error)};
    },
});

const COUNTING_TREE_COLLECTION: PresetCollection<CountingState> = Object.freeze({
    key: COUNTING_TREE_PRESET_KEY,
    checkGraphState,
    check(data: unknown): PresetDataCheck<CountingState> {
        const parsed = parseCountingState(data);
        return parsed.ok ? {data: parsed.value} : {rejection: combinatoricsRejection(parsed.error)};
    },
});

/** One frozen definition per key, shared by the graphs and the file importer (`PresetImport.ts`). */
export const latticePathsPresetCollection = (): PresetCollection<LatticeState> => LATTICE_PATHS_COLLECTION;
export const countingTreePresetCollection = (): PresetCollection<CountingState> => COUNTING_TREE_COLLECTION;
