// Declaration text of the Darboux graph (ADR 0066): the bare names of its bound pucks.
const sl = {
    "darboux_formula_label": "Funkcija",
    "darboux_a_name": "Levo krajišče",
    "darboux_b_name": "Desno krajišče",
    "darboux_n_name": "Število delov",
    "darboux_lower_puck": "Spodnja vsota",
    "darboux_upper_puck": "Zgornja vsota",
} as const;

export const darboux = {
    sl,
    en: {
        "darboux_formula_label": "Function",
        "darboux_a_name": "Left endpoint",
        "darboux_b_name": "Right endpoint",
        "darboux_n_name": "Number of parts",
        "darboux_lower_puck": "Lower sum",
        "darboux_upper_puck": "Upper sum",
    } satisfies Record<keyof typeof sl, string>,
};
