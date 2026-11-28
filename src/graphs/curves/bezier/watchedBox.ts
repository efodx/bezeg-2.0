import type {ViewMarks} from "../../base/declare/graphDeclaration";

/**
 * The box a subdivision graph's view frames: the control points and curve samples with a fifth of room around and double room
 * above for the point tags. Without it the lesson scene's wide box is widened to the canvas and the curve is a speck in the
 * card-free strip. Undefined when there is nothing to frame.
 */
export function watchedBox(marks: ViewMarks | undefined): [number, number, number, number] | undefined {
    const points = [...(marks?.must ?? []), ...(marks?.nice ?? [])].flatMap(mark => mark.kind === "point" ? [[mark.x, mark.y]] : mark.kind === "polyline" ? mark.points.map(p => [p[0], p[1]]) : []);
    if (points.length === 0) return undefined;
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    const left = Math.min(...xs), right = Math.max(...xs), bottom = Math.min(...ys), top = Math.max(...ys);
    const pad = Math.max(0.2 * Math.max(right - left, top - bottom), 0.5);
    return [left - pad, top + 2 * pad, right + pad, bottom - pad];
}
