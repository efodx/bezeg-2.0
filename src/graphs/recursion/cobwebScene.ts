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
/** The numbers of the y axis stand left of it, up to this wide; the legend keeps this far from the board edges. */
const Y_TICK_WIDTH_PX = 34;
const LEGEND_EDGE_PX = 6;

/** Whether a polyline (user coordinates) crosses a pixel box: x measured from `xmin`, y from the axis (Liang-Barsky on each segment). */
function crossesBox(line: Polyline, xmin: number, scale: CaptionScale, box: {left: number; right: number; bottom: number; top: number}): boolean {
    for (let i = 0; i + 1 < line.x.length; i++) {
        const x0 = (line.x[i] - xmin) * scale.unitX, y0 = line.y[i] * scale.unitY;
        const dx = (line.x[i + 1] - xmin) * scale.unitX - x0, dy = line.y[i + 1] * scale.unitY - y0;
        if (![x0, y0, dx, dy].every(Number.isFinite)) continue;
        let t0 = 0, t1 = 1;
        const edges: [number, number][] = [[-dx, x0 - box.left], [dx, box.right - x0], [-dy, y0 - box.bottom], [dy, box.top - y0]];
        let inside = true;
        for (const [p, q] of edges) {
            if (p === 0) { if (q < 0) { inside = false; break; } continue; }
            const r = q / p;
            if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
            if (t0 > t1) { inside = false; break; }
        }
        if (inside) return true;
    }
    return false;
}

/** The size of a caption wrapped at `room` pixels: its rows and the width of its widest row (words are not broken). */
export function wrapped(text: string | undefined, textPx: number, room: number): {rows: number; widest: number} {
    if (!text) return textPx <= room ? {rows: 1, widest: textPx} : {rows: Math.ceil(textPx / room), widest: room};
    let rows = 1, line = 0, widest = 0;
    for (const word of text.split(' ')) {
        const px = word.length * CAPTION_CHAR_PX;
        const next = line === 0 ? px : line + CAPTION_CHAR_PX + px;
        if (line > 0 && next > room) { rows++; widest = Math.max(widest, line); line = px; } else line = next;
    }
    return {rows, widest: Math.max(widest, line)};
}

/**
 * Where a board caption (anchored at its left end) stands, in user coordinates of the window of the map. The map and legend captions
 * have fixed places and the diagonal caption stands under the map caption (rows of `CAPTION_ROW_PX`, clear of the lines); on the
 * logistic window the map and diagonal captions start right of the y axis, which would cut them. The start, fixed point and iterate
 * captions stand beside their marker on the diagonal at `value`, or, when that point is outside the window or the caption of `chars`
 * characters would run past the right edge of the board, in a fixed place near the bottom (the start lowest, then the fixed point, then
 * the iterate), moved left far enough to fit, so the caption is still on the board.
 */
export function captionPlace(map: CobwebMap, role: CaptionRole, value = 0, chars = 0, scale?: CaptionScale, curve?: (x: number) => number, text?: string, frame: readonly [number, number, number, number] = VIEW_BOXES[map]): CaptionPlace {
    const [xmin, ymax, xmax, ymin] = frame;
    const inView = (_map: CobwebMap, at: number) => Number.isFinite(at) && at >= xmin && at <= xmax;
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
    // The legend caption wraps at the right edge of the board into `rows` rows, centred vertically on its place. It takes the first of
    // bottom-left, bottom-right, top-left (under the map and diagonal captions), top-right whose box misses the number row of the x axis, the
    // numbers and the line of the y axis, the map curve and the diagonal, and stays on the board; else the first that misses only the lines;
    // else (or no size known) the old place.
    const legendPlace = (): CaptionPlace | null => {
        if (!scale || !curve || chars <= 0) return null;
        const sc = scale;
        const axisX = -xmin * sc.unitX;
        const textPx = chars * CAPTION_CHAR_PX;
        const lines = [mapSamples(curve, xmin, xmax), {x: [xmin, xmax], y: [xmin, xmax]}];
        const lefts = [CAPTION_GAP_PX, axisX + CAPTION_GAP_PX];
        const topFirstRow = (ymax - 0.05 * h) * sc.unitY - 2 * CAPTION_ROW_PX; // the row under the diagonal caption
        // none clear of the lines either: the first clear of the numbers and the axis (text over a line reads better than over numbers)
        for (const [ignoreLines, atTop, left] of [false, true].flatMap(ignoreLines => [false, true].flatMap(atTop => lefts.map(left => [ignoreLines, atTop, left] as const)))) {
            {
                const room = sc.width - left - LEGEND_EDGE_PX;
                if (room <= 0) continue;
                const {rows, widest} = wrapped(text, textPx, room);
                const boxW = widest;
                const height = rows * CAPTION_ROW_PX;
                const centre = atTop ? topFirstRow - (height - CAPTION_ROW_PX) / 2 : ymin * sc.unitY + LEGEND_EDGE_PX + height / 2;
                const box = {left, right: left + boxW, bottom: centre - height / 2, top: centre + height / 2};
                if (box.left < 0 || box.right > sc.width || box.bottom < ymin * sc.unitY || box.top > ymax * sc.unitY) continue;
                if (box.top > -TICK_ROW_DEPTH_PX && box.bottom < -TICK_ROW_TOP_PX) continue; // the number row of the x axis
                if (box.right > axisX - Y_TICK_WIDTH_PX && box.left < axisX + 2) continue; // the y axis and its numbers
                if (!ignoreLines && lines.some(line => crossesBox(line, xmin, sc, box))) continue;
                return {x: xmin + left / sc.unitX, y: centre / sc.unitY};
            }
        }
        return null;
    };
    switch (role) {
        case 'map': return {x: nearAxis, y: ymax - 0.05 * h};
        case 'diagonal': return {x: nearAxis, y: ymax - 0.05 * h - row};
        case 'legend': return legendPlace() ?? {x: xmin + 0.02 * w, y: ymin + 0.05 * h};
        case 'start': return place(beside(-dy), 0);
        case 'fixed': {
            const usual = place(beside(dy), 1);
            if (!scale || !curve || !inView(map, value)) return usual;
            const sc = scale;
            const width = chars * CAPTION_CHAR_PX;
            const gapX = CAPTION_GAP_PX / sc.unitX;
            const lines = [mapSamples(curve, xmin, xmax), {x: [xmin, xmax], y: [xmin, xmax]}];
            // above-right (the usual place), below-right, above-left, below-left of the marker; the first box clear of both lines and the number row, inside the board
            const candidates: CaptionPlace[] = [
                {x: value + gapX, y: value + dy}, {x: value + gapX, y: value - dy},
                {x: value - textWidth / sc.unitX, y: value + dy}, {x: value - textWidth / sc.unitX, y: value - dy},
            ];
            // Where the map crosses the diagonal the other way (a falling map) those four sit in the lines' wedges: stand level with the marker, further out.
            for (const out of [16, 28, 44, 64]) {
                candidates.push({x: value + out / sc.unitX, y: value}, {x: value - (out + width) / sc.unitX, y: value});
            }
            for (const candidate of candidates) {
                const near = clearOfTicks(candidate);
                if (!fits(near) || near.x < xmin) continue;
                const box = {left: (near.x - xmin) * sc.unitX, right: (near.x - xmin) * sc.unitX + width, bottom: near.y * sc.unitY - CAPTION_HALF_PX - 2, top: near.y * sc.unitY + CAPTION_HALF_PX + 2};
                if (box.bottom < ymin * sc.unitY || box.top > ymax * sc.unitY) continue;
                if (lines.every(line => !crossesBox(line, xmin, sc, box))) return near;
            }
            return usual;
        }
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
