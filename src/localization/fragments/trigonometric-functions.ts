// Declaration text of the trigonometric functions graph (ADR 0066): the bare names of its pucks, the legend entries and the equation row.
const sl = {
    "trig_amplitude_name": "Amplituda",
    "trig_omega_name": "Frekvenca",
    "trig_phase_name": "Faza",
    "trig_midline_name": "Srednja črta",
    "trig_reference_name": "Referenčni graf",
    "trig_legend_curve": "Graf funkcije f",
    "trig_legend_midline": "Srednja črta y = B",
    "trig_legend_reference": "Referenčni graf osnovne funkcije g",
    "trig_equation_value": "{value0}",
} as const;

export const trigonometricFunctions = {
    sl,
    en: {
        "trig_amplitude_name": "Amplitude",
        "trig_omega_name": "Frequency",
        "trig_phase_name": "Phase",
        "trig_midline_name": "Midline",
        "trig_reference_name": "Reference graph",
        "trig_legend_curve": "Graph of f",
        "trig_legend_midline": "Midline y = B",
        "trig_legend_reference": "Reference graph of the basic function g",
        "trig_equation_value": "{value0}",
    } satisfies Record<keyof typeof sl, string>,
};
