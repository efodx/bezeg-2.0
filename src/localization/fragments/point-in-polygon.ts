// Declaration text of the point-in-polygon graph (ADR 0066). `en` must have exactly `sl`'s keys.
const sl = {
    "pointinpolygon_puck_winding": "Ovojno število",
} as const;

export const pointInPolygon = {
    sl,
    en: {
        "pointinpolygon_puck_winding": "Winding number",
    } satisfies Record<keyof typeof sl, string>,
};
