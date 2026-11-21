/**
 * UX picks: prototypes adopted from the ux-challenge/a-c branches for live evaluation. This is a prototype branch, not
 * shipped work; anything the owner keeps gets a spec and the normal workflow on master.
 *
 * Adding a prototype: append an entry to PICKS, gate its code with `usePick('<id>')` (React) or `pickOn('<id>')`.
 * Removing one: delete its entry and its gated code. Toggling is live: the panel writes the enabled set to
 * localStorage, and `?ux=a,b` in the URL replaces it (`?ux=none` turns everything off).
 */
import {useSyncExternalStore} from 'react';

export type Pick = {
    id: string;
    /** Short Slovenian name shown in the panel. */
    title: string;
    /** Source prototype, e.g. 'a28' or 'b23 + c24'. */
    from: string;
    /** One sentence on what it does and where to look. */
    note: string;
    /** Optional page where the prototype shows best. */
    tryAt?: string;
};

export const PICKS: readonly Pick[] = [
    // {id: 'example', title: 'Primer', from: 'a1', note: 'Kaj naredi in kje ga najdeš.', tryAt: '/bezeg-2.0/functions/transformations'},
];

const STORAGE_KEY = 'bezeg.uxPicks';
const listeners = new Set<() => void>();
let enabled: ReadonlySet<string> = initialSet();

function initialSet(): ReadonlySet<string> {
    if (typeof window === 'undefined') return new Set();
    const fromUrl = new URLSearchParams(window.location.search).get('ux');
    if (fromUrl !== null) {
        const set = new Set(fromUrl === 'none' ? [] : fromUrl.split(/[,\s]+/).filter(Boolean));
        save(set);
        return set;
    }
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return new Set(raw ? (JSON.parse(raw) as string[]) : PICKS.map(pick => pick.id));
    } catch {
        return new Set(PICKS.map(pick => pick.id));
    }
}

function save(set: ReadonlySet<string>) {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])); } catch { /* private window: session only */ }
}

export function pickOn(id: string): boolean {
    return enabled.has(id);
}

export function enabledPicks(): ReadonlySet<string> {
    return enabled;
}

export function setPicks(next: Iterable<string>) {
    enabled = new Set(next);
    save(enabled);
    listeners.forEach(listener => listener());
}

export function togglePick(id: string) {
    const next = new Set(enabled);
    if (next.has(id)) next.delete(id); else next.add(id);
    setPicks(next);
}

export function subscribePicks(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

/** Re-renders the caller when the prototype is switched on or off. */
export function usePick(id: string): boolean {
    return useSyncExternalStore(subscribePicks, () => enabled.has(id), () => false);
}

export function useEnabledPicks(): ReadonlySet<string> {
    return useSyncExternalStore(subscribePicks, () => enabled, () => enabled);
}
