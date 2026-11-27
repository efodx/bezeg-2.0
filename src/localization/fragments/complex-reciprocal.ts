// Declaration text of the reciprocal graph (ADR 0066): the pieces of a complex number in a readout value (the imaginary unit is a letter, so a value is built
// from messages), the bare name of the radius puck (the symbol r is typeset next to it), the three switch pucks (at most 16 characters), the legend of what the board
// draws and the prediction status that names the puck. `en` must have exactly `sl`'s keys.
const sl = {
    "complex_value_i": "i",
    "complex_value_imag": "{value0}i",
    "complex_value_plus": "{value0} + {value1}",
    "complex_value_minus": "{value0} − {value1}",
    "complex_value_negative": "−{value0}",
    "complex_recip_radius_name": "Polmer",
    "complex_recip_puck_reciprocal": "Obratna vrednost",
    "complex_recip_puck_quotient": "Količnik w/z",
    "complex_recip_puck_circle": "Inverzija",
    "complex_recip_key_z": "Število z",
    "complex_recip_key_w": "Število w",
    "complex_recip_key_unit_circle": "Enotska krožnica |z| = 1",
    "complex_recip_key_conjugate": "Konjugirano število z̄",
    "complex_recip_key_reciprocal": "Obratna vrednost 1/z",
    "complex_recip_key_quotient": "Količnik w/z",
    "complex_recip_key_inversion": "Krožnica inverzije in točka z'",
    "complex_recip_circle_hidden_puck_help": "Krožnica inverzije je zdaj skrita; pokaže jo krmilnik Inverzija.",
    "complex_recip_status_predict_puck": "1/z je skrit. Napovej z̄ in |z| ter kje leži 1/z; šele nato vklopi krmilnik Obratna vrednost.",
} as const;

export const complexReciprocal = {
    sl,
    en: {
        "complex_value_i": "i",
        "complex_value_imag": "{value0}i",
        "complex_value_plus": "{value0} + {value1}",
        "complex_value_minus": "{value0} − {value1}",
        "complex_value_negative": "−{value0}",
        "complex_recip_radius_name": "Radius",
        "complex_recip_puck_reciprocal": "Reciprocal",
        "complex_recip_puck_quotient": "Quotient w/z",
        "complex_recip_puck_circle": "Inversion",
        "complex_recip_key_z": "Number z",
        "complex_recip_key_w": "Number w",
        "complex_recip_key_unit_circle": "Unit circle |z| = 1",
        "complex_recip_key_conjugate": "Conjugate z̄",
        "complex_recip_key_reciprocal": "Reciprocal 1/z",
        "complex_recip_key_quotient": "Quotient w/z",
        "complex_recip_key_inversion": "Inversion circle and point z'",
        "complex_recip_circle_hidden_puck_help": "The inversion circle is hidden now; the control Inversion shows it.",
        "complex_recip_status_predict_puck": "1/z is hidden. Predict z̄ and |z|, and where 1/z lies; only then turn on the control Reciprocal.",
    } satisfies Record<keyof typeof sl, string>,
};
