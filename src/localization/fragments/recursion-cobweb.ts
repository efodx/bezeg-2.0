// Declaration text of the recursion-cobweb graph (ADR 0066): the bare names of the pucks (the symbol is typeset next to it; a puck label is at most 16
// characters), the short names of the three maps on the choice puck, the join of the status sentence with a notice, and the refusal of an unknown map.
// `en` must have exactly `sl`'s keys.
const sl = {
    "cobweb_m_name": "Naklon",
    "cobweb_c_name": "Prosti člen",
    "cobweb_r_name": "Parameter",
    "cobweb_x_name": "Začetek",
    "cobweb_map_affine_short": "Premica",
    "cobweb_map_cosine_short": "Kosinus",
    "cobweb_map_logistic_short": "Logistična",
    "cobweb_status_join": "{value0} {value1}",
    "cobweb_map_unknown": "Preslikava {value0} ni znana.",
} as const;

export const recursionCobweb = {
    sl,
    en: {
        "cobweb_m_name": "Slope",
        "cobweb_c_name": "Intercept",
        "cobweb_r_name": "Parameter",
        "cobweb_x_name": "Start",
        "cobweb_map_affine_short": "Line",
        "cobweb_map_cosine_short": "Cosine",
        "cobweb_map_logistic_short": "Logistic",
        "cobweb_status_join": "{value0} {value1}",
        "cobweb_map_unknown": "The map {value0} is unknown.",
    } satisfies Record<keyof typeof sl, string>,
};
