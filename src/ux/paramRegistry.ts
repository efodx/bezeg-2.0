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

export function upsertParam(entry: ParamEntry) {
    const previous = entries.get(entry.key);
    entries.set(entry.key, entry);
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

/** Splits "Vodoravni premik c" into a name and its symbol, so a puck can show the symbol large. */
export function splitLabel(label: string): {symbol?: string; name: string} {
    const trimmed = label.trim();
    if (trimmed.length <= 4) return {symbol: trimmed, name: ''};
    const parts = trimmed.split(/\s+/);
    const last = parts[parts.length - 1];
    if (parts.length > 1 && last.length <= 3 && !/^\(|\)$/.test(last)) return {symbol: last, name: parts.slice(0, -1).join(' ')};
    const symbolMatch = /^(.*?)\s*\(?\s*([A-Za-zα-ωΑ-Ω][₀-₉0-9]?)\s*\)?$/.exec(trimmed);
    if (symbolMatch && symbolMatch[1] && symbolMatch[2].length <= 2 && /[\s(]/.test(trimmed.slice(-4))) return {symbol: symbolMatch[2], name: symbolMatch[1]};
    return {name: trimmed};
}
