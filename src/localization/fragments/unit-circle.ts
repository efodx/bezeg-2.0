// Declaration text of the unit circle (ADR 0066): bare names of the two angle pucks (the symbol θ or β is typeset next to them), the three
// switch pucks (at most 16 characters), the signs row that carries letters (a template) and the refusal of an angle that is not a number.
// `en` must have exactly `sl`'s keys.
const sl = {
    "unitcircle_angle_name": "Kot",
    "unitcircle_second_name": "Drugi kot",
    "unitcircle_degrees": "°",
    "unitcircle_cosine_puck": "Kosinus",
    "unitcircle_symmetries_puck": "Simetrične točke",
    "unitcircle_addition_puck": "Seštevanje kotov",
    "unitcircle_signs_value": "cos θ {value0} 0, sin θ {value1} 0",
    "unitcircle_angle_refused": "Kot mora biti končno število stopinj.",
} as const;

export const unitCircle = {
    sl,
    en: {
        "unitcircle_angle_name": "Angle",
        "unitcircle_second_name": "Second angle",
        "unitcircle_degrees": "°",
        "unitcircle_cosine_puck": "Cosine",
        "unitcircle_symmetries_puck": "Symmetric points",
        "unitcircle_addition_puck": "Angle addition",
        "unitcircle_signs_value": "cos θ {value0} 0, sin θ {value1} 0",
        "unitcircle_angle_refused": "The angle must be a finite number of degrees.",
    } satisfies Record<keyof typeof sl, string>,
};
