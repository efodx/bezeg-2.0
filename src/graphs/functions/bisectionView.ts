/** How far the bisection view may zoom in: the box is never narrower than the starting width divided by this (2^12). */
export const BISECTION_ZOOM_LIMIT = 4096;
/** The bracket fills this share of the view's width. */
const BRACKET_SHARE = 0.6;
const SAMPLES = 33;
const Y_PADDING = 0.15;

export type ViewBox = [left: number, top: number, right: number, bottom: number];

export interface BisectionViewInput {
    /** The scene's own view (the graph's or a lesson's), which step 0 shows and no step exceeds. */
    base: Readonly<ViewBox>;
    step: number;
    /** The bracket after `step` steps. */
    a: number;
    b: number;
    f: (x: number) => number;
    /**
     * World width per world height of the board when both axes share one unit (canvas width / canvas height). Given, the box keeps
     * this aspect and covers the bracket, f(a), f(b) and y = 0, so the board shows it as computed; without it the y-range is free.
     */
    aspect?: number;
}

/**
 * The view bisection steps toward, a pure function of the state, centred on the bracket. With `aspect` (equal axis units, as the
 * function demonstrations draw): the smallest box of that aspect holding the bracket at no more than 60 % of the width and
 * the values f(a), f(b) and y = 0 with 15 % padding, so both value points and the sign change stay in view. Without `aspect`: the
 * bracket fills 60 % of the width and y covers f over that x-range and y = 0. Never wider than `base`, never zoomed in past 2^12
 * times its width, and `base` itself at step 0 or when the bracket is unusable.
 */
export function bisectionIntentBox({base, step, a, b, f, aspect}: BisectionViewInput): ViewBox {
    const [left, top, right, bottom] = base;
    const baseWidth = right - left, baseHeight = top - bottom;
    if (step <= 0 || !Number.isFinite(a) || !Number.isFinite(b) || !(b > a) || !(baseWidth > 0) || !(baseHeight > 0)) return [...base];
    const centre = (a + b) / 2;
    if (aspect !== undefined && Number.isFinite(aspect) && aspect > 0) {
        const values = [0, f(a), f(b)].filter(Number.isFinite);
        const low = Math.min(...values), high = Math.max(...values);
        const span = (high - low) * (1 + 2 * Y_PADDING);
        const width = Math.min(baseWidth, Math.max(baseWidth / BISECTION_ZOOM_LIMIT, (b - a) / BRACKET_SHARE, span * aspect));
        const height = width / aspect, middle = (low + high) / 2;
        return [centre - width / 2, middle + height / 2, centre + width / 2, middle - height / 2];
    }
    const width = Math.min(baseWidth, Math.max(baseWidth / BISECTION_ZOOM_LIMIT, (b - a) / BRACKET_SHARE));
    const x0 = centre - width / 2, x1 = centre + width / 2;
    let low = 0, high = 0;
    for (let i = 0; i < SAMPLES; i++) {
        const y = f(x0 + (x1 - x0) * i / (SAMPLES - 1));
        if (!Number.isFinite(y)) continue;
        low = Math.min(low, y);
        high = Math.max(high, y);
    }
    const pad = (high - low) * Y_PADDING;
    let yTop = high + pad, yBottom = low - pad;
    if (!(yTop > yBottom)) return [x0, top, x1, bottom];
    if (yTop - yBottom > baseHeight) { yTop = top; yBottom = bottom; }
    return [x0, yTop, x1, yBottom];
}
