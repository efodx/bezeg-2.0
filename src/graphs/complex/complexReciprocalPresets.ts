import {message, Message} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {COMPLEX_COORDINATE_MAX, COMPLEX_COORDINATE_MIN, isComplexCoordinate} from "../../analysis/complex";
import {
    COMPLEX_RECIPROCAL_EXAMPLE_IDS, ComplexReciprocalModel, INVERSION_RADIUS_MAX, INVERSION_RADIUS_MIN, isComplexReciprocalExampleId, isInversionRadius,
    parseComplexReciprocalModel, RECIPROCAL_COORDINATE_FIELDS, RECIPROCAL_VISIBILITY_FIELDS,
} from "../../analysis/complexReciprocalModel";
import {isFiniteNumber as finite, isRecord, PresetCollection, PresetDataCheck} from "../base/presets/PresetCollection";

/** A range bound as the file contract shows it (the same text in both languages). */
const bound = (value: number) => formatNumber(value, "en");

/** The most specific actionable message for a rejected reciprocal Preset, or the generic one for the wrong shape or a missing field. */
function diagnose(data: Readonly<Record<string, unknown>>): Message {
    if (!isComplexReciprocalExampleId(data.example)) return message("invalid_complex_example", {value0: COMPLEX_RECIPROCAL_EXAMPLE_IDS.join(", ")});
    for (const field of RECIPROCAL_COORDINATE_FIELDS) {
        if (finite(data[field]) && !isComplexCoordinate(data[field])) {
            return message("invalid_complex_coordinate", {value0: field, value1: bound(COMPLEX_COORDINATE_MIN), value2: bound(COMPLEX_COORDINATE_MAX)});
        }
    }
    if (finite(data.radius) && !isInversionRadius(data.radius)) {
        return message("invalid_complex_inversion_radius", {value0: bound(INVERSION_RADIUS_MIN), value1: bound(INVERSION_RADIUS_MAX)});
    }
    for (const field of RECIPROCAL_VISIBILITY_FIELDS) {
        if (typeof data[field] !== "boolean" && data[field] !== undefined) return message("invalid_complex_visibility", {value0: field});
    }
    return message("invalid_function_data");
}

/** The Preset collection of the reciprocal Demonstration, stored under `preset-complex-reciprocal` (task 04 may move it next to the other function collections). */
export const complexReciprocalPresetCollection: PresetCollection<ComplexReciprocalModel> = Object.freeze({
    key: "complex-reciprocal",
    check(data: unknown): PresetDataCheck<ComplexReciprocalModel> {
        const model = parseComplexReciprocalModel(data);
        if (model !== undefined) return {data: model};
        return {rejection: isRecord(data) ? diagnose(data) : message("invalid_function_data")};
    },
});
