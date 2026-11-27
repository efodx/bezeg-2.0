// Declaration text of the monotone partition graph (ADR 0066). `en` must have exactly `sl`'s keys.
const sl = {
    "monotonepartition_legend_status": "Robovi v stanju",
    "monotonepartition_legend_diagonal": "Diagonala",
    "monotonepartition_legend_pieces": "Monotoni kosi",
    "monotonepartition_legend_types": "Vrste oglišč",
} as const;

export const monotonePartition = {
    sl,
    en: {
        "monotonepartition_legend_status": "Edges in the status",
        "monotonepartition_legend_diagonal": "Diagonal",
        "monotonepartition_legend_pieces": "Monotone pieces",
        "monotonepartition_legend_types": "Vertex types",
    } satisfies Record<keyof typeof sl, string>,
};
