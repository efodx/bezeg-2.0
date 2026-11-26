// Declaration text of the Euler method graph (ADR 0066): the step puck's bare name and help, and the equation options of the example choice.
// `en` must have exactly `sl`'s keys.
const sl = {
    "euler_ode_halvings_name": "Razpolovitve",
    "euler_ode_halvings_help": "Vsaka razpolovitev razpolovi korak h in podvoji število korakov: 0 je korak 1, 4 je korak 0,0625.",
    "euler_ode_end_help": "Končni x določa, do kam Eulerjeva lomljenka računa približek; med −10 in 10, ne manjši od x₀.",
    "euler_ode_example_exponential": "y' = y",
    "euler_ode_example_linear_relaxation": "y' = x − y",
    "euler_ode_example_blow_up": "y' = y²",
} as const;

export const eulerMethod = {
    sl,
    en: {
        "euler_ode_halvings_name": "Halvings",
        "euler_ode_halvings_help": "Each halving halves the step h and doubles the number of steps: 0 is the step 1, 4 is the step 0.0625.",
        "euler_ode_end_help": "The end x sets where the Euler polyline computes its approximation; between −10 and 10, not smaller than x₀.",
        "euler_ode_example_exponential": "y' = y",
        "euler_ode_example_linear_relaxation": "y' = x − y",
        "euler_ode_example_blow_up": "y' = y²",
    } satisfies Record<keyof typeof sl, string>,
};
