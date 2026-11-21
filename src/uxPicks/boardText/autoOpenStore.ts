import {useSyncExternalStore} from 'react';

/** Cards the current lesson frame refers to (set by the board text layer, read by `DockCard`). */
let current: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();

export function setAutoOpen(next: ReadonlySet<string>) {
    if (next.size === current.size && [...next].every(k => current.has(k))) return;
    current = new Set(next);
    listeners.forEach(l => l());
}
export function useAutoOpen(kind: string): boolean {
    return useSyncExternalStore(l => { listeners.add(l); return () => { listeners.delete(l); }; }, () => current.has(kind), () => false);
}
