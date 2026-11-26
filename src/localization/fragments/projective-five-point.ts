// Declaration text of the projective-five-point graph (ADR 0066): the legend, a coordinate pair and the status joined with the stale note.
// `en` must have exactly `sl`'s keys.
const sl = {
    "projective_five_point_pair": "({value0}, {value1})",
    "projective_five_point_status_stale": "{value0} {value1}",
    "projective_five_point_legend_conic": "Stožnica skozi pet točk",
    "projective_five_point_legend_line_pair": "Par premic (tri točke na premici)",
    "projective_five_point_legend_arc": "Lok kot racionalna Bézierova krivulja",
    "projective_five_point_legend_continuation": "Nadaljevanje loka za t zunaj [0, 1]",
    "projective_five_point_legend_polygon": "Kontrolni poligon P₀P₁P₂",
    "projective_five_point_legend_tangents": "Tangenti v krajiščih loka",
    "projective_five_point_legend_points": "Točke A–E (vlečeš jih)",
} as const;

export const projectiveFivePoint = {
    sl,
    en: {
        "projective_five_point_pair": "({value0}, {value1})",
        "projective_five_point_status_stale": "{value0} {value1}",
        "projective_five_point_legend_conic": "Conic through the five points",
        "projective_five_point_legend_line_pair": "Line pair (three points on a line)",
        "projective_five_point_legend_arc": "Arc as a rational Bézier curve",
        "projective_five_point_legend_continuation": "Continuation of the arc for t outside [0, 1]",
        "projective_five_point_legend_polygon": "Control polygon P₀P₁P₂",
        "projective_five_point_legend_tangents": "End tangents of the arc",
        "projective_five_point_legend_points": "Points A–E (draggable)",
    } satisfies Record<keyof typeof sl, string>,
};
