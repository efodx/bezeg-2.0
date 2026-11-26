import {useEffect, useMemo, useRef, useSyncExternalStore} from 'react';
import {claimEscapeForUndo} from '../../graphs/base/escapeClaims';

/** How long the "Razveljavi" pill stays after a jump (task 05, slice 4). */
export const UNDO_MS = 4000;

export interface JumpUndoController {
    /** Remembers the value a jump replaced and starts the 4 s window; a newer jump replaces the offer. */
    offer(previous: number): void;
    /** Restores the previous value through `onWrite` and ends the offer. No-op when nothing is offered. */
    undo(): void;
    /** Ends the offer without restoring (the learner moved on: a drag, a step key, a typed value). */
    dismiss(): void;
    /** The value that would be restored, or undefined when no offer is open. */
    pending(): number | undefined;
    subscribe(listener: () => void): () => void;
    /** Tells the registry which element is this puck, so an Escape with focus inside it undoes this offer first. */
    setOwner(owner: (() => Element | null) | undefined): void;
}

/**
 * Every open offer, oldest first, behind one document listener: one Escape undoes exactly one offer, the one of the puck
 * holding focus, otherwise the most recent. The event is claimed so the board still cancels sweeps on the same keypress.
 */
interface Registered { undo(): void; owner?: () => Element | null }
const open: Registered[] = [];
function onEscape(event: KeyboardEvent) {
    if (event.key !== 'Escape' || event.defaultPrevented || open.length === 0) return;
    const target = event.target instanceof Node ? event.target : document.activeElement;
    const focused = open.find(entry => { const el = entry.owner?.(); return !!el && !!target && el.contains(target); });
    const entry = focused ?? open[open.length - 1];
    event.preventDefault();
    claimEscapeForUndo(event);
    entry.undo();
}
function register(entry: Registered) {
    unregister(entry);
    if (open.length === 0) document.addEventListener('keydown', onEscape);
    open.push(entry);
}
function unregister(entry: Registered) {
    const at = open.indexOf(entry);
    if (at < 0) return;
    open.splice(at, 1);
    if (open.length === 0) document.removeEventListener('keydown', onEscape);
}

export interface Timers {
    set(callback: () => void, ms: number): unknown;
    clear(handle: unknown): void;
}

const realTimers: Timers = {set: (callback, ms) => setTimeout(callback, ms), clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>)};

/** The small pure controller behind the pill. `getWrite` is read at undo time so a re-render's new writer is used. */
export function createJumpUndo(getWrite: () => (value: number) => void, timers: Timers = realTimers): JumpUndoController {
    let previous: number | undefined;
    let handle: unknown;
    const listeners = new Set<() => void>();
    const entry: Registered = {undo: () => controller.undo()};
    const emit = () => listeners.forEach(listener => listener());
    const end = () => {
        if (handle !== undefined) timers.clear(handle);
        handle = undefined;
        if (previous === undefined) return;
        previous = undefined;
        unregister(entry);
        emit();
    };
    const controller: JumpUndoController = {
        offer(value) {
            if (handle !== undefined) timers.clear(handle);
            previous = value;
            handle = timers.set(end, UNDO_MS);
            register(entry);
            emit();
        },
        undo() {
            const target = previous;
            if (target === undefined) return;
            end();
            getWrite()(target);
        },
        dismiss: end,
        pending: () => previous,
        subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
        setOwner(owner) { entry.owner = owner; },
    };
    return controller;
}

/** The controller for one puck, with its pending value; it stops its timer on unmount. */
export function useJumpUndo(onWrite: (value: number) => void): {controller: JumpUndoController; pending: number | undefined} {
    const write = useRef(onWrite);
    useEffect(() => { write.current = onWrite; });
    const controller = useMemo(() => createJumpUndo(() => (value: number) => write.current(value)), []);
    const pending = useSyncExternalStore(controller.subscribe, controller.pending);
    useEffect(() => () => controller.dismiss(), [controller]);
    return {controller, pending};
}
