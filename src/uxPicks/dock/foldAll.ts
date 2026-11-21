import {useSyncExternalStore} from 'react';

/**
 * Fold-all (round 5): one key folds every board card but the lesson card; the same key again gives the folds back as they
 * were. Nothing is written over the cards' own folds (they keep their state and storage): while fold-all is on, a card is
 * folded unless the learner opened it since, and turning fold-all off simply lets every card show its own fold again.
 */
const EXEMPT = 'guide';
let on = false;
const opened = new Set<string>();
let version = 0;
const listeners = new Set<() => void>();
const emit = () => { version++; listeners.forEach(l => l()); };

export function useFoldAll(): number {
    return useSyncExternalStore(l => { listeners.add(l); return () => { listeners.delete(l); }; }, () => version, () => 0);
}
export const isFoldAll = () => on;
/** Whether fold-all decides this card's fold now: it is on and the card is not the lesson card. */
export const foldAllRules = (kind: string) => on && kind !== EXEMPT;
/** The fold fold-all gives a card (true: folded); only meaningful while `foldAllRules(kind)`. */
export const foldAllFold = (kind: string) => !opened.has(kind);
/** A fold button pressed while fold-all is on opens (or re-folds) that card alone. */
export function setFoldAllCard(kind: string, folded: boolean) {
    if (folded) opened.delete(kind); else opened.add(kind);
    emit();
}
export function toggleFoldAll() {
    on = !on;
    opened.clear();
    emit();
}
