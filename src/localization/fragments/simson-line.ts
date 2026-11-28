// Declaration text of the Simson line graph (ADR 0066): the names of the two glider pucks and the legend of P and the feet.
// `en` must have exactly `sl`'s keys.
const sl = {
    "simson_decl_t_name": "Lega točke P",
    "simson_decl_epsilon_name": "Odmik od krožnice",
    "simson_decl_legend_p": "Točka P (vlečeš jo)",
    "simson_decl_legend_pprime": "Točka P′ (vlečeš jo)",
    "simson_decl_legend_feet": "Nožišča D, E, F",
} as const;

export const simsonLine = {
    sl,
    en: {
        "simson_decl_t_name": "Position of P",
        "simson_decl_epsilon_name": "Offset from the circle",
        "simson_decl_legend_p": "Point P (draggable)",
        "simson_decl_legend_pprime": "Point P′ (draggable)",
        "simson_decl_legend_feet": "Feet D, E, F",
    } satisfies Record<keyof typeof sl, string>,
};
