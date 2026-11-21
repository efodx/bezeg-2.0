import {useSyncExternalStore} from 'react';
import {getParam} from './paramRegistry';

/**
 * a3 — Oscillate a parameter. A pressed ∿ on a puck makes that parameter breathe between its bounds (a sine around the
 * middle of its range, starting from the current value so nothing jumps). Several parameters can breathe at once with
 * different periods, which turns one graph into a moving family.
 */

interface Oscillator { phase: number; period: number; last: number }

const running = new Map<string, Oscillator>();
const listeners = new Set<() => void>();
let snapshot: ReadonlySet<string> = new Set();
let frame = 0;
const PERIODS = [5200, 7300, 9100, 11300];

function emit() {
    snapshot = new Set(running.keys());
    for (const listener of listeners) listener();
}

function graphLocked() {
    return document.querySelector('.workspace-graph[data-lesson-locked="true"]') !== null;
}

function tick(now: number) {
    frame = 0;
    if (graphLocked()) { running.clear(); emit(); return; }
    for (const [key, osc] of running) {
        const entry = getParam(key);
        if (!entry || entry.inert) { running.delete(key); emit(); continue; }
        const dt = Math.min(64, now - osc.last);
        osc.last = now;
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
        if (!entry) return;
        const mid = (entry.min + entry.max) / 2, amp = (entry.max - entry.min) / 2 || 1;
        const phase = entry.cyclic !== undefined ? (entry.value / entry.cyclic) * 2 * Math.PI : Math.asin(Math.max(-1, Math.min(1, (entry.value - mid) / amp)));
        running.set(key, {phase, period: PERIODS[running.size % PERIODS.length], last: performance.now()});
    }
    emit();
    if (running.size > 0 && !frame) frame = requestAnimationFrame(tick);
}

export function stopAllOscillators() {
    running.clear();
    emit();
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

export function useOscillators(): ReadonlySet<string> {
    return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}
