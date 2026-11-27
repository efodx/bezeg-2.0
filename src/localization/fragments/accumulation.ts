// Declaration text of the accumulation graph (ADR 0066): the bare names of its bound pucks.
const sl = {
    "accumulation_formula_label": "Funkcija",
    "accumulation_a_name": "Spodnja meja",
    "accumulation_x_name": "Točka",
} as const;

export const accumulation = {
    sl,
    en: {
        "accumulation_formula_label": "Function",
        "accumulation_a_name": "Lower bound",
        "accumulation_x_name": "Point",
    } satisfies Record<keyof typeof sl, string>,
};
