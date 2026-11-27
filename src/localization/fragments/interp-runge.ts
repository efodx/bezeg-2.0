// Declaration text of the Runge interpolation graph (ADR 0066): the name and the short option names of the node rule and function pucks.
// `en` must have exactly `sl`'s keys.
const sl = {
    "interp_runge_rule_name": "Razporeditev točk",
    "interp_runge_rule_equispaced_short": "Enakomerne",
    "interp_runge_rule_chebyshev_short": "Čebiševe",
    "interp_runge_function_runge_short": "1/(1 + 25x²)",
} as const;

export const interpRunge = {
    sl,
    en: {
        "interp_runge_rule_name": "Node placement",
        "interp_runge_rule_equispaced_short": "Equispaced",
        "interp_runge_rule_chebyshev_short": "Chebyshev",
        "interp_runge_function_runge_short": "1/(1 + 25x²)",
    } satisfies Record<keyof typeof sl, string>,
};
