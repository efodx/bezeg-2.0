// Declaration text of the central limit theorem graph (ADR 0066): bare names of the copies count puck and the distribution-function switch puck (at most 16 characters; the symbol is typeset next to the name). `en` must have exactly `sl`'s keys.
const sl = {
    "prob_clt_n_name": "Število kopij",
    "prob_clt_cdf_name": "Funkcija F",
} as const;

export const probClt = {
    sl,
    en: {
        "prob_clt_n_name": "Copies",
        "prob_clt_cdf_name": "CDF",
    } satisfies Record<keyof typeof sl, string>,
};
