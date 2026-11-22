import {useSyncExternalStore} from 'react';

/**
 * Pick a1 (from ux-challenge/a, extended): every mounted shared Slider and CountSetter publishes itself here, so the
 * board pucks reach any graph's parameters without per-graph code. A `range` is a slider; a `count` is a − n + stepper.
 */
interface ParamBase {
    readonly key: string;
    readonly label: string;
    readonly value: number;
    /** Why the parameter cannot be changed now, or undefined when it can. */
    readonly unavailable?: string;
    readonly inert: boolean;
    /** The control sits on the inspector's Display tab (a presentation setting, not mathematics). */
    readonly display: boolean;
    format(value: number): string;
}

export interface RangeParam extends ParamBase {
    readonly kind: 'range';
    readonly min: number;
    readonly max: number;
    readonly step: number;
    readonly cyclic?: number;
    /** Sends a value through the slider's own onChange (clamped or wrapped). */
    set(value: number): void;
    /** Writes past the learner-facing lock, for previews that restore the value at once. */
    setRaw(value: number): void;
}

export interface CountParam extends ParamBase {
    readonly kind: 'count';
    readonly min?: number;
    readonly max?: number;
    /** One step down or up through the setter's own − and + (false when that side is at its bound). */
    minus(): boolean;
    plus(): boolean;
}

export type ParamEntry = RangeParam | CountParam;

const entries = new Map<string, ParamEntry>();
const listeners = new Set<() => void>();
let snapshot: readonly ParamEntry[] = [];
let scheduled = false;

// While a preview probes (probeWindow) nothing is published: pucks, readouts and view checks never see the probed value.
let windowDepth = 0;
let held = false;

function emit() {
    if (windowDepth > 0) { held = true; return; }
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
        scheduled = false;
        if (windowDepth > 0) { held = true; return; }
        snapshot = [...entries.values()];
        for (const listener of listeners) listener();
    });
}

/** Runs a preview's whole probe (set a value, look, restore); the registry publishes afterwards, and only if something differs. */
export async function probeWindow<T>(run: () => Promise<T>): Promise<T> {
    windowDepth++;
    try { return await run(); } finally {
        await Promise.resolve(); // effects of the restoring render
        if (--windowDepth === 0 && held) {
            held = false;
            const next = [...entries.values()];
            const unchanged = next.length === snapshot.length && next.every((entry, i) => entry.key === snapshot[i].key && same(entry, snapshot[i]));
            if (!unchanged) { snapshot = next; for (const listener of listeners) listener(); }
        }
    }
}

function same(a: ParamEntry, b: ParamEntry) {
    return a.kind === b.kind && a.label === b.label && a.min === b.min && a.max === b.max && a.value === b.value
        && a.unavailable === b.unavailable && a.inert === b.inert && a.display === b.display
        && (a.kind !== 'range' || b.kind !== 'range' || (a.step === b.step && a.cyclic === b.cyclic));
}

export function upsertParam(entry: ParamEntry) {
    const previous = entries.get(entry.key);
    entries.set(entry.key, entry);
    if (!previous || !same(previous, entry)) emit();
}

export function removeParam(key: string) {
    if (entries.delete(key)) emit();
}

export function getParam(key: string): ParamEntry | undefined {
    return entries.get(key);
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

export function useParams(): readonly ParamEntry[] {
    return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}

/** Splits "Vodoravni premik c" into a name and its symbol, so a puck can show the symbol large; a trailing "(rad)" or "(°)" is dropped. */
export function splitLabel(label: string): {symbol?: string; name: string} {
    let trimmed = label.trim();
    const paren = /\s*\((?:[^()]|\([^()]*\))*\)$/.exec(trimmed);
    if (paren && paren.index > 0) trimmed = trimmed.slice(0, paren.index).trim();
    if (trimmed.length <= 4) return {symbol: trimmed, name: ''};
    const parts = trimmed.split(/\s+/);
    const tail: string[] = [];
    while (parts.length > 1 && tail.length < 2 && parts[parts.length - 1].length <= 3 && /[^A-Za-zČŠŽčšž]|^[a-zα-ω]{1,3}$/.test(parts[parts.length - 1])) tail.unshift(parts.pop()!);
    if (tail.length > 0 && tail.join(' ').length <= 6) return {symbol: tail.join(' '), name: parts.join(' ')};
    return {name: trimmed};
}

/**
 * The parameters the pucks show right now (owner, 2026-11-21: "only keep pucks for sliders"). A control whose key is here
 * marks itself `data-ux-pucked`; the tools card hides it (it stays mounted, so the puck still drives it).
 */
let pucked: ReadonlySet<string> = new Set();
const puckedListeners = new Set<() => void>();
export function setPuckedKeys(keys: readonly string[]) {
    if (keys.length === pucked.size && keys.every(k => pucked.has(k))) return;
    pucked = new Set(keys);
    puckedListeners.forEach(listener => listener());
}
export function usePucked(key: string): boolean {
    return useSyncExternalStore(listener => { puckedListeners.add(listener); return () => { puckedListeners.delete(listener); }; },
        () => pucked.has(key), () => false);
}
/** Whether the control's element sits on the inspector's Display tab. */
export function onDisplayTab(element: Element | null): boolean {
    return Boolean(element?.closest('#inspector-display'));
}

/**
 * Something sweeps (pick a3, set by src/uxPicks/a3/oscillators.ts). While it does, hover previews (a19 ghosts, the a29 track
 * ghost and overview fan) do not probe: a probe writes the live value for a moment and restores the value it read first, and
 * with a sweep writing every frame that restore is stale and the probe's frames show on the board (owner, 2026-11-22: the
 * curve flickered and jumped to the mouse). The sweep owns the value until the learner takes it.
 */
let sweeping = false;
export function setSweeping(next: boolean) { sweeping = next; }
export function isSweeping(): boolean { return sweeping; }

/** Previews (a19) set a value for a moment and restore it; observers skip changes made while probing. */
let probeDepth = 0;
let lastProbeEnd = -Infinity;
export function asProbe<T>(run: () => T): T {
    probeDepth++;
    try { return run(); } finally { probeDepth--; lastProbeEnd = performance.now(); }
}
/** True while a preview probes, or within a moment after (effects of the probe's renders run later). */
export function recentlyProbed(): boolean {
    return probeDepth > 0 || performance.now() - lastProbeEnd < 250;
}

/** The parameters registered right now, for non-React readers (a29). */
export function listParams(): ParamEntry[] {
    return [...entries.values()];
}

/**
 * The parameter whose puck is being typed into, if any. Hover previews and ghosts (a19, a29) stay quiet while it is set:
 * read `getEditingParam()` (or `useEditingParam()`), or match `body[data-ux-editing-param]` in CSS.
 */
let editingKey: string | undefined;
const editingListeners = new Set<() => void>();
export function getEditingParam(): string | undefined { return editingKey; }
export function setEditingParam(key: string | undefined) {
    if (editingKey === key) return;
    editingKey = key;
    if (typeof document !== 'undefined') {
        if (key === undefined) document.body.removeAttribute('data-ux-editing-param');
        else document.body.setAttribute('data-ux-editing-param', key);
    }
    editingListeners.forEach(listener => listener());
}
export function useEditingParam(): string | undefined {
    return useSyncExternalStore(listener => { editingListeners.add(listener); return () => { editingListeners.delete(listener); }; }, () => editingKey, () => undefined);
}
