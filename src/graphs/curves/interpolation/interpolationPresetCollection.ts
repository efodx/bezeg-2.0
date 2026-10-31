import {message, Message} from "../../../localization";
import {isFiniteNumber, isRecord, PresetCollection, PresetDataCheck} from "../../base/presets/PresetCollection";
import {
    DEFAULT_INTERPOLATION_PRESET, interpolationRejection, InterpolationPresetData, isParameterRule,
} from "./interpolationModel";

export const INTERPOLATION_COLLECTION_KEY = 'interp-lagrange';

const isPointRow = (value: unknown): value is [number, number] =>
    Array.isArray(value) && value.length === 2 && isFiniteNumber(value[0]) && isFiniteNumber(value[1]);

/** Checks the whole data record; returns the rejection or the cleaned data. */
function checkFields(value: unknown): Message | InterpolationPresetData {
    if (!isRecord(value)) return message("invalid_state");
    const {points, parameterRule, showHull, showBezier, t} = value;
    if (!Array.isArray(points) || !points.every(isPointRow)) return message("invalid_value", {value0: "points"});
    if (!isParameterRule(parameterRule)) return message("invalid_value", {value0: "parameterRule"});
    if (typeof showHull !== "boolean") return message("invalid_option", {value0: "showHull"});
    if (typeof showBezier !== "boolean") return message("invalid_option", {value0: "showBezier"});
    if (!isFiniteNumber(t) || t < 0 || t > 1) return message("invalid_parameter", {value0: "t"});
    const rejection = interpolationRejection(points, parameterRule);
    if (rejection) return rejection;
    return {points: points.map(p => [p[0], p[1]] as [number, number]), parameterRule, showHull, showBezier, t};
}

const isMessage = (value: Message | InterpolationPresetData): value is Message => 'key' in value;

/**
 * The Preset collection of the `interp-lagrange` Demonstration (not yet registered in `curvePresetCollections`). The scene
 * state carries the same five fields as the data plus `notice`, so `graphState` is checked with the same rules.
 */
export const interpolationPresetCollection: PresetCollection<InterpolationPresetData> = Object.freeze({
    key: INTERPOLATION_COLLECTION_KEY,
    check(data: unknown): PresetDataCheck<InterpolationPresetData> {
        const checked = checkFields(data);
        return isMessage(checked) ? {rejection: checked} : {data: checked};
    },
    checkGraphState(graphState: unknown): Message | undefined {
        if (!isRecord(graphState)) return message("invalid_state");
        const {notice} = graphState;
        if (notice !== undefined && notice !== '' && notice !== 'coincident') return message("invalid_value", {value0: "notice"});
        const fields = ['points', 'parameterRule', 'showHull', 'showBezier', 't'];
        if (!fields.some(field => field in graphState)) return undefined;
        const checked = checkFields({...DEFAULT_INTERPOLATION_PRESET, ...graphState});
        return isMessage(checked) ? checked : undefined;
    },
});
