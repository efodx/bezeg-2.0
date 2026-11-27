// Declaration text of the monotone triangulation graph (ADR 0066). `en` must have exactly `sl`'s keys.
const sl = {
    "monotonetri_legend_triangles": "Trikotniki",
    "monotonetri_legend_stack": "Oglišča na skladu",
    "monotonetri_legend_chains": "Verige kosa",
    "monotonetri_legend_test": "Preizkus diagonale",
} as const;

export const monotoneTriangulation = {
    sl,
    en: {
        "monotonetri_legend_triangles": "Triangles",
        "monotonetri_legend_stack": "Vertices on the stack",
        "monotonetri_legend_chains": "Chains of the piece",
        "monotonetri_legend_test": "Diagonal test",
    } satisfies Record<keyof typeof sl, string>,
};
