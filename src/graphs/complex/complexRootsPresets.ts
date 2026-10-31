import {message, Message} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {COMPLEX_COORDINATE_MAX, COMPLEX_COORDINATE_MIN, isComplexCoordinate} from "../../analysis/complex";
import {COMPLEX_ROOT_DEGREE_MAX, COMPLEX_ROOT_DEGREE_MIN, isComplexRootDegree} from "../../analysis/complexRoots";
import {
    COMPLEX_ROOTS_EXAMPLE_IDS, ComplexRootsModel, isComplexRootsExampleId, parseComplexRootsModel, ROOTS_COORDINATE_FIELDS, ROOTS_VISIBILITY_FIELDS,
} from "../../analysis/complexRootsModel";
import {isFiniteNumber as finite, isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";

/** A range bound as the file contract shows it (the same text in both languages). */
const bound = (value: number) => formatNumber(value, "en");

/** The most specific actionable message for a rejected roots Preset, or the generic one for the wrong shape or a missing field. */
function diagnose(data: Readonly<Record<string, unknown>>): Message {
    if (!isComplexRootsExampleId(data.example)) return message("invalid_complex_example", {value0: COMPLEX_ROOTS_EXAMPLE_IDS.join(", ")});
    for (const field of ROOTS_COORDINATE_FIELDS) {
        if (finite(data[field]) && !isComplexCoordinate(data[field])) {
            return message("invalid_complex_coordinate", {value0: field, value1: bound(COMPLEX_COORDINATE_MIN), value2: bound(COMPLEX_COORDINATE_MAX)});
        }
    }
    if (data.degree !== undefined && !isComplexRootDegree(data.degree)) {
        return message("complex_roots_invalid_degree", {value0: bound(COMPLEX_ROOT_DEGREE_MIN), value1: bound(COMPLEX_ROOT_DEGREE_MAX)});
    }
    for (const field of ROOTS_VISIBILITY_FIELDS) {
        if (typeof data[field] !== "boolean" && data[field] !== undefined) return message("invalid_complex_visibility", {value0: field});
    }
    return message("invalid_function_data");
}

/** The Preset collection of the roots Demonstration, stored under `preset-complex-roots` (task 04 may move it next to the other function collections). */
export const complexRootsPresetCollection: PresetCollection<ComplexRootsModel> = Object.freeze({
    key: "complex-roots",
    check(data: unknown): PresetDataCheck<ComplexRootsModel> {
        const model = parseComplexRootsModel(data);
        if (model !== undefined) return {data: model};
        return {rejection: isRecord(data) ? diagnose(data) : message("invalid_function_data")};
    },
});
