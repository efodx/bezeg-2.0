// Declaration text of the repeated-subdivision graph: the legend of its pieces (a lone piece is simply "Krivulja"). `en` must have exactly `sl`'s keys.
const sl = {
    "repeated_subdivision_pieces": "Kosi krivulje",
    "repeated_subdivision_pieces_alt": "Sosednji kosi",
} as const;

export const repeatedSubdivision = {
    sl,
    en: {
        "repeated_subdivision_pieces": "Pieces of the curve",
        "repeated_subdivision_pieces_alt": "Neighbouring pieces",
    } satisfies Record<keyof typeof sl, string>,
};
