// Declaration text of the linear map graph (ADR 0066). `en` must have exactly `sl`'s keys.
const sl = {
    // The determinant formula of the panel with the graph's formatted factors: "a·d − b·c = 2·1 − (−1)·1 = 3".
    "linear_map_det_formula_value": "a·d − b·c = {value0}·{value1} − {value2}·{value3} = {value4}",
} as const;

export const linear = {
    sl,
    en: {
        "linear_map_det_formula_value": "a·d − b·c = {value0}·{value1} − {value2}·{value3} = {value4}",
    } satisfies Record<keyof typeof sl, string>,
};
