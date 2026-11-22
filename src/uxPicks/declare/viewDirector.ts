import type {FitBox} from '../../graphs/base/fitBoundingBox';
import {prefersReducedMotion} from '../../graphs/base/controls/reducedMotion';
import {pickOn} from '../picks';
import {coveredMarks, DEFAULT_MAX_OUT, fitIntent} from './fitIntent';
import {getGraphUx} from './graphUxStore';
import {computeFit, mustNeedsRefit, obstacleKey, obstacleRects} from './useViewFit';
import {autoFitOn, getViewPort, setFreeRect} from './viewPort';
import {fitView, type Point} from './viewFit';

/**
 * The view director (Fable consult 2026-11-22, "one shared view director"): while pick `viewDirector` is on, the ONLY code that
 * sets the board's box after a graph has chosen its view. A graph (or a lesson frame, a preset) states an intent; every cause of
 * a change (load, example or mode switch, lesson frame, resize, card change, parameter release, the button) is `request(reason)`.
 * The target is computed once (`fitIntent`: the intent mapped into the largest card-free rectangle, zoom out at most `maxOut`;
 * a graph that declares `GraphUx.focus`, or marks that stay covered, falls back to `fitView`) and ONE transition runs from the
 * box on screen. A lesson morph drives the same transition with its own clock (`beginMorph`, `progress`, `endMorph`).
 */
export type Reason = 'port' | 'intent' | 'action' | 'dock' | 'resize' | 'params' | 'auto';

const GLIDE_MS = 250;
/** Where on the morph's easing curve the view stands when the scene's clock ends (see `progress`). */
const VIEW_END = 0.8;
/** A card or canvas change this soon after a motion is its tail (the readouts a finished scene shows): continue at once, not as a second glide after a pause. */
const TAIL_MS = 500, TAIL_DELAY = 0, ACTION_MS = 400;
const DELAY: Record<Reason, number> = {port: 60, intent: 60, action: 220, dock: 140, resize: 140, params: 0, auto: 60};
/** The morph's easing (b1/morph.ts), so scene and view share one curve. */
const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
/** A picture that names its corners has no empty margin to give up first, so it may shrink further than a whole intent (2.2) before a card has to cover part of it. */
const NAMED_MAX_OUT = 3;
/** A picture that fills its free rectangle may grow to this many times the intent's scale (a handful of points in a canvas-wide intent). */
const NAMED_MAX_IN = 8;
const smooth = (k: number) => k * k * (3 - 2 * k);
const same = (a: FitBox, b: FitBox) => a.every((v, i) => Math.abs(v - b[i]) < 1e-9 * (1 + Math.abs(v)));

export function directorOn(): boolean { return pickOn('viewDirector'); }

interface Morph {from: FitBox; to: FitBox; intent: FitBox; key: string; e: number}

const s = {
    paused: false, down: false, applying: false, timer: 0, reason: 'auto' as Reason, dockOnly: false, pendingFit: false, pendingParams: false, frame: 0, movedAt: -1e9, actionAt: -1e9,
    fitKey: undefined as string | undefined, morph: undefined as Morph | undefined,
    maxOut: DEFAULT_MAX_OUT, useFocus: true, marks: [] as Point[],
};

function cancelGlide() { cancelAnimationFrame(s.frame); s.frame = 0; }
function clearTimer() { window.clearTimeout(s.timer); s.timer = 0; }
function run(box: FitBox) {
    const port = getViewPort();
    if (!port) return;
    s.applying = true;
    try { port.apply(box); } finally { s.applying = false; }
}

/** The widest-by-tallest card-free rectangle (by area) of the canvas: every rectangle bounded by canvas and obstacle edges is tried. */
function largestFreeRect(canvas: {width: number; height: number}, obstacles: readonly {x: number; y: number; width: number; height: number}[]): {width: number; height: number} {
    const xs = [0, canvas.width, ...obstacles.flatMap(o => [o.x, o.x + o.width])].map(v => Math.min(canvas.width, Math.max(0, v))).sort((a, b) => a - b);
    const ys = [0, canvas.height, ...obstacles.flatMap(o => [o.y, o.y + o.height])].map(v => Math.min(canvas.height, Math.max(0, v))).sort((a, b) => a - b);
    let best = {width: 0, height: 0};
    for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) for (let k = 0; k < ys.length; k++) for (let l = k + 1; l < ys.length; l++) {
        const w = xs[j] - xs[i], h = ys[l] - ys[k];
        if (w * h <= best.width * best.height) continue;
        const hit = obstacles.some(o => o.x < xs[j] - 0.5 && o.x + o.width > xs[i] + 0.5 && o.y < ys[l] - 0.5 && o.y + o.height > ys[k] + 0.5);
        if (!hit) best = {width: w, height: h};
    }
    return best;
}

/** The box the director wants for `intent` (default: the graph's current one) under the cards as they are now. */
export function computeTarget(intentOverride?: FitBox, excludeObstacles?: string): FitBox | undefined {
    const port = getViewPort();
    const intent = intentOverride ?? port?.intent();
    if (!port || !intent) return undefined;
    const rect = port.container.getBoundingClientRect();
    if (rect.width < 50 || rect.height < 50) return undefined;
    if (s.useFocus && getGraphUx()?.focus) {
        const declared = computeFit('keep', intent);
        if (declared) return declared.box;
    }
    const canvas = {width: rect.width, height: rect.height};
    const obstacles = obstacleRects(port.container, excludeObstacles);
    // A graph that names the corners of its picture (`ViewPort.marks`): the least zoom-out that keeps them all clear of the cards,
    // not the whole intent (with its margins) squeezed into the largest free rectangle.
    setFreeRect(largestFreeRect(canvas, obstacles));
    let content: ReturnType<NonNullable<typeof port.marks>>;
    try { content = port.marks?.(); } finally { setFreeRect(undefined); }
    if (content && content.length > 0) {
        const fills = port.fillsMarks?.() === true;
        const named = fitView({
            must: content.map(p => [p[0], p[1]] as Point), canvas, obstacles, base: intent, equalAxisUnits: port.equalAxisUnits,
            limits: {maxOut: Math.max(s.maxOut, NAMED_MAX_OUT), maxIn: fills ? NAMED_MAX_IN : 1}, mode: fills ? 'fill' : 'keep',
        });
        if (named.covered.length === 0) return named.box;
    }
    const result = fitIntent({intent, canvas, obstacles, maxOut: s.maxOut, equalAxisUnits: port.equalAxisUnits});
    if (s.marks.length > 0 && coveredMarks(result.box, s.marks, canvas, obstacles).length > 0) {
        const marked = fitView({
            must: s.marks, canvas, obstacles, base: intent, equalAxisUnits: port.equalAxisUnits,
            limits: {maxOut: s.maxOut, maxIn: 1}, mode: 'keep',
        });
        if (marked.covered.length < coveredMarks(result.box, s.marks, canvas, obstacles).length) return marked.box;
    }
    return result.box;
}

/** One glide from the box on screen to `target`; a second call retargets from where the view is now. */
function goTo(target: FitBox, finish = false) {
    const port = getViewPort();
    if (!port) return;
    cancelGlide();
    const from = port.current();
    // A difference of a pixel or ten (a card that grew by a line) is not worth a motion: the fit is always computed from the intent, so nothing accumulates.
    // A tail (the view was just moving) skips a bit more: a card that slides a few tens of pixels after a motion is not worth a second one.
    const tail = performance.now() - s.movedAt < TAIL_MS;
    const small = (tail ? 0.025 : 0.012) * Math.abs(from[2] - from[0]);
    if (same(from, target) || (!finish && from.every((v, i) => Math.abs(v - target[i]) < small))) return;
    if (prefersReducedMotion()) { run(target); return; }
    // A tail starts fast: an eased-in start is a pause the eye reads as a second motion.
    const start = performance.now();
    const tick = (now: number) => {
        const k = Math.min(1, (now - start) / GLIDE_MS);
        run(k >= 1 ? target : from.map((v, i) => v + (target[i] - v) * (tail ? 1 - (1 - k) * (1 - k) : smooth(k))) as FitBox);
        s.frame = k < 1 ? requestAnimationFrame(tick) : 0;
        s.movedAt = now;
    };
    s.frame = requestAnimationFrame(tick);
}

function fit(finish = false) {
    const port = getViewPort();
    s.fitKey = port ? obstacleKey(port.container) : undefined;
    const target = computeTarget();
    if (target) goTo(target, finish);
}

function fire() {
    s.timer = 0;
    if (s.down) { s.pendingFit = true; return; }
    if (s.paused || !autoFitOn()) return;
    const dockOnly = s.dockOnly;
    s.dockOnly = false;
    // A hint or hover cue in the dock changed nothing the fit avoids: leave the view where it is.
    const port = getViewPort();
    if (dockOnly && port && s.fitKey !== undefined && obstacleKey(port.container) === s.fitKey) return;
    fit();
}

/**
 * A card that settles during the motion (the lesson card's height glide, typeset maths) changes where the fit lands. Retarget the
 * open transition then, rebased so the box on screen does not move at that instant, so the motion ends on the settled fit and no
 * second glide follows it. Past 98 % of the curve the end-of-morph request takes over.
 */
function retargetMorph(m: Morph, e: number, force = false) {
    const port = getViewPort();
    m.e = e;
    if (!port || e > 0.98) return;
    const key = obstacleKey(port.container);
    if (key === m.key && !force) return;
    m.key = key;
    const to = computeTarget(m.intent);
    if (!to) return;
    const cur = m.from.map((v, i) => v + (m.to[i] - v) * e);
    m.from = cur.map((c, i) => (c - to[i] * e) / (1 - e)) as FitBox;
    m.to = to;
}

export const director = {
    /** Every cause of a view change. A new frame, a view of the graph's own or the switch coming on ends the learner's pause. */
    request(reason: Reason, delay = DELAY[reason]) {
        if (!directorOn()) return;
        if (reason === 'action') s.actionAt = performance.now();
        if (reason === 'port' || reason === 'intent' || reason === 'action' || reason === 'auto') s.paused = false;
        if (s.morph) {
            // Interpolated restores only record intent; a card or canvas change retargets the open transition.
            if (reason === 'dock' || reason === 'resize') retargetMorph(s.morph, s.morph.e, true);
            return;
        }
        // Any other trigger pending makes the fit unconditional.
        s.dockOnly = reason === 'dock' && (s.timer === 0 || s.dockOnly);
        clearTimer();
        if ((reason === 'dock' || reason === 'resize') && performance.now() - s.movedAt < TAIL_MS) delay = Math.min(delay, TAIL_DELAY);
        s.timer = window.setTimeout(fire, delay);
    },
    /** "Prilagodi točkam": the same fit, now, and the learner's pause ends. */
    fitNow() { s.paused = false; clearTimer(); s.dockOnly = false; s.morph = undefined; fit(); },
    /** The learner moved the view: nothing moves it until the button or a new frame. */
    pause() { s.paused = true; s.morph = undefined; cancelGlide(); clearTimer(); },
    /** Pointer state: while a press is down nothing moves; the release runs what was held back. */
    press(down: boolean) {
        s.down = down;
        if (down) return;
        if (s.pendingFit) { s.pendingFit = false; director.request('resize', 0); }
        if (s.pendingParams) { s.pendingParams = false; director.paramsChanged(); }
    },
    /** A parameter changed: refit only when a must point (declared focus or mark) is under a card or off the canvas. */
    paramsChanged() {
        if (!directorOn() || s.paused || !autoFitOn() || s.morph) return;
        if (s.down) { s.pendingParams = true; return; }
        const port = getViewPort();
        if (!port) return;
        const [left, top, right, bottom] = port.current();
        const rect = port.container.getBoundingClientRect();
        const covered = (getGraphUx()?.focus && mustNeedsRefit())
            || (s.marks.length > 0 && coveredMarks([left, top, right, bottom], s.marks, {width: rect.width, height: rect.height}, obstacleRects(port.container)).length > 0);
        if (covered) fit();
    },
    /** A lesson morph opens: the destination intent is already set, so the transition runs from the box on screen to its fit. */
    beginMorph(): boolean {
        if (!directorOn() || s.paused || !autoFitOn()) return false;
        const port = getViewPort(), intent = port?.intent();
        if (!port || !intent) return false;
        clearTimer(); cancelGlide();
        const to = computeTarget(intent);
        if (!to) return false;
        s.morph = {from: port.current(), to, intent, key: obstacleKey(port.container), e: 0};
        return true;
    },
    /** The morph's clock: `t` in 0..1, eased as the scene is. */
    progress(t: number) {
        const m = s.morph;
        if (!m) return;
        // The view's clock stops at VIEW_END of the curve: a card that settles only when the scene ends (the readouts of the finished
        // scene) moves the fit after the motion has eased to rest, which read as a second glide. The view is still moving then, and
        // endMorph carries it on to the settled fit in one tail glide.
        const e = ease(VIEW_END * Math.min(1, Math.max(0, t)));
        retargetMorph(m, e);
        run(m.from.map((v, i) => v + (m.to[i] - v) * e) as FitBox);
        s.movedAt = performance.now();
    },
    endMorph() {
        if (!s.morph) return;
        s.morph = undefined;
        s.movedAt = performance.now();
        clearTimer();
        if (s.down) { s.pendingFit = true; return; }
        if (s.paused || !autoFitOn()) return;
        fit(true); // the continuation of the morph to the fit under the cards as they are now (a tail glide: fast start, eases out)
    },
    /**
     * True while a lesson morph runs and for ACTION_MS after a lesson frame's action: view boxes a graph writes then (a frame that
     * sets its view twice, a restore) are the frame's intent, not the graph animating its own view, so the seam (BaseGraph
     * `installBoxSeam`) must not show the second one at once (Lagrange: the unfitted intent flashed for 200 ms, then glided back).
     */
    morphing(): boolean { return s.morph !== undefined || performance.now() - s.actionAt < ACTION_MS; },
    /** Optional must-marks: world points the fit keeps visible and clear of cards (set by a graph, one line per object). */
    setMarks(marks: readonly Point[]) { s.marks = [...marks]; },
    /** Dev and measurement: the zoom-out limit and whether a declared `focus` is used. */
    configure(options: {maxOut?: number; useFocus?: boolean}) {
        if (options.maxOut !== undefined) s.maxOut = options.maxOut;
        if (options.useFocus !== undefined) s.useFocus = options.useFocus;
    },
    /** A new board: nothing carries over. */
    reset() { clearTimer(); cancelGlide(); s.morph = undefined; s.paused = false; s.pendingFit = false; s.pendingParams = false; s.dockOnly = false; s.fitKey = undefined; s.marks = []; },
    /** The auto-fit switch went off: stop what is moving. */
    stop() { cancelGlide(); clearTimer(); s.morph = undefined; },
    /** Measurement: the intent, and its intent-fit with every card and without the cards matching `exclude` (the lesson card: `[data-kind="lesson"]`). */
    measure(exclude: string) {
        const port = getViewPort();
        return {intent: port?.intent(), shown: port?.current(), all: computeTarget(), without: computeTarget(undefined, exclude)};
    },
    state: () => ({paused: s.paused, morphing: s.morph !== undefined, down: s.down}),
};

if (typeof window !== 'undefined') (window as unknown as {__bezegDirector?: typeof director}).__bezegDirector = director;
