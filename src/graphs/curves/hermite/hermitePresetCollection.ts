import {message, Message} from "../../../localization";
import {isFiniteNumber, isRecord, PresetCollection, PresetDataCheck} from "../../base/presets/PresetCollection";
import {DEFAULT_HERMITE_PRESET, hermiteRejection, HermitePresetData, isHermiteMode, isParameterRule} from "./hermiteModel";

export const HERMITE_COLLECTION_KEY = 'interp-hermite';

const isRow = (value: unknown): value is [number, number] =>
    Array.isArray(value) && value.length === 2 && isFiniteNumber(value[0]) && isFiniteNumber(value[1]);

/** Checks the whole data record; returns the rejection or the cleaned data. */
function checkFields(value: unknown): Message | HermitePresetData {
    if (!isRecord(value)) return message("invalid_state");
    const {points, mode, tangents, parameterRule, tension, showTangents, showBezier} = value;
    if (!Array.isArray(points) || !points.every(isRow)) return message("invalid_value", {value0: "points"});
    if (!isHermiteMode(mode)) return message("invalid_value", {value0: "mode"});
    if (!Array.isArray(tangents) || !tangents.every(isRow)) return message("invalid_value", {value0: "tangents"});
    if (!isParameterRule(parameterRule)) return message("invalid_value", {value0: "parameterRule"});
    if (!isFiniteNumber(tension)) return message("invalid_parameter", {value0: "tension"});
    if (typeof showTangents !== "boolean") return message("invalid_option", {value0: "showTangents"});
    if (typeof showBezier !== "boolean") return message("invalid_option", {value0: "showBezier"});
    const data: HermitePresetData = {
        points: points.map(p => [p[0], p[1]] as const), mode, tangents: tangents.map(m => [m[0], m[1]] as const),
        parameterRule, tension, showTangents, showBezier,
    };
    return hermiteRejection(data) ?? data;
}

const isMessage = (value: Message | HermitePresetData): value is Message => 'key' in value;

const FIELDS = ['points', 'mode', 'tangents', 'parameterRule', 'tension', 'showTangents', 'showBezier'];

/**
 * The Preset collection of the `interp-hermite` Demonstration (not yet registered in `curvePresetCollections`). The scene
 * state carries the same seven fields as the data plus `notice`, so `graphState` is checked with the same rules.
 */
export const hermitePresetCollection: PresetCollection<HermitePresetData> = Object.freeze({
    key: HERMITE_COLLECTION_KEY,
    check(data: unknown): PresetDataCheck<HermitePresetData> {
        const checked = checkFields(data);
        return isMessage(checked) ? {rejection: checked} : {data: checked};
    },
    checkGraphState(graphState: unknown): Message | undefined {
        if (!isRecord(graphState)) return message("invalid_state");
        const {notice} = graphState;
        if (notice !== undefined && notice !== '' && notice !== 'coincident') return message("invalid_value", {value0: "notice"});
        if (!FIELDS.some(field => field in graphState)) return undefined;
        const checked = checkFields({...DEFAULT_HERMITE_PRESET, ...graphState});
        return isMessage(checked) ? checked : undefined;
    },
});
