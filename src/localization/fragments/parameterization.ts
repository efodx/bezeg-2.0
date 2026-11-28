// Declaration text of the weighted and uniform parameterization graphs (task 08 lane L21): the bare puck names, the short
// segments of the method choice, the legend entry of the sample points and the refusals of a parameter write. `en` must have
// exactly `sl`'s keys.
const sl = {
    "param_mode_name": "Parametrizacija",
    "param_mode_weighted_short": "Utežena",
    "param_mode_uniform_short": "Enakomerna",
    "param_alpha_name": "Parameter",
    "param_samples_legend": "Vzorčne točke",
    "param_alpha_refused": "Parameter α mora biti število od {value0} do {value1}.",
    "param_samples_refused": "Število točk mora biti celo število od {value0} do {value1}.",
    "param_mode_refused": "Parametrizacija je lahko utežena ali enakomerna.",
} as const;

export const parameterization = {
    sl,
    en: {
        "param_mode_name": "Parametrization",
        "param_mode_weighted_short": "Weighted",
        "param_mode_uniform_short": "Uniform",
        "param_alpha_name": "Parameter",
        "param_samples_legend": "Sample points",
        "param_alpha_refused": "The parameter α must be a number from {value0} to {value1}.",
        "param_samples_refused": "The number of points must be an integer from {value0} to {value1}.",
        "param_mode_refused": "The parametrization can be weighted or uniform.",
    } satisfies Record<keyof typeof sl, string>,
};
