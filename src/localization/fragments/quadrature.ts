// Declaration text of the quadrature graph (ADR 0066): bare names of the n puck and the bounds, short rule names for the rule puck and the
// function options. `en` must have exactly `sl`'s keys.
const sl = {
    "quadrature_formula_label": "Funkcija",
    "quadrature_n_name": "Podintervali",
    "quadrature_a_name": "Spodnja meja",
    "quadrature_b_name": "Zgornja meja",
    "quadrature_rule_trapezoid_short": "Trapez",
    "quadrature_rule_simpson_short": "Simpson",
    "quadrature_function_square": "f(x) = x²",
    "quadrature_function_sin": "f(x) = sin x",
    "quadrature_function_exp": "f(x) = eˣ",
} as const;

export const quadrature = {
    sl,
    en: {
        "quadrature_formula_label": "Function",
        "quadrature_n_name": "Subintervals",
        "quadrature_a_name": "Lower bound",
        "quadrature_b_name": "Upper bound",
        "quadrature_rule_trapezoid_short": "Trapezoid",
        "quadrature_rule_simpson_short": "Simpson",
        "quadrature_function_square": "f(x) = x²",
        "quadrature_function_sin": "f(x) = sin x",
        "quadrature_function_exp": "f(x) = eˣ",
    } satisfies Record<keyof typeof sl, string>,
};
