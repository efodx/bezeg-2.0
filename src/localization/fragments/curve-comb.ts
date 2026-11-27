// Declaration text of the curvature comb graph: the board pucks of the comb switch and the gain, the legend entry of the comb and
// the refusal of a gain write. The Orodja controls keep their old keys. `en` must have exactly `sl`'s keys.
const sl = {
    "comb_shown_puck": "Glavnik",
    "comb_gain_name": "Ojačitev",
    "comb_legend_teeth": "Glavnik ukrivljenosti (zobje in črta čez njihove konice)",
    "comb_gain_refused": "Ojačitev glavnika mora biti število od {value0} do {value1}.",
} as const;

export const curveComb = {
    sl,
    en: {
        "comb_shown_puck": "Comb",
        "comb_gain_name": "Gain",
        "comb_legend_teeth": "Curvature comb (the teeth and the line through their tips)",
        "comb_gain_refused": "The gain of the comb must be a number from {value0} to {value1}.",
    } satisfies Record<keyof typeof sl, string>,
};
