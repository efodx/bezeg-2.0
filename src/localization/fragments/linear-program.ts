// Declaration text of the linear-program graph (ADR 0066): the bare name of the sweep puck (its letter `k` is the symbol).
// `en` must have exactly `sl`'s keys.
const sl = {
    "lp_sweep_name": "Vrednost",
} as const;

export const linearProgram = {
    sl,
    en: {
        "lp_sweep_name": "Value",
    } satisfies Record<keyof typeof sl, string>,
};
