import {message} from "../../localization";
import {checkComplexRootsModel, ComplexRootsModel} from "../../analysis/complexRootsModel";
import {complexFileMessage} from "./complexMessages";
import {PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";

/** The Preset collection of the roots Demonstration, stored under `preset-complex-roots` (task 04 may move it next to the other function collections). */
export const complexRootsPresetCollection: PresetCollection<ComplexRootsModel> = Object.freeze({
    key: "complex-roots",
    check(data: unknown): PresetDataCheck<ComplexRootsModel> {
        const result = checkComplexRootsModel(data);
        if (result.ok) return {data: result.model};
        return {rejection: result.issue === undefined ? message("invalid_function_data") : complexFileMessage(result.issue)};
    },
});
