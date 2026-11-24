import type {FitBox} from '../../graphs/base/fitBoundingBox';
import type {Point, Rect} from './viewFit';

/**
 * Pure core of the view director: maps the VIEW INTENT (the box the graph chose) into the card-free rectangle the layout
 * leaves (`freeRect(layout)`), shrinking the scale by at most `maxOut` (2.2 = to 1/2.2 of the intent's scale). Free rectangle
 * equal to the canvas: the intent itself. Idempotent: it reads the intent, never the box on screen, and never changes it.
 */
export interface FitIntentInput {
    /** Read only: the fit returns a new box. */
    intent: Readonly<FitBox>;
    canvas: {width: number; height: number};
    /** The card-free rectangle, px, origin at the canvas top-left (`freeRect(layout)`). */
    free: Rect;
    maxOut?: number;
    /** Air kept between a card and the content, px, on the sides of the free rectangle that do not lie on the canvas edge. */
    marginPx?: number;
    equalAxisUnits: boolean;
}

export interface FitIntentResult {
    box: FitBox;
    /** Scale relative to the intent (1 = unchanged, never below 1/maxOut). */
    scale: number;
    /** The rectangle the intent was mapped into (the free rectangle less the margin, px). */
    rect: Rect;
    /** The free rectangle is smaller than the limit allows: the intent no longer fits the free area. */
    clamped: boolean;
}

/** Cards on both sides of a small canvas leave about half of it, so 1.6 left curve tails under them; 2.2 keeps every such case unclamped. */
export const DEFAULT_MAX_OUT = 2.2;
export const DEFAULT_MARGIN_PX = 8;

/** The free rectangle clipped to the canvas and pulled in by the margin where it borders a card. */
export function insetFree(canvas: {width: number; height: number}, free: Rect, marginPx = DEFAULT_MARGIN_PX): Rect {
    const {width: W, height: H} = canvas;
    const x0 = Math.max(0, free.x), y0 = Math.max(0, free.y);
    const x1 = Math.min(W, free.x + free.width), y1 = Math.min(H, free.y + free.height);
    if (!(x1 > x0) || !(y1 > y0)) return {x: 0, y: 0, width: W, height: H}; // nothing free: nothing moves
    const l = x0 > 0 ? marginPx : 0, t = y0 > 0 ? marginPx : 0;
    const r = x1 < W ? marginPx : 0, b = y1 < H ? marginPx : 0;
    const width = x1 - x0 - l - r, height = y1 - y0 - t - b;
    if (!(width > 0) || !(height > 0)) return {x: x0, y: y0, width: x1 - x0, height: y1 - y0};
    return {x: x0 + l, y: y0 + t, width, height};
}

export function fitIntent(input: FitIntentInput): FitIntentResult {
    const {intent, canvas, equalAxisUnits} = input;
    const maxOut = Math.max(1, input.maxOut ?? DEFAULT_MAX_OUT);
    const rect = insetFree(canvas, input.free, input.marginPx);
    const [left, top, right, bottom] = intent;
    const iw = right - left, ih = top - bottom;
    // Pixels per unit at the intent's own scale (one for both axes when the units are equal).
    const kx0 = equalAxisUnits ? Math.min(canvas.width / iw, canvas.height / ih) : canvas.width / iw;
    const ky0 = equalAxisUnits ? kx0 : canvas.height / ih;
    // Shrink only as far as the intent's own extent (not the whole canvas) needs: with equal units the intent may be narrower
    // than the canvas, and then a pan into the free rectangle is enough.
    const raw = Math.min(rect.width / (iw * kx0), rect.height / (ih * ky0));
    const scale = Math.min(1, Math.max(1 / maxOut, raw));
    const kx = kx0 * scale, ky = ky0 * scale;
    const cx = (left + right) / 2, cy = (top + bottom) / 2;
    const rcx = rect.x + rect.width / 2, rcy = rect.y + rect.height / 2;
    const l = cx - rcx / kx, t = cy + rcy / ky;
    const box: FitBox = [l, t, l + canvas.width / kx, t - canvas.height / ky];
    return {box, scale, rect, clamped: raw < 1 / maxOut - 1e-9};
}

/** The marks (world points) that lie off the canvas or under a card in `box`. */
export function coveredMarks(box: Readonly<FitBox>, marks: readonly Point[], canvas: {width: number; height: number}, obstacles: readonly Rect[]): Point[] {
    const [left, top, right, bottom] = box;
    return marks.filter(p => {
        const x = (p[0] - left) / (right - left) * canvas.width, y = (top - p[1]) / (top - bottom) * canvas.height;
        return x < 0 || x > canvas.width || y < 0 || y > canvas.height
            || obstacles.some(o => x > o.x && x < o.x + o.width && y > o.y && y < o.y + o.height);
    });
}
