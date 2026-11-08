/**
 * Generic step-trace contract shared by the step-through algorithms (hulls, triangulation, sweeps). A trace is a
 * read-only event array produced by a pure function of validated input; the state after event i is a pure fold.
 * Payloads hold point indices into the algorithm's input, never coordinates. Pure TypeScript: no React, JSXGraph,
 * localization or global state.
 */

/** Kinds every algorithm uses; an algorithm may widen its own union, and consumers ignore kinds they do not know. */
export type SharedTraceKind = 'phase' | 'test' | 'accept' | 'reject' | 'output' | 'done';

export interface TraceEvent<K extends string, P, N extends string> {
    readonly kind: K;
    readonly payload: P;
    /** Running number of predicate evaluations up to and including this event. */
    readonly predicateCount: number;
    /** Status-line message key: the producing algorithm's own string literal union `N`; not yet part of any locale catalog. */
    readonly noteKey: N;
}

export type Trace<K extends string, P, N extends string> = readonly TraceEvent<K, P, N>[];

/**
 * Event whose payload depends on its kind: `M` maps every kind to its payload, and the result is the union of the
 * matching `{kind, payload}` pairs, so a kind narrows the payload and a mismatched pair does not compile. Use the flat
 * `TraceEvent` only when every kind shares one payload shape (the hull, ear clipping, Lawson and clipping traces).
 */
export type CorrelatedTraceEvent<M extends object, N extends string> = CorrelatedTraceEventByKind<M, N>[keyof M & string];

/** The event of each kind, so a generic `K` can name its own member (`ByKind<M, N>[K]`) and still widen to the union. */
export type CorrelatedTraceEventByKind<M extends object, N extends string> = {
    readonly [K in keyof M & string]: TraceEvent<K, M[K], N>;
};

export type CorrelatedTrace<M extends object, N extends string> = readonly CorrelatedTraceEvent<M, N>[];

/** Clamps a (possibly stale or imported) step index to [0, length - 1]; non-finite input and empty traces give 0. */
export function clampTraceIndex(trace: readonly unknown[], index: number): number {
    if (trace.length === 0 || !Number.isFinite(index)) return 0;
    return Math.min(Math.max(Math.trunc(index), 0), trace.length - 1);
}

/**
 * Folds events 0..i (clamped) over `initial` without mutating anything. `fold` must be pure and return a new state.
 * An empty trace yields `initial`.
 */
export function stateAt<E extends TraceEvent<string, unknown, string>, S>(
    trace: readonly E[],
    index: number,
    fold: (state: S, event: E) => S,
    initial: S,
): S {
    if (trace.length === 0) return initial;
    const last = clampTraceIndex(trace, index);
    let state = initial;
    for (let i = 0; i <= last; i++) state = fold(state, trace[i]);
    return state;
}
