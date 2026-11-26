// Declaration text of the linear function graph (ADR 0066): the bare names of its pucks, the legend entries and the equation row.
const sl = {
    "linear_k_name": "Naklon",
    "linear_n_name": "Začetna vrednost",
    "linear_legend_line": "Premica",
    "linear_legend_triangle": "Naklonski trikotnik",
    "linear_legend_intercept": "Presečišče z osjo y",
    "linear_legend_p1": "Točka P₁",
    "linear_legend_p2": "Točka P₂",
    "linear_equation_value": "{value0}",
} as const;

export const linearFunction = {
    sl,
    en: {
        "linear_k_name": "Slope",
        "linear_n_name": "Intercept",
        "linear_legend_line": "Line",
        "linear_legend_triangle": "Slope triangle",
        "linear_legend_intercept": "Intersection with the y-axis",
        "linear_legend_p1": "Point P₁",
        "linear_legend_p2": "Point P₂",
        "linear_equation_value": "{value0}",
    } satisfies Record<keyof typeof sl, string>,
};
