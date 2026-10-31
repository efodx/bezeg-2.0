/**
 * Generic step-trace contract shared by the step-through algorithms (hulls, triangulation, sweeps). A trace is a
 * read-only event array produced by a pure function of validated input; the state after event i is a pure fold.
 * Payloads hold point indices into the algorithm's input, never coordinates. Pure TypeScript: no React, JSXGraph,
 * localization or global state.
 */

/** Kinds every algorithm uses; an algorithm may widen its own union, and consumers ignore kinds they do not know. */
export type SharedTraceKind = 'phase' | 'test' | 'accept' | 'reject' | 'output' | 'done';

export interface TraceEvent<K extends string, P> {
    readonly kind: K;
    readonly payload: P;
    /** Running number of predicate evaluations up to and including this event. */
    readonly predicateCount: number;
    /** Status-line message key (a string literal union per algorithm); not yet part of any locale catalog. */
    readonly noteKey: string;
}

export type Trace<K extends string, P> = readonly TraceEvent<K, P>[];

/** Clamps a (possibly stale or imported) step index to [0, length - 1]; non-finite input and empty traces give 0. */
export function clampTraceIndex(trace: readonly unknown[], index: number): number {
    if (trace.length === 0 || !Number.isFinite(index)) return 0;
    return Math.min(Math.max(Math.trunc(index), 0), trace.length - 1);
}

/**
 * Folds events 0..i (clamped) over `initial` without mutating anything. `fold` must be pure and return a new state.
 * An empty trace yields `initial`.
 */
export function stateAt<K extends string, P, S>(
    trace: Trace<K, P>,
    index: number,
    fold: (state: S, event: TraceEvent<K, P>) => S,
    initial: S,
): S {
    if (trace.length === 0) return initial;
    const last = clampTraceIndex(trace, index);
    let state = initial;
    for (let i = 0; i <= last; i++) state = fold(state, trace[i]);
    return state;
}
