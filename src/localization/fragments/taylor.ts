// Declaration text of the Taylor graph (ADR 0066). `en` must have exactly `sl`'s keys.
const sl = {
    "taylor_formula_label": "Funkcija",
    "taylor_example_exp": "f(x) = eˣ",
    "taylor_example_sine": "f(x) = sin x",
    "taylor_example_geometric": "f(x) = 1/(1 − x)",
    "taylor_example_flat": "f(x) = e^(−1/x) za x > 0, 0 sicer",
    "taylor_legend_center": "Središče c: točka na osi x",
    "taylor_legend_x": "Točka x: točka na osi x",
    "taylor_center_name": "Središče",
    "taylor_x_name": "Točka",
    "taylor_degree_name": "Stopnja",
    "taylor_polynomial_name": "Polinom",
    "taylor_function_name": "Funkcija",
} as const;

export const taylor = {
    sl,
    en: {
        "taylor_formula_label": "Function",
        "taylor_example_exp": "f(x) = eˣ",
        "taylor_example_sine": "f(x) = sin x",
        "taylor_example_geometric": "f(x) = 1/(1 − x)",
        "taylor_example_flat": "f(x) = e^(−1/x) for x > 0, 0 otherwise",
        "taylor_legend_center": "Center c: point on the x-axis",
        "taylor_legend_x": "Point x: point on the x-axis",
        "taylor_center_name": "Center",
        "taylor_x_name": "Point",
        "taylor_degree_name": "Degree",
        "taylor_polynomial_name": "Polynomial",
        "taylor_function_name": "Function",
    } satisfies Record<keyof typeof sl, string>,
};
