// Declaration text of the subdivision graph (ADR 0066): the short names of the two rules (the rule puck), the legend of the drawn objects and
// the reason a refused rule write carries. `en` must have exactly `sl`'s keys.
const sl = {
    "subdiv_rule_chaikin_short": "Chaikin",
    "subdiv_rule_four_point_short": "Štiritočkovno",
    "subdiv_rule_invalid": "Pravilo je lahko Chaikinovo ali štiritočkovno.",
    "subdiv_legend_polygon": "Začetni poligon",
    "subdiv_legend_stage": "Poligon prikazanega koraka",
    "subdiv_legend_limit": "Limitna krivulja (kvadratni B-zlepek)",
} as const;

export const interpSubdivision = {
    sl,
    en: {
        "subdiv_rule_chaikin_short": "Chaikin",
        "subdiv_rule_four_point_short": "Four-point",
        "subdiv_rule_invalid": "The rule can be the Chaikin or the four-point rule.",
        "subdiv_legend_polygon": "Starting polygon",
        "subdiv_legend_stage": "Polygon of the shown step",
        "subdiv_legend_limit": "Limit curve (quadratic B-spline)",
    } satisfies Record<keyof typeof sl, string>,
};
