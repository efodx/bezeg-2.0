// Declaration text of the Bezier clipping graph (ADR 0066). `en` must have exactly `sl`'s keys.
const sl = {
    "bezierclipping_curve_a": "Krivulja A",
    "bezierclipping_curve_b": "Krivulja B",
    "bezierclipping_puck_kept": "Ohranjeni deli",
    "bezierclipping_puck_discarded": "Zavrženi deli",
} as const;

export const bezierClipping = {
    sl,
    en: {
        "bezierclipping_curve_a": "Curve A",
        "bezierclipping_curve_b": "Curve B",
        "bezierclipping_puck_kept": "Kept parts",
        "bezierclipping_puck_discarded": "Discarded parts",
    } satisfies Record<keyof typeof sl, string>,
};
