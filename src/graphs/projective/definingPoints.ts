/**
 * A JSXGraph line made from coefficients owns two anonymous defining points (`point1`, `point2`) that the board keeps after the
 * line is removed. Returns them so the scene that created the line can own and dispose of them; empty for any other element.
 */
export const definingPoints = (element: object): JXG.GeometryElement[] => {
    if (!("point1" in element) || !("point2" in element)) return [];
    const {point1, point2} = element;
    return [point1, point2].filter((helper): helper is JXG.GeometryElement => typeof helper === "object" && helper !== null);
};
