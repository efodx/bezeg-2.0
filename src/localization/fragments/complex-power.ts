// Declaration text of the complex-power graph (ADR 0066): the bare name of the exponent puck (the symbol n is typeset next to it), the four legend entries
// (the drawn style is the legend swatch, so the labels carry no style word) and the join of the status sentences. `en` must have exactly `sl`'s keys.
const sl = {
    "power_n_name": "Eksponent",
    "power_legend_unit": "Enotska krožnica",
    "power_legend_path": "Pot z, z², …, z{value0}",
    "power_legend_powers": "Potence števila z",
    "power_legend_z": "z, premakljiv",
    "power_status_join": "{value0} {value1}",
} as const;

export const complexPower = {
    sl,
    en: {
        "power_n_name": "Exponent",
        "power_legend_unit": "Unit circle",
        "power_legend_path": "Path z, z², …, z{value0}",
        "power_legend_powers": "Powers of z",
        "power_legend_z": "z, movable",
        "power_status_join": "{value0} {value1}",
    } satisfies Record<keyof typeof sl, string>,
};
