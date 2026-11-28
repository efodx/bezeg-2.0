// Declaration text of the inversion graph (ADR 0066): the names of the two pucks and the joining of a sentence with the reason it is not drawn.
// `en` must have exactly `sl`'s keys.
const sl = {
    "inversion_decl_radius_name": "Polmer inverzije",
    "inversion_decl_theta_name": "Smer sekante",
    "inversion_decl_beyond": "{value0}; {value1}",
} as const;

export const inversion = {
    sl,
    en: {
        "inversion_decl_radius_name": "Radius of inversion",
        "inversion_decl_theta_name": "Direction of the secant",
        "inversion_decl_beyond": "{value0}; {value1}",
    } satisfies Record<keyof typeof sl, string>,
};
