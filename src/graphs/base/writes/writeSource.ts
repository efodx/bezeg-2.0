/**
 * Who is writing right now: the ambient source of a parameter write ([parameter writes](../../../../docs/specs/parameter-writes.md),
 * ADR 0064).
 *
 * JavaScript runs one task at a time, so the source is global: a writer opens a scope with {@link runAs} around the
 * synchronous code that calls a graph's setter, and every graph's {@link ParameterArbiter} reads it with
 * {@link currentWrite}. Scopes nest; the innermost wins.
 *
 * A learner gesture (pointer or key down on the board or a control, until release) spans many events, so it cannot
 * be a synchronous scope. {@link beginLearnerGesture} opens an ambient `learner` source that applies whenever no
 * scope is open. An animation frame that runs during a drag opens its own `animation` scope and is not mistaken
 * for the learner.
 *
 * Pure: no React, no JSXGraph.
 */

/** Priority is fixed in this order: `learner` > `lesson` > `animation`. */
export type WriteSource = "learner" | "lesson" | "animation";

const PRIORITY: Record<WriteSource, number> = {learner: 3, lesson: 2, animation: 1};

/** Whether a write from `source` may override one from `other`. */
export function outranks(source: WriteSource, other: WriteSource): boolean {
    return PRIORITY[source] > PRIORITY[other];
}

/** What an animation scope carries so an arbiter can check the keys it changes. Implemented by `Lease`. */
export interface WriteLeaseRef {
    readonly keys: ReadonlySet<string>;
    readonly active: boolean;
}

export interface ActiveWrite {
    readonly source: WriteSource;
    /** Set for `animation` scopes: the lease whose keys the scope may change. */
    readonly lease?: WriteLeaseRef;
    /** Set when the source is the ambient learner gesture, not a synchronous scope. */
    readonly gesture?: number;
}

const scopes: ActiveWrite[] = [];
let gestureId = 0;
let openGestures = 0;
let currentGestureId: number | undefined;
const gestureEndListeners = new Set<(id: number) => void>();
const scopeEndListeners = new Set<() => void>();

/** Lets every observer attribute changes made inside a scope or gesture before it closes (values outside a store). */
function notifyScopeEnd(): void {
    for (const listener of [...scopeEndListeners]) listener();
}

/**
 * Subscribes to the end of every write scope and learner gesture; the listener runs while the ending source is still
 * current. Returns the unsubscribe function.
 */
export function onWriteScopeEnd(listener: () => void): () => void {
    scopeEndListeners.add(listener);
    return () => {
        scopeEndListeners.delete(listener);
    };
}

/** Runs `work` as a write from `source`. An `animation` scope must name its lease. */
export function runAs<T>(source: WriteSource, work: () => T, lease?: WriteLeaseRef): T {
    if (source === "animation" && !lease) throw new Error("An animation write scope needs its lease.");
    scopes.push(lease ? {source, lease} : {source});
    try {
        const result = work();
        notifyScopeEnd();
        return result;
    } finally {
        scopes.pop();
    }
}

/** The innermost scope, else the ambient learner gesture, else `undefined` (an untagged write). */
export function currentWrite(): ActiveWrite | undefined {
    const top = scopes[scopes.length - 1];
    if (top) return top;
    if (currentGestureId !== undefined) return {source: "learner", gesture: currentGestureId};
    return undefined;
}

/** The current learner gesture's id, if a gesture is open (whether or not a scope is open on top of it). */
export function activeGesture(): number | undefined {
    return currentGestureId;
}

/**
 * Opens the ambient learner gesture (pointer or key down) and returns its idempotent end function. Overlapping
 * gestures (two pointers) share one id until the last ends.
 */
export function beginLearnerGesture(): () => void {
    if (openGestures === 0) currentGestureId = ++gestureId;
    openGestures++;
    let open = true;
    return () => {
        if (!open) return;
        open = false;
        if (openGestures === 1) notifyScopeEnd();
        openGestures--;
        if (openGestures > 0) return;
        const ended = currentGestureId!;
        currentGestureId = undefined;
        for (const listener of [...gestureEndListeners]) listener(ended);
    };
}

/** Subscribes to the end of learner gestures; returns the unsubscribe function. */
export function onLearnerGestureEnd(listener: (id: number) => void): () => void {
    gestureEndListeners.add(listener);
    return () => {
        gestureEndListeners.delete(listener);
    };
}

/** Test helper: whether every scope and gesture has been closed. */
export function writeSourcesIdle(): boolean {
    return scopes.length === 0 && openGestures === 0;
}
