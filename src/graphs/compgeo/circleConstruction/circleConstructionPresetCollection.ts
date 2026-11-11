import {message, Message} from "../../../localization";
import {isRecord, PresetCollection, PresetDataCheck} from "../../base/presets/PresetCollection";
import {
    CircleConstructionState, CircleError, parseCircleConstructionState,
} from "../../../compgeo/circleConstructionModel";

/**
 * The Preset collection of the circle-construction graph (ADR 0044, ADR 0045). A Preset keeps only the stored fields of the
 * state model (`circleConstructionModel.ts`: the mode, three circles, the points P, A and B and the ratio k), never derived
 * values, so the scene is recomputed from checked data. `data` carries those fields; `graphState` carries only `initialized`.
 */

/** The localized rejection of a state-model error; it names the offending field so the file can be corrected. */
export function circleConstructionRejection(error: CircleError): Message {
    if (error.reason === "not-an-object") return message("invalid_state");
    return message("invalid_value", {value0: error.field});
}

export const CIRCLE_CONSTRUCTION_PRESET_KEY = "circle-construction";

const CIRCLE_CONSTRUCTION_COLLECTION: PresetCollection<CircleConstructionState> = Object.freeze({
    key: CIRCLE_CONSTRUCTION_PRESET_KEY,
    checkGraphState(graphState: unknown): Message | undefined {
        if (!isRecord(graphState)) return message("invalid_state");
        const unknown = Object.keys(graphState).find(field => field !== "initialized");
        if (unknown !== undefined) return message("invalid_value", {value0: unknown});
        if (graphState.initialized !== undefined && typeof graphState.initialized !== "boolean") return message("invalid_option", {value0: "initialized"});
        return undefined;
    },
    check(data: unknown): PresetDataCheck<CircleConstructionState> {
        const parsed = parseCircleConstructionState(data);
        return parsed.ok ? {data: parsed.value} : {rejection: circleConstructionRejection(parsed.error)};
    },
});

/** One frozen definition per key, shared by the graph and the file importer (`PresetImport.ts`). */
export const circleConstructionPresetCollection = (): PresetCollection<CircleConstructionState> => CIRCLE_CONSTRUCTION_COLLECTION;
