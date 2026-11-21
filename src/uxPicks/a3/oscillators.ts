import {useSyncExternalStore} from 'react';
import {getParam, type ParamEntry} from '../a1/paramRegistry';

/**
 * Pick a3 (from ux-challenge/a, extended): a pressed ∿ on a puck makes that parameter move by itself. A slider breathes
 * between its bounds (a sine around the middle of its range, starting from the current value so nothing jumps); a count
 * with both bounds steps up to its maximum and back down. Several can move at once with different periods.
 */

interface Oscillator {phase: number; period: number; last: number; direction: 1 | -1; nextStep: number}

const running = new Map<string, Oscillator>();
const listeners = new Set<() => void>();
let snapshot: ReadonlySet<string> = new Set();
let frame = 0;
const PERIODS = [5200, 7300, 9100, 11300];
/** Milliseconds between two steps of an oscillating count. */
const COUNT_STEP_MS = 750;

function emit() {
    snapshot = new Set(running.keys());
    for (const listener of listeners) listener();
}

const graphLocked = () => document.querySelector('.workspace-graph[data-lesson-locked="true"]') !== null;

/** Whether a parameter can move by itself: a slider with a range, or a count with both bounds and room between them. */
export function canOscillate(entry: ParamEntry): boolean {
    if (entry.inert) return false;
    if (entry.kind === 'range') return entry.max > entry.min;
    return entry.min !== undefined && entry.max !== undefined && entry.max > entry.min;
}

function tick(now: number) {
    frame = 0;
    if (graphLocked()) { running.clear(); emit(); return; }
    for (const [key, osc] of running) {
        const entry = getParam(key);
        if (!entry || !canOscillate(entry)) { running.delete(key); emit(); continue; }
        const dt = Math.min(64, now - osc.last);
        osc.last = now;
        if (entry.kind === 'count') {
            if (now < osc.nextStep) continue;
            osc.nextStep = now + COUNT_STEP_MS;
            if (entry.value >= entry.max!) osc.direction = -1;
            else if (entry.value <= entry.min!) osc.direction = 1;
            const moved = osc.direction > 0 ? entry.plus() : entry.minus();
            if (!moved) osc.direction = osc.direction > 0 ? -1 : 1;
            continue;
        }
        osc.phase += (2 * Math.PI * dt) / osc.period;
        const lo = entry.min, hi = entry.max;
        const mid = (lo + hi) / 2, amp = (hi - lo) / 2;
        const target = entry.cyclic !== undefined ? ((osc.phase / (2 * Math.PI)) * entry.cyclic) % entry.cyclic : mid + amp * Math.sin(osc.phase);
        const base = entry.cyclic === undefined ? lo : 0;
        const snapped = base + Math.round((target - base) / entry.step) * entry.step;
        const value = Math.min(hi, Math.max(lo, Number(snapped.toFixed(10))));
        if (value !== entry.value) entry.set(value);
    }
    if (running.size > 0) frame = requestAnimationFrame(tick);
}

export function toggleOscillator(key: string) {
    if (running.has(key)) running.delete(key);
    else {
        const entry = getParam(key);
        if (!entry || !canOscillate(entry)) return;
        let phase = 0;
        if (entry.kind === 'range') {
            const mid = (entry.min + entry.max) / 2, amp = (entry.max - entry.min) / 2 || 1;
            phase = entry.cyclic !== undefined ? (entry.value / entry.cyclic) * 2 * Math.PI : Math.asin(Math.max(-1, Math.min(1, (entry.value - mid) / amp)));
        }
        const now = performance.now();
        running.set(key, {phase, period: PERIODS[running.size % PERIODS.length], last: now, direction: 1, nextStep: now});
    }
    emit();
    if (running.size > 0 && !frame) frame = requestAnimationFrame(tick);
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
