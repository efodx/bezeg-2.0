// Declaration text of the epicycle graph (ADR 0066): the names of its two pucks and of the readout rows. Everything else reuses the `epicycle_*` keys of the main catalog.
const sl = {
    "epicycles_n_name": "Podrobnost sledi",
    "epicycles_param_equal_short": "Enakomerna",
    "epicycles_param_chord_short": "Po tetivah",
    "epicycles_row_centre": "Središče",
    "epicycles_row_circle": "{value0}. krog",
} as const;

export const epicycles = {
    sl,
    en: {
        "epicycles_n_name": "Trace detail",
        "epicycles_param_equal_short": "Equal",
        "epicycles_param_chord_short": "By chords",
        "epicycles_row_centre": "Centre",
        "epicycles_row_circle": "Circle {value0}",
    } satisfies Record<keyof typeof sl, string>,
};
