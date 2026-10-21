import {message, Message} from "../../../localization";

/** One Preset's data after its collection checked it: the data to import, or the localized reason it was rejected. */
export type PresetDataCheck<D> = { readonly data: D } | { readonly rejection: Message };

/**
 * The static definition of one Demonstration's browser-local Preset collection. It needs no graph or board, so the
 * file importer checks a file with the same definition the graph uses when it loads a stored Preset.
 */
export interface PresetCollection<D> {
    /** Frozen storage and file contract: the collection is stored and exported under `preset-<key>`. */
    readonly key: string;
    /** Checks one Preset's `data` (present, not null). */
    check(data: unknown): PresetDataCheck<D>;
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === "object" && !Array.isArray(value);

export const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export const isIntegerAtLeast = (value: unknown, min: number): value is number =>
    typeof value === "number" && Number.isInteger(value) && value >= min;

const BOOLEAN_OPTION = /^(show|is|allow|hide|labelAll|curveSelected|initialized)/;
const NUMERIC_PARAMETER = /^(subdivisionT|decasteljauT|extrapolationT|d|offsetCurveNumber|selectedCurveOption|n|degree|continuity|numberOfPoints|alpha|t|v)$/;

/**
 * Scene state stored beside Preset data, as a Preset's `graphState` or a curve DTO's `state`: a flat record of finite
 * numbers, booleans and strings whose shared field names keep their meaning in every collection (display switches are
 * booleans; editing mode, degree, offset and point counts are in range). Returns the reason for a rejection.
 * `allowed` lists extra fields a collection stores with another shape; their own check belongs to that collection.
 */
export function checkSceneState(value: unknown, allowed: readonly string[] = []): Message | undefined {
    if (!isRecord(value)) return message("invalid_state");
    for (const [key, item] of Object.entries(value)) {
        if (allowed.includes(key)) continue;
        if (typeof item === "number" && !Number.isFinite(item)) return message("invalid_number", {value0: key});
        if (BOOLEAN_OPTION.test(key) && typeof item !== "boolean") return message("invalid_option", {value0: key});
        if (typeof item !== "number" && typeof item !== "boolean" && typeof item !== "string") return message("invalid_value", {value0: key});
        if (NUMERIC_PARAMETER.test(key) && !isFiniteNumber(item)) return message("invalid_parameter", {value0: key});
    }
    const {offsetCurveNumber, selectedCurveOption, n, numberOfPoints} = value;
    if (offsetCurveNumber !== undefined && !isIntegerAtLeast(offsetCurveNumber, 1)) return message("invalid_number_of_offsets");
    if (selectedCurveOption !== undefined && ![0, 1, 2].some(option => option === selectedCurveOption)) return message("invalid_editing_mode");
    if (n !== undefined && !isIntegerAtLeast(n, 1)) return message("invalid_polynomial_degree");
    if (numberOfPoints !== undefined && !isIntegerAtLeast(numberOfPoints, 0)) return message("invalid_number_of_points");
    return undefined;
}
