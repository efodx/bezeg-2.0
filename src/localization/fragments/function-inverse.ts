// Declaration text of the function-inverse graph (ADR 0066): the connector's legend entry and the tangent switch's name and the x0 puck's bare name. `en` must have exactly `sl`'s keys.
const sl = {
    "function_inverse_legend_connector": "Daljica PP′",
    "function_inverse_tangents": "Tangenti",
    "function_inverse_legend_point_p": "Točka P",
    "function_inverse_legend_point_mirror": "Zrcalna točka P′",
    "function_inverse_x0_name": "Abscisa točke P",
} as const;

export const functionInverse = {
    sl,
    en: {
        "function_inverse_legend_connector": "Segment PP′",
        "function_inverse_tangents": "Tangents",
        "function_inverse_legend_point_p": "Point P",
        "function_inverse_legend_point_mirror": "Mirror point P′",
        "function_inverse_x0_name": "Abscissa of P",
    } satisfies Record<keyof typeof sl, string>,
};
