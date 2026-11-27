// Declaration text of the contour-map graph (ADR 0066): the bare names of its pucks (their letters are the symbols), the
// refusals of the bound parameters and the join of the status sentence. `en` must have exactly `sl`'s keys.
const sl = {
    "contour_level_name": "Vrednost",
    "contour_count_name": "Število nivojnic",
    "contour_step_name": "Korak",
    "contour_line_x_name": "Točka na premici",
    "contour_circle_name": "Kot na krožnici",
    "contour_numeric_puck": "Numerična ocena",
    "contour_degrees": "°",
    "contour_count_rejected": "Število nivojnic mora biti celo število od {value0} do {value1}.",
    "contour_line_x_rejected": "x mora biti na mreži od {value0} do {value1} v korakih po {value2}.",
    "contour_choice_rejected": "Izbira «{value0}» ni med možnostmi.",
    "contour_status_join": "{value0} {value1}",
} as const;

export const contourMap = {
    sl,
    en: {
        "contour_level_name": "Value",
        "contour_count_name": "Level sets",
        "contour_step_name": "Step",
        "contour_line_x_name": "Line point",
        "contour_circle_name": "Circle angle",
        "contour_numeric_puck": "Numeric estimate",
        "contour_degrees": "°",
        "contour_count_rejected": "The number of level sets must be a whole number from {value0} to {value1}.",
        "contour_line_x_rejected": "x must be on the grid from {value0} to {value1} in steps of {value2}.",
        "contour_choice_rejected": "The choice \"{value0}\" is not one of the options.",
        "contour_status_join": "{value0} {value1}",
    } satisfies Record<keyof typeof sl, string>,
};
