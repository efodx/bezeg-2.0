// Declaration text of the least-squares graph (ADR 0066): the bare names of the pucks (the degree, the manual line's slope and intercept, the squares switch)
// and the equation row, which the old panel built as one string with the "y = " in front. `en` must have exactly `sl`'s keys.
const sl = {
    "interp_lsq_equation_value": "y = {value0}",
    "interp_lsq_degree_name": "Stopnja",
    "interp_lsq_slope_name": "Naklon",
    "interp_lsq_intercept_name": "Začetna vrednost",
    "interp_lsq_squares_name": "Kvadrati",
} as const;

export const interpLeastSquares = {
    sl,
    en: {
        "interp_lsq_equation_value": "y = {value0}",
        "interp_lsq_degree_name": "Degree",
        "interp_lsq_slope_name": "Slope",
        "interp_lsq_intercept_name": "Intercept",
        "interp_lsq_squares_name": "Squares",
    } satisfies Record<keyof typeof sl, string>,
};
