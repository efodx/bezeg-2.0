// Declaration text of the uniform convergence graph (ADR 0066): the formula label and the bare names of its bound pucks.
const sl = {
    "uniform_formula_label": "Funkcija",
    "uniform_r_name": "Konec območja",
    "uniform_x_name": "Točka",
    "uniform_epsilon_name": "Toleranca",
} as const;

export const uniformConvergence = {
    sl,
    en: {
        "uniform_formula_label": "Function",
        "uniform_r_name": "Domain end",
        "uniform_x_name": "Point",
        "uniform_epsilon_name": "Tolerance",
    } satisfies Record<keyof typeof sl, string>,
};
