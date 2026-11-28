// Declaration text of the binomial-to-normal graph (ADR 0066): bare names of the three range pucks and the two switch pucks (at most 16 characters; the symbol is typeset next to the name). `en` must have exactly `sl`'s keys.
const sl = {
    "prob_binomial_n_name": "Število poskusov",
    "prob_binomial_p_name": "Verjetnost",
    "prob_binomial_k_name": "Meja",
    "prob_binomial_mean_name": "Povprečje",
    "prob_binomial_correction_name": "Popravek",
    "prob_binomial_poisson_name": "Poisson",
} as const;

export const probBinomialNormal = {
    sl,
    en: {
        "prob_binomial_n_name": "Trials",
        "prob_binomial_p_name": "Probability",
        "prob_binomial_k_name": "Threshold",
        "prob_binomial_mean_name": "Mean",
        "prob_binomial_correction_name": "Correction",
        "prob_binomial_poisson_name": "Poisson",
    } satisfies Record<keyof typeof sl, string>,
};
