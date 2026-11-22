import type {FitBox} from '../../graphs/base/fitBoundingBox';
import type {Point, Rect} from './viewFit';

/**
 * Pure core of the view director (docs/reviews/ux-picks, Fable consult 2026-11-22, alternative A): maps the VIEW INTENT (the
 * box the graph chose) into the largest card-free rectangle of the canvas, shrinking the scale by at most `maxOut` (1.6 = to
 * 1/1.6 of the intent's scale). No obstacles: the intent itself. Idempotent: it reads the intent, never the box on screen.
 */
export interface FitIntentInput {
    intent: FitBox;
    canvas: {width: number; height: number};
    /** Cards, px, origin at the canvas top-left. */
    obstacles: readonly Rect[];
    maxOut?: number;
    /** Air kept between a card and the content, px. */
    marginPx?: number;
    equalAxisUnits: boolean;
}

export interface FitIntentResult {
    box: FitBox;
    /** Scale relative to the intent (1 = unchanged, never below 1/maxOut). */
    scale: number;
    /** The card-free rectangle the intent was mapped into (px). */
    rect: Rect;
    /** The free rectangle is smaller than the limit allows: the intent no longer fits the free area. */
    clamped: boolean;
}

export const DEFAULT_MAX_OUT = 1.6;
const MARGIN_PX = 8;

function overlaps(a: Rect, b: Rect): boolean {
    return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** The free rectangle in which the intent is shown at the largest scale; ties go to the one nearest the canvas centre. */
export function largestFreeRect(canvas: {width: number; height: number}, obstacles: readonly Rect[], marginPx = MARGIN_PX): Rect {
    const {width: W, height: H} = canvas;
    const inflated = obstacles
        .map(o => ({x: o.x - marginPx, y: o.y - marginPx, width: o.width + 2 * marginPx, height: o.height + 2 * marginPx}))
        .filter(o => o.width > 0 && o.height > 0 && overlaps(o, {x: 0, y: 0, width: W, height: H}));
    if (inflated.length === 0) return {x: 0, y: 0, width: W, height: H};
    const clampX = (v: number) => Math.min(W, Math.max(0, v)), clampY = (v: number) => Math.min(H, Math.max(0, v));
    const xs = [...new Set([0, W, ...inflated.flatMap(o => [clampX(o.x), clampX(o.x + o.width)])])].sort((a, b) => a - b);
    const ys = [...new Set([0, H, ...inflated.flatMap(o => [clampY(o.y), clampY(o.y + o.height)])])].sort((a, b) => a - b);
    let best: Rect = {x: 0, y: 0, width: 0, height: 0};
    let bestScore = -1, bestDist = Infinity;
    for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) {
        for (let k = 0; k < ys.length; k++) for (let l = k + 1; l < ys.length; l++) {
            const r = {x: xs[i], y: ys[k], width: xs[j] - xs[i], height: ys[l] - ys[k]};
            const score = Math.min(r.width / W, r.height / H);
            if (score < bestScore - 1e-9) continue;
            if (inflated.some(o => overlaps(r, o))) continue;
            const dist = Math.hypot(r.x + r.width / 2 - W / 2, r.y + r.height / 2 - H / 2);
            if (score > bestScore + 1e-9 || dist < bestDist) { best = r; bestScore = score; bestDist = dist; }
        }
    }
    // Cards cover the whole canvas: nothing is free, so nothing moves.
    return bestScore <= 0 ? {x: 0, y: 0, width: W, height: H} : best;
}

export function fitIntent(input: FitIntentInput): FitIntentResult {
    const {intent, canvas, obstacles, equalAxisUnits} = input;
    const maxOut = Math.max(1, input.maxOut ?? DEFAULT_MAX_OUT);
    const rect = largestFreeRect(canvas, obstacles, input.marginPx);
    const raw = Math.min(rect.width / canvas.width, rect.height / canvas.height);
    const scale = Math.min(1, Math.max(1 / maxOut, raw));
    const [left, top, right, bottom] = intent;
    const iw = right - left, ih = top - bottom;
    // Pixels per unit at the intent's own scale (one for both axes when the units are equal).
    const kx0 = equalAxisUnits ? Math.min(canvas.width / iw, canvas.height / ih) : canvas.width / iw;
    const ky0 = equalAxisUnits ? kx0 : canvas.height / ih;
    const kx = kx0 * scale, ky = ky0 * scale;
    const cx = (left + right) / 2, cy = (top + bottom) / 2;
    const rcx = rect.x + rect.width / 2, rcy = rect.y + rect.height / 2;
    const l = cx - rcx / kx, t = cy + rcy / ky;
    const box: FitBox = [l, t, l + canvas.width / kx, t - canvas.height / ky];
    return {box, scale, rect, clamped: raw < 1 / maxOut - 1e-9};
}

/** The marks (world points) that lie off the canvas or under a card in `box`. */
export function coveredMarks(box: FitBox, marks: readonly Point[], canvas: {width: number; height: number}, obstacles: readonly Rect[]): Point[] {
    const [left, top, right, bottom] = box;
    return marks.filter(p => {
        const x = (p[0] - left) / (right - left) * canvas.width, y = (top - p[1]) / (top - bottom) * canvas.height;
        return x < 0 || x > canvas.width || y < 0 || y > canvas.height
            || obstacles.some(o => x > o.x && x < o.x + o.width && y > o.y && y < o.y + o.height);
    });
}
