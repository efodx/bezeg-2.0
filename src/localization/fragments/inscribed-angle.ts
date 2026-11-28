// Declaration text of the inscribed-angle graph (ADR 0066): the glider's name and the legend of the circle, the chord and P.
// `en` must have exactly `sl`'s keys.
const sl = {
    "inscribed_decl_glider_name": "Lega točke P",
    "inscribed_decl_legend_circle": "Krožnica skozi A, B in C",
    "inscribed_decl_legend_chord": "Tetiva AB",
    "inscribed_decl_legend_glider": "Točka P (vlečeš jo)",
} as const;

export const inscribedAngle = {
    sl,
    en: {
        "inscribed_decl_glider_name": "Position of P",
        "inscribed_decl_legend_circle": "Circle through A, B and C",
        "inscribed_decl_legend_chord": "Chord AB",
        "inscribed_decl_legend_glider": "Point P (draggable)",
    } satisfies Record<keyof typeof sl, string>,
};
