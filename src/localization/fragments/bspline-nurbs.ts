// Declaration text of the NURBS circle graph (ADR 0066): the legend entry of the marked point C(t). `en` must have exactly `sl`'s keys.
const sl = {
    "bsn_legend_marker": "Točka C(t)",
} as const;

export const bsplineNurbs = {
    sl,
    en: {
        "bsn_legend_marker": "Point C(t)",
    } satisfies Record<keyof typeof sl, string>,
};
