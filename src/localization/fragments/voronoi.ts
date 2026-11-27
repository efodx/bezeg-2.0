// Declaration text of the Voronoi graph (ADR 0066). `en` must have exactly `sl`'s keys.
const sl = {
    "vor_puck_diagram": "Diagram",
    "vor_puck_duality": "Dualnost",
    "vor_legend_bisector": "Simetrale izbrane celice",
} as const;

export const voronoi = {
    sl,
    en: {
        "vor_puck_diagram": "Diagram",
        "vor_puck_duality": "Duality",
        "vor_legend_bisector": "Bisectors of the chosen cell",
    } satisfies Record<keyof typeof sl, string>,
};
