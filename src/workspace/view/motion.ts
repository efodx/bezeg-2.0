// The one clock of workspace motion (task 07): the view director's glide and the lesson morph share the duration and the curve,
// so a step's view and its numbers arrive together.
export const GLIDE_MS = 250;
export const GLIDE_MAX_MS = 450;
/** Extra milliseconds per unit of distance (one view width of pan = 80 ms; three widths reach the cap). */
const GLIDE_MS_PER_UNIT = 80;

export const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

type Box = readonly [number, number, number, number]; // [xmin, ymax, xmax, ymin]

/** Scale-free size of a view move: pan in widths (per axis) or the log of a zoom, whichever is largest. */
export function glideDistance(from: Box, to: Box): number {
    const fw = Math.abs(from[2] - from[0]), tw = Math.abs(to[2] - to[0]);
    const fh = Math.abs(from[1] - from[3]), th = Math.abs(to[1] - to[3]);
    const axis = (shift: number, a: number, b: number) => (Math.max(a, b) > 0 ? Math.abs(shift) / Math.max(a, b) : 0);
    const panX = axis((from[0] + from[2] - to[0] - to[2]) / 2, fw, tw);
    const panY = axis((from[1] + from[3] - to[1] - to[3]) / 2, fh, th);
    const zoom = (a: number, b: number) => (a > 0 && b > 0 ? Math.abs(Math.log(a / b)) : 0);
    const d = Math.max(panX, panY, zoom(fw, tw), zoom(fh, th));
    return Number.isFinite(d) ? d : 0;
}

/** Duration of a view glide: 250 ms for small moves, longer with distance, capped at 450 ms. */
export function glideDuration(from: Box, to: Box): number {
    return Math.min(GLIDE_MAX_MS, GLIDE_MS + GLIDE_MS_PER_UNIT * glideDistance(from, to));
}

// The step clock: the director publishes the duration of the glide it starts for a step's frame; the lesson morph and the scene
// reveal read it while they run, so one step's view, numbers and reveal arrive together. Falls back to GLIDE_MS.
let stepMs = GLIDE_MS;
export const setStepGlideMs = (ms: number): void => { stepMs = ms; };
export const stepGlideMs = (): number => stepMs;
