// Declaration text of the Bézier-family graphs (ADR 0066), starting with De Casteljau. `en` must have exactly `sl`'s keys.
const sl = {
    "decasteljau_legend_curve": "Krivulja do parametra t",
    "decasteljau_legend_rest": "Preostanek krivulje",
    "decasteljau_legend_point": "Točka B(t) na krivulji",
    "decasteljau_legend_scheme": "Daljice De Casteljaujeve sheme",
    "decasteljau_legend_control": "Kontrolne točke",
    "elevation_legend_elevated_points": "Nove kontrolne točke",
} as const;

export const bezier = {
    sl,
    en: {
        "decasteljau_legend_curve": "Curve up to the parameter t",
        "decasteljau_legend_rest": "Rest of the curve",
        "decasteljau_legend_point": "Point B(t) on the curve",
        "decasteljau_legend_scheme": "De Casteljau scheme segments",
        "decasteljau_legend_control": "Control points",
        "elevation_legend_elevated_points": "New control points",
    } satisfies Record<keyof typeof sl, string>,
};
