import {bezierDescent, descentTime, descentTimeFrom, G, type BezierDescent} from './descentTime';
import {brachistochrone, type Brachistochrone} from './brachistochrone';
import {arcTrack, bezierTrack, cycloidTrack, lineTrack, type Track, type Vec2} from './tracks';

/**
 * Stored state of the descent graph (docs/adr/0056-mechanical-curves-descent-graph-quarter-grid-tracks.md, sections 1 and 2) and
 * everything it derives. Pure TypeScript: no React, JSXGraph or localization (messages are English developer text).
 *
 * Stored: the mode, the rolling radius of the race and the tautochrone, the end point and the two inner control points of the
 * Bezier track on the quarter grid, three start parameters on the 0.05 grid, and two switches. The elapsed time and the playing flag
 * are host state of the graph and are never stored. Times, statuses and positions are derived from the validated state and never
 * read from a Preset: a Preset that carries other fields is accepted and they are dropped. Imported and typed values are never
 * snapped or clamped (an off-grid or off-range value rejects the whole state, or the one typed number); only a drag snaps, through
 * `snapDrag`. The track starts at P0 = (0, 0); the second coordinate of every point is the depth, measured downwards.
 */

// ---- Result type ----

export type TrackErrorReason = 'not-an-object' | 'not-finite' | 'off-grid' | 'out-of-range' | 'unknown-value' | 'not-boolean' | 'missing';
export interface TrackError {
    readonly field: string;
    readonly reason: TrackErrorReason;
    readonly message: string;
}
export type TrackResult<T> = {readonly ok: true; readonly value: T} | {readonly ok: false; readonly error: TrackError};

const ok = <T>(value: T): TrackResult<T> => ({ok: true, value});
const fail = <T>(field: string, reason: TrackErrorReason, message: string): TrackResult<T> => ({ok: false, error: {field, reason, message}});
const isRecord = (data: unknown): data is Record<string, unknown> => data !== null && typeof data === 'object' && !Array.isArray(data);

// ---- Modes and ranges ----

export const DESCENT_MODES = ['race', 'track', 'tautochrone'] as const;
export type DescentMode = typeof DESCENT_MODES[number];

export interface FieldRange {
    readonly min: number;
    readonly max: number;
    /** The grid: stored values are min plus a whole number of steps. */
    readonly step: number;
}

/** The quarter grid of the end and control points (ADR 0056 section 2). */
export const QUARTER = 0.25;
/** The grid of the start parameters of the tautochrone. */
export const THETA_STEP = 0.05;

export const RADIUS_RANGE: FieldRange = {min: 0.25, max: 3, step: QUARTER};
export const END_X_RANGE: FieldRange = {min: 0.25, max: 6, step: QUARTER};
export const END_Y_RANGE: FieldRange = {min: 0.25, max: 4, step: QUARTER};
export const CONTROL_X_RANGE: FieldRange = {min: 0, max: 6, step: QUARTER};
/** Negative depths are allowed so that a track above the start can be built and reported. */
export const CONTROL_Y_RANGE: FieldRange = {min: -2, max: 4, step: QUARTER};
/**
 * The largest start parameter on the 0.05 grid (3.1); the accepted maximum is theta = pi (3.1416, the lowest point), the one further
 * value, reached by a drag or the step after 3.1 and refused when typed (3.1416 is not pi).
 */
export const THETA_RANGE: FieldRange = {min: 0, max: 3.1, step: THETA_STEP};

export const NUMERIC_FIELDS = ['radius', 'endX', 'endY', 'p1x', 'p1y', 'p2x', 'p2y', 'theta1', 'theta2', 'theta3'] as const;
export type NumericField = typeof NUMERIC_FIELDS[number];
export const FIELD_RANGES: Readonly<Record<NumericField, FieldRange>> = {
    radius: RADIUS_RANGE, endX: END_X_RANGE, endY: END_Y_RANGE, p1x: CONTROL_X_RANGE, p1y: CONTROL_Y_RANGE,
    p2x: CONTROL_X_RANGE, p2y: CONTROL_Y_RANGE, theta1: THETA_RANGE, theta2: THETA_RANGE, theta3: THETA_RANGE,
};
export const THETA_FIELDS = ['theta1', 'theta2', 'theta3'] as const;
export type ThetaField = typeof THETA_FIELDS[number];
export const isThetaField = (field: NumericField): field is ThetaField => (THETA_FIELDS as readonly string[]).includes(field);

export const TOGGLE_FIELDS = ['showCycloid', 'showArc'] as const;
export type ToggleField = typeof TOGGLE_FIELDS[number];

export interface DescentState {
    readonly mode: DescentMode;
    /** Rolling radius r of the cycloid of the race and the tautochrone (metres). */
    readonly radius: number;
    /** The end point B of the track mode (x, depth). */
    readonly endX: number;
    readonly endY: number;
    /** The inner control points P1 and P2 of the cubic Bezier track (x, depth). */
    readonly p1x: number;
    readonly p1y: number;
    readonly p2x: number;
    readonly p2y: number;
    /** The start parameters (cycloid angle) of the three beads of the tautochrone. */
    readonly theta1: number;
    readonly theta2: number;
    readonly theta3: number;
    /** Track mode: draws the cycloid through A and B. */
    readonly showCycloid: boolean;
    /** Tautochrone: adds the circular arc through the same lowest point. */
    readonly showArc: boolean;
}

/** The default example: the race of MC1 with r = 1 m; the track mode starts at the MC2 numbers, the tautochrone at theta = 0.3, 1, 2. */
export const DEFAULT_DESCENT_STATE: DescentState = {
    mode: 'race', radius: 1, endX: 3.25, endY: 2, p1x: 0.5, p1y: 2, p2x: 2, p2y: 2.5, theta1: 0.3, theta2: 1, theta3: 2,
    showCycloid: true, showArc: false,
};

const GRID_TOLERANCE = 1e-9;
const norm = (n: number) => (n === 0 ? 0 : n); // no -0 in stored state
/** Removes binary noise of a grid product (0.05 * 3 is 0.15000000000000002). */
const clean = (value: number): number => norm(Number(value.toPrecision(12)));

const onGrid = (value: number, range: FieldRange): boolean => {
    const steps = (value - range.min) / range.step;
    return Math.abs(steps - Math.round(steps)) <= GRID_TOLERANCE;
};

/** The lowest point of the cycloid arch is the one stored value off the 0.05 grid. */
const isLowestPoint = (field: NumericField, value: number): boolean => isThetaField(field) && value === Math.PI;

// ---- Strict checks (no snapping) ----

/** One number, as stored: finite, inside the range and on the grid (or theta = pi exactly). Nothing is rounded or clamped. */
export function checkField(field: NumericField, value: unknown): TrackResult<number> {
    const range = FIELD_RANGES[field];
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected a number from ${range.min} to ${range.max}.`);
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return fail(field, 'not-finite', `${field} must be a finite number, not ${typeof value === 'number' ? String(value) : typeof value}.`);
    }
    if (isLowestPoint(field, value)) return ok(value);
    if (value < range.min || value > range.max) return fail(field, 'out-of-range', `${field} is outside [${range.min}, ${range.max}].`);
    if (!onGrid(value, range)) return fail(field, 'off-grid', `${field} must be ${range.min} plus a whole number of steps of ${range.step}.`);
    return ok(clean(value));
}

function parseToggle(value: unknown, field: string): TrackResult<boolean> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected true or false.`);
    return typeof value === 'boolean' ? ok(value) : fail(field, 'not-boolean', `${field} must be true or false.`);
}

/** Strict check of a stored state (a Preset entry, an imported file, a lesson action): the first problem is returned as an actionable error. */
export function parseDescentState(data: unknown): TrackResult<DescentState> {
    if (!isRecord(data)) return fail('state', 'not-an-object', 'The descent state must be an object.');
    if (data.mode === undefined || data.mode === null) return fail('mode', 'missing', `mode is missing; expected one of: ${DESCENT_MODES.join(', ')}.`);
    const mode = DESCENT_MODES.find(id => id === data.mode);
    if (mode === undefined) return fail('mode', 'unknown-value', `mode must be one of: ${DESCENT_MODES.join(', ')}.`);
    const numbers: Partial<Record<NumericField, number>> = {};
    for (const field of NUMERIC_FIELDS) {
        const parsed = checkField(field, data[field]);
        if (!parsed.ok) return parsed;
        numbers[field] = parsed.value;
    }
    const toggles: Partial<Record<ToggleField, boolean>> = {};
    for (const field of TOGGLE_FIELDS) {
        const parsed = parseToggle(data[field], field);
        if (!parsed.ok) return parsed;
        toggles[field] = parsed.value;
    }
    return ok({
        mode, radius: numbers.radius!, endX: numbers.endX!, endY: numbers.endY!, p1x: numbers.p1x!, p1y: numbers.p1y!, p2x: numbers.p2x!,
        p2y: numbers.p2y!, theta1: numbers.theta1!, theta2: numbers.theta2!, theta3: numbers.theta3!,
        showCycloid: toggles.showCycloid!, showArc: toggles.showArc!,
    });
}

/** The state to store in a Preset: only the stored fields, nothing derived and no elapsed time. */
export const serializeDescentState = (s: DescentState): DescentState => ({
    mode: s.mode, radius: s.radius, endX: s.endX, endY: s.endY, p1x: s.p1x, p1y: s.p1y, p2x: s.p2x, p2y: s.p2y,
    theta1: s.theta1, theta2: s.theta2, theta3: s.theta3, showCycloid: s.showCycloid, showArc: s.showArc,
});

// ---- Drag: the one place that snaps ----

/**
 * The value a drag lands on: the nearest grid value (the quarter grid; for a start parameter the 0.05 grid and the lowest point,
 * theta = pi), taken inside the range. Typed values never come here: they go through `checkField` and are refused when invalid.
 */
export function snapDrag(field: NumericField, input: number): number {
    const range = FIELD_RANGES[field];
    if (!Number.isFinite(input)) return range.min;
    const inside = Math.min(Math.max(input, range.min), range.max);
    const onTheGrid = clean(range.min + Math.round((inside - range.min) / range.step) * range.step);
    const snapped = Math.min(Math.max(onTheGrid, range.min), range.max);
    if (isThetaField(field) && Math.abs(input - Math.PI) < Math.abs(input - snapped)) return Math.PI;
    return snapped;
}

// ---- Bead motion ----

/**
 * The track parameter of a bead released at rest at `tStart` after `elapsed` seconds: the time to a parameter is the kernel's
 * descent time of the track clipped there, increasing in the parameter, so the parameter is found by bisection (50 steps, 40 panels
 * per evaluation), not tabulated. From `elapsed` at or beyond the total time the bead rests at the end of the track.
 */
export function beadParameter(track: Track, tStart: number, elapsed: number, g: number = G): number {
    if (!(elapsed > 0)) return tStart;
    if (elapsed >= descentTimeFrom(track, tStart, g)) return track.t1;
    let lo = tStart;
    let hi = track.t1;
    for (let i = 0; i < 50; i++) {
        const mid = (lo + hi) / 2;
        if (descentTimeFrom({...track, t1: mid}, tStart, g, {panels: 40}) < elapsed) lo = mid;
        else hi = mid;
    }
    return (lo + hi) / 2;
}

// ---- Derived ----

/** A time shown on a slider with a 0.01 s grid: rounded up, so the slowest bead can arrive. */
export const roundUpTime = (time: number): number => Number((Math.ceil(time * 100 - 1e-9) / 100).toFixed(2));

export type RaceTrackId = 'line' | 'arc' | 'cycloid';

export interface RaceDerived {
    readonly mode: 'race';
    readonly radius: number;
    /** The end point B = (pi r, 2 r) of one cycloid arch: computed, not on the grid. */
    readonly end: Vec2;
    readonly tracks: Readonly<Record<RaceTrackId, Track>>;
    /** Computed descent times (kernel quadrature). */
    readonly times: Readonly<Record<RaceTrackId, number>>;
    readonly winner: RaceTrackId;
    /** The straight line's time over the cycloid's, minus one, in per cent. */
    readonly lineSlowerPercent: number;
    /** The arc: centre (c, 0), radius c (vertical start tangent) swept by `sweep` radians. */
    readonly arcCentre: number;
    readonly arcSweep: number;
    readonly tEnd: number;
}

export type TrackStatus = 'ok' | 'above-start' | 'never-starts';

export interface TrackDerived {
    readonly mode: 'track';
    /** P0, P1, P2 and B as (x, depth). */
    readonly controls: readonly [Vec2, Vec2, Vec2, Vec2];
    readonly track: Track;
    readonly status: TrackStatus;
    /** The computed descent time of the track; undefined unless the track is admissible. */
    readonly time: number | undefined;
    readonly line: Track;
    readonly lineTime: number;
    readonly cycloid: Brachistochrone;
    /** The track's time minus the cycloid's (never below zero beyond 1e-9 for an admissible track); undefined without a time. */
    readonly difference: number | undefined;
    readonly differencePercent: number | undefined;
    /** The length of the run in seconds; 0 when no bead runs (inadmissible track with the cycloid hidden). */
    readonly tEnd: number;
}

export type StartStatus = 'ok' | 'at-bottom';

export interface TautochroneBead {
    readonly theta: number;
    readonly status: StartStatus;
    /** Computed time on the cycloid from this start to the lowest point. */
    readonly time: number;
    readonly start: Vec2;
    /** The circular arc of the same start depth to the same lowest point (only when requested). */
    readonly arc?: {readonly track: Track; readonly time: number; readonly start: Vec2; readonly sweep: number};
}

export interface TautochroneDerived {
    readonly mode: 'tautochrone';
    readonly radius: number;
    readonly cycloid: Track;
    /** The lowest point (pi r, 2 r) and the closed form pi sqrt(r / g) of the descent time. */
    readonly bottom: Vec2;
    readonly closedForm: number;
    readonly beads: readonly [TautochroneBead, TautochroneBead, TautochroneBead];
    /** The osculating circle at the lowest point (centre (pi r, -2 r), radius 4 r), from the lowest point to depth 0; only when the arc is requested. */
    readonly arcGuide?: Track;
    readonly tEnd: number;
}

export type DescentDerived = RaceDerived | TrackDerived | TautochroneDerived;

/** The lowest depth of the arc radius 4 r: the radius of curvature of the cycloid at its lowest point. */
export const ARC_RADIUS_FACTOR = 4;

export function deriveRace(radius: number): RaceDerived {
    const x = Math.PI * radius;
    const depth = 2 * radius;
    const centre = (radius * (Math.PI * Math.PI + 4)) / (2 * Math.PI);
    const sweep = Math.atan2(depth, centre - x);
    const tracks = {
        line: lineTrack([0, 0], [x, depth]),
        arc: arcTrack([centre, 0], centre, Math.PI, Math.PI - sweep),
        cycloid: cycloidTrack(radius, 0, Math.PI),
    };
    const times = {line: descentTime(tracks.line), arc: descentTime(tracks.arc), cycloid: descentTime(tracks.cycloid)};
    const ids: RaceTrackId[] = ['cycloid', 'arc', 'line'];
    const winner = ids.reduce((best, id) => (times[id] < times[best] ? id : best), 'cycloid' as RaceTrackId);
    const slowest = Math.max(times.line, times.arc, times.cycloid);
    return {
        mode: 'race', radius, end: [x, depth], tracks, times, winner, lineSlowerPercent: (times.line / times.cycloid - 1) * 100,
        arcCentre: centre, arcSweep: sweep, tEnd: roundUpTime(slowest),
    };
}

export const trackControls = (s: DescentState): readonly [Vec2, Vec2, Vec2, Vec2] => [[0, 0], [s.p1x, s.p1y], [s.p2x, s.p2y], [s.endX, s.endY]];

export function deriveTrack(state: DescentState): TrackDerived {
    const controls = trackControls(state);
    const timing: BezierDescent = bezierDescent(controls);
    const line = lineTrack([0, 0], controls[3]);
    const cycloid = brachistochrone(controls[3]);
    const time = timing.kind === 'ok' ? timing.time : undefined;
    const lineTime = descentTime(line);
    let difference: number | undefined;
    if (time !== undefined) {
        const raw = time - cycloid.time;
        difference = raw < 0 && raw > -GRID_TOLERANCE ? 0 : raw; // below the cycloid only by quadrature noise
    }
    const candidates = [time, state.showCycloid ? cycloid.time : undefined].filter((v): v is number => v !== undefined);
    return {
        mode: 'track', controls, track: bezierTrack(controls), status: timing.kind, time, line, lineTime, cycloid, difference,
        differencePercent: difference === undefined ? undefined : (difference / cycloid.time) * 100,
        // No bead at all (inadmissible track, cycloid hidden): the run has length 0 and the graph offers no playback.
        tEnd: candidates.length > 0 ? roundUpTime(Math.max(...candidates)) : 0,
    };
}

/** The start of bead i on the circular arc (radius 4 r, lowest point shared with the cycloid) that has the same start depth. */
function arcBead(radius: number, theta: number): NonNullable<TautochroneBead['arc']> | undefined {
    const bigR = ARC_RADIUS_FACTOR * radius;
    const drop = radius * (1 + Math.cos(theta)); // the height above the lowest point
    if (!(drop > 0)) return undefined;
    const sweep = Math.acos(1 - drop / bigR);
    const centre: Vec2 = [Math.PI * radius, 2 * radius - bigR];
    const track = arcTrack(centre, bigR, Math.PI / 2 + sweep, Math.PI / 2);
    return {track, time: descentTime(track), start: track.point(0), sweep};
}

export function deriveTautochrone(state: DescentState): TautochroneDerived {
    const radius = state.radius;
    const cycloid = cycloidTrack(radius, 0, Math.PI);
    const bead = (theta: number): TautochroneBead => {
        const atBottom = theta >= Math.PI;
        const arc = state.showArc && !atBottom ? arcBead(radius, theta) : undefined;
        return {
            theta, status: atBottom ? 'at-bottom' : 'ok', time: atBottom ? 0 : descentTimeFrom(cycloid, theta), start: cycloid.point(theta),
            ...(arc ? {arc} : {}),
        };
    };
    const beads: [TautochroneBead, TautochroneBead, TautochroneBead] = [bead(state.theta1), bead(state.theta2), bead(state.theta3)];
    const times = beads.flatMap(b => [b.time, b.arc?.time ?? 0]);
    return {
        mode: 'tautochrone', radius, cycloid, bottom: [Math.PI * radius, 2 * radius], closedForm: Math.PI * Math.sqrt(radius / G), beads,
        arcGuide: state.showArc ? arcTrack([Math.PI * radius, 2 * radius - ARC_RADIUS_FACTOR * radius], ARC_RADIUS_FACTOR * radius, Math.PI / 2 + Math.PI / 3, Math.PI / 2) : undefined,
        tEnd: roundUpTime(Math.max(...times)),
    };
}

export function deriveDescent(state: DescentState): DescentDerived {
    switch (state.mode) {
        case 'race': return deriveRace(state.radius);
        case 'track': return deriveTrack(state);
        case 'tautochrone': return deriveTautochrone(state);
    }
}
