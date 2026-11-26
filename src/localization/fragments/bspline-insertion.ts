// Declaration text of the knot insertion graph (ADR 0066): the comb switch puck (at most 16 characters) and the legend entry of the
// faded polygon before the last insertion. `en` must have exactly `sl`'s keys.
const sl = {
    "bsi_puck_comb": "Glavnik",
    "bsi_legend_ghost": "Prejšnji poligon",
} as const;

export const bsplineInsertion = {
    sl,
    en: {
        "bsi_puck_comb": "Comb",
        "bsi_legend_ghost": "Previous polygon",
    } satisfies Record<keyof typeof sl, string>,
};
