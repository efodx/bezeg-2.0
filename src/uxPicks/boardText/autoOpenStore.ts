import {useSyncExternalStore} from 'react';
import {useFrameUx} from '../declare/graphUxStore';

/** Cards the current lesson frame refers to (set by the board text layer, read by `DockCard`). */
let current: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();

export function setAutoOpen(next: ReadonlySet<string>) {
    if (next.size === current.size && [...next].every(k => current.has(k))) return;
    current = new Set(next);
    listeners.forEach(l => l());
}
export function onAutoOpenChange(fn: () => void): () => void {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
}
/**
 * A frame opens what it names; below 1200 px only the first card it names (the lesson card needs the room). A frame that
 * highlights readout rows names Odčitki too (after the cards it lists in `open`).
 */
const allowed = (kind: string, highlights: boolean) => {
    const names = [...current];
    if (highlights && !names.includes('readout')) names.push('readout');
    return names.includes(kind) && (window.innerWidth >= 1200 || names[0] === kind);
};
export function useAutoOpen(kind: string): boolean {
    const highlights = (useFrameUx()?.highlight?.length ?? 0) > 0;
    return useSyncExternalStore(l => { listeners.add(l); return () => { listeners.delete(l); }; }, () => allowed(kind, highlights), () => false);
}
