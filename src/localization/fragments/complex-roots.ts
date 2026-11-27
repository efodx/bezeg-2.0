// Declaration text of the roots graph (ADR 0066): the bare name of the degree puck (the symbol n is typeset next to it), the three switch pucks (at most 16
// characters), the legend of what the board draws and the texts that named the old buttons. `en` must have exactly `sl`'s keys.
const sl = {
    "complex_roots_degree_name": "Stopnja",
    "complex_roots_puck_roots": "Koreni",
    "complex_roots_puck_polygon": "N-kotnik",
    "complex_roots_puck_test": "Točka z",
    "complex_roots_key_w": "Število w",
    "complex_roots_key_roots": "Koreni z_k: krogi z indeksi",
    "complex_roots_key_polygon": "Krožnica in n-kotnik",
    "complex_roots_key_test": "Preizkusna točka z",
    "complex_roots_test_hidden_puck_help": "Točka z je zdaj skrita; pokaže jo krmilnik Točka z.",
    "complex_roots_status_predict_puck": "Koreni so skriti. Napovej, kje ležijo rešitve enačbe z^n = w; šele nato vklopi krmilnik Koreni.",
} as const;

export const complexRoots = {
    sl,
    en: {
        "complex_roots_degree_name": "Degree",
        "complex_roots_puck_roots": "Roots",
        "complex_roots_puck_polygon": "N-gon",
        "complex_roots_puck_test": "Point z",
        "complex_roots_key_w": "Number w",
        "complex_roots_key_roots": "Roots z_k: circles with indices",
        "complex_roots_key_polygon": "Circle and n-gon",
        "complex_roots_key_test": "Test point z",
        "complex_roots_test_hidden_puck_help": "The point z is hidden now; the control Point z shows it.",
        "complex_roots_status_predict_puck": "The roots are hidden. Predict where the solutions of z^n = w lie; only then turn on the control Roots.",
    } satisfies Record<keyof typeof sl, string>,
};
