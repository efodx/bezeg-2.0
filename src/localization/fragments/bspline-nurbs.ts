// Declaration text of the NURBS circle graph (ADR 0066): the legend entry of the marked point C(t) and the parameter t. `en` must have exactly `sl`'s keys.
const sl = {
    "bsn_legend_marker": "Točka C(t)",
    "bsn_param_name": "Parameter",
    "bsn_t_not_finite": "Parameter mora biti končno število.",
} as const;

export const bsplineNurbs = {
    sl,
    en: {
        "bsn_legend_marker": "Point C(t)",
        "bsn_param_name": "Parameter",
        "bsn_t_not_finite": "The parameter must be a finite number.",
    } satisfies Record<keyof typeof sl, string>,
};
