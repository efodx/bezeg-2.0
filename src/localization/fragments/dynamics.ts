// Declaration text of the dynamics graphs (ADR 0066), starting with the phase portrait. `en` must have exactly `sl`'s keys.
const sl = {
    "dynamics_legend_seeds": "Začetne točke (vlečeš jih)",
    "dynamics_legend_columns": "Stolpca matrike A (rombi, vlečeš ju)",
    "dynamics_matrix_a_name": "Zgoraj levo",
    "dynamics_matrix_b_name": "Zgoraj desno",
    "dynamics_matrix_c_name": "Spodaj levo",
    "dynamics_matrix_d_name": "Spodaj desno",
    "dynamics_time_name": "Čas",
} as const;

export const dynamics = {
    sl,
    en: {
        "dynamics_legend_seeds": "Start points (draggable)",
        "dynamics_legend_columns": "Columns of the matrix A (diamonds, draggable)",
        "dynamics_matrix_a_name": "Top left",
        "dynamics_matrix_b_name": "Top right",
        "dynamics_matrix_c_name": "Bottom left",
        "dynamics_matrix_d_name": "Bottom right",
        "dynamics_time_name": "Time",
    } satisfies Record<keyof typeof sl, string>,
};
