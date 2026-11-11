import {message, Message} from "../../../localization";
import {isRecord, PresetCollection, PresetDataCheck} from "../../base/presets/PresetCollection";
import {KinematicsError, KinematicsState, parseKinematicsState} from "../../../kinematics/kinematicsModel";

/**
 * The Preset collection of the kinematics graph (ADR 0044, ADR 0045, ADR 0049, ADR 0050). A Preset keeps only the stored fields of
 * the state model (`kinematicsModel.ts`: the motion, its parameters and the display switches of the arrows), never the time, the
 * playing flag or derived values, so the scene is recomputed from checked data. `data` carries those fields; `graphState` carries only `initialized`.
 */

/** The localized rejection of a state-model error; it names the offending field so the file can be corrected. */
export function kinematicsRejection(error: KinematicsError): Message {
    if (error.reason === "not-an-object") return message("invalid_state");
    if (error.reason === "not-boolean") return message("invalid_option", {value0: error.field});
    return message("invalid_value", {value0: error.field});
}

export const KINEMATICS_PRESET_KEY = "curve-kinematics";

const KINEMATICS_COLLECTION: PresetCollection<KinematicsState> = Object.freeze({
    key: KINEMATICS_PRESET_KEY,
    checkGraphState(graphState: unknown): Message | undefined {
        if (!isRecord(graphState)) return message("invalid_state");
        const unknown = Object.keys(graphState).find(field => field !== "initialized");
        if (unknown !== undefined) return message("invalid_value", {value0: unknown});
        if (graphState.initialized !== undefined && typeof graphState.initialized !== "boolean") return message("invalid_option", {value0: "initialized"});
        return undefined;
    },
    check(data: unknown): PresetDataCheck<KinematicsState> {
        const parsed = parseKinematicsState(data);
        return parsed.ok ? {data: parsed.value} : {rejection: kinematicsRejection(parsed.error)};
    },
});

/** One frozen definition per key, shared by the graph and the file importer (`PresetImport.ts`). */
export const kinematicsPresetCollection = (): PresetCollection<KinematicsState> => KINEMATICS_COLLECTION;
