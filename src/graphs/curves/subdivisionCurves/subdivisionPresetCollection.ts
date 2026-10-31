import {message, Message} from "../../../localization";
import {isFiniteNumber, isRecord, PresetCollection, PresetDataCheck} from "../../base/presets/PresetCollection";
import {DEFAULT_SUBDIVISION_PRESET, isRound, isSubdivisionRule, SubdivisionPresetData, subdivisionRejection} from "./subdivisionModel";

export const SUBDIVISION_COLLECTION_KEY = 'interp-subdivision';

const isRow = (value: unknown): value is [number, number] =>
    Array.isArray(value) && value.length === 2 && isFiniteNumber(value[0]) && isFiniteNumber(value[1]);

/** Checks the whole data record; returns the rejection or the cleaned data. */
function checkFields(value: unknown): Message | SubdivisionPresetData {
    if (!isRecord(value)) return message("invalid_state");
    const {points, closed, rule, round, showLimit} = value;
    if (!Array.isArray(points) || !points.every(isRow)) return message("invalid_value", {value0: "points"});
    if (typeof closed !== "boolean") return message("invalid_option", {value0: "closed"});
    if (!isSubdivisionRule(rule)) return message("invalid_value", {value0: "rule"});
    if (!isRound(round)) return message("subdiv_round_invalid", {value0: 6});
    if (typeof showLimit !== "boolean") return message("invalid_option", {value0: "showLimit"});
    const data: SubdivisionPresetData = {points: points.map(p => [p[0], p[1]] as const), closed, rule, round, showLimit};
    return subdivisionRejection(data) ?? data;
}

const isMessage = (value: Message | SubdivisionPresetData): value is Message => 'key' in value;

const FIELDS = ['points', 'closed', 'rule', 'round', 'showLimit'];

/**
 * The Preset collection of the `interp-subdivision` Demonstration (not registered in `curvePresetCollections`). The scene state
 * carries the same five fields as the data plus `notice`, so `graphState` is checked with the same rules.
 */
export const subdivisionPresetCollection: PresetCollection<SubdivisionPresetData> = Object.freeze({
    key: SUBDIVISION_COLLECTION_KEY,
    check(data: unknown): PresetDataCheck<SubdivisionPresetData> {
        const checked = checkFields(data);
        return isMessage(checked) ? {rejection: checked} : {data: checked};
    },
    checkGraphState(graphState: unknown): Message | undefined {
        if (!isRecord(graphState)) return message("invalid_state");
        const {notice} = graphState;
        if (notice !== undefined && notice !== '' && notice !== 'closed-needs-three') return message("invalid_value", {value0: "notice"});
        if (!FIELDS.some(field => field in graphState)) return undefined;
        const checked = checkFields({...DEFAULT_SUBDIVISION_PRESET, ...graphState});
        return isMessage(checked) ? checked : undefined;
    },
});
