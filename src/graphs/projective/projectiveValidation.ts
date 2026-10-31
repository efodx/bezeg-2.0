import {message, Message} from "../../localization";
import {isRecord} from "../base/presets/PresetCollection";

/** A grid point of a projective graph: whole numbers, one grid step per unit. */
export interface ProjectiveGridPoint {
    readonly x: number;
    readonly y: number;
}

/** The result of checking one field of imported Preset data: the value, or the localized, actionable refusal. */
export type ProjectiveCheck<D> = { readonly ok: true; readonly value: D } | { readonly ok: false; readonly rejection: Message };

export const accept = <D, >(value: D): ProjectiveCheck<D> => ({ok: true, value});
export const refuse = (rejection: Message): ProjectiveCheck<never> => ({ok: false, rejection});

/** A whole number within `[-limit, limit]`; `field` names it in the message so the file can be fixed. */
export function checkInteger(value: unknown, field: string, limit: number): ProjectiveCheck<number> {
    if (typeof value !== "number" || !Number.isInteger(value)) return refuse(message("projective_invalid_non_integer", {value0: field}));
    if (Math.abs(value) > limit) return refuse(message("projective_invalid_out_of_range", {value0: field, value1: limit}));
    return accept(value);
}

/** An object `{x, y}` of whole numbers within the limit. */
export function checkGridPoint(value: unknown, field: string, limit: number): ProjectiveCheck<ProjectiveGridPoint> {
    if (!isRecord(value)) return refuse(message("projective_invalid_field_missing", {value0: field}));
    const x = checkInteger(value.x, `${field}.x`, limit);
    if (!x.ok) return x;
    const y = checkInteger(value.y, `${field}.y`, limit);
    if (!y.ok) return y;
    return accept({x: x.value, y: y.value});
}

/** A list of exactly `length` items, each checked by `item`. */
export function checkTuple<D>(value: unknown, field: string, length: number,
                              item: (entry: unknown, name: string) => ProjectiveCheck<D>): ProjectiveCheck<D[]> {
    if (!Array.isArray(value) || value.length !== length) return refuse(message("projective_invalid_field_missing", {value0: field}));
    const out: D[] = [];
    for (let i = 0; i < length; i++) {
        const checked = item(value[i], `${field}[${i}]`);
        if (!checked.ok) return checked;
        out.push(checked.value);
    }
    return accept(out);
}
