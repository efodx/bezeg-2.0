// Declaration text of the offset graph: the board puck of the distance d is named here, the read-off rows reuse that name, the
// puck of the offset switch and the refusal of a write. The Orodja controls keep their old keys. `en` must have exactly `sl`'s keys.
const sl = {
    "offset_d_name": "Razdalja",
    "offset_cusps_name": "Osti",
    "offset_shown_puck": "Vzporednica",
    "offset_d_refused": "Razdalja d mora biti število od {value0} do {value1}.",
} as const;

export const curveOffset = {
    sl,
    en: {
        "offset_d_name": "Distance",
        "offset_cusps_name": "Cusps",
        "offset_shown_puck": "Offset",
        "offset_d_refused": "The distance d must be a number from {value0} to {value1}.",
    } satisfies Record<keyof typeof sl, string>,
};
