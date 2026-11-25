// Declaration text of the bisection graph (ADR 0066): the example choice's formula options and the function-value readout names. `en` must have exactly `sl`'s keys.
const sl = {
    "bisection_example_square_minus_two": "f(x) = x² − 2",
    "bisection_example_cubic": "f(x) = x³ − x",
    "bisection_readout_fa": "f(a)",
    "bisection_readout_fb": "f(b)",
    "bisection_readout_fm": "f(m)",
} as const;

export const bisection = {
    sl,
    en: {
        "bisection_example_square_minus_two": "f(x) = x² − 2",
        "bisection_example_cubic": "f(x) = x³ − x",
        "bisection_readout_fa": "f(a)",
        "bisection_readout_fb": "f(b)",
        "bisection_readout_fm": "f(m)",
    } satisfies Record<keyof typeof sl, string>,
};
