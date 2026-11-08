import type {Point2} from "./placement";

/** A JSXGraph bounding box `[left, top, right, bottom]`; either vertical orientation is accepted. */
export type ViewBox = readonly [number, number, number, number];

/** Whether any framed point lies strictly outside the box. A point exactly on the edge is inside. */
export function isOutsideView(box: ViewBox, framed: readonly Point2[]): boolean {
    const [left, top, right, bottom] = box;
    const xMin = Math.min(left, right), xMax = Math.max(left, right);
    const yMin = Math.min(top, bottom), yMax = Math.max(top, bottom);
    return framed.some(([x, y]) => x < xMin || x > xMax || y < yMin || y > yMax);
}

/**
 * Refits only when some framed point is outside the view; returns whether it did.
 * An add or a typed edit calls this with everything the graph frames for the new point (e.g. Hermite tangent tips);
 * a drag never calls it.
 */
export function refitWhenOutside(box: ViewBox, framed: readonly Point2[], refit: () => void): boolean {
    if (!isOutsideView(box, framed)) return false;
    refit();
    return true;
}
