// Declaration text of the function transformation graph (ADR 0066). `en` must have exactly `sl`'s keys.
const sl = {
    "transformations_rule_value": "y = {value0}f({value1}){value2}",
    "transformations_point_value": "({value0}; {value1})",
    "transformations_base_square": "f(x) = x²",
    "transformations_base_cube": "f(x) = x³",
    "transformations_base_sqrt": "f(x) = √x",
    "transformations_base_reciprocal": "f(x) = 1/x",
    "transformations_base_abs": "f(x) = |x|",
    "transformations_base_exp": "f(x) = eˣ",
    "transformations_base_ln": "f(x) = ln x",
} as const;

export const transformations = {
    sl,
    en: {
        "transformations_rule_value": "y = {value0}f({value1}){value2}",
        "transformations_point_value": "({value0}, {value1})",
        "transformations_base_square": "f(x) = x²",
        "transformations_base_cube": "f(x) = x³",
        "transformations_base_sqrt": "f(x) = √x",
        "transformations_base_reciprocal": "f(x) = 1/x",
        "transformations_base_abs": "f(x) = |x|",
        "transformations_base_exp": "f(x) = eˣ",
        "transformations_base_ln": "f(x) = ln x",
    } satisfies Record<keyof typeof sl, string>,
};
