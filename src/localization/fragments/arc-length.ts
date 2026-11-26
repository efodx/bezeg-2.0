// Declaration text of the arc-length graph (ADR 0066): the bare names of its three pucks and the legend entries.
const sl = {
    "arc_n_name": "Število daljic",
    "arc_a_name": "Prvo krajišče",
    "arc_b_name": "Drugo krajišče",
    "arc_legend_curve": "Graf f(x) = sin x",
    "arc_legend_polyline": "Lomljenka",
    "arc_legend_point_a": "Krajišče A",
    "arc_legend_point_b": "Krajišče B",
} as const;

export const arcLength = {
    sl,
    en: {
        "arc_n_name": "Segments",
        "arc_a_name": "First endpoint",
        "arc_b_name": "Second endpoint",
        "arc_legend_curve": "Graph of f(x) = sin x",
        "arc_legend_polyline": "Polyline",
        "arc_legend_point_a": "Endpoint A",
        "arc_legend_point_b": "Endpoint B",
    } satisfies Record<keyof typeof sl, string>,
};
