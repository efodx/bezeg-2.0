import type {IterationStep} from '../../recursion/iteration';
import type {CobwebMap} from '../../recursion/recursionModel';

/** Pure geometry of the cobweb board: windows, the polyline of the steps, samples of the map. No JSXGraph, React or localization. */

/** JSXGraph bounding box [xmin, ymax, xmax, ymin] per map; fixed for a map, so the drawn steps never move the window. */
export const VIEW_BOXES: Readonly<Record<CobwebMap, readonly [number, number, number, number]>> = {
    affine: [-10, 10, 10, -10],
    cosine: [-2, 2, 2, -2],
    // Room under the axis for its number row and the bottom captions, and above the 1 for the map caption.
    logistic: [-0.1, 1.15, 1.1, -0.2],
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
/** The board in pixels: units per pixel are converted back to user coordinates so offsets and text widths hold at any board width. */
export interface CaptionScale {
    readonly unitX: number;
    readonly unitY: number;
    readonly width: number;
}
/** Width of a character of a caption (14 px sans), in pixels, and the height of a caption row. */
export const CAPTION_CHAR_PX = 6.5;
export const CAPTION_ROW_PX = 20;
const CAPTION_GAP_PX = 8;
const CAPTION_HALF_PX = 7;
/** The row of the numbers of the x axis: from 2 px to 20 px under the axis. */
const TICK_ROW_TOP_PX = 2;
const TICK_ROW_DEPTH_PX = 20;

/**
 * Where a board caption (anchored at its left end) stands, in user coordinates of the window of the map. The map and legend captions
 * have fixed places and the diagonal caption stands under the map caption (rows of `CAPTION_ROW_PX`, clear of the lines); on the
 * logistic window the map and diagonal captions start right of the y axis, which would cut them. The start, fixed point and iterate
 * captions stand beside their marker on the diagonal at `value`, or, when that point is outside the window or the caption of `chars`
 * characters would run past the right edge of the board, in a fixed place near the bottom (the start lowest, then the fixed point, then
 * the iterate), moved left far enough to fit, so the caption is still on the board.
 */
export function captionPlace(map: CobwebMap, role: CaptionRole, value = 0, chars = 0, scale?: CaptionScale): CaptionPlace {
    const [xmin, ymax, xmax, ymin] = VIEW_BOXES[map];
    const w = xmax - xmin;
    const h = ymax - ymin;
    const textWidth = chars * CAPTION_CHAR_PX + CAPTION_GAP_PX;
    const bottom = (rows: number): CaptionPlace => {
        const wanted = xmin + 0.3 * w;
        const fitting = scale ? xmin + (scale.width - textWidth) / scale.unitX : wanted;
        return {x: Math.max(xmin + 0.02 * w, Math.min(wanted, fitting)), y: ymin + (0.05 + 0.06 * rows) * h};
    };
    const beside = (dy: number): CaptionPlace => {
        if (!inView(map, value)) return {x: NaN, y: NaN};
        return {x: value + (scale ? CAPTION_GAP_PX / scale.unitX : 0.02 * w), y: value + dy};
    };
    const fits = (place: CaptionPlace): boolean => Number.isFinite(place.x) && (!scale || (place.x - xmin) * scale.unitX + textWidth <= scale.width);
    const row = scale ? CAPTION_ROW_PX / scale.unitY : 0.07 * h;
    const nearAxis = map === 'logistic' ? 0 + (scale ? CAPTION_GAP_PX / scale.unitX : 0.02 * w) : xmin + 0.02 * w;
    const dy = scale ? 0.7 * CAPTION_ROW_PX / scale.unitY : 0.05 * h;
    // A marker in the window whose caption is too wide: the caption goes to a row under the diagonal caption at the top (the bottom has the axis numbers).
    const top = (rows: number): CaptionPlace => ({x: nearAxis, y: ymax - 0.05 * h - row * (2 + rows)});
    // The numbers of the x axis stand in a row under it: a caption beside a marker near the axis moves down below that row (or stays above it).
    const clearOfTicks = (near: CaptionPlace): CaptionPlace => {
        if (!scale || !Number.isFinite(near.y)) return near;
        const centre = near.y * scale.unitY;
        if (centre - CAPTION_HALF_PX >= -TICK_ROW_TOP_PX || centre + CAPTION_HALF_PX <= -TICK_ROW_DEPTH_PX) return near;
        return {x: near.x, y: -(TICK_ROW_DEPTH_PX + CAPTION_HALF_PX + 2) / scale.unitY};
    };
    const place = (near: CaptionPlace, rows: number) => (fits(near) ? clearOfTicks(near) : inView(map, value) ? top(rows) : bottom(rows));
    switch (role) {
        case 'map': return {x: nearAxis, y: ymax - 0.05 * h};
        case 'diagonal': return {x: nearAxis, y: ymax - 0.05 * h - row};
        case 'legend': return {x: xmin + 0.02 * w, y: ymin + 0.05 * h};
        case 'start': return place(beside(-dy), 0);
        case 'fixed': return place(beside(dy), 1);
        case 'iterate': return place(beside(-2.2 * dy), 2);
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
