// Declaration text of the B-spline basis graph (ADR 0066): the bare names of the puck controls (the symbols t and k are typeset next to them),
// the short name of the clamped switch, the legend and row name N_{i,k} and the name of the sum row. `en` must have exactly `sl`'s keys.
const sl = {
    "bsbd_param_name": "Parameter",
    "bsbd_degree_name": "Stopnja",
    "bsbd_clamped_short": "Pritrjen vektor",
    "bsbd_t_not_finite": "Parameter mora biti končno število.",
    "bsbd_legend_fn": "N{value0},{value1}",
    "bsbd_sum_name": "Vsota",
} as const;

export const bsplineBasis = {
    sl,
    en: {
        "bsbd_param_name": "Parameter",
        "bsbd_degree_name": "Degree",
        "bsbd_clamped_short": "Clamped vector",
        "bsbd_t_not_finite": "The parameter must be a finite number.",
        "bsbd_legend_fn": "N{value0},{value1}",
        "bsbd_sum_name": "Sum",
    } satisfies Record<keyof typeof sl, string>,
};
