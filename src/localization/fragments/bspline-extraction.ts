// Declaration text of the Bezier extraction graph (ADR 0066): a piece sentence that is one message (the old panel joined "row" and
// "(changed)"), and the legend entry of one Bezier piece. `en` must have exactly `sl`'s keys.
const sl = {
    "bse_piece_row_changed": "Odsek {value0}: u ∈ [{value1}, {value2}], točke {value3} (spremenjen)",
    "bse_legend_piece": "Odsek {value0}",
} as const;

export const bsplineExtraction = {
    sl,
    en: {
        "bse_piece_row_changed": "Piece {value0}: u ∈ [{value1}, {value2}], points {value3} (changed)",
        "bse_legend_piece": "Piece {value0}",
    } satisfies Record<keyof typeof sl, string>,
};
