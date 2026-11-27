// Declaration text of the Hermite and Catmull-Rom graph (ADR 0066): the short names of the two curve types (the mode puck), the legend of the
// drawn objects and the reasons a refused write carries. `en` must have exactly `sl`'s keys.
const sl = {
    "interp_hermite_mode_catmull_short": "Catmull-Rom",
    "interp_hermite_mode_hermite_short": "Hermite",
    "interp_hermite_legend_tangents": "Tangente v točkah",
    "interp_hermite_legend_bezier": "Bézierove kontrolne točke odsekov",
    "interp_hermite_mode_invalid": "Vrsta krivulje je lahko Catmull-Romov zlepek ali Hermiteova krivulja.",
    "interp_hermite_tension_invalid": "Napetost mora biti število od 0 do 2.",
    "interp_hermite_tension_hermite": "Napetost deluje samo pri Catmull-Romovem zlepku.",
} as const;

export const interpHermite = {
    sl,
    en: {
        "interp_hermite_mode_catmull_short": "Catmull-Rom",
        "interp_hermite_mode_hermite_short": "Hermite",
        "interp_hermite_legend_tangents": "Tangents at the points",
        "interp_hermite_legend_bezier": "Bézier control points of the segments",
        "interp_hermite_mode_invalid": "The curve type can be the Catmull-Rom spline or the Hermite curve.",
        "interp_hermite_tension_invalid": "The tension must be a number from 0 to 2.",
        "interp_hermite_tension_hermite": "The tension only works for the Catmull-Rom spline.",
    } satisfies Record<keyof typeof sl, string>,
};
