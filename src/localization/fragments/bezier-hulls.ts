// Declaration text of the Bezier hulls graph (ADR 0066). `en` must have exactly `sl`'s keys.
const sl = {
    "bezierhulls_curve_a": "Krivulja A",
    "bezierhulls_curve_b": "Krivulja B",
} as const;

export const bezierHulls = {
    sl,
    en: {
        "bezierhulls_curve_a": "Curve A",
        "bezierhulls_curve_b": "Curve B",
    } satisfies Record<keyof typeof sl, string>,
};
