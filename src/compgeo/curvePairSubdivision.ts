/**
 * Curve pair subdivision model (convexity task 24, spec A6, ADR 0036; reused by the Curves D2 graph).
 *
 * Two Bezier nets of the same degree (2 or 3) on the integer grid are halved at t = 1/2 up to depth 4. A pair of
 * pieces is kept when the conservative hull test `hullsSeparated` cannot certify it disjoint, and only the children
 * of kept pairs are tested at the next depth. Piece control points are dyadic (denominator 2^(degree * depth)) and
 * exact in doubles. Drawn hulls are built by the exact monotone chain on the pieces scaled to integers, so no
 * off-grid hull is ever built. Pure TypeScript: no React, JSXGraph, localization or graph state.
 */
import {subdivide} from '../bezeg/impl/kernels/bezier-kernels';
import {GRID_COORD_LIMIT, type GridPoint} from './grid';
import {hullsSeparated, type HullPoint} from './hullSeparation';
import {monotoneChainTrace} from './monotoneChain';
import {stateAt, type Trace} from './trace';

export const CURVE_PAIR_MAX_DEPTH = 4;
/** Coordinate bound of the input nets: degree 3 at depth 4 scales by 2^12, which must stay within 2^25. */
export const CURVE_PAIR_COORD_LIMIT = 2 ** 13;

export type CurvePairKind = 'phase' | 'split' | 'discard';
/** Piece index pair [i, j]: piece i of the first curve and piece j of the second, left to right at `depth`. */
export type PiecePair = readonly [number, number];

export interface CurvePairPayload {
    readonly depth: number;
    /** The pairs tested at this depth. */
    readonly candidates: readonly PiecePair[];
    /** Verdicts: empty on `split` events. */
    readonly kept: readonly PiecePair[];
    readonly discarded: readonly PiecePair[];
}

export type CurvePairTrace = Trace<CurvePairKind, CurvePairPayload>;

function assertNet(net: readonly GridPoint[], name: string): void {
    if (!Array.isArray(net) || (net.length !== 3 && net.length !== 4)) {
        throw new RangeError(`${name} must be a net of degree 2 or 3`);
    }
    for (const p of net) {
        for (const c of [p?.x, p?.y]) {
            if (typeof c !== 'number' || !Number.isInteger(c)) throw new RangeError(`${name} needs integer grid points`);
            if (Math.abs(c) > CURVE_PAIR_COORD_LIMIT) {
                throw new RangeError(`${name} coordinates must satisfy |c| <= ${CURVE_PAIR_COORD_LIMIT}`);
            }
        }
    }
}

/** `curvePieces` may go one level past the model (depth 5 pins the near-miss claim); drawn hulls stay within it. */
function assertDepth(depth: number, max = CURVE_PAIR_MAX_DEPTH): void {
    if (!Number.isInteger(depth) || depth < 0 || depth > max) {
        throw new RangeError(`depth must be an integer from 0 to ${max}`);
    }
}

/** The 2^depth pieces of the net, left to right, as control point lists (halving at t = 1/2). */
export function curvePieces(net: readonly GridPoint[], depth: number): HullPoint[][] {
    assertNet(net, 'net');
    assertDepth(depth, CURVE_PAIR_MAX_DEPTH + 1);
    let level: number[][][] = [net.map(p => [p.x, p.y])];
    for (let k = 0; k < depth; k++) {
        level = level.flatMap(rows => subdivide(0.5, rows));
    }
    return level.map(rows => rows.map(([x, y]) => ({x, y})));
}


export function curvePairRun(a: readonly GridPoint[], b: readonly GridPoint[]): CurvePairTrace {
    assertNet(a, 'a');
    assertNet(b, 'b');
    if (a.length !== b.length) throw new RangeError('both nets must have the same degree');

    const events: CurvePairTrace[number][] = [];
    let tests = 0;
    const push = (kind: CurvePairKind, noteKey: string, payload: CurvePairPayload) => {
        events.push(Object.freeze({kind, noteKey, payload: Object.freeze(payload), predicateCount: tests}));
    };
    const test = (depth: number, candidates: readonly PiecePair[]) => {
        const piecesA = curvePieces(a, depth);
        const piecesB = curvePieces(b, depth);
        const kept: PiecePair[] = [];
        const discarded: PiecePair[] = [];
        for (const [i, j] of candidates) {
            tests++;
            (hullsSeparated(piecesA[i], piecesB[j]).separated ? discarded : kept).push([i, j]);
        }
        return {kept, discarded};
    };

    let candidates: PiecePair[] = [[0, 0]];
    let verdict = test(0, candidates);
    push('phase', 'phase-depth-0', {depth: 0, candidates, ...verdict});
    for (let depth = 1; depth <= CURVE_PAIR_MAX_DEPTH && verdict.kept.length > 0; depth++) {
        candidates = verdict.kept.flatMap(([i, j]): PiecePair[] =>
            [[2 * i, 2 * j], [2 * i, 2 * j + 1], [2 * i + 1, 2 * j], [2 * i + 1, 2 * j + 1]]);
        push('split', 'split-pairs', {depth, candidates, kept: [], discarded: []});
        verdict = test(depth, candidates);
        push('discard', 'discard-pairs', {depth, candidates, ...verdict});
    }
    return Object.freeze(events);
}

export interface CurvePairState {
    readonly depth: number;
    readonly candidates: readonly PiecePair[];
    readonly kept: readonly PiecePair[];
    readonly discarded: readonly PiecePair[];
    /** Cumulative `hullsSeparated` calls once the verdicts of the latest event are known. */
    readonly tests: number;
    /** `split` means the verdicts for the current candidates are not known yet. */
    readonly phase: CurvePairKind | null;
}

export const CURVE_PAIR_INITIAL_STATE: CurvePairState = Object.freeze({
    depth: 0, candidates: Object.freeze([]), kept: Object.freeze([]), discarded: Object.freeze([]), tests: 0, phase: null,
});

export function curvePairStateAt(trace: CurvePairTrace, index: number): CurvePairState {
    return stateAt(trace, index, (state: CurvePairState, event) => {
        const {depth, candidates, kept, discarded} = event.payload;
        // A split event announces candidates whose tests have not run: the count stays at the previous verdicts.
        const tests = event.kind === 'split' ? state.tests : event.predicateCount;
        return {depth, candidates, kept, discarded, tests, phase: event.kind};
    }, CURVE_PAIR_INITIAL_STATE);
}

/**
 * Vertex indices (into `piece`) of the piece's convex hull in order, from the lexicographically smallest point.
 * A collinear or repeated piece gives a segment (2 indices) or a point (1). The piece is scaled by 2^(degree * depth)
 * to integers and the exact monotone chain is used.
 */
export function pieceHull(piece: readonly HullPoint[], depth: number, degree: number): number[] {
    assertDepth(depth);
    if (degree !== 2 && degree !== 3) throw new RangeError('degree must be 2 or 3');
    if (piece.length !== degree + 1) throw new RangeError('piece needs degree + 1 points');
    const scale = 2 ** (degree * depth);
    const scaled: GridPoint[] = piece.map(p => {
        const x = p.x * scale;
        const y = p.y * scale;
        if (!Number.isInteger(x) || !Number.isInteger(y) || Math.abs(x) > GRID_COORD_LIMIT || Math.abs(y) > GRID_COORD_LIMIT) {
            throw new RangeError('piece does not scale to the integer grid');
        }
        return {x, y};
    });
    const output = monotoneChainTrace(scaled).find(e => e.kind === 'output');
    return [...(output?.payload.hull ?? [])];
}
