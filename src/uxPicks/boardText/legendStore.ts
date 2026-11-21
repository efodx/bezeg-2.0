import {useEffect, useSyncExternalStore} from 'react';
import type {LegendItem} from '../../graphs/functions/FunctionReadout';

/**
 * Pick boardText: the tools' "Legenda" groups publish their items here instead of rendering in the inspector, and the
 * legend card on the graph reads them. Each mounted legend group owns one entry.
 */
const entries = new Map<symbol, readonly LegendItem[]>();
const listeners = new Set<() => void>();
let snapshot: readonly LegendItem[] = [];

function emit() {
    snapshot = [...entries.values()].flat();
    listeners.forEach(listener => listener());
}

/** Publishes `items` while `on`; the entry is removed on unmount or when switched off. */
export function usePublishLegend(items: readonly LegendItem[], on: boolean) {
    const key = JSON.stringify(items);
    useEffect(() => {
        if (!on) return undefined;
        const id = Symbol('legend');
        entries.set(id, JSON.parse(key) as LegendItem[]);
        emit();
        return () => { entries.delete(id); emit(); };
    }, [key, on]);
}

export function usePublishedLegend(): readonly LegendItem[] {
    return useSyncExternalStore(
        listener => { listeners.add(listener); return () => { listeners.delete(listener); }; },
        () => snapshot, () => snapshot);
}
