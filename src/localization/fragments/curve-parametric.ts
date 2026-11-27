// Declaration text of the parametric and polar curves demonstration (curve-parametric): the bare names of the board pucks (the Orodja
// sliders keep "Parameter t", "Kot θ" and "Polmer kotalečega se kroga"), the rows that were board caption lines, the legend and the
// refusals. The cusp sentence reuses `parametric_status_stopped`. `en` must have exactly `sl`'s keys.
const sl = {
    "parametric_t_name": "Parameter",
    "parametric_theta_name": "Kot",
    "parametric_radius_name": "Polmer kroga",
    "parametric_velocity_name": "Hitrost",
    "parametric_speed_name": "Velikost hitrosti",
    "parametric_ray_name": "Polmer",
    "parametric_length_name": "Dolžina loka",
    "parametric_area_name": "Ploščina",
    "parametric_vector_pair": "({value0}; {value1})",
    "parametric_legend_velocity": "Vektor hitrosti",
    "parametric_legend_ray": "Poltrak",
    "parametric_legend_circle": "Kotaleči se krog",
    "parametric_t_refused": "Parameter mora biti število od {value0} do {value1}.",
    "parametric_radius_refused": "Polmer kroga mora biti število od {value0} do {value1}.",
} as const;

export const curveParametric = {
    sl,
    en: {
        "parametric_t_name": "Parameter",
        "parametric_theta_name": "Angle",
        "parametric_radius_name": "Circle radius",
        "parametric_velocity_name": "Velocity",
        "parametric_speed_name": "Speed",
        "parametric_ray_name": "Radius",
        "parametric_length_name": "Arc length",
        "parametric_area_name": "Area",
        "parametric_vector_pair": "({value0}; {value1})",
        "parametric_legend_velocity": "Velocity vector",
        "parametric_legend_ray": "Ray",
        "parametric_legend_circle": "Rolling circle",
        "parametric_t_refused": "The parameter must be a number from {value0} to {value1}.",
        "parametric_radius_refused": "The circle radius must be a number from {value0} to {value1}.",
    } satisfies Record<keyof typeof sl, string>,
};
