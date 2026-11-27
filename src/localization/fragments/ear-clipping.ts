// Declaration text of the ear clipping graph (ADR 0066). `en` must have exactly `sl`'s keys.
const sl = {
    "earclip_detail_join": "{value0} {value1}",
} as const;

export const earClipping = {
    sl,
    en: {
        "earclip_detail_join": "{value0} {value1}",
    } satisfies Record<keyof typeof sl, string>,
};
