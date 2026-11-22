import {useSyncExternalStore} from 'react';
import {getParam, setSweeping, type ParamEntry, type RangeParam} from '../a1/paramRegistry';
import {prefersReducedMotion} from '../../graphs/base/controls/reducedMotion';
import {findBoard, settle, type JxgBoard} from '../a19/ghost';

/**
 * Pick a3 (from ux-challenge/a, extended): a pressed ∿ on a puck makes that parameter move by itself. A slider breathes
 * over the interval of values, around the current one, for which the graph stays in view (a sine around the middle of
 * that interval, starting from the current value so nothing jumps); a count with both bounds steps up to its maximum and
 * back down. Several can move at once with different periods.
 *
 * "In view": the sweep probes ~21 values across the slider's range (the board is set to each for a moment, then the
 * live value is restored), counts how many sampled points of the curves that move are inside the board, and keeps the
 * contiguous run of values around the current one where that count stays at least IN_VIEW_SHARE of the count at the
 * start value. If probing fails or gives a sliver, the swing is the current value +/- 25% of the range. The probe
 * repeats when the board's view changes. Counts are not probed and keep stepping between their bounds.
 */

/** A value is in view while at least this share of the moving curves' visible points at the start value are still visible. */
const IN_VIEW_SHARE = 0.4;
const PROBE_VALUES = 21;
const FALLBACK_SHARE = 0.25;

/**
 * Who wins (owner, 2026-11-22: "changing value of a puck when it's playing makes it go weird"): the learner. A sweep is one
 * writer of a value among several (the puck's drag, typing and track, the tools' control, ±, keys, lesson scenes, Povrni,
 * undo). Any of them stops that parameter's sweep and the value stays where it was put; ∿ shows unpressed again. Two ways
 * to notice: a pointer or key on the parameter's own control (`[data-param]`, so a touch without movement counts too), and
 * a published value that is none of the sweep's own recent writes (the registry publishes on the control's next render, so
 * it lags the sweep by a write or two).
 */
interface Oscillator {phase: number; period: number; last: number; direction: 1 | -1; nextStep: number; lo?: number; hi?: number; recent?: number[]}
const RECENT_WRITES = 8;

/** The published value is the sweep's own (the start value or one of its recent writes), within half a step. */
function isOwnValue(osc: Oscillator, entry: RangeParam): boolean {
    const tolerance = entry.step / 2 + 1e-9;
    const cycle = entry.cyclic;
    const distance = (v: number) => {
        const d = Math.abs(v - entry.value);
        return cycle === undefined ? d : Math.min(d % cycle, cycle - (d % cycle));  // an angle published wrapped is the same angle
    };
    return osc.recent === undefined || osc.recent.some(v => distance(v) <= tolerance);
}

const SKIP_KEYS = new Set(['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'Escape', 'CapsLock']);
function stopFromEvent(event: Event) {
    if (running.size === 0 || !(event.target instanceof Element)) return;
    if (event instanceof KeyboardEvent && SKIP_KEYS.has(event.key)) return;
    if (event instanceof PointerEvent && event.button !== 0) return;
    const key = event.target.closest<HTMLElement>('[data-param]')?.dataset.param;
    if (key !== undefined && running.has(key)) stopOscillator(key);
}
if (typeof document !== 'undefined') {
    document.addEventListener('pointerdown', stopFromEvent, true);
    document.addEventListener('keydown', stopFromEvent, true);
}

const running = new Map<string, Oscillator>();
const listeners = new Set<() => void>();
let snapshot: ReadonlySet<string> = new Set();
let frame = 0;
let probing = 0;
const PERIODS = [5200, 7300, 9100, 11300];
/** Milliseconds between two steps of an oscillating count. */
const COUNT_STEP_MS = 750;

function emit() {
    snapshot = new Set(running.keys());
    setSweeping(running.size > 0);
    for (const listener of listeners) listener();
}

const graphLocked = () => document.querySelector('.workspace-graph[data-lesson-locked="true"]') !== null;

/** Whether a parameter can move by itself: a slider with a range, or a count with both bounds and room between them. */
export function canOscillate(entry: ParamEntry): boolean {
    if (entry.inert) return false;
    if (entry.kind === 'range') return entry.max > entry.min;
    return entry.min !== undefined && entry.max !== undefined && entry.max > entry.min;
}

/**
 * Writing a parameter redraws the graph and re-renders the workspace, which costs more than a frame on slow machines.
 * Writes are paced by how long the last one kept the main thread busy (measured by a message queued behind it, so the
 * React render and commit are included): never faster than one per frame, never slower than 8 per second.
 * Oscillator phases follow the clock, so a slower write rate only coarsens the motion, never the range or the period.
 */
let writeAfter = 0;
const channel = typeof MessageChannel === 'undefined' ? undefined : new MessageChannel();
let busyStart = 0;
let busy = 0;
if (channel) channel.port1.onmessage = () => { busy = performance.now() - busyStart; };
function measureBusy() {
    if (!channel) return;
    busyStart = performance.now();
    channel.port2.postMessage(0);
}

function tick(now: number) {
    frame = 0;
    if (graphLocked()) { running.clear(); emit(); return; }
    const paced = now < writeAfter;
    let wrote = false;
    for (const [key, osc] of running) {
        const entry = getParam(key);
        if (!entry || !canOscillate(entry)) { running.delete(key); emit(); continue; }
        const prev = osc.last;
        if (probing > 0) { osc.last = now; continue; }
        if (paced) continue; // keep osc.last: the next write covers the whole elapsed time
        osc.last = now;
        const dt = Math.min(250, now - prev);
        if (entry.kind === 'count') {
            if (now < osc.nextStep) continue;
            osc.nextStep = now + COUNT_STEP_MS;
            if (entry.value >= entry.max!) osc.direction = -1;
            else if (entry.value <= entry.min!) osc.direction = 1;
            const moved = osc.direction > 0 ? entry.plus() : entry.minus();
            if (!moved) osc.direction = osc.direction > 0 ? -1 : 1;
            continue;
        }
        if (!isOwnValue(osc, entry)) { running.delete(key); emit(); continue; } // someone else set it: they win
        if (entry.cyclic === undefined && osc.lo === undefined) continue; // still probing which values stay in view
        osc.phase += (2 * Math.PI * dt) / osc.period;
        const lo = Math.max(entry.min, osc.lo ?? entry.min), hi = Math.min(entry.max, osc.hi ?? entry.max);
        const mid = (lo + hi) / 2, amp = (hi - lo) / 2;
        const target = entry.cyclic !== undefined ? ((osc.phase / (2 * Math.PI)) * entry.cyclic) % entry.cyclic : mid + amp * Math.sin(osc.phase);
        const base = entry.cyclic === undefined ? entry.min : 0;
        const snapped = base + Math.round((target - base) / entry.step) * entry.step;
        const value = Math.min(hi, Math.max(lo, Number(snapped.toFixed(10))));
        if (value !== entry.value) {
            entry.set(value);
            wrote = true;
            osc.recent = [...(osc.recent ?? []), value].slice(-RECENT_WRITES);
        }
    }
    if (wrote) { measureBusy(); writeAfter = now + Math.min(125, Math.max(0, busy * 1.2 - 8)); }
    if (running.size > 0) frame = requestAnimationFrame(tick);
}

interface Measure {count: number; sig: number}

/** Per curve of the board: how many of its sampled points are inside the board, and a signature of where they are. */
function measure(board: JxgBoard, width: number, height: number): Map<string, Measure> {
    const out = new Map<string, Measure>();
    for (const object of board.objectsList as unknown as {id: string; elType?: string; points?: {scrCoords: number[]}[]}[]) {
        if (object.elType !== 'curve' && object.elType !== 'functiongraph') continue;
        let count = 0, sig = 0;
        for (const point of object.points ?? []) {
            const [, x, y] = point.scrCoords;
            if (Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x <= width && y <= height) { count++; sig += x * 3 + y; }
        }
        out.set(object.id, {count, sig: Math.round(sig)});
    }
    return out;
}

const boardNow = () => findBoard(document.querySelector<HTMLElement>('.workspace-graph') ?? document.body);

/** The interval of values around the current one for which the moving curves keep IN_VIEW_SHARE of their visible points; undefined when probing is not possible. */
async function probeInterval(key: string): Promise<[number, number] | undefined> {
    const first = getParam(key);
    if (first?.kind !== 'range') return undefined;
    const board = boardNow();
    const svg = board?.renderer.svgRoot;
    if (!board || !svg) return undefined;
    const box = svg.getBoundingClientRect();
    const {min, max, step} = first, start = first.value;
    const values: number[] = [];
    for (let i = 0; i < PROBE_VALUES; i++) {
        const raw = min + (i / (PROBE_VALUES - 1)) * (max - min);
        values.push(Math.min(max, Math.max(min, Number((min + Math.round((raw - min) / step) * step).toFixed(10)))));
    }
    const at = (): Map<string, Measure> => measure(board, box.width, box.height);
    const reference = at();
    const samples: Map<string, Measure>[] = [];
    probing++;
    try {
        for (const value of values) {
            await settle(board, () => (getParam(key) as RangeParam | undefined)?.setRaw(value));
            samples.push(at());
            // Back to the live value and a pause before the next probe: the probes never share one long task and never reach a paint.
            await settle(board, () => (getParam(key) as RangeParam | undefined)?.setRaw(start));
            await new Promise<void>(resolve => window.setTimeout(resolve, 0));
        }
    } finally {
        await settle(board, () => (getParam(key) as RangeParam | undefined)?.setRaw(start));
        probing--;
    }
    const moving = [...reference.keys()].filter(id => reference.get(id)!.count > 0 && samples.some(s => s.get(id)?.sig !== reference.get(id)!.sig));
    const base = moving.reduce((n, id) => n + reference.get(id)!.count, 0);
    if (moving.length === 0 || base === 0) return undefined;
    const good = samples.map(s => moving.reduce((n, id) => n + (s.get(id)?.count ?? 0), 0) >= IN_VIEW_SHARE * base);
    let near = 0;
    values.forEach((v, i) => { if (Math.abs(v - start) < Math.abs(values[near] - start)) near = i; });
    let a = near, b = near;
    while (a > 0 && good[a - 1]) a--;
    while (b < values.length - 1 && good[b + 1]) b++;
    return [Math.min(values[a], start), Math.max(values[b], start)];
}

/** Sets the sweep's interval for a running slider: the in-view interval, else the current value +/- a quarter of the range. */
async function fitToView(key: string) {
    let interval: [number, number] | undefined;
    try { interval = await probeInterval(key); } catch { interval = undefined; }
    const entry = getParam(key), osc = running.get(key);
    if (entry?.kind !== 'range' || !osc) return;
    if (!interval || interval[1] - interval[0] < 4 * entry.step) {
        const reach = FALLBACK_SHARE * (entry.max - entry.min);
        interval = [Math.max(entry.min, entry.value - reach), Math.min(entry.max, entry.value + reach)];
    }
    osc.lo = interval[0]; osc.hi = interval[1];
    const mid = (osc.lo + osc.hi) / 2, amp = (osc.hi - osc.lo) / 2 || 1;
    osc.phase = Math.asin(Math.max(-1, Math.min(1, (entry.value - mid) / amp)));
    watchView();
}

/** The board's view changing (pan, zoom, resize) makes the in-view interval stale: probe again once it settles. */
let watched: JxgBoard | undefined;
let reprobe = 0;
function watchView() {
    const board = boardNow();
    if (!board || board === watched) return;
    watched = board;
    board.on('boundingbox', () => {
        if (probing > 0 || running.size === 0) return;
        window.clearTimeout(reprobe);
        reprobe = window.setTimeout(() => {
            for (const [key, osc] of running) {
                const entry = getParam(key);
                if (entry?.kind === 'range' && entry.cyclic === undefined && osc.lo !== undefined) void fitToView(key);
            }
        }, 400);
    });
}

export function toggleOscillator(key: string) {
    if (running.has(key)) running.delete(key);
    else {
        const entry = getParam(key);
        if (!entry || !canOscillate(entry) || prefersReducedMotion()) return;
        let phase = 0;
        if (entry.kind === 'range') {
            const mid = (entry.min + entry.max) / 2, amp = (entry.max - entry.min) / 2 || 1;
            phase = entry.cyclic !== undefined ? (entry.value / entry.cyclic) * 2 * Math.PI : Math.asin(Math.max(-1, Math.min(1, (entry.value - mid) / amp)));
        }
        const now = performance.now();
        running.set(key, {phase, period: PERIODS[running.size % PERIODS.length], last: now, direction: 1, nextStep: now,
            recent: entry.kind === 'range' ? [entry.value] : undefined});
        if (entry.kind === 'range' && entry.cyclic === undefined) void fitToView(key);
    }
    emit();
    if (running.size > 0 && !frame) frame = requestAnimationFrame(tick);
}

/** Key N: starts a sweep on every listed parameter that can sweep, or stops them all if any is sweeping. */
export function sweepAll(keys: readonly string[]) {
    if (running.size > 0) { stopAllOscillators(); return; }
    if (prefersReducedMotion() || graphLocked()) return;
    for (const key of keys) toggleOscillator(key);
}

export function stopOscillator(key: string) {
    if (running.delete(key)) emit();
}

export function stopAllOscillators() {
    running.clear();
    emit();
}

export function isOscillating(key: string): boolean {
    return running.has(key);
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

export function useOscillators(): ReadonlySet<string> {
    return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}
