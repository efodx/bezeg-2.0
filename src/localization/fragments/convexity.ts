// Declaration text of the convexity graph (ADR 0066): the bare names of its bound pucks.
const sl = {
    "convexity_a_name": "Levo krajišče",
    "convexity_b_name": "Desno krajišče",
    "convexity_t_name": "Točka dotika tangente",
    "convexity_t_puck": "Točka dotika",
    "convexity_line_value": "y = {value0}",
} as const;

export const convexity = {
    sl,
    en: {
        "convexity_a_name": "Left endpoint",
        "convexity_b_name": "Right endpoint",
        "convexity_t_name": "Tangent point",
        "convexity_t_puck": "Tangent point",
        "convexity_line_value": "y = {value0}",
    } satisfies Record<keyof typeof sl, string>,
};
