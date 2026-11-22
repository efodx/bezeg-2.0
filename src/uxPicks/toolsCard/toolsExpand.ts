import {useSyncExternalStore} from 'react';

/**
 * Pick toolsCard: "Več" on the Orodja card, when its stack holds other open cards, gives Orodja the stack (owner, 2026-11-22:
 * "it automatically extends it in its column and shrinks other cards in the column, so that it actually becomes usable").
 * The other cards of that stack fold to chips, the lesson card shrinks to its floor, Orodja takes the height it needs.
 * "Manj", Naprej/Nazaj in a lesson and folding Orodja return to the previous split. Memory only: never stored.
 */
let expanded = false;
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

export const toolsExpanded = () => expanded;
export function setToolsExpanded(next: boolean) {
    if (expanded === next) return;
    expanded = next;
    listeners.forEach(fn => fn());
}
export const onToolsExpandedChange = subscribe;
export const useToolsExpanded = () => useSyncExternalStore(subscribe, toolsExpanded, () => false);
