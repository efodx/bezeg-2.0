import {AFFINE_C_RANGE, AFFINE_M_RANGE, affineMap, classifyAffine, Rational, rational} from './affine';
import {Iteration, ITERATION_MAX_STEPS, iterate} from './iteration';
import {LOGISTIC_R_RANGE, classifyLogistic, logisticMap} from './logistic';
import {compound, conformalRate, eApprox, relative, simple} from './interest';
import {arithmetic, geometric, geometricLimit, partialSum} from './sequences';

/**
 * Stored state of the two recursion graphs (docs/adr/0052-recursion-new-cobweb-graph-integer-parameters-log-plot.md, section 2;
 * docs/specs/recursion-growth-lessons.md, Implementation Decisions). Pure TypeScript: no React, JSXGraph or localization
 * (messages are English developer text).
 *
 * Everything stored is an integer, a name or a boolean-free choice: the slope is m = M/20, the intercept c = C/10, the start is
 * x0 = X/100, the logistic parameter r = R/10, so every label comes from an integer test and never from an iterate. `step` (the
 * number of drawn steps) is stored; playback is not, so a Preset reopens paused. Every derived value (classification, fixed
 * point, iterates) is recomputed from the validated state and is never read from a Preset: derived or unknown fields are
 * accepted and dropped. Imported values are never snapped or clamped (an off-range value rejects the whole state); typed input
 * from the UI goes through `typedInteger` (refused when off the grid or out of range) and a drag through `snapDragInteger`.
 */

// ---- Result type ----

export type RecursionErrorReason = 'not-an-object' | 'not-finite' | 'off-grid' | 'out-of-range' | 'unknown-value' | 'missing' | 'inconsistent';
export interface RecursionError {
    readonly field: string;
    readonly reason: RecursionErrorReason;
    readonly message: string;
}
export type RecursionResult<T> = {readonly ok: true; readonly value: T} | {readonly ok: false; readonly error: RecursionError};

const ok = <T>(value: T): RecursionResult<T> => ({ok: true, value});
const fail = <T>(field: string, reason: RecursionErrorReason, message: string): RecursionResult<T> => ({ok: false, error: {field, reason, message}});
const isRecord = (data: unknown): data is Record<string, unknown> => data !== null && typeof data === 'object' && !Array.isArray(data);

export interface IntegerRange {
    readonly min: number;
    readonly max: number;
}

// ---- Ranges and scales ----

/** The map is chosen among these; `affine` is x -> mx + c, `logistic` is x -> rx(1 - x). */
export const COBWEB_MAPS = ['affine', 'cosine', 'logistic'] as const;
export type CobwebMap = typeof COBWEB_MAPS[number];

export const M_RANGE: IntegerRange = AFFINE_M_RANGE;
export const C_RANGE: IntegerRange = AFFINE_C_RANGE;
export const R_RANGE: IntegerRange = LOGISTIC_R_RANGE;
export const STEP_RANGE: IntegerRange = {min: 0, max: ITERATION_MAX_STEPS};
/** x0 = X/100: affine starts lie in [-10, 10], cosine starts in [-2, 2] (the window of the board), the logistic start in the open interval (0, 1). */
export const X_SCALE = 100;
export const X_RANGE: IntegerRange = {min: -10 * X_SCALE, max: 10 * X_SCALE};
export const X_RANGE_COSINE: IntegerRange = {min: -2 * X_SCALE, max: 2 * X_SCALE};
export const X_RANGE_LOGISTIC: IntegerRange = {min: 1, max: X_SCALE - 1};
export const M_SCALE = 20;
export const C_SCALE = 10;
export const R_SCALE = 10;

export const startRange = (map: CobwebMap): IntegerRange => (map === 'logistic' ? X_RANGE_LOGISTIC : map === 'cosine' ? X_RANGE_COSINE : X_RANGE);

export const slopeOf = (M: number): number => M / M_SCALE;
export const interceptOf = (C: number): number => C / C_SCALE;
export const startOf = (X: number): number => X / X_SCALE;
export const rateOf = (R: number): number => R / R_SCALE;

// ---- Field parsers (strict, no snapping) ----

const norm = (n: number) => (n === 0 ? 0 : n); // no -0 in stored state

function parseInteger(value: unknown, field: string, range: IntegerRange): RecursionResult<number> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected a whole number from ${range.min} to ${range.max}.`);
    if (typeof value !== 'number' || !Number.isFinite(value)) return fail(field, 'not-finite', `${field} must be a finite number, not ${typeof value === 'number' ? String(value) : typeof value}; expected a whole number from ${range.min} to ${range.max}.`);
    if (!Number.isInteger(value)) return fail(field, 'off-grid', `${field} must be a whole number from ${range.min} to ${range.max}.`);
    if (value < range.min || value > range.max) return fail(field, 'out-of-range', `${field} is outside [${range.min}, ${range.max}].`);
    return ok(norm(value));
}

function parseChoice<T extends string>(value: unknown, field: string, choices: readonly T[]): RecursionResult<T> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected one of: ${choices.join(', ')}.`);
    const found = choices.find(choice => choice === value);
    return found !== undefined ? ok(found) : fail(field, 'unknown-value', `${field} must be one of: ${choices.join(', ')}.`);
}

function parseNumberChoice(value: unknown, field: string, choices: readonly number[]): RecursionResult<number> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected one of: ${choices.join(', ')}.`);
    const found = choices.find(choice => choice === value);
    return found !== undefined ? ok(found) : fail(field, 'unknown-value', `${field} must be one of: ${choices.join(', ')}.`);
}

// ---- Typed input and dragging ----

/**
 * A typed value on a grid of 1/scale: the integer it stands for. Anything not finite, off the grid (more digits than the grid
 * has) or outside the range is refused with a reason, never rounded or clamped into range. (The shared number field rounds an
 * off-grid typed value to the nearest grid value itself before it calls the graph, so a value reaching here is on the grid.)
 */
export function typedInteger(value: number, scale: number, range: IntegerRange, field: string): RecursionResult<number> {
    if (typeof value !== 'number' || !Number.isFinite(value)) return fail(field, 'not-finite', `${field} must be a finite number.`);
    const scaled = value * scale;
    const rounded = Math.round(scaled);
    if (Math.abs(scaled - rounded) > 1e-6) return fail(field, 'off-grid', `${field} must be a multiple of 1/${scale}.`);
    if (rounded < range.min || rounded > range.max) return fail(field, 'out-of-range', `${field} is outside [${range.min / scale}, ${range.max / scale}].`);
    return ok(norm(rounded));
}

/** A drag only: the nearest grid integer, clamped into the range (a drag has no message to give). */
export function snapDragInteger(coordinate: number, scale: number, range: IntegerRange): number | undefined {
    if (typeof coordinate !== 'number' || !Number.isFinite(coordinate)) return undefined;
    return norm(Math.min(range.max, Math.max(range.min, Math.round(coordinate * scale))));
}

// ---- The cobweb state (RecursionCobwebGraph, RG2 and RG4) ----

export interface CobwebState {
    readonly map: CobwebMap;
    /** Slope m = M/20 of the affine map. */
    readonly M: number;
    /** Intercept c = C/10 of the affine map. */
    readonly C: number;
    /** Logistic parameter r = R/10. */
    readonly R: number;
    /** Start x0 = X/100; for the logistic map X is in [1, 99]. */
    readonly X: number;
    /** The number of drawn steps, 0 to 60. Stored; playback is not. */
    readonly step: number;
}

/** m = 0,5, c = 1, x0 = 0: the first example of RG2 (iterates 0, 1, 1,5, 1,75, 1,875, ... to 2). */
export const DEFAULT_COBWEB_STATE: CobwebState = {map: 'affine', M: 10, C: 10, R: 15, X: 0, step: 0};
/** The start a map falls back to when its range does not hold the current one: 0 (affine, cosine) or 0,1 (logistic, RG4). */
export const defaultStart = (map: CobwebMap): number => (map === 'logistic' ? 10 : 0);

export function parseCobwebState(data: unknown): RecursionResult<CobwebState> {
    if (!isRecord(data)) return fail('state', 'not-an-object', 'The cobweb state must be an object.');
    const map = parseChoice(data.map, 'map', COBWEB_MAPS);
    if (!map.ok) return map;
    const M = parseInteger(data.M, 'M', M_RANGE);
    if (!M.ok) return M;
    const C = parseInteger(data.C, 'C', C_RANGE);
    if (!C.ok) return C;
    const R = parseInteger(data.R, 'R', R_RANGE);
    if (!R.ok) return R;
    const X = parseInteger(data.X, 'X', startRange(map.value));
    if (!X.ok) {
        return X.error.reason === 'out-of-range' && map.value === 'logistic'
            ? fail('X', 'inconsistent', `X must be from ${X_RANGE_LOGISTIC.min} to ${X_RANGE_LOGISTIC.max} for the logistic map (x0 strictly between 0 and 1).`)
            : X;
    }
    const step = parseInteger(data.step, 'step', STEP_RANGE);
    if (!step.ok) return step;
    return ok({map: map.value, M: M.value, C: C.value, R: R.value, X: X.value, step: step.value});
}

/** The state to store in a Preset: only the stored fields. Playback and every derived value are left out. */
export const serializeCobwebState = (s: CobwebState): CobwebState => ({map: s.map, M: s.M, C: s.C, R: s.R, X: s.X, step: s.step});

/** A new map; the start moves to the map's default when the current one lies outside its range. */
export function withMap(state: CobwebState, map: CobwebMap): CobwebState {
    if (map === state.map) return state;
    const range = startRange(map);
    const X = state.X >= range.min && state.X <= range.max ? state.X : defaultStart(map);
    return {...state, map, X};
}

export type CobwebKind =
    | 'attracting' // affine |M| < 20, logistic 11 <= R <= 29
    | 'repelling' // affine |M| > 20
    | 'two-cycle' // affine M = -20
    | 'all-fixed' // affine M = 20, C = 0
    | 'none' // affine M = 20, C != 0
    | 'extinction' // logistic R <= 9
    | 'extinction-slope-one' // logistic R = 10
    | 'local-attracting'; // cosine: |f'(x*)| < 1 shown numerically, a local statement

/** Staircase: the slope is positive; spiral: negative; degenerate: zero (the first step lands on the fixed point). */
export type CobwebShape = 'staircase' | 'spiral' | 'degenerate' | 'none';

export interface CobwebDerived {
    readonly kind: CobwebKind;
    readonly shape: CobwebShape;
    /** True when the label rests on the integers alone; false for the cosine, whose fixed point and slope are computed. */
    readonly exact: boolean;
    /** x0 = X/100 as a double. */
    readonly x0: number;
    /** The map in doubles. */
    readonly map: (x: number) => number;
    /** The fixed point converted once to a double; null when there is none (affine M = 20) or all points are fixed. */
    readonly fixedPoint: number | null;
    /** The exact fixed point of an affine or logistic map; undefined for the cosine and when the fixed point is not unique. */
    readonly fixedExact?: Rational;
    /** The slope that decides: m (affine), r at 0 or 2 - r at 1 - 1/r (logistic), -sin x* (cosine, computed). null when M = 20. */
    readonly slope: number | null;
    /** The first `step` steps and the points x0, ..., x_step, in doubles (computed). */
    readonly iteration: Iteration;
}

/** x* of cos x = x: bisection on [0, 1], where cos x - x changes sign once; deterministic and labelled computed. */
export function cosineFixedPoint(): number {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        if (Math.cos(mid) - mid > 0) lo = mid;
        else hi = mid;
    }
    return (lo + hi) / 2;
}

export function deriveCobweb(state: CobwebState): CobwebDerived {
    const x0 = startOf(state.X);
    if (state.map === 'affine') {
        const c = classifyAffine(state.M, state.C);
        const map = affineMap(state.M, state.C);
        const allFixed = c.kind === 'all-fixed';
        return {
            kind: c.kind, shape: c.shape, exact: true, x0, map,
            fixedPoint: c.fixedPoint === null || allFixed ? null : Number(c.fixedPoint.num) / Number(c.fixedPoint.den),
            fixedExact: c.fixedPoint === null || allFixed ? undefined : c.fixedPoint,
            slope: slopeOf(state.M), iteration: iterate(map, x0, state.step),
        };
    }
    if (state.map === 'logistic') {
        const c = classifyLogistic(state.R);
        const map = logisticMap(state.R);
        const shape: CobwebShape = c.slope === 0 ? 'degenerate' : c.slope > 0 ? 'staircase' : 'spiral';
        return {
            kind: c.kind, shape, exact: true, x0, map, fixedPoint: c.fixedPoint.num / c.fixedPoint.den,
            fixedExact: rational(BigInt(c.fixedPoint.num), BigInt(c.fixedPoint.den)), slope: c.slope, iteration: iterate(map, x0, state.step),
        };
    }
    const star = cosineFixedPoint();
    const slope = -Math.sin(star);
    return {
        kind: 'local-attracting', shape: 'spiral', exact: false, x0, map: Math.cos, fixedPoint: star, slope, iteration: iterate(Math.cos, x0, state.step),
    };
}

// ---- The growth state (GrowthGraph, RG1, RG3 and RG5) ----

export const GROWTH_PANELS = ['sequence', 'interest', 'log'] as const;
export type GrowthPanel = typeof GROWTH_PANELS[number];
export const SEQUENCE_KINDS = ['arithmetic', 'geometric'] as const;
export type SequenceKind = typeof SEQUENCE_KINDS[number];
export const LOG_MODELS = ['exponential', 'power'] as const;
export type LogModel = typeof LOG_MODELS[number];
/** Compounding periods per year offered in RG3 (relative rate p/m per period). */
export const INTEREST_PARTS = [1, 2, 4, 12, 365] as const;

export const A1_RANGE: IntegerRange = {min: -100, max: 100};
export const D_RANGE: IntegerRange = {min: -20, max: 20};
/** q = Q/10 for the geometric sequence: 0,5 and 2 are on the grid. */
export const Q_SCALE = 10;
export const Q_RANGE: IntegerRange = {min: -30, max: 30};
export const TERMS_RANGE: IntegerRange = {min: 1, max: 30};
export const CAPITAL_RANGE: IntegerRange = {min: 1, max: 100000};
/** The yearly rate p = rate/200 in steps of 0,5 %: rate 10 is 5 %. */
export const RATE_SCALE = 200;
export const RATE_RANGE: IntegerRange = {min: 1, max: 80};
export const YEARS_RANGE: IntegerRange = {min: 1, max: 40};
export const Y0_RANGE: IntegerRange = {min: 1, max: 1000};
/** The growth factor of the logarithm panel q = LQ/100, positive so that the logarithm exists. */
export const LOG_Q_SCALE = 100;
export const LOG_Q_RANGE: IntegerRange = {min: 50, max: 300};

export interface GrowthState {
    readonly panel: GrowthPanel;
    readonly kind: SequenceKind;
    readonly a1: number;
    readonly d: number;
    readonly q: number;
    readonly n: number;
    readonly capital: number;
    readonly rate: number;
    readonly years: number;
    readonly parts: number;
    readonly y0: number;
    readonly logQ: number;
    readonly logModel: LogModel;
}

/** a1 = 3, d = 2 (a10 = 21, S10 = 120); 1000 at 5 % for 10 years with 12 parts; y_n = 1000 * 1,05^n. */
export const DEFAULT_GROWTH_STATE: GrowthState = {
    panel: 'sequence', kind: 'arithmetic', a1: 3, d: 2, q: 20, n: 10, capital: 1000, rate: 10, years: 10, parts: 12, y0: 1000, logQ: 105, logModel: 'exponential',
};

export function parseGrowthState(data: unknown): RecursionResult<GrowthState> {
    if (!isRecord(data)) return fail('state', 'not-an-object', 'The growth state must be an object.');
    const panel = parseChoice(data.panel, 'panel', GROWTH_PANELS);
    if (!panel.ok) return panel;
    const kind = parseChoice(data.kind, 'kind', SEQUENCE_KINDS);
    if (!kind.ok) return kind;
    const a1 = parseInteger(data.a1, 'a1', A1_RANGE);
    if (!a1.ok) return a1;
    const d = parseInteger(data.d, 'd', D_RANGE);
    if (!d.ok) return d;
    const q = parseInteger(data.q, 'q', Q_RANGE);
    if (!q.ok) return q;
    const n = parseInteger(data.n, 'n', TERMS_RANGE);
    if (!n.ok) return n;
    const capital = parseInteger(data.capital, 'capital', CAPITAL_RANGE);
    if (!capital.ok) return capital;
    const rate = parseInteger(data.rate, 'rate', RATE_RANGE);
    if (!rate.ok) return rate;
    const years = parseInteger(data.years, 'years', YEARS_RANGE);
    if (!years.ok) return years;
    const parts = parseNumberChoice(data.parts, 'parts', INTEREST_PARTS);
    if (!parts.ok) return parts;
    const y0 = parseInteger(data.y0, 'y0', Y0_RANGE);
    if (!y0.ok) return y0;
    const logQ = parseInteger(data.logQ, 'logQ', LOG_Q_RANGE);
    if (!logQ.ok) return logQ;
    const logModel = parseChoice(data.logModel, 'logModel', LOG_MODELS);
    if (!logModel.ok) return logModel;
    return ok({
        panel: panel.value, kind: kind.value, a1: a1.value, d: d.value, q: q.value, n: n.value, capital: capital.value, rate: rate.value,
        years: years.value, parts: parts.value, y0: y0.value, logQ: logQ.value, logModel: logModel.value,
    });
}

/** The state to store in a Preset: only the stored fields. */
export const serializeGrowthState = (s: GrowthState): GrowthState => ({
    panel: s.panel, kind: s.kind, a1: s.a1, d: s.d, q: s.q, n: s.n, capital: s.capital, rate: s.rate, years: s.years, parts: s.parts,
    y0: s.y0, logQ: s.logQ, logModel: s.logModel,
});

// ---- Derived growth values (RG1, RG3 and RG5) ----

/** A term or a sum: a BigInt when every input is a whole number (exact), a double otherwise (computed). */
export type SeqValue = bigint | number;

export interface SequenceDerived {
    /** True when a1 and d (or q) are whole numbers, so every term and sum is an exact BigInt. */
    readonly exact: boolean;
    /** a1, ..., an by the recursive rule a(k+1) = a(k) + d or q a(k). */
    readonly terms: readonly SeqValue[];
    /** The n-th term and the n-th partial sum by the closed forms. */
    readonly nth: SeqValue;
    readonly sum: SeqValue;
    /** a1/(1 - q) for a geometric sequence with |q| < 1: a statement about the closed form, not about the last term. */
    readonly limit: number | null;
}

export interface InterestDerived {
    /** The yearly rate as a fraction (0,05 for 5 %). */
    readonly p: number;
    readonly simple: number;
    readonly compound: number;
    readonly relative: number;
    /** P e^(p t), the limit of the relative value as the number of parts grows. */
    readonly continuous: number;
    /** (1 + p)^(1/m) - 1 and the value after m t parts of it, which reproduces the compound value. */
    readonly conformal: number;
    readonly conformalValue: number;
    /** ln 2 / ln(1 + p) years and the rule of 72, 72 / (100 p). */
    readonly doubling: number;
    readonly ruleOf72: number;
    readonly eTable: readonly {readonly n: number; readonly value: number}[];
}

export interface LogDerived {
    readonly q: number;
    /** The plotted points: n = 0, ..., N for the exponential model, n = 1, ..., N + 1 for the power model y = y0 n^2. */
    readonly ns: readonly number[];
    readonly ys: readonly number[];
    readonly lnY: readonly number[];
    /** Exact difference quotients of ln y: over the whole run, over the first step and over the last step. */
    readonly slope: number;
    readonly slopeFirst: number;
    readonly slopeLast: number;
    /** ln q, to compare with the slope. */
    readonly lnQ: number;
    /** True for the exponential model, decided from the model name and not from the numbers: its ln y points lie on a line. */
    readonly straight: boolean;
}

export interface GrowthDerived {
    readonly sequence: SequenceDerived;
    readonly interest: InterestDerived;
    readonly log: LogDerived;
}

/** The values of n in the table of (1 + 1/n)^n of RG3 (10^6 is the largest the kernel accepts). */
export const E_TABLE_N = [1, 10, 100, 1000, 1_000_000] as const;

const sequenceOf = (state: GrowthState): SequenceDerived => {
    const {kind, a1, d, q, n} = state;
    const geometricKind = kind === 'geometric';
    const exact = Number.isInteger(a1) && (geometricKind ? q % Q_SCALE === 0 : Number.isInteger(d));
    if (exact) {
        const first = BigInt(a1);
        const ratio = BigInt(geometricKind ? q / Q_SCALE : d);
        const terms: bigint[] = [first];
        for (let k = 1; k < n; k++) terms.push(geometricKind ? terms[k - 1] * ratio : terms[k - 1] + ratio);
        return {
            exact, terms, nth: geometricKind ? geometric(first, ratio, n) : arithmetic(first, ratio, n), sum: partialSum(kind, first, ratio, n),
            limit: geometricKind && Math.abs(q) < Q_SCALE ? geometricLimit(a1, q / Q_SCALE) : null,
        };
    }
    const ratio = geometricKind ? q / Q_SCALE : d;
    const terms: number[] = [a1];
    for (let k = 1; k < n; k++) terms.push(geometricKind ? terms[k - 1] * ratio : terms[k - 1] + ratio);
    return {
        exact, terms, nth: geometricKind ? geometric(a1, ratio, n) : arithmetic(a1, ratio, n), sum: partialSum(kind, a1, ratio, n),
        limit: geometricKind && Math.abs(ratio) < 1 ? geometricLimit(a1, ratio) : null,
    };
};

const interestOf = (state: GrowthState): InterestDerived => {
    const {capital: P, years: t, parts: m} = state;
    const p = state.rate / RATE_SCALE;
    const conformal = conformalRate(p, m);
    return {
        p, simple: simple(P, p, t), compound: compound(P, p, t), relative: relative(P, p, m, t), continuous: P * Math.exp(p * t),
        conformal, conformalValue: P * Math.pow(1 + conformal, m * t), doubling: Math.log(2) / Math.log(1 + p), ruleOf72: 72 / (100 * p),
        eTable: E_TABLE_N.map(count => ({n: count, value: eApprox(count)})),
    };
};

const logOf = (state: GrowthState): LogDerived => {
    const q = state.logQ / LOG_Q_SCALE;
    const power = state.logModel === 'power';
    const ns: number[] = [];
    const ys: number[] = [];
    for (let k = 0; k <= state.n; k++) {
        const index = power ? k + 1 : k;
        ns.push(index);
        ys.push(power ? state.y0 * index * index : state.y0 * Math.pow(q, index));
    }
    const lnY = ys.map(y => Math.log(y));
    const last = ns.length - 1;
    return {
        q, ns, ys, lnY, slope: (lnY[last] - lnY[0]) / (ns[last] - ns[0]), slopeFirst: (lnY[1] - lnY[0]) / (ns[1] - ns[0]),
        slopeLast: (lnY[last] - lnY[last - 1]) / (ns[last] - ns[last - 1]), lnQ: Math.log(q), straight: !power,
    };
};

/** Every value a growth readout or drawing needs, recomputed from the validated state (never read from a Preset). */
export const deriveGrowth = (state: GrowthState): GrowthDerived => ({sequence: sequenceOf(state), interest: interestOf(state), log: logOf(state)});
