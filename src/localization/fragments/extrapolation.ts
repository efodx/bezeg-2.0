// Declaration text of the extrapolation graph: the board puck of the extrapolation parameter, the refusal of a write and the legend entries of the extended arc and the point beyond the curve. The Orodja slider keeps its old key. `en` must have exactly `sl`'s keys.
const sl = {
    "extrapolation_t_name": "Ekstrapolacija",
    "extrapolation_t_refused": "Parameter ekstrapolacije mora biti število od 1 do 1,5.",
    "extrapolation_legend_extension": "Podaljšek krivulje",
    "extrapolation_legend_point": "Točka B(t)",
} as const;

export const extrapolation = {
    sl,
    en: {
        "extrapolation_t_name": "Extrapolation",
        "extrapolation_t_refused": "The extrapolation parameter must be a number from 1 to 1.5.",
        "extrapolation_legend_extension": "Extension of the curve",
        "extrapolation_legend_point": "Point B(t)",
    } satisfies Record<keyof typeof sl, string>,
};
