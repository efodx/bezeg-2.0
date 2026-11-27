// Declaration text of the extrema graph (ADR 0066): the bare names of its bound pucks and the joins of its readout values.
const sl = {
    "extrema_formula_label": "Funkcija",
    "extrema_a_name": "Levo krajišče",
    "extrema_b_name": "Desno krajišče",
    "extrema_join_comma": "{value0}, {value1}",
    "extrema_join_semicolon": "{value0}; {value1}",
} as const;

export const extrema = {
    sl,
    en: {
        "extrema_formula_label": "Function",
        "extrema_a_name": "Left endpoint",
        "extrema_b_name": "Right endpoint",
        "extrema_join_comma": "{value0}, {value1}",
        "extrema_join_semicolon": "{value0}; {value1}",
    } satisfies Record<keyof typeof sl, string>,
};
