// Declaration text of the root-finding graph (ADR 0066): bare names for the start pucks, the method puck's segments and the example options.
// `en` must have exactly `sl`'s keys.
const sl = {
    "root_finding_formula_label": "Funkcija",
    "root_finding_x0_name": "Začetek",
    "root_finding_x1_name": "Drugi začetek",
    "root_finding_method_short_newton": "Newton",
    "root_finding_method_short_secant": "Sekanta",
    "root_finding_example_square_minus_two": "f(x) = x² − 2",
    "root_finding_example_cubic_two_cycle": "f(x) = x³ − 2x + 2",
    "root_finding_example_cubic_three_roots": "f(x) = x³ − x",
} as const;

export const rootFinding = {
    sl,
    en: {
        "root_finding_formula_label": "Function",
        "root_finding_x0_name": "Start",
        "root_finding_x1_name": "Second start",
        "root_finding_method_short_newton": "Newton",
        "root_finding_method_short_secant": "Secant",
        "root_finding_example_square_minus_two": "f(x) = x² − 2",
        "root_finding_example_cubic_two_cycle": "f(x) = x³ − 2x + 2",
        "root_finding_example_cubic_three_roots": "f(x) = x³ − x",
    } satisfies Record<keyof typeof sl, string>,
};
