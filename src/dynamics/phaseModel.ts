import {MATRIX_ENTRY_MAX, MATRIX_ENTRY_MIN, MATRIX_ENTRY_STEP} from '../linear/matrix2';
import type {Mat2, Vec2} from '../linear/matrix2';
import {classifyPlane, type PlaneClassification} from './classify2';
import {
    LOGISTIC_R_RANGE, detectPeriodAtR, fixedPoint, fixedPointAttracts, fixedPointMultiplier, logisticMap, twoCycle, twoCycleAttracts,
    twoCycleExists, twoCycleMultiplier, type PeriodResult,
} from './logistic';
import {integrate, RK4_STEP, type StopReason, type View} from './rk4';
import {isHyperbolic, SYSTEM_IDS, systemEquilibria, systemField, systemJacobian, type SystemId} from './systems2';

/**
 * Stored state of the two phase-portrait graphs (docs/adr/0054-phase-portraits-separate-graphs-rk4-integer-classification.md;
 * docs/specs/phase-portraits-lessons.md, Implementation Decisions). Pure TypeScript: no React, JSXGraph or localization
 * (messages are English developer text).
 *
 * Everything stored is an integer or a name, so every label comes from an integer test: matrix entries are A/4 (the quarter grid
 * of ADR 0025, [-4, 4]), a seed coordinate is S/20, the logistic parameter is r = R/100 and the start is x0 = X/100. Every derived
 * value (type, trajectories, period) is recomputed from the validated state and is never read from a Preset: derived and unknown
 * fields are accepted and dropped. Imported values are never snapped or clamped (an off-range value rejects the whole state); typed
 * input from the UI goes through `typedInteger` (refused when off the grid or out of range) and a drag through `snapDragInteger`.
 * Playback is not stored, so a Preset reopens paused.
 */

// ---- Result type ----

export type PhaseErrorReason = 'not-an-object' | 'not-finite' | 'off-grid' | 'out-of-range' | 'unknown-value' | 'missing' | 'inconsistent';
export interface PhaseError {
    readonly field: string;
    readonly reason: PhaseErrorReason;
    readonly message: string;
}
export type PhaseResult<T> = {readonly ok: true; readonly value: T} | {readonly ok: false; readonly error: PhaseError};

const ok = <T>(value: T): PhaseResult<T> => ({ok: true, value});
const fail = <T>(field: string, reason: PhaseErrorReason, message: string): PhaseResult<T> => ({ok: false, error: {field, reason, message}});
const isRecord = (data: unknown): data is Record<string, unknown> => data !== null && typeof data === 'object' && !Array.isArray(data);
const norm = (n: number) => (n === 0 ? 0 : n); // no -0 in stored state

export interface IntegerRange {
    readonly min: number;
    readonly max: number;
}

// ---- Ranges and scales ----

/** Matrix entry a = A/4 on [-4, 4]: A is an integer from -16 to 16. */
export const ENTRY_SCALE = 1 / MATRIX_ENTRY_STEP;
export const ENTRY_RANGE: IntegerRange = {min: MATRIX_ENTRY_MIN * ENTRY_SCALE, max: MATRIX_ENTRY_MAX * ENTRY_SCALE};
/** Seed coordinate s = S/20 on [-4, 4] (the pendulum separatrix point (0, 2) is S = (0, 40)). */
export const SEED_SCALE = 20;
export const SEED_RANGE: IntegerRange = {min: -4 * SEED_SCALE, max: 4 * SEED_SCALE};
/** Seeds are 1 to 6 points. */
export const SEEDS_MIN = 1;
export const SEEDS_MAX = 6;
/** The view half-width is 4 / 2^Z for the zoom level Z, 0 to 6. */
export const ZOOM_RANGE: IntegerRange = {min: 0, max: 6};
export const BASE_HALF_WIDTH = 4;
/** Logistic: r = R/100, x0 = X/100 strictly inside (0, 1), the number of drawn cobweb steps 0 to 60. */
export const R_SCALE = 100;
export const R_RANGE: IntegerRange = LOGISTIC_R_RANGE;
export const X_SCALE = 100;
export const X_RANGE: IntegerRange = {min: 1, max: X_SCALE - 1};
export const STEP_RANGE: IntegerRange = {min: 0, max: 60};

export const entryOf = (A: number): number => A / ENTRY_SCALE;
export const seedOf = (S: number): number => S / SEED_SCALE;
export const rOf = (R: number): number => R / R_SCALE;
export const startOf = (X: number): number => X / X_SCALE;
export const halfWidthOf = (zoom: number): number => BASE_HALF_WIDTH / 2 ** zoom;

// ---- Field parsers (strict, no snapping) ----

function parseInteger(value: unknown, field: string, range: IntegerRange): PhaseResult<number> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected a whole number from ${range.min} to ${range.max}.`);
    if (typeof value !== 'number' || !Number.isFinite(value)) return fail(field, 'not-finite', `${field} must be a finite number, not ${typeof value === 'number' ? String(value) : typeof value}; expected a whole number from ${range.min} to ${range.max}.`);
    if (!Number.isInteger(value)) return fail(field, 'off-grid', `${field} must be a whole number from ${range.min} to ${range.max}.`);
    if (value < range.min || value > range.max) return fail(field, 'out-of-range', `${field} is outside [${range.min}, ${range.max}].`);
    return ok(norm(value));
}

function parseChoice<T extends string>(value: unknown, field: string, choices: readonly T[]): PhaseResult<T> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected one of: ${choices.join(', ')}.`);
    const found = choices.find(choice => choice === value);
    return found !== undefined ? ok(found) : fail(field, 'unknown-value', `${field} must be one of: ${choices.join(', ')}.`);
}

// ---- Typed input and dragging ----

/**
 * A typed value on a grid of 1/scale: the integer it stands for. Anything not finite, off the grid (more digits than the grid has)
 * or outside the range is refused with a reason, never rounded or clamped into range.
 */
export function typedInteger(value: number, scale: number, range: IntegerRange, field: string): PhaseResult<number> {
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

// ---- The phase-portrait state (PhasePortraitGraph, PP1 to PP3) ----

export interface SeedState {
    /** x = X/20 (the angle theta for the pendulum). */
    readonly X: number;
    /** y = Y/20 (the angular velocity omega for the pendulum). */
    readonly Y: number;
}

export interface PhaseState {
    readonly system: SystemId;
    /** The matrix of `linear`, entries A/4, B/4, C/4, D/4 for ((a, b), (c, d)). Kept for the other systems too, unused there. */
    readonly A: number;
    readonly B: number;
    readonly C: number;
    readonly D: number;
    readonly seeds: readonly SeedState[];
    /** Index into the system's listed equilibria that the view is centred on (0 unless the system has several). */
    readonly equilibrium: number;
    /** Zoom level around the equilibrium, 0 to 6 (half-width 4 / 2^Z). */
    readonly zoom: number;
}

/** The stable node of PP1, step 1 (eigenvalues -5 and -2), one seed at (1, 0). */
export const DEFAULT_PHASE_STATE: PhaseState = {system: 'linear', A: -16, B: -4, C: -8, D: -12, seeds: [{X: 20, Y: 0}], equilibrium: 0, zoom: 0};

/** Only `pendulum` has more than one listed equilibrium the view may be centred on: (0, 0) and (pi, 0). */
export const equilibriumChoices = (system: SystemId): number => (system === 'pendulum' ? 2 : 1);

export const matrixOf = (s: PhaseState): Mat2 => [[entryOf(s.A), entryOf(s.B)], [entryOf(s.C), entryOf(s.D)]];
export const centreOf = (s: PhaseState): Vec2 => systemEquilibria(s.system)[s.equilibrium];

function parseSeed(data: unknown, index: number): PhaseResult<SeedState> {
    if (!isRecord(data)) return fail(`seeds[${index}]`, 'not-an-object', `seeds[${index}] must be an object with X and Y.`);
    const X = parseInteger(data.X, `seeds[${index}].X`, SEED_RANGE);
    if (!X.ok) return X;
    const Y = parseInteger(data.Y, `seeds[${index}].Y`, SEED_RANGE);
    if (!Y.ok) return Y;
    return ok({X: X.value, Y: Y.value});
}

export function parsePhaseState(data: unknown): PhaseResult<PhaseState> {
    if (!isRecord(data)) return fail('state', 'not-an-object', 'The phase-portrait state must be an object.');
    const system = parseChoice(data.system, 'system', SYSTEM_IDS);
    if (!system.ok) return system;
    const entries: number[] = [];
    for (const field of ['A', 'B', 'C', 'D'] as const) {
        const entry = parseInteger(data[field], field, ENTRY_RANGE);
        if (!entry.ok) return entry;
        entries.push(entry.value);
    }
    if (data.seeds === undefined || data.seeds === null) return fail('seeds', 'missing', `seeds is missing; expected a list of ${SEEDS_MIN} to ${SEEDS_MAX} seeds.`);
    if (!Array.isArray(data.seeds)) return fail('seeds', 'not-an-object', 'seeds must be a list of seeds.');
    if (data.seeds.length < SEEDS_MIN || data.seeds.length > SEEDS_MAX) return fail('seeds', 'out-of-range', `seeds must have ${SEEDS_MIN} to ${SEEDS_MAX} entries.`);
    const seeds: SeedState[] = [];
    for (let i = 0; i < data.seeds.length; i++) {
        const seed = parseSeed(data.seeds[i], i);
        if (!seed.ok) return seed;
        seeds.push(seed.value);
    }
    const equilibrium = parseInteger(data.equilibrium, 'equilibrium', {min: 0, max: 1});
    if (!equilibrium.ok) return equilibrium;
    if (equilibrium.value >= equilibriumChoices(system.value)) {
        return fail('equilibrium', 'inconsistent', `equilibrium must be 0 for the system ${system.value}.`);
    }
    const zoom = parseInteger(data.zoom, 'zoom', ZOOM_RANGE);
    if (!zoom.ok) return zoom;
    return ok({system: system.value, A: entries[0], B: entries[1], C: entries[2], D: entries[3], seeds, equilibrium: equilibrium.value, zoom: zoom.value});
}

/** The state to store in a Preset: only the stored fields, seeds copied. Every derived value is left out. */
export const serializePhaseState = (s: PhaseState): PhaseState => ({
    system: s.system, A: s.A, B: s.B, C: s.C, D: s.D, seeds: s.seeds.map(seed => ({X: seed.X, Y: seed.Y})), equilibrium: s.equilibrium, zoom: s.zoom,
});

/** A new system: the equilibrium falls back to 0 when the new system does not have it. */
export function withSystem(state: PhaseState, system: SystemId): PhaseState {
    if (system === state.system) return state;
    return {...state, system, equilibrium: state.equilibrium < equilibriumChoices(system) ? state.equilibrium : 0};
}

// ---- Derived phase-portrait values ----

/** Orbit horizon: 500 steps of h = 0.02, forward and backward. */
export const ORBIT_STEPS = 500;
export const ORBIT_DURATION = ORBIT_STEPS * RK4_STEP;
/** Trajectories started on a ring around the equilibrium (PP3). */
export const RING_COUNT = 12;
/** Radius of that ring as a fraction of the view half-width. */
export const RING_FRACTION = 0.75;
/** |H - 1| below this is reported "on the separatrix (within 1e-9)", never "exactly". */
export const SEPARATRIX_TOLERANCE = 1e-9;

/** One drawn orbit: forward and backward halves, each with its reported stop. */
export interface Orbit {
    readonly start: Vec2;
    readonly forward: readonly Vec2[];
    readonly backward: readonly Vec2[];
    readonly forwardStop: StopReason;
    readonly backwardStop: StopReason;
}

export type EnergyStatus =
    | {readonly kind: 'swing'; readonly H: number}
    | {readonly kind: 'rotation'; readonly H: number}
    /** Decided by an integer test: only at theta = 0, where H = 1 iff |omega| = 2. */
    | {readonly kind: 'separatrix-exact'; readonly H: number}
    | {readonly kind: 'separatrix-near'; readonly H: number};

export interface PhaseDerived {
    /** Classification of x' = A x (the matrix, or the Jacobian at the equilibrium of another system); exact, no tolerance. */
    readonly plane: PlaneClassification;
    /** The Jacobian the classification used: the matrix for `linear`, the analytic Jacobian at the equilibrium otherwise. */
    readonly jacobian: Mat2;
    /** True iff no eigenvalue of the Jacobian has real part 0 (exact integer test). When false the linearization does not decide. */
    readonly hyperbolic: boolean;
    readonly view: View;
    readonly centre: Vec2;
    /** The orbits of the stored seeds (computed). */
    readonly orbits: readonly Orbit[];
    /** Orbits from a ring around the equilibrium (computed; PP3); empty for `linear`. */
    readonly ring: readonly Orbit[];
    /** The same ring under the linearization x' = J (x - x*) (computed); empty for `linear`. */
    readonly ringLinear: readonly Orbit[];
    /** Pendulum only: the energy status of every seed, by seed index; empty for the other systems. */
    readonly energies: readonly EnergyStatus[];
}

const viewAround = (centre: Vec2, half: number): View => ({xMin: centre[0] - half, xMax: centre[0] + half, yMin: centre[1] - half, yMax: centre[1] + half});

function orbitFrom(field: (s: Vec2) => Vec2, start: Vec2, view: View): Orbit {
    const forward = integrate(field, start, ORBIT_DURATION, {view});
    const backward = integrate(field, start, -ORBIT_DURATION, {view});
    return {start, forward: forward.points, backward: backward.points, forwardStop: forward.stop, backwardStop: backward.stop};
}

/** H = omega^2/2 - cos(theta), the pendulum energy at the point (theta, omega). */
export const pendulumEnergy = (theta: number, omega: number): number => (omega * omega) / 2 - Math.cos(theta);

/**
 * Swing (H < 1), rotation (H > 1) or the separatrix (H = 1) for a seed (X, Y) on the 1/20 grid. At theta = 0 the cosine is exactly 1,
 * so H = 1 iff Y^2 = 1600 (|omega| = 2), an integer comparison; elsewhere cos is computed, so only "within 1e-9" can be said.
 */
export function energyStatus(seed: SeedState): EnergyStatus {
    const H = pendulumEnergy(seedOf(seed.X), seedOf(seed.Y));
    if (seed.X === 0) {
        const compare = seed.Y * seed.Y - 2 * 2 * SEED_SCALE * SEED_SCALE; // 20^2 (omega^2 - 4), zero iff H = 1
        return compare === 0 ? {kind: 'separatrix-exact', H} : {kind: compare < 0 ? 'swing' : 'rotation', H};
    }
    if (Math.abs(H - 1) < SEPARATRIX_TOLERANCE) return {kind: 'separatrix-near', H};
    return {kind: H < 1 ? 'swing' : 'rotation', H};
}

/** Every value a phase-portrait readout or drawing needs, recomputed from the validated state (never read from a Preset). */
export function derivePhase(state: PhaseState): PhaseDerived {
    const matrix = matrixOf(state);
    const centre = centreOf(state);
    const jacobian = systemJacobian(state.system, centre, matrix);
    const view = viewAround(centre, halfWidthOf(state.zoom));
    const field = systemField(state.system, matrix);
    const orbits = state.seeds.map(seed => orbitFrom(field, [seedOf(seed.X), seedOf(seed.Y)], view));
    let ring: Orbit[] = [];
    let ringLinear: Orbit[] = [];
    if (state.system !== 'linear') {
        const radius = RING_FRACTION * halfWidthOf(state.zoom);
        const linearField = (s: Vec2): Vec2 => {
            const dx = s[0] - centre[0];
            const dy = s[1] - centre[1];
            return [jacobian[0][0] * dx + jacobian[0][1] * dy, jacobian[1][0] * dx + jacobian[1][1] * dy];
        };
        const starts = Array.from({length: RING_COUNT}, (_, i): Vec2 => [
            centre[0] + radius * Math.cos((2 * Math.PI * i) / RING_COUNT), centre[1] + radius * Math.sin((2 * Math.PI * i) / RING_COUNT),
        ]);
        ring = starts.map(start => orbitFrom(field, start, view));
        ringLinear = starts.map(start => orbitFrom(linearField, start, view));
    }
    return {
        plane: classifyPlane(jacobian), jacobian, hyperbolic: isHyperbolic(jacobian), view, centre, orbits, ring, ringLinear,
        energies: state.system === 'pendulum' ? state.seeds.map(energyStatus) : [],
    };
}

// ---- The logistic state (LogisticMapGraph, PP4 and PP5) ----

export interface LogisticState {
    /** r = R/100. */
    readonly R: number;
    /** x0 = X/100, strictly between 0 and 1. */
    readonly X: number;
    /** The number of drawn cobweb steps, 0 to 60. Stored; playback is not. */
    readonly step: number;
}

/** r = 2,9, x0 = 0,2, no steps drawn: the first step of PP4. */
export const DEFAULT_LOGISTIC_STATE: LogisticState = {R: 290, X: 20, step: 0};

export function parseLogisticState(data: unknown): PhaseResult<LogisticState> {
    if (!isRecord(data)) return fail('state', 'not-an-object', 'The logistic state must be an object.');
    const R = parseInteger(data.R, 'R', R_RANGE);
    if (!R.ok) return R;
    const X = parseInteger(data.X, 'X', X_RANGE);
    if (!X.ok) return X;
    const step = parseInteger(data.step, 'step', STEP_RANGE);
    if (!step.ok) return step;
    return ok({R: R.value, X: X.value, step: step.value});
}

export const serializeLogisticState = (s: LogisticState): LogisticState => ({R: s.R, X: s.X, step: s.step});

/**
 * Decided by integer tests on R alone: the fixed point attracts for 100 < R < 300; at R = 300 its multiplier is exactly -1; the
 * 2-cycle attracts for 300 < R <= 344; from 345 only a computed period can be said (a tolerance, never exact).
 */
export type LogisticKind = 'fixed-attracting' | 'neutral-at-3' | 'two-cycle-attracting' | 'beyond-two-cycle';

export interface LogisticDerived {
    readonly kind: LogisticKind;
    readonly exact: boolean;
    readonly r: number;
    readonly x0: number;
    /** The fixed point 1 - 1/r and its multiplier 2 - r. */
    readonly fixedPoint: number;
    readonly fixedMultiplier: number;
    /** The 2-cycle and its multiplier; null for R <= 300. */
    readonly twoCycle: readonly [number, number] | null;
    readonly twoCycleMultiplier: number | null;
    /** Computed (tolerance 1e-9) period from x0 = 0,2; independent of the stored start. */
    readonly period: PeriodResult;
    /** x0, ..., x_step (computed). */
    readonly iterates: readonly number[];
}

export function classifyLogisticR(R: number): LogisticKind {
    if (fixedPointAttracts(R)) return 'fixed-attracting';
    if (R === 300) return 'neutral-at-3';
    return twoCycleAttracts(R) ? 'two-cycle-attracting' : 'beyond-two-cycle';
}

/** The period detector runs 200000 steps; it depends on R alone (at most 151 values), so each result is computed once. */
const periodCache = new Map<number, PeriodResult>();
/** How many results are cached; never more than the grid has values (a test hook for the bound). */
export const periodCacheSize = (): number => periodCache.size;
const periodAt = (R: number): PeriodResult => {
    // Only grid-valid R (an integer in range) is cached, so the map holds at most one entry per grid value; anything else is rejected before the lookup.
    if (!Number.isInteger(R) || R < R_RANGE.min || R > R_RANGE.max) throw new RangeError(`R must be an integer from ${R_RANGE.min} to ${R_RANGE.max}.`);
    let found = periodCache.get(R);
    if (!found) {
        found = detectPeriodAtR(R);
        periodCache.set(R, found);
    }
    return found;
};

/** Every value a logistic readout or drawing needs, recomputed from the validated state (never read from a Preset). */
export function deriveLogistic(state: LogisticState): LogisticDerived {
    const f = logisticMap(state.R);
    const x0 = startOf(state.X);
    const iterates: number[] = [x0];
    for (let i = 0; i < state.step; i++) iterates.push(f(iterates[i]));
    const kind = classifyLogisticR(state.R);
    return {
        kind, exact: kind !== 'beyond-two-cycle', r: rOf(state.R), x0, fixedPoint: fixedPoint(state.R), fixedMultiplier: fixedPointMultiplier(state.R),
        twoCycle: twoCycleExists(state.R) ? twoCycle(state.R) : null, twoCycleMultiplier: twoCycleExists(state.R) ? twoCycleMultiplier(state.R) : null,
        period: periodAt(state.R), iterates,
    };
}
