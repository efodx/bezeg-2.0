import {message} from "../../localization";
import {checkComplexReciprocalModel, ComplexReciprocalModel} from "../../analysis/complexReciprocalModel";
import {complexFileMessage} from "./complexMessages";
import {PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";

/** The Preset collection of the reciprocal Demonstration, stored under `preset-complex-reciprocal` (task 04 may move it next to the other function collections). */
export const complexReciprocalPresetCollection: PresetCollection<ComplexReciprocalModel> = Object.freeze({
    key: "complex-reciprocal",
    check(data: unknown): PresetDataCheck<ComplexReciprocalModel> {
        const result = checkComplexReciprocalModel(data);
        if (result.ok) return {data: result.model};
        return {rejection: result.issue === undefined ? message("invalid_function_data") : complexFileMessage(result.issue)};
    },
});
