// Declaration text of the de Boor graph (ADR 0066): the bare name of the parameter puck (the symbol t is typeset next to it), its refusal,
// and the legend entries of the construction. `en` must have exactly `sl`'s keys.
const sl = {
    "bsd_param_name": "Parameter",
    "bsd_t_not_finite": "Parameter mora biti končno število.",
    "bsd_legend_active": "Aktivne točke",
    "bsd_legend_levels": "Vmesne točke postopka",
    "bsd_legend_point": "Točka krivulje C(t)",
} as const;

export const bsplineDeBoor = {
    sl,
    en: {
        "bsd_param_name": "Parameter",
        "bsd_t_not_finite": "The parameter must be a finite number.",
        "bsd_legend_active": "Active points",
        "bsd_legend_levels": "Intermediate points of the algorithm",
        "bsd_legend_point": "Curve point C(t)",
    } satisfies Record<keyof typeof sl, string>,
};
