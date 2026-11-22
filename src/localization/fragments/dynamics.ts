// Declaration text of the dynamics graphs (ADR 0066), starting with the phase portrait. `en` must have exactly `sl`'s keys.
const sl = {
    "dynamics_legend_seeds": "Začetne točke (vlečeš jih)",
    "dynamics_legend_columns": "Stolpca matrike A (rombi, vlečeš ju)",
} as const;

export const dynamics = {
    sl,
    en: {
        "dynamics_legend_seeds": "Start points (draggable)",
        "dynamics_legend_columns": "Columns of the matrix A (diamonds, draggable)",
    } satisfies Record<keyof typeof sl, string>,
};
