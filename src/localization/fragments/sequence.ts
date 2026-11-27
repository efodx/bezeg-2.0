// Declaration text of the sequence graph (ADR 0066): the formula row and the bare names and helps of its bound pucks.
const sl = {
    "sequence_formula_label": "Funkcija",
    "sequence_epsilon_name": "Širina pasu",
    "sequence_epsilon_help": "Pas je območje med L − ε in L + ε. Širina ε je večkratnik števila 0,01 med 0,01 in 2.",
    "sequence_limit_name": "Kandidat limite",
    "sequence_limit_help": "Kandidat za limito L: večkratnik števila 0,01 med −2 in 2.",
    "sequence_threshold_name": "Prag",
    "sequence_threshold_help": "Prag N: celo število med 1 in 1000. Od njega naprej naj bi vsi členi ležali v pasu.",
} as const;

export const sequence = {
    sl,
    en: {
        "sequence_formula_label": "Function",
        "sequence_epsilon_name": "Band width",
        "sequence_epsilon_help": "The band is the region between L − ε and L + ε. The width ε is a multiple of 0.01 between 0.01 and 2.",
        "sequence_limit_name": "Limit candidate",
        "sequence_limit_help": "The candidate limit L: a multiple of 0.01 between −2 and 2.",
        "sequence_threshold_name": "Threshold",
        "sequence_threshold_help": "The threshold N: an integer between 1 and 1000. From it on, all terms should lie in the band.",
    } satisfies Record<keyof typeof sl, string>,
};
