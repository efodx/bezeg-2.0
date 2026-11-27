// Declaration text of the segment intersections graph (ADR 0066). `en` must have exactly `sl`'s keys.
const sl = {
    "bentleyottmann_legend_status": "Daljice v stanju",
    "bentleyottmann_legend_current": "Daljice trenutnega dogodka",
    "bentleyottmann_legend_test": "Preizkus sosednjih daljic",
    "bentleyottmann_legend_crossing": "Najdena presečišča",
} as const;

export const segmentIntersections = {
    sl,
    en: {
        "bentleyottmann_legend_status": "Segments in the status",
        "bentleyottmann_legend_current": "Segments of the current event",
        "bentleyottmann_legend_test": "Neighbour test",
        "bentleyottmann_legend_crossing": "Reported crossings",
    } satisfies Record<keyof typeof sl, string>,
};
