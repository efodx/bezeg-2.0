// Declaration text of the Fourier coefficients graph (ADR 0066): the bare names, help and short option names of its pucks, and the decay legend.
// `en` must have exactly `sl`'s keys.
const sl = {
    "fourier_coef_k_name": "Zadnji harmonik",
    "fourier_coef_k_help": "Najvišji harmonik, ki ga vsebuje delna vsota S_K, od 1 do 32. Ne sme biti manjši od izbranega harmonika k.",
    "fourier_coef_harmonic_name": "Harmonik",
    "fourier_coef_term_name": "Koeficient",
    "fourier_coef_term_help": "aₖ je koeficient pri kosinusu cos kx, bₖ pri sinusu sin kx.",
    "fourier_coef_term_a_short": "aₖ",
    "fourier_coef_term_b_short": "bₖ",
    "fourier_decay_n_name": "Število členov",
    "fourier_decay_n_help": "Delna vsota Sₙ ima člene do harmonika N, spektri pa prikazujejo amplitude Aₖ za 1 ≤ k ≤ N; od 1 do 101.",
    "fourier_decay_legend_sum_of": "Delne vsote Sₙ · {value0}",
} as const;

export const fourierCoefficients = {
    sl,
    en: {
        "fourier_coef_k_name": "Top harmonic",
        "fourier_coef_k_help": "The highest harmonic in the partial sum S_K, from 1 to 32. It may not be below the chosen harmonic k.",
        "fourier_coef_harmonic_name": "Harmonic",
        "fourier_coef_term_name": "Coefficient",
        "fourier_coef_term_help": "aₖ is the coefficient of the cosine cos kx, bₖ of the sine sin kx.",
        "fourier_coef_term_a_short": "aₖ",
        "fourier_coef_term_b_short": "bₖ",
        "fourier_decay_n_name": "Number of terms",
        "fourier_decay_n_help": "The partial sum Sₙ has terms up to harmonic N, and the spectra show the amplitudes Aₖ for 1 ≤ k ≤ N; from 1 to 101.",
        "fourier_decay_legend_sum_of": "Partial sums Sₙ · {value0}",
    } satisfies Record<keyof typeof sl, string>,
};
