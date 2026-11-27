// Declaration text of the Delaunay trace graph (ADR 0066). `en` must have exactly `sl`'s keys.
const sl = {
    "del_angle_join": "{value0}; {value1}",
} as const;

export const delaunay = {
    sl,
    en: {
        "del_angle_join": "{value0}; {value1}",
    } satisfies Record<keyof typeof sl, string>,
};
