// Declaration text of the affine transformations graph: the name of the first comparison row (the point T(B(t)) mapped from the original curve). `en` must have exactly `sl`'s keys.
const sl = {
    "affine_mapped_name": "T(B({value0}))",
} as const;

export const affine = {
    sl,
    en: {
        "affine_mapped_name": "T(B({value0}))",
    } satisfies Record<keyof typeof sl, string>,
};
