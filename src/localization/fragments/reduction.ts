// Declaration text of the degree-reduction graph (ADR 0066): the end-point choice puck and the legend entries of the reduced quadratic.
// `en` must have exactly `sl`'s keys.
const sl = {
    "reduction_puck_ends": "Krajišči",
    "reduction_puck_fixed": "Fiksni",
    "reduction_puck_free": "Prosti",
    "reduction_legend_quadratic": "Nižana kvadratna krivulja",
    "reduction_legend_quadratic_points": "Kontrolne točke kvadratne krivulje",
    "reduction_legend_net": "Zvišana mreža kvadratne krivulje",
} as const;

export const reduction = {
    sl,
    en: {
        "reduction_puck_ends": "Ends",
        "reduction_puck_fixed": "Fixed",
        "reduction_puck_free": "Free",
        "reduction_legend_quadratic": "Reduced quadratic",
        "reduction_legend_quadratic_points": "Control points of the quadratic",
        "reduction_legend_net": "Elevated net of the quadratic",
    } satisfies Record<keyof typeof sl, string>,
};
