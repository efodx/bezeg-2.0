// Declaration text of the mean value graph (ADR 0066): the bare names of its bound pucks and the joins of its readout values.
const sl = {
    "mean_value_formula_label": "Funkcija",
    "mean_value_a_name": "Levo krajišče",
    "mean_value_b_name": "Desno krajišče",
    "mean_value_c_name": "Točka dotika",
    "mean_value_join_semicolon": "{value0}; {value1}",
} as const;

export const meanValue = {
    sl,
    en: {
        "mean_value_formula_label": "Function",
        "mean_value_a_name": "Left endpoint",
        "mean_value_b_name": "Right endpoint",
        "mean_value_c_name": "Tangent point",
        "mean_value_join_semicolon": "{value0}; {value1}",
    } satisfies Record<keyof typeof sl, string>,
};
