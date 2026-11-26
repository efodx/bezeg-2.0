// Declaration text of the growth graph (ADR 0066): bare names of the pucks (their letters are the symbols), the unit of the rate,
// short model names for the model puck, and the two status sentences that carry the limit of the sum. `en` must have exactly `sl`'s keys.
const sl = {
    "growth_n_terms_name": "Število členov",
    "growth_d_name": "Razlika",
    "growth_q_name": "Količnik",
    "growth_rate_name": "Obrestna mera",
    "growth_percent_unit": "%",
    "growth_years_name": "Čas (leta)",
    "growth_logq_name": "Faktor rasti",
    "growth_steps_name": "Število korakov",
    "growth_model_exponential_short": "Eksponentni",
    "growth_model_power_short": "Potenčni",
    "growth_status_geometric_exact_limit": "Geometrijsko zaporedje: a{value0} = {value1} in vsota S{value0} = {value2} po obrazcih (natančno, cela števila). Ker je |q| < 1, je limita vsote a₁/(1 − q) = {value3}; to je vrednost zaprte oblike, ne zadnji narisani člen.",
    "growth_status_geometric_computed_limit": "Geometrijsko zaporedje: a{value0} = {value1} in vsota S{value0} = {value2} po obrazcih (izračunano z decimalkami). Ker je |q| < 1, je limita vsote a₁/(1 − q) = {value3}; to je vrednost zaprte oblike, ne zadnji narisani člen.",
} as const;

export const recursionGrowth = {
    sl,
    en: {
        "growth_n_terms_name": "Number of terms",
        "growth_d_name": "Difference",
        "growth_q_name": "Ratio",
        "growth_rate_name": "Interest rate",
        "growth_percent_unit": "%",
        "growth_years_name": "Time (years)",
        "growth_logq_name": "Growth factor",
        "growth_steps_name": "Number of steps",
        "growth_model_exponential_short": "Exponential",
        "growth_model_power_short": "Power",
        "growth_status_geometric_exact_limit": "Geometric sequence: a{value0} = {value1} and the sum S{value0} = {value2} by the formulas (exact, whole numbers). Since |q| < 1, the limit of the sum is a₁/(1 − q) = {value3}; this is the value of the closed form, not the last term drawn.",
        "growth_status_geometric_computed_limit": "Geometric sequence: a{value0} = {value1} and the sum S{value0} = {value2} by the formulas (computed with decimals). Since |q| < 1, the limit of the sum is a₁/(1 − q) = {value3}; this is the value of the closed form, not the last term drawn.",
    } satisfies Record<keyof typeof sl, string>,
};
