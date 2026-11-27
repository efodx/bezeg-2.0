// Declaration text of the curvature graph: the board puck of the parameter t, the three read-off rows of the Odčitki card, the legend
// entry of the osculating circle and the refusal of a t write. The Orodja slider keeps its old key. `en` must have exactly `sl`'s keys.
const sl = {
    "curvature_t_name": "Parameter",
    "curvature_t_refused": "Parameter t mora biti število od 0 do 1.",
    "curvature_row_kappa": "Ukrivljenost",
    "curvature_row_radius": "Krivinski polmer",
    "curvature_row_angle": "Smerni kot tangente",
    "curvature_unit_degrees": "°",
    "curvature_legend_circle": "Krivinska krožnica (premica, kjer je ukrivljenost 0)",
} as const;

export const curveCurvature = {
    sl,
    en: {
        "curvature_t_name": "Parameter",
        "curvature_t_refused": "The parameter t must be a number from 0 to 1.",
        "curvature_row_kappa": "Curvature",
        "curvature_row_radius": "Radius of curvature",
        "curvature_row_angle": "Direction angle of the tangent",
        "curvature_unit_degrees": "°",
        "curvature_legend_circle": "Osculating circle (a line where the curvature is 0)",
    } satisfies Record<keyof typeof sl, string>,
};
