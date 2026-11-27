// Declaration text of the definite-integral graph (ADR 0066): the bare names of its pucks, the short method labels and the legend entries.
const sl = {
    "integral_formula_label": "Funkcija",
    "integral_n_name": "Podintervali",
    "integral_a_name": "Prva meja",
    "integral_b_name": "Druga meja",
    "integral_method_name": "Vrsta vsote",
    "integral_method_short_left": "Leva",
    "integral_method_short_right": "Desna",
    "integral_method_short_midpoint": "Sredinska",
    "integral_method_short_trapezoid": "Trapezna",
    "integral_legend_curve": "Graf funkcije f",
    "integral_legend_point_a": "Meja a",
    "integral_legend_point_b": "Meja b",
} as const;

export const definiteIntegral = {
    sl,
    en: {
        "integral_formula_label": "Function",
        "integral_n_name": "Subintervals",
        "integral_a_name": "First bound",
        "integral_b_name": "Second bound",
        "integral_method_name": "Sum type",
        "integral_method_short_left": "Left",
        "integral_method_short_right": "Right",
        "integral_method_short_midpoint": "Midpoint",
        "integral_method_short_trapezoid": "Trapezoid",
        "integral_legend_curve": "Graph of f",
        "integral_legend_point_a": "Bound a",
        "integral_legend_point_b": "Bound b",
    } satisfies Record<keyof typeof sl, string>,
};
