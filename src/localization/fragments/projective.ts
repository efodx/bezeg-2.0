// Declaration text of the projective-family graphs (ADR 0066), starting with the cross-ratio legend. `en` must have exactly `sl`'s keys.
const sl = {
    "projective_k1_legend_line_p": "Prva premica p",
    "projective_k1_legend_line_q": "Druga premica p′",
    "projective_k1_legend_originals": "Izvirne točke A–D (vlečeš jih po premici)",
    "projective_k1_legend_centre": "Središče O (vlečeš ga)",
    "projective_k1_legend_line_points": "Točki M in N, ki določata drugo premico (vlečeš ju)",
    "projective_k1_legend_images": "Slike A′–D′",
    "projective_k1_legend_rays": "Žarki iz središča",
} as const;

export const projective = {
    sl,
    en: {
        "projective_k1_legend_line_p": "First line p",
        "projective_k1_legend_line_q": "Second line p′",
        "projective_k1_legend_originals": "Original points A–D (drag along the line)",
        "projective_k1_legend_centre": "Centre O (draggable)",
        "projective_k1_legend_line_points": "Points M and N that fix the second line (draggable)",
        "projective_k1_legend_images": "Images A′–D′",
        "projective_k1_legend_rays": "Rays from the centre",
    } satisfies Record<keyof typeof sl, string>,
};
