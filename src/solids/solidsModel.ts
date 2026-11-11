import type {Xyz} from '../graphs/patches/surface-view/surfaceScene';
import {NORMAL_LIMIT, OFFSET_LIMIT} from './section';

/**
 * Stored state of the solids graph (docs/adr/0051-solids-mesh-in-surface-view-integer-clipping-and-kgon-revolve.md section 2;
 * docs/specs/solids-volumes-lessons.md, Implementation Decisions "State"). Pure TypeScript: no React, JSXGraph or localization,
 * so errors are codes (`field` plus `reason`, with the limits) and the graph words them.
 *
 * Everything stored on the clipping grid is an integer: the plane normal has components -4..4 (not all zero), the offset D is in
 * grid units of 1/4 (the plane is n . x = D/4 in real units), the shear is in units of 1/4. Imported values are never snapped or
 * clamped: an off-range or off-grid value rejects the whole state. Unknown fields are accepted and dropped. A section needs a convex
 * grid solid (ADR 0051 section 2), so `mode: 'section'` with another solid is rejected as inconsistent, and `withSolid` / `withMode`
 * keep a state consistent when the learner changes one of them.
 */

export type SolidsErrorReason = 'not-an-object' | 'not-finite' | 'off-grid' | 'out-of-range' | 'unknown-value' | 'missing' | 'inconsistent' | 'zero-normal';
export interface SolidsError {
    readonly field: string;
    readonly reason: SolidsErrorReason;
    /** The accepted integer range for range and grid errors. */
    readonly min?: number;
    readonly max?: number;
    /** The accepted names for `unknown-value` and `missing`, or the solids the mode accepts for `inconsistent`. */
    readonly choices?: readonly string[];
}
export type SolidsResult<T> = {readonly ok: true; readonly value: T} | {readonly ok: false; readonly error: SolidsError};

const ok = <T>(value: T): SolidsResult<T> => ({ok: true, value});
const fail = <T>(error: SolidsError): SolidsResult<T> => ({ok: false, error});
const isRecord = (data: unknown): data is Record<string, unknown> => data !== null && typeof data === 'object' && !Array.isArray(data);
const norm = (n: number) => (n === 0 ? 0 : n); // no -0 in stored state
const finite = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

export interface IntegerRange {
    readonly min: number;
    readonly max: number;
}

// ---- Choices and ranges ----

/** Convex grid solids (a section is offered), then solids that are revolve meshes or not on the clipping grid. */
export const SECTION_SOLIDS = ['cube', 'triangular-prism', 'square-prism', 'square-pyramid'] as const;
export const OTHER_SOLIDS = ['cone', 'sqrt', 'parabola', 'sphere'] as const;
export const SOLID_IDS = [...SECTION_SOLIDS, ...OTHER_SOLIDS] as const;
export type SolidId = typeof SOLID_IDS[number];

export const MODES = ['section', 'stack', 'volume', 'revolve'] as const;
export type SolidsMode = typeof MODES[number];

/** Solids each mode accepts. Section: convex grid solids only. Stack (Cavalieri slabs): the solids the shear moves. Revolve: the profiles. */
export const MODE_SOLIDS: Readonly<Record<SolidsMode, readonly SolidId[]>> = {
    section: SECTION_SOLIDS,
    stack: ['cube', 'square-prism', 'cone'],
    volume: SOLID_IDS,
    revolve: ['cone', 'sqrt', 'parabola', 'sphere'],
};

export const modeAccepts = (mode: SolidsMode, solid: SolidId): boolean => MODE_SOLIDS[mode].includes(solid);

/**
 * The axis a profile is rotated about in revolve mode (SV5 step 5). Rotating the region under `f` about the y-axis needs a
 * profile that starts on the axis and grows, so the sphere (a half disc over -3..3, which would only give a hemisphere) keeps x.
 */
export const AXES = ['x', 'y'] as const;
export type SolidsAxis = typeof AXES[number];
export const Y_AXIS_SOLIDS: readonly SolidId[] = ['cone', 'sqrt', 'parabola'];
export const axisAccepts = (solid: SolidId, axis: SolidsAxis): boolean => axis === 'x' || Y_AXIS_SOLIDS.includes(solid);
/**
 * Stack mode holds two pairs (SV3): the straight and sheared solid (the prism and the cube), whose slice areas stay equal, and the
 * failing pair, a cone and a cylinder of equal height, whose slice areas differ. The pair follows from the solid, so a Preset
 * cannot name a pair its solid does not show.
 */
export type StackPair = 'sheared' | 'failing';
export const stackPair = (solid: SolidId): StackPair => (solid === 'cone' ? 'failing' : 'sheared');
/** Sections are offered for convex grid solids only. */
export const isSectionSolid = (solid: SolidId): boolean => modeAccepts('section', solid);

export const NORMAL_RANGE: IntegerRange = {min: -NORMAL_LIMIT, max: NORMAL_LIMIT};
/** D in grid units of 1/4; |D| beyond OFFSET_LIMIT never meets a solid of the grid. */
export const OFFSET_RANGE: IntegerRange = {min: -OFFSET_LIMIT, max: OFFSET_LIMIT};
export const OFFSET_SCALE = 4;
/** Shear in units of 1/4, up to 3. */
export const SHEAR_RANGE: IntegerRange = {min: -12, max: 12};
export const SHEAR_SCALE = 4;
/** The number of discs or slabs (the spec: up to 60). */
export const DISC_RANGE: IntegerRange = {min: 1, max: 60};

/** The cursor height of stack mode in units of 1/40 of the solid's height, strictly inside it. */
export const CURSOR_RANGE: IntegerRange = {min: 1, max: 39};
export const CURSOR_SCALE = 40;
export const DEFAULT_CURSOR = 20;
export const cursorOf = (c: number): number => c / CURSOR_SCALE;

export const offsetOf = (D: number): number => D / OFFSET_SCALE;
export const shearOf = (S: number): number => S / SHEAR_SCALE;

// ---- Field parsers (strict, no snapping) ----

function parseInteger(value: unknown, field: string, range: IntegerRange): SolidsResult<number> {
    if (value === undefined || value === null) return fail({field, reason: 'missing', ...range});
    if (!finite(value)) return fail({field, reason: 'not-finite', ...range});
    if (!Number.isInteger(value)) return fail({field, reason: 'off-grid', ...range});
    if (value < range.min || value > range.max) return fail({field, reason: 'out-of-range', ...range});
    return ok(norm(value));
}

function parseChoice<T extends string>(value: unknown, field: string, choices: readonly T[]): SolidsResult<T> {
    if (value === undefined || value === null) return fail({field, reason: 'missing', choices});
    const found = choices.find(choice => choice === value);
    return found !== undefined ? ok(found) : fail({field, reason: 'unknown-value', choices});
}

export interface SolidsCamera {
    readonly az: number;
    readonly el: number;
    readonly distance: number;
    readonly projection: 'perspective';
    readonly target: Xyz;
}

function parseCamera(value: unknown): SolidsResult<SolidsCamera> {
    if (value === undefined || value === null) return fail({field: 'camera', reason: 'missing'});
    if (!isRecord(value)) return fail({field: 'camera', reason: 'not-an-object'});
    const {az, el, distance, projection, target} = value;
    if (!finite(az)) return fail({field: 'camera.az', reason: az === undefined ? 'missing' : 'not-finite'});
    if (!finite(el)) return fail({field: 'camera.el', reason: el === undefined ? 'missing' : 'not-finite'});
    if (Math.abs(el) > Math.PI / 2) return fail({field: 'camera.el', reason: 'out-of-range'});
    if (!finite(distance)) return fail({field: 'camera.distance', reason: distance === undefined ? 'missing' : 'not-finite'});
    if (distance <= 0) return fail({field: 'camera.distance', reason: 'out-of-range'});
    if (projection !== 'perspective') return fail({field: 'camera.projection', reason: 'unknown-value', choices: ['perspective']});
    if (!Array.isArray(target) || target.length !== 3 || !target.every(finite)) return fail({field: 'camera.target', reason: 'not-finite'});
    return ok({az, el, distance, projection: 'perspective', target: [target[0], target[1], target[2]]});
}

// ---- The state ----

export interface SolidsState {
    readonly solid: SolidId;
    readonly mode: SolidsMode;
    /** Plane normal (integers -4..4, not all zero). */
    readonly normal: readonly [number, number, number];
    /** Plane offset D in units of 1/4: the plane is normal . x = D/4. */
    readonly offset: number;
    /** Shear S in units of 1/4. */
    readonly shear: number;
    /** Discs (revolve) or slabs (stack), 1 to 60. */
    readonly discs: number;
    /** Revolve mode: the axis of rotation. Stored in every state; a Preset without it means 'x'. */
    readonly axis: SolidsAxis;
    /** Stack mode: the height of the compared slices, 1 to 39 in units of 1/40 of the height. A Preset without it means 20 (the middle). */
    readonly cursor: number;
    readonly camera: SolidsCamera;
}

/** SV1, step 1: the cube cut by z = 1/2 (normal (0,0,1), D = 2). */
export const DEFAULT_SOLIDS_STATE: SolidsState = {
    solid: 'cube', mode: 'section', normal: [0, 0, 1], offset: 2, shear: 0, discs: 10, axis: 'x', cursor: DEFAULT_CURSOR,
    camera: {az: -0.9, el: 0.5, distance: 9, projection: 'perspective', target: [0.5, 0.5, 0.5]},
};

export function parseSolidsState(data: unknown): SolidsResult<SolidsState> {
    if (!isRecord(data)) return fail({field: 'state', reason: 'not-an-object'});
    const solid = parseChoice(data.solid, 'solid', SOLID_IDS);
    if (!solid.ok) return solid;
    const mode = parseChoice(data.mode, 'mode', MODES);
    if (!mode.ok) return mode;
    if (data.normal === undefined || data.normal === null) return fail({field: 'normal', reason: 'missing'});
    if (!Array.isArray(data.normal) || data.normal.length !== 3) return fail({field: 'normal', reason: 'not-an-object'});
    const normal: number[] = [];
    for (let i = 0; i < 3; i++) {
        const component = parseInteger(data.normal[i], `normal[${i}]`, NORMAL_RANGE);
        if (!component.ok) return component;
        normal.push(component.value);
    }
    if (normal.every(c => c === 0)) return fail({field: 'normal', reason: 'zero-normal'});
    const offset = parseInteger(data.offset, 'offset', OFFSET_RANGE);
    if (!offset.ok) return offset;
    const shear = parseInteger(data.shear, 'shear', SHEAR_RANGE);
    if (!shear.ok) return shear;
    const discs = parseInteger(data.discs, 'discs', DISC_RANGE);
    if (!discs.ok) return discs;
    const axis = data.axis === undefined ? ok<SolidsAxis>('x') : parseChoice(data.axis, 'axis', AXES);
    if (!axis.ok) return axis;
    const cursor = data.cursor === undefined ? ok(DEFAULT_CURSOR) : parseInteger(data.cursor, 'cursor', CURSOR_RANGE);
    if (!cursor.ok) return cursor;
    const camera = parseCamera(data.camera);
    if (!camera.ok) return camera;
    if (!modeAccepts(mode.value, solid.value)) return fail({field: 'mode', reason: 'inconsistent', choices: MODE_SOLIDS[mode.value]});
    if (!axisAccepts(solid.value, axis.value)) return fail({field: 'axis', reason: 'inconsistent', choices: Y_AXIS_SOLIDS});
    return ok({
        solid: solid.value, mode: mode.value, normal: [normal[0], normal[1], normal[2]], offset: offset.value,
        shear: shear.value, discs: discs.value, axis: axis.value, cursor: cursor.value, camera: camera.value,
    });
}

/** The state to store in a Preset: only the stored fields, arrays copied. */
export const serializeSolidsState = (s: SolidsState): SolidsState => ({
    solid: s.solid, mode: s.mode, normal: [s.normal[0], s.normal[1], s.normal[2]], offset: s.offset, shear: s.shear, discs: s.discs, axis: s.axis, cursor: s.cursor,
    camera: {az: s.camera.az, el: s.camera.el, distance: s.camera.distance, projection: 'perspective', target: [s.camera.target[0], s.camera.target[1], s.camera.target[2]]},
});

/** A new solid: the mode falls back to `volume` (accepted by every solid) and the axis to `x` when the new solid does not suit them. */
export function withSolid(state: SolidsState, solid: SolidId): SolidsState {
    if (solid === state.solid) return state;
    return {...state, solid, mode: modeAccepts(state.mode, solid) ? state.mode : 'volume', axis: axisAccepts(solid, state.axis) ? state.axis : 'x'};
}

/** A new mode: the solid falls back to the mode's first solid when the current one does not suit it. */
export function withMode(state: SolidsState, mode: SolidsMode): SolidsState {
    if (mode === state.mode) return state;
    return {...state, mode, solid: modeAccepts(mode, state.solid) ? state.solid : MODE_SOLIDS[mode][0]};
}
