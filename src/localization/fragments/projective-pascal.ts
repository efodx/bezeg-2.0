// Declaration text of the projective-pascal graph (ADR 0066): the legend and the two choice pucks (hexagon order, conic).
// `en` must have exactly `sl`'s keys.
const sl = {
    "projective_pascal_legend_conic": "Stožnica",
    "projective_pascal_legend_sides": "Stranice šestkotnika s₁ do s₆",
    "projective_pascal_legend_line": "Pascalova premica p",
    "projective_pascal_legend_points": "Presečišča P₁, P₂, P₃ nasprotnih stranic",
    "projective_pascal_legend_infinity": "Smer presečišča v neskončnosti",
    "projective_pascal_legend_handles": "Točke šestkotnika (vlečeš jih)",
    "projective_pascal_puck_order": "Vrstni red",
    "projective_pascal_puck_order_natural": "Običajni",
    "projective_pascal_puck_order_pappus": "Prekrižan",
    "projective_pascal_puck_order_star": "Zvezda",
    "projective_pascal_puck_conic": "Stožnica",
} as const;

export const projectivePascal = {
    sl,
    en: {
        "projective_pascal_legend_conic": "Conic",
        "projective_pascal_legend_sides": "Hexagon sides s₁ to s₆",
        "projective_pascal_legend_line": "Pascal line p",
        "projective_pascal_legend_points": "Intersections P₁, P₂, P₃ of opposite sides",
        "projective_pascal_legend_infinity": "Direction of an intersection at infinity",
        "projective_pascal_legend_handles": "Hexagon points (draggable)",
        "projective_pascal_puck_order": "Vertex order",
        "projective_pascal_puck_order_natural": "Usual",
        "projective_pascal_puck_order_pappus": "Crossed",
        "projective_pascal_puck_order_star": "Star",
        "projective_pascal_puck_conic": "Conic",
    } satisfies Record<keyof typeof sl, string>,
};
