// Declaration text of the projective-three-views graph (ADR 0066): the legend and the two clipped sentences joined into one note.
// `en` must have exactly `sl`'s keys.
const sl = {
    "projective_three_views_clipped_both": "{value0} {value1}",
    "projective_three_views_legend_circle": "Enotska krožnica",
    "projective_three_views_legend_line": "Premica L: y = c",
    "projective_three_views_legend_image": "Slika krožnice",
    "projective_three_views_legend_directions": "Smeri v neskončnosti",
    "projective_three_views_legend_points": "Točki P in P′",
} as const;

export const projectiveThreeViews = {
    sl,
    en: {
        "projective_three_views_clipped_both": "{value0} {value1}",
        "projective_three_views_legend_circle": "Unit circle",
        "projective_three_views_legend_line": "Line L: y = c",
        "projective_three_views_legend_image": "Image of the circle",
        "projective_three_views_legend_directions": "Directions at infinity",
        "projective_three_views_legend_points": "Points P and P′",
    } satisfies Record<keyof typeof sl, string>,
};
