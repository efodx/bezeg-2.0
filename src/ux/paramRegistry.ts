import {useSyncExternalStore} from 'react';

/**
 * Every mounted shared `Slider` publishes itself here while a lane-A prototype needs it, so prototypes can reach any
 * graph's ranged parameters without per-graph code: the board pucks (a1), oscillation (a3) and the curve-grab solver (a4).
 */
export interface ParamEntry {
    readonly key: string;
    readonly label: string;
    readonly min: number;
    readonly max: number;
    readonly step: number;
    readonly value: number;
    readonly cyclic?: number;
    /** Why the parameter cannot be changed now, or undefined when it can. */
    readonly unavailable?: string;
    readonly inert: boolean;
    /** The slider sits on the inspector's Display tab (a presentation setting, not mathematics). */
    readonly display?: boolean;
    format(value: number): string;
    /** Sends a value through the slider's own onChange (clamped and wrapped by the caller's rules). */
    set(value: number): void;
    /** Writes on the lesson's behalf, also while the learner's controls are locked. */
    setFromLesson(value: number): void;
}

const entries = new Map<string, ParamEntry>();
const listeners = new Set<() => void>();
let snapshot: readonly ParamEntry[] = [];
let scheduled = false;

function emit() {
    // Several sliders register in one commit; listeners hear once.
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
        scheduled = false;
        snapshot = [...entries.values()];
        for (const listener of listeners) listener();
    });
}

function same(a: ParamEntry, b: ParamEntry) {
    return a.label === b.label && a.min === b.min && a.max === b.max && a.step === b.step && a.value === b.value
        && a.cyclic === b.cyclic && a.unavailable === b.unavailable && a.inert === b.inert && a.display === b.display;
}

type ChangeObserver = (previous: ParamEntry, next: ParamEntry) => void;
const changeObservers = new Set<ChangeObserver>();

/** Prototype probes (a17, a19–a21 and the family captures) set values for a moment and restore them; recorders skip those. */
let probeDepth = 0;
export function probing(): boolean { return probeDepth > 0; }
/** For asynchronous probes (a25 reads a whole lesson ahead): call the returned function when done. */
export function holdProbe(): () => void { probeDepth++; let done = false; return () => { if (!done) { done = true; probeDepth--; } }; }
export function asProbe<T>(run: () => T): T {
    probeDepth++;
    try { return run(); } finally { probeDepth--; }
}

/** Observers hear every value change of a registered parameter (a6 tweens lesson-driven jumps, a8 records them). */
export function observeParamChanges(observer: ChangeObserver): () => void {
    changeObservers.add(observer);
    return () => { changeObservers.delete(observer); };
}

export function upsertParam(entry: ParamEntry) {
    const previous = entries.get(entry.key);
    entries.set(entry.key, entry);
    if (previous && previous.value !== entry.value) for (const observer of [...changeObservers]) observer(previous, entry);
    if (!previous || !same(previous, entry)) emit();
}

export function removeParam(key: string) {
    if (entries.delete(key)) emit();
}

export function currentParams(): readonly ParamEntry[] {
    return [...entries.values()];
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
    // A trailing parenthetical (a unit, or a reminder such as "(P(X ≤ k))") is not part of the symbol.
    const paren = /\s*\((?:[^()]|\([^()]*\))*\)$/.exec(trimmed);
    if (paren && paren.index > 0) trimmed = trimmed.slice(0, paren.index).trim();
    if (trimmed.length <= 4) return {symbol: trimmed, name: ''};
    const parts = trimmed.split(/\s+/);
    const tail: string[] = [];
    while (parts.length > 1 && tail.length < 2 && parts[parts.length - 1].length <= 3 && /[^A-Za-zČŠŽčšž]|^[a-zα-ω]{1,3}$/.test(parts[parts.length - 1])) tail.unshift(parts.pop()!);
    if (tail.length > 0 && tail.join(' ').length <= 6) return {symbol: tail.join(' '), name: parts.join(' ')};
    return {name: trimmed};
}
