// Declaration text of the projective-pole-polar graph (ADR 0066): the legend and the status sentence joined with its note.
// `en` must have exactly `sl`'s keys.
const sl = {
    "projective_pole_polar_join": "{value0} {value1}",
    "projective_pole_polar_legend_conic": "Stožnica",
    "projective_pole_polar_legend_polar": "Polara p točke P",
    "projective_pole_polar_legend_tangents": "Tangenti t₁, t₂ iz točke P",
    "projective_pole_polar_legend_tangency": "Dotikališči T₁, T₂",
    "projective_pole_polar_legend_centre": "Središče S stožnice",
    "projective_pole_polar_legend_point": "Točka P (vlečeš jo)",
    "projective_pole_polar_legend_infinity": "Smer točke P v neskončnosti",
} as const;

export const projectivePolePolar = {
    sl,
    en: {
        "projective_pole_polar_join": "{value0} {value1}",
        "projective_pole_polar_legend_conic": "Conic",
        "projective_pole_polar_legend_polar": "Polar p of the point P",
        "projective_pole_polar_legend_tangents": "Tangents t₁, t₂ from the point P",
        "projective_pole_polar_legend_tangency": "Points of tangency T₁, T₂",
        "projective_pole_polar_legend_centre": "Centre S of the conic",
        "projective_pole_polar_legend_point": "Point P (draggable)",
        "projective_pole_polar_legend_infinity": "Direction of the point P at infinity",
    } satisfies Record<keyof typeof sl, string>,
};
