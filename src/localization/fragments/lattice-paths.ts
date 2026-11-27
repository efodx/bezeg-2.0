// Declaration text of the lattice-paths graph (ADR 0066): the bare names of the pucks (the symbol is typeset next to it; a puck label is at most 16 characters),
// the joins and templates of the readout sentences (a value with letters is a template, never a formatted value), and the refusal of a typed value.
// `en` must have exactly `sl`'s keys.
const sl = {
    "lattice_a_name": "Koraki desno",
    "lattice_b_name": "Koraki gor",
    "lattice_n_name": "Potenca",
    "lattice_c_name": "Število",
    "lattice_a_help": "Število korakov desno od začetka do cilja.",
    "lattice_b_help": "Število korakov gor od začetka do cilja.",
    "lattice_n_help": "Potenca, v katero dvignemo dvočlenik.",
    "lattice_c_help": "Število c v dvočleniku x + c.",
    "lattice_counts_name": "Števila v točkah",
    "lattice_split_name": "Ločitev poti",
    "lattice_cap_over": "poti niso narisane: več kot {value0} korakov",
    "lattice_value_rejected": "Vrednost mora biti celo število od {value0} do {value1}.",
    "lattice_status_join": "{value0} {value1}",
    "lattice_formula_value": "{value0} = {value1}",
    "lattice_binomial_value": "(x {value0} {value1}){value2}",
} as const;

export const latticePaths = {
    sl,
    en: {
        "lattice_a_name": "Steps right",
        "lattice_b_name": "Steps up",
        "lattice_n_name": "Power",
        "lattice_c_name": "Number",
        "lattice_a_help": "The number of steps right from the start to the target.",
        "lattice_b_help": "The number of steps up from the start to the target.",
        "lattice_n_help": "The power the binomial is raised to.",
        "lattice_c_help": "The number c in the binomial x + c.",
        "lattice_counts_name": "Counts at points",
        "lattice_split_name": "Split routes",
        "lattice_cap_over": "routes not drawn: more than {value0} steps",
        "lattice_value_rejected": "The value must be a whole number from {value0} to {value1}.",
        "lattice_status_join": "{value0} {value1}",
        "lattice_formula_value": "{value0} = {value1}",
        "lattice_binomial_value": "(x {value0} {value1}){value2}",
    } satisfies Record<keyof typeof sl, string>,
};
