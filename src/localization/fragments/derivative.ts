// Declaration text of the derivative graph (ADR 0066): the bare names of its pucks and the legend entries.
const sl = {
    "derivative_x0_name": "Točka",
    "derivative_h_name": "Korak",
    "derivative_tangent_name": "Tangenta",
    "derivative_legend_curve": "Graf funkcije f",
    "derivative_legend_secant": "Sekanta",
    "derivative_legend_tangent": "Tangenta (mejna premica)",
    "derivative_legend_point_p": "Točka P",
    "derivative_legend_point_q": "Točka Q",
} as const;

export const derivative = {
    sl,
    en: {
        "derivative_x0_name": "Point",
        "derivative_h_name": "Step",
        "derivative_tangent_name": "Tangent",
        "derivative_legend_curve": "Graph of f",
        "derivative_legend_secant": "Secant",
        "derivative_legend_tangent": "Tangent (limit line)",
        "derivative_legend_point_p": "Point P",
        "derivative_legend_point_q": "Point Q",
    } satisfies Record<keyof typeof sl, string>,
};
