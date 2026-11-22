/**
 * Who is writing right now: the ambient source of a parameter write ([parameter writes](../../../../docs/specs/parameter-writes.md),
 * ADR 0064).
 *
 * JavaScript runs one task at a time, so the source is global: a writer opens a scope with {@link runAs} around the
 * synchronous code that calls a graph's setter, and every graph's {@link ParameterArbiter} reads it with
 * {@link currentWrite}. Scopes nest; the innermost wins.
 *
 * The learner has two separate things, so that nothing else is mistaken for the learner:
 * - an ambient `learner` **source** ({@link beginLearnerInput}), open only while a learner's input event is being
 *   dispatched (pointer down, move and up, key down, click, input, change, ...). It applies when no scope is open.
 *   A timer, promise or animation frame that runs between those events, even during a held drag, has no ambient
 *   source: it names its own or is an untagged write.
 * - a **span** ({@link beginLearnerSpan}), from pointer or key down to its release. It carries no source; it only
 *   says how long the keys the learner's input changed stay held (`ParameterArbiter`). Holds are per key: a pointer
 *   held where no key changes (a card grip) holds nothing.
 * An explicit scope always wins over the ambient source: a lesson action triggered by a click on Next runs as
 * `lesson`, a playback tick inside a pointer event as `animation`.
 *
 * Tests that call a graph directly open the learner's source and span with {@link beginLearnerGesture}, or a scope
 * with `runAs("learner", ...)`.
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
let spanId = 0;
let openSpans = 0;
let currentSpanId: number | undefined;
let openInputs = 0;
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

/** The innermost scope, else the ambient learner source, else `undefined` (an untagged write). */
export function currentWrite(): ActiveWrite | undefined {
    const top = scopes[scopes.length - 1];
    if (top) return top;
    if (openInputs > 0) return {source: "learner", gesture: currentSpanId};
    return undefined;
}

/** The current learner span's id, if one is open (whether or not a source is open). */
export function activeGesture(): number | undefined {
    return currentSpanId;
}

/**
 * Opens a learner span (pointer or key down until release) and returns its idempotent end function. Overlapping
 * spans (two pointers, a key and a pointer) share one id until the last ends. A span holds, it does not write.
 */
export function beginLearnerSpan(): () => void {
    if (openSpans === 0) currentSpanId = ++spanId;
    openSpans++;
    let open = true;
    return () => {
        if (!open) return;
        open = false;
        openSpans--;
        if (openSpans > 0) return;
        const ended = currentSpanId!;
        currentSpanId = undefined;
        for (const listener of [...gestureEndListeners]) listener(ended);
    };
}

/**
 * Opens the ambient learner source for the dispatch of one input event, inside a span (its own short one when none is
 * open). Returns the idempotent end function; changes made under it are attributed before it closes.
 */
export function beginLearnerInput(): () => void {
    const endSpan = beginLearnerSpan();
    openInputs++;
    let open = true;
    return () => {
        if (!open) return;
        open = false;
        if (openInputs === 1) notifyScopeEnd();
        openInputs--;
        endSpan();
    };
}

/** The learner's source and span together until the returned function runs (tests, and code that simulates input). */
export function beginLearnerGesture(): () => void {
    const endSpan = beginLearnerSpan();
    const endInput = beginLearnerInput();
    return () => {
        endInput();
        endSpan();
    };
}

/** Subscribes to the end of learner gestures; returns the unsubscribe function. */
export function onLearnerGestureEnd(listener: (id: number) => void): () => void {
    gestureEndListeners.add(listener);
    return () => {
        gestureEndListeners.delete(listener);
    };
}

/** Test helper: whether every scope, source and span has been closed. */
export function writeSourcesIdle(): boolean {
    return scopes.length === 0 && openInputs === 0 && openSpans === 0;
}
