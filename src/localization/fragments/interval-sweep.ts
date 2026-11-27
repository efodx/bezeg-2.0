// Declaration text of the interval sweep graph (ADR 0066). `en` must have exactly `sl`'s keys.
const sl = {
    "intervalsweep_legend_open": "Odprti intervali",
    "intervalsweep_legend_pair": "Najden par",
} as const;

export const intervalSweep = {
    sl,
    en: {
        "intervalsweep_legend_open": "Open intervals",
        "intervalsweep_legend_pair": "Reported pair",
    } satisfies Record<keyof typeof sl, string>,
};
