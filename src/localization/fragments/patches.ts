// Declaration text of the surface-patch graphs (ADR 0066), starting with the Coons patch. `en` must have exactly `sl`'s keys.
const sl = {
    "coons_interior_point_name": "P{value0}{value1}",
    "coons_legend_boundary": "Robne krivulje c₀, c₁, d₀, d₁",
    "coons_legend_polygon": "Kontrolni poligoni robnih krivulj",
    "coons_legend_net": "Kontrolna mreža prikazane ploskve",
    "coons_legend_surface": "Prikazana ploskev",
    "coons_legend_points": "Kontrolne točke robnih krivulj (vlečeš jih)",
} as const;

export const patches = {
    sl,
    en: {
        "coons_interior_point_name": "P{value0}{value1}",
        "coons_legend_boundary": "Boundary curves c₀, c₁, d₀, d₁",
        "coons_legend_polygon": "Control polygons of the boundary curves",
        "coons_legend_net": "Control net of the shown surface",
        "coons_legend_surface": "Shown surface",
        "coons_legend_points": "Control points of the boundary curves (draggable)",
    } satisfies Record<keyof typeof sl, string>,
};
