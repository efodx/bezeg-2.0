import type {ReactNode} from "react";
import {useSyncExternalStore} from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function query(): MediaQueryList | undefined {
    return typeof window !== "undefined" ? window.matchMedia?.(QUERY) : undefined;
}

/** Whether the system asks for reduced motion now. False where `matchMedia` is missing (jsdom). */
export function prefersReducedMotion(): boolean {
    return query()?.matches === true;
}

/** Calls `listener` when the system setting changes; returns the unsubscribe. A missing `matchMedia` never fires. */
export function subscribeReducedMotion(listener: () => void): () => void {
    const list = query();
    if (!list) return () => {};
    if (list.addEventListener) {
        list.addEventListener("change", listener);
        return () => list.removeEventListener("change", listener);
    }
    // Older engines only have the deprecated listener pair.
    list.addListener?.(listener);
    return () => list.removeListener?.(listener);
}

/** The system setting, following a change without another render of the owner. */
export function useReducedMotion(): boolean {
    return useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false);
}

/**
 * Re-renders its function child when the system setting changes, so class graphs render a playback block through it and React owns
 * the subscription (made on mount, removed on unmount): no graph class needs a lifecycle hook. The child reads the setting itself, through
 * the graph's own `reducedMotion()`, so a test or lesson override of that method still applies.
 */
export function ReducedMotion({children}: { readonly children: () => ReactNode }): ReactNode {
    useReducedMotion();
    return children();
}
