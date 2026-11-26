// Declaration text of the line-geometry graph (ADR 0066): two templates that join pieces (the equation's letters are parameters of
// the template, never numbers), and the short texts of the intersect-target puck. `en` must have exactly `sl`'s keys.
const sl = {
    "lines_equation": "{value0} = {value1}",
    "lines_status_with_note": "{value0} {value1}",
    "lines_target_name": "Presek z",
    "lines_target_lines_short": "Premica",
    "lines_target_circle_short": "Krožnica",
    "lines_target_rejected": "Presečišče je mogoče iskati z drugo premico ali s krožnico.",
} as const;

export const lineGeometry = {
    sl,
    en: {
        "lines_equation": "{value0} = {value1}",
        "lines_status_with_note": "{value0} {value1}",
        "lines_target_name": "Meets",
        "lines_target_lines_short": "Line",
        "lines_target_circle_short": "Circle",
        "lines_target_rejected": "The intersection can be found with the second line or with the circle.",
    } satisfies Record<keyof typeof sl, string>,
};
