// Declaration text of the blossom graph (ADR 0066): the legend entry of its interpolation triangle. `en` must have exactly `sl`'s keys.
const sl = {
    "bsl_legend_triangle": "Trikotnik interpolacij f(a, b)",
} as const;

export const bsplineBlossom = {
    sl,
    en: {
        "bsl_legend_triangle": "Interpolation triangle f(a, b)",
    } satisfies Record<keyof typeof sl, string>,
};
