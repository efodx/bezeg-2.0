// Declaration text of the prob-simulation graph (ADR 0066): the bare names of the pucks whose old Orodja label is longer than a puck label (16 characters), the
// segments of the shape choice and the refusal of a value outside its range. `en` must have exactly `sl`'s keys.
const sl = {
    "random_name_walks": "Sprehodi",
    "random_name_chain_steps": "Koraki verige",
    "random_name_intervals": "Intervali",
    "random_name_rows": "Vrste klinov",
    "random_name_p": "Verjetnost desno",
    "random_name_walk_steps": "Koraki sprehoda",
    "random_name_a": "Prehod A v B",
    "random_name_b": "Prehod B v A",
    "random_shape_quarter_short": "Četrtina",
    "random_shape_disc_short": "Cel krog",
    "random_unit_percent": "%",
    "random_value_rejected": "Vrednost je celo število od {value0} do {value1}.",
    "random_choice_unknown": "Izbira {value0} ni znana.",
} as const;

export const probSimulation = {
    sl,
    en: {
        "random_name_walks": "Walks",
        "random_name_chain_steps": "Chain steps",
        "random_name_intervals": "Intervals",
        "random_name_rows": "Peg rows",
        "random_name_p": "Right chance",
        "random_name_walk_steps": "Steps per walk",
        "random_name_a": "A to B",
        "random_name_b": "B to A",
        "random_shape_quarter_short": "Quarter",
        "random_shape_disc_short": "Whole",
        "random_unit_percent": "%",
        "random_value_rejected": "The value is a whole number from {value0} to {value1}.",
        "random_choice_unknown": "The choice {value0} is unknown.",
    } satisfies Record<keyof typeof sl, string>,
};
