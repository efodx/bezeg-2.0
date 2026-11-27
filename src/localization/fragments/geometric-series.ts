// Declaration text of the geometric series graph (ADR 0066): the formula row and the bare names and helps of its bound pucks.
const sl = {
    "series_formula_label": "Delna vsota",
    "series_q_name": "Količnik",
    "series_q_help": "Količnik q geometrijske vrste: večkratnik števila 0,05 med −2 in 2. Za |q| ≥ 1 vrsta ne konvergira.",
    "series_tolerance_name": "Odstopanje",
    "series_tolerance_help": "Širina pasu okoli limite: večkratnik števila 0,01 med 0 in 1; 0 pas skrije.",
} as const;

export const geometricSeries = {
    sl,
    en: {
        "series_formula_label": "Partial sum",
        "series_q_name": "Ratio",
        "series_q_help": "The ratio q of the geometric series: a multiple of 0.05 between −2 and 2. For |q| ≥ 1 the series does not converge.",
        "series_tolerance_name": "Tolerance",
        "series_tolerance_help": "The width of the band around the limit: a multiple of 0.01 between 0 and 1; 0 hides the band.",
    } satisfies Record<keyof typeof sl, string>,
};
