// Declaration text of the circle construction graph (ADR 0066): the equation of a line (its left side has letters, so it is a template),
// and the names of the radius and ratio pucks (bare names; the presenter typesets the symbol). `en` must have exactly `sl`'s keys.
const sl = {
    "circle_construction_line_equation": "{value0} = {value1}",
    "circle_construction_radius_name": "Polmer",
    "circle_construction_radius_first": "Prva krožnica",
    "circle_construction_radius_second": "Druga krožnica",
    "circle_construction_radius_third": "Tretja krožnica",
    "circle_construction_ratio_name": "Razmerje",
    "circle_construction_value_not_finite": "Vrednost mora biti končno število.",
} as const;

export const circleConstruction = {
    sl,
    en: {
        "circle_construction_line_equation": "{value0} = {value1}",
        "circle_construction_radius_name": "Radius",
        "circle_construction_radius_first": "First circle",
        "circle_construction_radius_second": "Second circle",
        "circle_construction_radius_third": "Third circle",
        "circle_construction_ratio_name": "Ratio",
        "circle_construction_value_not_finite": "The value must be a finite number.",
    } satisfies Record<keyof typeof sl, string>,
};
