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

function emit() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
        scheduled = false;
        snapshot = [...entries.values()];
        for (const listener of listeners) listener();
    });
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

/** Whether the control's element sits on the inspector's Display tab. */
export function onDisplayTab(element: Element | null): boolean {
    return Boolean(element?.closest('#inspector-display'));
}
