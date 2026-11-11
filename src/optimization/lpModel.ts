import type {LpConstraint} from './lp2';

/**
 * Stored state of the linear-programming graph, LS5 (docs/adr/0053-level-sets-contour-graph-marching-squares-exact-lp.md sections 1
 * and 4; docs/specs/level-sets-optimization-lessons.md, Implementation Decisions "State"). Pure TypeScript: no React, JSXGraph or
 * localization, so errors are codes (`field` plus `reason`, with the limits) and the graph words them.
 *
 * Everything stored is an integer: the user constraints a x + b y <= c (x >= 0 and y >= 0 are always added by the kernel and are not
 * stored), the objective max p x + q y, and the sweep value k of the objective line p x + q y = k. The region kind, vertices, optimum,
 * unbounded and infeasible statuses, the walk and an optimal edge are recomputed by `solveLinearProgram` from the validated state and
 * never read from a Preset: unknown fields are accepted and dropped. Imported values are never snapped or clamped: an off-range
 * or non-integer value rejects the whole state. Playback of the walk is not stored.
 */

export type LpErrorReason = 'not-an-object' | 'not-finite' | 'off-grid' | 'out-of-range' | 'missing' | 'zero-row';
export interface LpError {
    readonly field: string;
    readonly reason: LpErrorReason;
    /** The accepted integer range for range and grid errors (for `constraints` the accepted row count). */
    readonly min?: number;
    readonly max?: number;
}
export type LpModelResult<T> = {readonly ok: true; readonly value: T} | {readonly ok: false; readonly error: LpError};

const ok = <T>(value: T): LpModelResult<T> => ({ok: true, value});
const fail = <T>(error: LpError): LpModelResult<T> => ({ok: false, error});
const isRecord = (data: unknown): data is Record<string, unknown> => data !== null && typeof data === 'object' && !Array.isArray(data);
const norm = (n: number) => (n === 0 ? 0 : n); // no -0 in stored state
const finite = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

export interface IntegerRange {
    readonly min: number;
    readonly max: number;
}

/** User rows, not counting x >= 0 and y >= 0 (so at most 7 rows reach the kernel and 21 pairs). */
export const ROW_COUNT_RANGE: IntegerRange = {min: 1, max: 5};
/** Coefficients a, b of a row (not both 0). */
export const COEFFICIENT_RANGE: IntegerRange = {min: -9, max: 9};
/** Right-hand side c of a row. */
export const BOUND_RANGE: IntegerRange = {min: -30, max: 30};
/** Objective coefficients p, q. */
export const OBJECTIVE_RANGE: IntegerRange = {min: -9, max: 9};
/** The objective line p x + q y = k. */
export const SWEEP_RANGE: IntegerRange = {min: -100, max: 100};

function parseInteger(value: unknown, field: string, range: IntegerRange): LpModelResult<number> {
    if (value === undefined || value === null) return fail({field, reason: 'missing', ...range});
    if (!finite(value)) return fail({field, reason: 'not-finite', ...range});
    if (!Number.isInteger(value)) return fail({field, reason: 'off-grid', ...range});
    if (value < range.min || value > range.max) return fail({field, reason: 'out-of-range', ...range});
    return ok(norm(value));
}

export interface LpState {
    readonly constraints: readonly LpConstraint[];
    readonly objective: {readonly p: number; readonly q: number};
    readonly sweep: number;
}

/** LS5 step 1: x + 2y <= 8, 3x + y <= 9, objective 3x + 2y (optimum 12 at (2, 3)), the sweep line through the vertex (3, 0). */
export const DEFAULT_LP_STATE: LpState = {
    constraints: [{a: 1, b: 2, c: 8}, {a: 3, b: 1, c: 9}],
    objective: {p: 3, q: 2},
    sweep: 9,
};

export function parseLpState(data: unknown): LpModelResult<LpState> {
    if (!isRecord(data)) return fail({field: 'state', reason: 'not-an-object'});
    if (data.constraints === undefined || data.constraints === null) return fail({field: 'constraints', reason: 'missing', ...ROW_COUNT_RANGE});
    if (!Array.isArray(data.constraints)) return fail({field: 'constraints', reason: 'not-an-object', ...ROW_COUNT_RANGE});
    if (data.constraints.length < ROW_COUNT_RANGE.min || data.constraints.length > ROW_COUNT_RANGE.max) {
        return fail({field: 'constraints', reason: 'out-of-range', ...ROW_COUNT_RANGE});
    }
    const constraints: LpConstraint[] = [];
    for (let i = 0; i < data.constraints.length; i++) {
        const row: unknown = data.constraints[i];
        if (!isRecord(row)) return fail({field: `constraints[${i}]`, reason: 'not-an-object'});
        const a = parseInteger(row.a, `constraints[${i}].a`, COEFFICIENT_RANGE);
        if (!a.ok) return a;
        const b = parseInteger(row.b, `constraints[${i}].b`, COEFFICIENT_RANGE);
        if (!b.ok) return b;
        const c = parseInteger(row.c, `constraints[${i}].c`, BOUND_RANGE);
        if (!c.ok) return c;
        if (a.value === 0 && b.value === 0) return fail({field: `constraints[${i}]`, reason: 'zero-row'});
        constraints.push({a: a.value, b: b.value, c: c.value});
    }
    if (!isRecord(data.objective)) return fail({field: 'objective', reason: data.objective === undefined || data.objective === null ? 'missing' : 'not-an-object'});
    const p = parseInteger(data.objective.p, 'objective.p', OBJECTIVE_RANGE);
    if (!p.ok) return p;
    const q = parseInteger(data.objective.q, 'objective.q', OBJECTIVE_RANGE);
    if (!q.ok) return q;
    const sweep = parseInteger(data.sweep, 'sweep', SWEEP_RANGE);
    if (!sweep.ok) return sweep;
    return ok({constraints, objective: {p: p.value, q: q.value}, sweep: sweep.value});
}

/** The state to store in a Preset: only the stored fields, rows copied. */
export const serializeLpState = (s: LpState): LpState => ({
    constraints: s.constraints.map(k => ({a: k.a, b: k.b, c: k.c})),
    objective: {p: s.objective.p, q: s.objective.q},
    sweep: s.sweep,
});
