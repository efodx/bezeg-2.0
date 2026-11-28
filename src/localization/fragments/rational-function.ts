// Declaration text of the rational function graph (task 08): the bare name of the probe puck (the symbol x is typeset beside it).
const sl = {
    "rational_function_probe_name": "Točka",
} as const;

export const rationalFunction = {
    sl,
    en: {
        "rational_function_probe_name": "Point",
    } satisfies Record<keyof typeof sl, string>,
};
