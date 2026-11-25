// Declaration text of the function-inverse graph (ADR 0066): the connector's legend entry and the tangent switch's name. `en` must have exactly `sl`'s keys.
const sl = {
    "function_inverse_legend_connector": "Daljica PP′",
    "function_inverse_tangents": "Tangenti",
} as const;

export const functionInverse = {
    sl,
    en: {
        "function_inverse_legend_connector": "Segment PP′",
        "function_inverse_tangents": "Tangents",
    } satisfies Record<keyof typeof sl, string>,
};
