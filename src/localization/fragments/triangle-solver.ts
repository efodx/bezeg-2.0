// Declaration text of the triangle graph (ADR 0066): the lists of solved sides and angles (letters need a template, a formatted value may hold none),
// short option names for the mode and data-type pucks, and the refusal of an unknown option. `en` must have exactly `sl`'s keys.
const sl = {
    "trisolve_sides_list": "a {value0}; b {value1}; c {value2}",
    "trisolve_angles_list": "A {value0}; B {value1}; C {value2}",
    "trisolve_mode_sides_short": "Stranice",
    "trisolve_mode_circle_short": "Krožnica",
    "trisolve_mode_solve_short": "Reševanje",
    "trisolve_data_sss_short": "SSS",
    "trisolve_data_sas_short": "SKS",
    "trisolve_data_asa_short": "KSK",
    "trisolve_data_ssa_short": "SSK",
    "trisolve_choice_rejected": "Izbira «{value0}» ni med možnostmi.",
} as const;

export const triangleSolver = {
    sl,
    en: {
        "trisolve_sides_list": "a {value0}, b {value1}, c {value2}",
        "trisolve_angles_list": "A {value0}, B {value1}, C {value2}",
        "trisolve_mode_sides_short": "Sides",
        "trisolve_mode_circle_short": "Circle",
        "trisolve_mode_solve_short": "Solve",
        "trisolve_data_sss_short": "SSS",
        "trisolve_data_sas_short": "SAS",
        "trisolve_data_asa_short": "ASA",
        "trisolve_data_ssa_short": "SSA",
        "trisolve_choice_rejected": "The choice \"{value0}\" is not one of the options.",
    } satisfies Record<keyof typeof sl, string>,
};
