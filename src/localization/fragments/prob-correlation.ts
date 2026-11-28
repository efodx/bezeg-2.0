// Declaration text of the correlation graph (ADR 0066): bare names of the two switch pucks (residuals, the line of x on y), at most 16 characters, and the frame of the two line equations (the formula is the argument). `en` must have exactly `sl`'s keys.
const sl = {
    "prob_correlation_residuals_name": "Ostanki",
    "prob_correlation_xony_name": "Premica za x",
    "prob_correlation_equation_y": "y = {value0}",
    "prob_correlation_equation_x": "x = {value0}",
} as const;

export const probCorrelation = {
    sl,
    en: {
        "prob_correlation_residuals_name": "Residuals",
        "prob_correlation_xony_name": "Line of x on y",
        "prob_correlation_equation_y": "y = {value0}",
        "prob_correlation_equation_x": "x = {value0}",
    } satisfies Record<keyof typeof sl, string>,
};
