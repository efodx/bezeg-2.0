// Declaration text of the evolute graph: the E row of the Odčitki card and the legend entries of the trace and the normal. The t puck,
// the kappa, R and angle rows, the circle entry and the line and singular notes are the curvature graph's keys. `en` must have exactly `sl`'s keys.
const sl = {
    "evolute_row_point": "Točka evolute",
    "evolute_point_pair": "({value0}; {value1})",
    "evolute_legend_trace": "Evoluta (sled središč krivinskih krožnic)",
    "evolute_legend_normal": "Normala v točki",
} as const;

export const curveEvolute = {
    sl,
    en: {
        "evolute_row_point": "Point of the evolute",
        "evolute_point_pair": "({value0}; {value1})",
        "evolute_legend_trace": "Evolute (the track of the centres of the osculating circles)",
        "evolute_legend_normal": "Normal at the point",
    } satisfies Record<keyof typeof sl, string>,
};
