/**
 * Escape keydowns that something already used for an undo but that must still still the board (sweeps, leases, playback).
 * `BaseGraph` ignores a `defaultPrevented` Escape unless it is listed here.
 */
const claimed = new WeakSet<Event>();

/** Marks an Escape as used for an undo; the board's Escape cancellation still runs for it. */
export function claimEscapeForUndo(event: Event): void {
    claimed.add(event);
}

export function isUndoEscape(event: Event): boolean {
    return claimed.has(event);
}
