import type {ClipRange, ClipState} from "../../bezeg/impl/kernels/bezier-clipping";

/**
 * Pure adapter of the Bezier clipping graph's readout (advanced Bezier D2, AB-B-2a2): the one-line status, the clip count, the
 * widest alive range and the bounded interval table. No React, JSXGraph or localization (`BezierClippingControls` turns these
 * into text). The status never claims more than the run knows: overlapping hulls are necessary for an intersection, not
 * sufficient, and `limit` proves nothing either way.
 */
export type BezierClippingStatus = "overlapping" | "separated" | "running" | "found" | "empty" | "limit";

/** At most this many rows of the table are shown; the rest are counted in one "further n" row. */
export const CLIP_TABLE_MAX_ROWS = 8;

/**
 * The status of the shown step. Before the first clip (no clip counted, nothing decided) it is the hull test of the whole nets:
 * `overlapping` when they are not certified apart, `separated` when they are; afterwards the kernel's `running`, `found`,
 * `empty` or `limit`.
 */
export function clipStatus(state: ClipState, hullsApart: boolean): BezierClippingStatus {
    if (state.status === "running" && state.clipCount === 0) return hullsApart ? "separated" : "overlapping";
    return state.status;
}

/** One table row: a result (the answer), a live pair, or a pair left unresolved by a limit, with both ranges. */
export interface ClipTableRow {
    readonly kind: "result" | "active" | "unresolved";
    readonly aRange: ClipRange;
    readonly bRange: ClipRange;
}

export interface ClipTable {
    /** At most `CLIP_TABLE_MAX_ROWS` rows, results first. */
    readonly rows: readonly ClipTableRow[];
    /** How many rows the cap left out; 0 when all are shown. */
    readonly further: number;
}

/** The rows of the interval table: results, then live pairs, then unresolved pairs, capped at `maxRows` with the rest counted. */
export function clipTable(state: ClipState, maxRows = CLIP_TABLE_MAX_ROWS): ClipTable {
    const all: ClipTableRow[] = [
        ...state.results.map(r => ({kind: "result" as const, aRange: r.aRange, bRange: r.bRange})),
        ...state.active.map(v => ({kind: "active" as const, aRange: v.aRange, bRange: v.bRange})),
        ...state.unresolved.map(v => ({kind: "unresolved" as const, aRange: v.aRange, bRange: v.bRange})),
    ];
    return {rows: all.slice(0, maxRows), further: Math.max(0, all.length - maxRows)};
}

/** The widest range, over both curves, of the live pairs (active and unresolved); null when none is alive. */
export function widestAliveWidth(state: ClipState): number | null {
    const widths = [...state.active, ...state.unresolved].flatMap(v => [v.aRange[1] - v.aRange[0], v.bRange[1] - v.bRange[0]]);
    return widths.length === 0 ? null : Math.max(...widths);
}

export interface BezierClippingReadout {
    readonly status: BezierClippingStatus;
    readonly clipCount: number;
    readonly widest: number | null;
    readonly table: ClipTable;
}

export function bezierClippingReadout(state: ClipState, hullsApart: boolean): BezierClippingReadout {
    return {status: clipStatus(state, hullsApart), clipCount: state.clipCount, widest: widestAliveWidth(state), table: clipTable(state)};
}
