// Declaration text of the conic focal graph (ADR 0066): the bare names of the eccentricity and middle weight pucks and the eccentricity's help.
// `en` must have exactly `sl`'s keys.
const sl = {
    "conic_epsilon_name": "Ekscentričnost",
    "conic_epsilon_help": "Numerična ekscentričnost ε = |PF| / |Pd|: pod 1 je stožnica elipsa, natanko 1 parabola, nad 1 hiperbola; pri 0 je krožnica brez vodnice.",
    "conic_weight_name": "Srednja utež",
} as const;

export const conicFocal = {
    sl,
    en: {
        "conic_epsilon_name": "Eccentricity",
        "conic_epsilon_help": "Numerical eccentricity ε = |PF| / |Pd|: below 1 the conic is an ellipse, exactly 1 a parabola, above 1 a hyperbola; at 0 it is a circle without a directrix.",
        "conic_weight_name": "Middle weight",
    } satisfies Record<keyof typeof sl, string>,
};
