/**
 * The math form of a point-set label, in the delimiter form the shared point labels use (`"$$p_{0}$$"`):
 * letters followed by digits, with or without an underscore, become a subscript ("P1" and "A_0" to `P_{1}`, `A_{0}`),
 * anything else is typeset as it is. The JSXGraph `name` of the element stays the plain text.
 */
export function pointSetLabelMath(name: string): string {
    const subscripted = /^([A-Za-z]+)_?(\d+)$/.exec(name);
    return `$$${subscripted ? `${subscripted[1]}_{${subscripted[2]}}` : name}$$`;
}
