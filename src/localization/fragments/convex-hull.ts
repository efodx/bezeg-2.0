// Declaration text of the convex hull trace graph (ADR 0066). `en` must have exactly `sl`'s keys.
const sl = {
    "hulltrace_puck_hull": "Ovojnica",
    "hulltrace_puck_monotone_chain": "Veriga",
    "hulltrace_puck_slow_edge_test": "Počasni",
    "hulltrace_puck_gift_wrapping": "Ovijanje",
} as const;

export const convexHull = {
    sl,
    en: {
        "hulltrace_puck_hull": "Hull",
        "hulltrace_puck_monotone_chain": "Chain",
        "hulltrace_puck_slow_edge_test": "Slow",
        "hulltrace_puck_gift_wrapping": "Wrapping",
    } satisfies Record<keyof typeof sl, string>,
};
