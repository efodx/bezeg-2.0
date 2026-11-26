// Declaration text of the continuity graph (ADR 0066): the bare name of the parameter puck and the legend entries.
const sl = {
    "continuity_param_name": "Parameter",
    "continuity_legend_curve": "Graf f (dva dela)",
    "continuity_legend_value": "Vrednost f(1) in leva limita",
    "continuity_legend_right": "Desna limita",
} as const;

export const continuity = {
    sl,
    en: {
        "continuity_param_name": "Parameter",
        "continuity_legend_curve": "Graph of f (two pieces)",
        "continuity_legend_value": "Value f(1) and left limit",
        "continuity_legend_right": "Right limit",
    } satisfies Record<keyof typeof sl, string>,
};
