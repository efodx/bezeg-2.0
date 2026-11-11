import type {IterationStep} from '../../recursion/iteration';
import type {CobwebMap} from '../../recursion/recursionModel';

/** Pure geometry of the cobweb board: windows, the polyline of the steps, samples of the map. No JSXGraph, React or localization. */

/** JSXGraph bounding box [xmin, ymax, xmax, ymin] per map; fixed for a map, so the drawn steps never move the window. */
export const VIEW_BOXES: Readonly<Record<CobwebMap, readonly [number, number, number, number]>> = {
    affine: [-10, 10, 10, -10],
    cosine: [-2, 2, 2, -2],
    logistic: [-0.1, 1.1, 1.1, -0.1],
};

/** Whether the point (value, value) of the diagonal lies inside the window of the map. */
export function inView(map: CobwebMap, value: number): boolean {
    const [xmin, , xmax] = VIEW_BOXES[map];
    return Number.isFinite(value) && value >= xmin && value <= xmax;
}

/** Past this size a coordinate is far outside every window and the polyline stops there, so the renderer never gets overflowing numbers. */
export const DRAW_LIMIT = 1e6;

export interface Polyline {
    readonly x: number[];
    readonly y: number[];
}

/**
 * The cobweb of the steps: it starts at (x0, x0) and each step {from, to} adds (from, to) and (to, to), the vertical segment to the map
 * and the horizontal one to the diagonal. The list of vertices is exactly the list of `{from, to}` of the iteration; it stops (without
 * the offending step) at the first non-finite coordinate or one beyond `limit` in size.
 */
export function cobwebPath(x0: number, steps: readonly IterationStep[], limit = DRAW_LIMIT): Polyline {
    const x: number[] = [];
    const y: number[] = [];
    if (!Number.isFinite(x0) || Math.abs(x0) > limit) return {x, y};
    x.push(x0);
    y.push(x0);
    for (const step of steps) {
        if (!Number.isFinite(step.to) || Math.abs(step.to) > limit) break;
        x.push(step.from, step.to);
        y.push(step.to, step.to);
    }
    return {x, y};
}

/** `count` + 1 equally spaced samples of the map on [xmin, xmax]. */
export function mapSamples(map: (x: number) => number, xmin: number, xmax: number, count = 200): Polyline {
    const x: number[] = [];
    const y: number[] = [];
    for (let i = 0; i <= count; i++) {
        const at = xmin + ((xmax - xmin) * i) / count;
        x.push(at);
        y.push(map(at));
    }
    return {x, y};
}

const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉';
/** A whole number as subscript digits ("x" + subscript(12) is x₁₂). */
export const subscript = (n: number): string => String(Math.max(0, Math.floor(n))).replace(/\d/g, digit => SUBSCRIPTS[Number(digit)]);

export type CaptionRole = 'map' | 'diagonal' | 'legend' | 'start' | 'fixed' | 'iterate';
export interface CaptionPlace {
    readonly x: number;
    readonly y: number;
}

/**
 * Where a board caption (anchored at its left end) stands, in user coordinates of the window of the map. The map, diagonal and legend
 * captions have fixed places; the start, fixed point and iterate captions stand beside their marker on the diagonal at `value`, or,
 * when that point is outside the window, in a fixed place near the bottom (the start lowest, then the fixed point, then the iterate), so
 * the caption is still on the board.
 */
export function captionPlace(map: CobwebMap, role: CaptionRole, value = 0): CaptionPlace {
    const [xmin, ymax, xmax, ymin] = VIEW_BOXES[map];
    const w = xmax - xmin;
    const h = ymax - ymin;
    const bottom = (rows: number): CaptionPlace => ({x: xmin + 0.3 * w, y: ymin + (0.05 + 0.06 * rows) * h});
    switch (role) {
        case 'map': return {x: xmin + 0.02 * w, y: ymax - 0.05 * h};
        case 'diagonal': return {x: xmax - 0.25 * w, y: xmax - 0.25 * w - 0.06 * h};
        case 'legend': return {x: xmin + 0.02 * w, y: ymin + 0.05 * h};
        case 'start': return inView(map, value) ? {x: value + 0.02 * w, y: value - 0.05 * h} : bottom(0);
        case 'fixed': return inView(map, value) ? {x: value + 0.02 * w, y: value + 0.05 * h} : bottom(1);
        case 'iterate': return inView(map, value) ? {x: value + 0.02 * w, y: value - 0.11 * h} : bottom(2);
    }
}

/**
 * The equation of the affine map as text, "y = m·x + c" (a zero intercept leaves "+ c" out, a negative one reads "− |c|"); `fmt` formats a
 * number in the language of the page. Pure: the sign of c is decided by the number, not by the text.
 */
export function affineEquation(m: number, c: number, fmt: (value: number) => string): string {
    const slope = `y = ${fmt(m)}·x`;
    if (c === 0) return slope;
    return `${slope} ${c < 0 ? '−' : '+'} ${fmt(Math.abs(c))}`;
}
