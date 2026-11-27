// Declaration text of the Lagrange versus Bezier graph (ADR 0066): the bare name of the position puck, the short names of the two parameter
// rules (also used by the Hermite graph), the legend of the drawn objects and the reasons a refused write carries. `en` must have exactly `sl`'s keys.
const sl = {
    "interp_lagrange_position_name": "Položaj",
    "interp_rule_uniform_short": "Enakomerni",
    "interp_rule_chord_short": "Tetive",
    "interp_legend_points": "Interpolacijske točke",
    "interp_lagrange_legend_lagrange": "Lagrangeeva krivulja",
    "interp_lagrange_legend_bezier": "Bézierova krivulja z istimi točkami",
    "interp_lagrange_position_invalid": "Položaj mora biti število od 0 do 1.",
    "interp_rule_invalid": "Parametri točk so lahko enakomerni ali po dolžini tetiv.",
} as const;

export const interpLagrange = {
    sl,
    en: {
        "interp_lagrange_position_name": "Position",
        "interp_rule_uniform_short": "Uniform",
        "interp_rule_chord_short": "Chord",
        "interp_legend_points": "Interpolation points",
        "interp_lagrange_legend_lagrange": "Lagrange curve",
        "interp_lagrange_legend_bezier": "Bézier curve on the same points",
        "interp_lagrange_position_invalid": "The position must be a number from 0 to 1.",
        "interp_rule_invalid": "The point parameters can be uniform or by chord length.",
    } satisfies Record<keyof typeof sl, string>,
};
