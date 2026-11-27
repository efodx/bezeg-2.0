// Declaration text of the fixed-point graph (ADR 0066): the bare names of its bound pucks and the join of its status sentences.
const sl = {
    "fixed_point_formula_label": "Funkcija",
    "fixed_point_x0_name": "Začetek",
    "fixed_point_x0_help": "Začetek iteracije x₀: večkratnik števila 0,01 na intervalu preslikave. Sprememba vrne iteracijo na korak 0.",
    "fixed_point_join_space": "{value0} {value1}",
} as const;

export const fixedPoint = {
    sl,
    en: {
        "fixed_point_formula_label": "Function",
        "fixed_point_x0_name": "Start",
        "fixed_point_x0_help": "The start of the iteration x₀: a multiple of 0.01 inside the interval of the map. Changing it returns the iteration to step 0.",
        "fixed_point_join_space": "{value0} {value1}",
    } satisfies Record<keyof typeof sl, string>,
};
