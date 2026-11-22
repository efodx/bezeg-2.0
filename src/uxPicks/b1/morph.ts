import {recoverBoards, recoverBoardsSoon} from './board';
import {prefersReducedMotion} from '../../graphs/base/controls/reducedMotion';
import type {LessonGraphCapabilities, LessonSceneCheckpoint} from '../../learning/model';

/** Keys whose numbers are counts or choices: they jump to the target instead of sliding. */
const DISCRETE_KEY = /(^n$|^k$|count|degree|order|index|step|level|depth|iteration|round|harmonic|selected|mode|kind|type|^id$|version|revision|generation|size$|digits|seed)/i;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Point sets store integer coordinates on a power-of-two grid. While moving, the grid is made 32 times finer so the
 * points can slide smoothly and every in-between scene is still a valid one.
 */
const GRID_REFINEMENT = 5;
export function refineGrid(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(refineGrid);
    if (!isRecord(value)) return value;
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) result[key] = refineGrid(child);
    if (typeof value.gridStepExponent === 'number' && Array.isArray(value.points)) {
        const exponent = value.gridStepExponent;
        const refined = Math.max(-7, exponent - GRID_REFINEMENT);
        const scale = 2 ** (exponent - refined);
        result.gridStepExponent = refined;
        result.points = (value.points as unknown[]).map(point => isRecord(point) && typeof point.x === 'number' && typeof point.y === 'number'
            ? {...point, x: point.x * scale, y: point.y * scale} : point);
    }
    return result;
}

/** Interpolates plain JSON: numbers slide, everything structural or discrete takes the target. */
/** Back from a refined grid to the original one (`original` is the unrefined checkpoint value), rounding to its points. */
export function coarsenGrid(value: unknown, original: unknown): unknown {
    if (Array.isArray(value)) return value.map((item, index) => coarsenGrid(item, Array.isArray(original) ? original[index] : undefined));
    if (!isRecord(value) || !isRecord(original)) return value;
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) result[key] = coarsenGrid(child, original[key]);
    if (typeof value.gridStepExponent === 'number' && typeof original.gridStepExponent === 'number' && Array.isArray(value.points)) {
        const scale = 2 ** (original.gridStepExponent - value.gridStepExponent);
        result.gridStepExponent = original.gridStepExponent;
        result.points = (value.points as unknown[]).map(point => isRecord(point) && typeof point.x === 'number' && typeof point.y === 'number'
            ? {...point, x: Math.round(point.x / scale), y: Math.round(point.y / scale)} : point);
    }
    return result;
}

export function interpolateValue(from: unknown, to: unknown, t: number, key = '', integer = false, roundIntegers = false): unknown {
    if (typeof from === 'number' && typeof to === 'number') {
        if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return to;
        if (DISCRETE_KEY.test(key)) return to;
        const value = from + (to - from) * t;
        return integer || (roundIntegers && Number.isInteger(from) && Number.isInteger(to)) ? Math.round(value) : value;
    }
    if (Array.isArray(from) && Array.isArray(to)) {
        if (from.length !== to.length) return to;
        return to.map((item, index) => interpolateValue(from[index], item, t, key, integer, roundIntegers));
    }
    if (isRecord(from) && isRecord(to)) {
        const result: Record<string, unknown> = {};
        const onGrid = integer || typeof to.gridStepExponent === 'number';
        for (const [childKey, value] of Object.entries(to)) {
            result[childKey] = childKey in from ? interpolateValue(from[childKey], value, t, childKey, onGrid && childKey !== 'boundingBox', roundIntegers) : value;
        }
        return result;
    }
    // Something switched on appears once the motion has settled; something switched off leaves at once.
    if (typeof from === 'boolean' && typeof to === 'boolean') return t >= 1 || !to ? to : from;
    return to;
}

export function checkpointsDiffer(a: LessonSceneCheckpoint, b: LessonSceneCheckpoint): boolean {
    return JSON.stringify(a.value) !== JSON.stringify(b.value);
}

/** Counts how many numeric leaves move between two checkpoints (for "what changed" hints). */
export function movingLeafCount(from: unknown, to: unknown, key = ''): number {
    if (typeof from === 'number' && typeof to === 'number') return from !== to && !DISCRETE_KEY.test(key) ? 1 : 0;
    if (Array.isArray(from) && Array.isArray(to)) return from.length === to.length ? to.reduce((sum: number, item, index) => sum + movingLeafCount(from[index], item, key), 0) : 0;
    if (isRecord(from) && isRecord(to)) return Object.entries(to).reduce((sum, [childKey, value]) => sum + (childKey in from ? movingLeafCount(from[childKey], value, childKey) : 0), 0);
    return 0;
}

const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** True while a lesson morph runs: readers of the board (the text card) hold their last settled content until it ends. */
let morphing = 0;
const morphListeners = new Set<() => void>();
export function isMorphing(): boolean { return morphing > 0; }
export function subscribeMorphing(listener: () => void): () => void {
    morphListeners.add(listener);
    return () => { morphListeners.delete(listener); };
}
function bumpMorphing(delta: 1 | -1) {
    morphing = Math.max(0, morphing + delta);
    morphListeners.forEach(listener => listener());
}

/** Whether a string or boolean differs between two checkpoint values (a different setup rather than moved numbers). */
export function setupChanged(from: unknown, to: unknown): boolean {
    if (typeof from === 'string' || typeof from === 'boolean' || typeof to === 'string' || typeof to === 'boolean') return from !== to;
    if (Array.isArray(from) && Array.isArray(to)) return from.length === to.length && from.some((item, index) => setupChanged(item, to[index]));
    if (isRecord(from) && isRecord(to)) return Object.keys(to).some(key => key in from && setupChanged(from[key], to[key]));
    return false;
}

export interface MorphHandle {
    finish(): void;
    readonly done: Promise<void>;
}

/**
 * Plays the graph from `before` to its current (already applied) scene by restoring interpolated checkpoints.
 * Slow graphs (one restore over 45 ms) snap to the end. Any finish() call jumps to the exact target.
 */
export function morphScene(capabilities: LessonGraphCapabilities, before: LessonSceneCheckpoint, options: {duration?: number; onStart?: () => void; onFrame?: (t: number) => void} = {}): MorphHandle | undefined {
    let after: LessonSceneCheckpoint;
    try { after = capabilities.captureState(); } catch { return undefined; }
    if (!checkpointsDiffer(before, after) || movingLeafCount(before.value, after.value) === 0) return undefined;
    // A different setup (another example function, a switched option) has no valid in-between scenes: its numbers would
    // slide under the new setup's rules (Taylor step 6: the point slid outside the new example's domain and the graph
    // threw while rendering, where the restore's catch cannot see it). Such a change shows at once.
    if (setupChanged(before.value, after.value)) return undefined;
    const duration = options.duration ?? 750;
    let finished = false;
    let frame = 0;
    let resolveDone: () => void = () => undefined;
    let settled = false;
    const settle = () => { if (!settled) { settled = true; bumpMorphing(-1); } };
    bumpMorphing(1);
    options.onStart?.(); // the destination scene is applied: the view director opens its transition before the first restore
    window.setTimeout(settle, duration + 3000); // a morph that is abandoned must not hold readers forever
    const done = new Promise<void>(resolve => { resolveDone = () => { settle(); resolve(); }; });
    const from = refineGrid(before.value);
    const to = refineGrid(after.value);
    // Some quantities are whole numbers stored as numbers (half-degrees, steps): after one refusal they move in whole steps.
    let roundIntegers = false;
    const restore = (t: number) => {
        const started = performance.now();
        try {
            capabilities.restoreState({version: 1, value: interpolateValue(from, to, t, '', false, roundIntegers)});
        } catch (error) {
            recoverBoards();
            if (roundIntegers) throw error;
            roundIntegers = true;
            capabilities.restoreState({version: 1, value: interpolateValue(from, to, t, '', false, true)});
        }
        return performance.now() - started;
    };
    const debug = typeof window !== 'undefined' && window.location.search.includes('uxdebug');
    let frames = 0;
    const finish = () => {
        if (debug) console.info(`[ux b1] morph finished after ${frames} frames`);
        if (finished) return;
        finished = true;
        cancelAnimationFrame(frame);
        try { if (capabilities.isAvailable?.() !== false) capabilities.restoreState(after); } catch { recoverBoards(); }
        recoverBoardsSoon(() => { try { capabilities.restoreState(after); } catch { recoverBoards(); } });
        options.onFrame?.(1);
        resolveDone();
    };
    if (prefersReducedMotion()) { finish(); return {finish, done}; } // reduced motion: jump to the end state
    try {
        if (restore(0) > 90) { finish(); return {finish, done}; }
    } catch { finish(); return {finish, done}; }
    const start = performance.now();
    const tick = (now: number) => {
        if (finished) return;
        const linear = Math.min(1, (now - start) / duration);
        if (linear >= 1) { finish(); return; }
        try {
            if (capabilities.isAvailable?.() === false) { finished = true; resolveDone(); return; }
            // A frame that the graph refused while drawing leaves the board stuck: recover, then move in whole steps.
            if (recoverBoards()) roundIntegers = true;
            const cost = restore(ease(linear));
            frames++;
            options.onFrame?.(linear);
            if (cost > 120) { finish(); return; }
        } catch { finish(); return; }
        frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return {finish, done};
}
