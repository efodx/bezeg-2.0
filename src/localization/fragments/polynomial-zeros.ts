// Declaration text of the polynomial zeros graph (task 08): the join of the two sentences of the end behaviour, the bare name of the
// derivative switch puck, and the join of the pieces of a formula (also used by the rational function graph): symbols stay literal,
// every number of the formula is a number parameter, so the formula re-renders in the language.
const sl = {
    "function_formula_join": "{value0}{value1}",
    "polynomial_zeros_end_full": "{value0}. {value1}",
    "polynomial_zeros_derivative_name": "Odvod",
} as const;

export const polynomialZeros = {
    sl,
    en: {
        "function_formula_join": "{value0}{value1}",
        "polynomial_zeros_end_full": "{value0}. {value1}",
        "polynomial_zeros_derivative_name": "Derivative",
    } satisfies Record<keyof typeof sl, string>,
};
