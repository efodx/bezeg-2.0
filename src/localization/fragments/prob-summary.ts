// Declaration text of the summary statistics graph (ADR 0066): bare names of the two choice pucks (quartile rule, kind of deviation) and the two switch pucks (box plot, band), at most 16 characters, and the short text of each choice segment. `en` must have exactly `sl`'s keys.
const sl = {
    "prob_summary_rule_name": "Pravilo",
    "prob_summary_rule_short_inclusive": "Šolsko",
    "prob_summary_rule_short_exclusive": "Brez mediane",
    "prob_summary_sigma_name": "Odklon",
    "prob_summary_sigma_short_population": "σ",
    "prob_summary_sigma_short_sample": "s",
    "prob_summary_box_name": "Škatla z brki",
    "prob_summary_band_name": "Pas odklona",
} as const;

export const probSummary = {
    sl,
    en: {
        "prob_summary_rule_name": "Rule",
        "prob_summary_rule_short_inclusive": "School",
        "prob_summary_rule_short_exclusive": "No median",
        "prob_summary_sigma_name": "Deviation",
        "prob_summary_sigma_short_population": "σ",
        "prob_summary_sigma_short_sample": "s",
        "prob_summary_box_name": "Box plot",
        "prob_summary_band_name": "Deviation band",
    } satisfies Record<keyof typeof sl, string>,
};
