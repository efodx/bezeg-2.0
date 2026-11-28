// Declaration text of the density graph (ADR 0066): bare names of the four pucks (the symbol is typeset next to the name). `en` must have exactly `sl`'s keys.
const sl = {
    "prob_density_mu_name": "Povprečje",
    "prob_density_sigma_name": "Odklon",
    "prob_density_a_name": "Leva meja",
    "prob_density_b_name": "Desna meja",
} as const;

export const probDensity = {
    sl,
    en: {
        "prob_density_mu_name": "Mean",
        "prob_density_sigma_name": "Deviation",
        "prob_density_a_name": "Left end",
        "prob_density_b_name": "Right end",
    } satisfies Record<keyof typeof sl, string>,
};
