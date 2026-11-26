// Declaration text of the area-between-curves graph (ADR 0066): the bare names of its pucks, the short mode labels, the integral rows and the legend entries.
const sl = {
    "area_a_name": "Prva meja",
    "area_b_name": "Druga meja",
    "area_mode_short_under_f": "Pod f",
    "area_mode_short_under_g": "Pod g",
    "area_mode_short_between": "Med f in g",
    "area_int_f": "∫ f(x) dx",
    "area_int_g": "∫ g(x) dx",
    "area_legend_f": "f(x) = (x − 2)²",
    "area_legend_g": "g(x) = 3 − (x − 2)²",
} as const;

export const areaBetweenCurves = {
    sl,
    en: {
        "area_a_name": "First bound",
        "area_b_name": "Second bound",
        "area_mode_short_under_f": "Under f",
        "area_mode_short_under_g": "Under g",
        "area_mode_short_between": "Between",
        "area_int_f": "∫ f(x) dx",
        "area_int_g": "∫ g(x) dx",
        "area_legend_f": "f(x) = (x − 2)²",
        "area_legend_g": "g(x) = 3 − (x − 2)²",
    } satisfies Record<keyof typeof sl, string>,
};
