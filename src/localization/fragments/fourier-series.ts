// Declaration text of the Fourier series graph (ADR 0066): the bare name and help of its puck and the legend entries. `en` must have exactly `sl`'s keys.
const sl = {
    "fourier_series_n_name": "Harmoniki",
    "fourier_series_terms_value": "{value0}",
    "fourier_series_n_help": "Delna vsota Sₙ vsebuje harmonike do N, od 1 do 1001. Pri pravokotnem valu sodi harmoniki ne prispevajo, zato je Sₙ pri sodem N enaka vsoti pri N − 1.",
    "fourier_series_legend_sum": "Delna vsota Sₙ",
    "fourier_series_legend_target": "Funkcija f",
    "fourier_series_legend_jump": "Enostranski limiti pri skoku",
    "fourier_series_legend_band": "Pas f ± ε",
    "fourier_series_legend_error": "Napaka |f − Sₙ| pri x",
    "fourier_series_legend_peak": "Vrh ob skoku",
    "fourier_series_legend_window": "Okno za približanje",
} as const;

export const fourierSeries = {
    sl,
    en: {
        "fourier_series_n_name": "Harmonics",
        "fourier_series_terms_value": "{value0}",
        "fourier_series_n_help": "The partial sum Sₙ contains the harmonics up to N, from 1 to 1001. For the square wave the even harmonics add nothing, so Sₙ at an even N equals the sum at N − 1.",
        "fourier_series_legend_sum": "Partial sum Sₙ",
        "fourier_series_legend_target": "Function f",
        "fourier_series_legend_jump": "One-sided limits at the jump",
        "fourier_series_legend_band": "Band f ± ε",
        "fourier_series_legend_error": "Error |f − Sₙ| at x",
        "fourier_series_legend_peak": "Peak at the jump",
        "fourier_series_legend_window": "Zoom window",
    } satisfies Record<keyof typeof sl, string>,
};
