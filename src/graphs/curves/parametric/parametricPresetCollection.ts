import {message, Message} from "../../../localization";
import {checkSceneState, isFiniteNumber, isRecord, PresetCollection, PresetDataCheck} from "../../base/presets/PresetCollection";
import {
    CYCLOID_RADIUS_DEFAULT, CYCLOID_RADIUS_MAX, CYCLOID_RADIUS_MIN, isParametricCurveId, PARAMETRIC_CATALOGUE, ParametricCurveId,
} from "./parametricCatalogue";

/** Preset data of the parametric Demonstration: the catalogue choice, its rolling radius and the parameter shown. */
export interface ParametricPresetData {
    readonly curve: ParametricCurveId;
    readonly radius: number;
    readonly parameter: number;
}

export const PARAMETRIC_COLLECTION_KEY = 'curve-parametric';

const checkFields = (value: unknown): Message | undefined => {
    if (!isRecord(value)) return message("invalid_state");
    const {curve, radius, parameter} = value;
    if (!isParametricCurveId(curve)) return message("invalid_value", {value0: "curve"});
    if (!isFiniteNumber(radius) || radius < CYCLOID_RADIUS_MIN || radius > CYCLOID_RADIUS_MAX) return message("invalid_parameter", {value0: "radius"});
    const [t0, t1] = PARAMETRIC_CATALOGUE[curve].domain;
    if (!isFiniteNumber(parameter) || parameter < t0 || parameter > t1) return message("invalid_parameter", {value0: "parameter"});
    return undefined;
};

export const DEFAULT_PARAMETRIC_PRESET: ParametricPresetData = {curve: 'cycloid', radius: CYCLOID_RADIUS_DEFAULT, parameter: Math.PI / 2};

/**
 * The Preset collection of the `curve-parametric` Demonstration (not yet registered in `curvePresetCollections`; the
 * registration slice adds it). The scene state (`graphState`) carries the same three fields as the data, so both are checked.
 */
export const parametricPresetCollection: PresetCollection<ParametricPresetData> = Object.freeze({
    key: PARAMETRIC_COLLECTION_KEY,
    check(data: unknown): PresetDataCheck<ParametricPresetData> {
        const rejection = checkFields(data);
        if (rejection) return {rejection};
        const {curve, radius, parameter} = data as ParametricPresetData;
        return {data: {curve, radius, parameter}};
    },
    checkGraphState(graphState: unknown): Message | undefined {
        const invalid = checkSceneState(graphState);
        if (invalid) return invalid;
        return graphState !== undefined && isRecord(graphState) && ('curve' in graphState || 'radius' in graphState || 'parameter' in graphState)
            ? checkFields({...DEFAULT_PARAMETRIC_PRESET, ...graphState}) : undefined;
    },
});
