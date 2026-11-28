// Declaration text of the advanced patch graphs patch-subdivision, patch-joins and patch-triangular (ADR 0066). `en` must have exactly `sl`'s keys.
const sl = {
    "patch_split_puck": "Mesto delitve",
    "patch_pieces_legend_left": "Mreža dela S_L",
    "patch_pieces_legend_right": "Mreža dela S_R",
    "patch_pieces_legend_split": "Krivulja reza",
    "patch_pieces_legend_ghost": "Mreža pred višanjem",
    "patch_join_mode_short_none": "Brez",
    "patch_join_mode_short_c0": "C0",
    "patch_join_mode_short_c1": "C1",
    "patch_join_mode_short_g1": "G1",
    "patch_join_legend_net_a": "Mreža krpe A",
    "patch_join_legend_net_b": "Mreža krpe B",
    "patch_join_legend_seam": "Skupni rob",
    "patch_join_legend_arrow_a": "S_u krpe A",
    "patch_join_legend_arrow_b": "S_u krpe B",
} as const;

export const patchAdvanced = {
    sl,
    en: {
        "patch_split_puck": "Split at",
        "patch_pieces_legend_left": "Net of piece S_L",
        "patch_pieces_legend_right": "Net of piece S_R",
        "patch_pieces_legend_split": "Split curve",
        "patch_pieces_legend_ghost": "Net before elevation",
        "patch_join_mode_short_none": "None",
        "patch_join_mode_short_c0": "C0",
        "patch_join_mode_short_c1": "C1",
        "patch_join_mode_short_g1": "G1",
        "patch_join_legend_net_a": "Net of patch A",
        "patch_join_legend_net_b": "Net of patch B",
        "patch_join_legend_seam": "Shared boundary",
        "patch_join_legend_arrow_a": "S_u of patch A",
        "patch_join_legend_arrow_b": "S_u of patch B",
    } satisfies Record<keyof typeof sl, string>,
};
