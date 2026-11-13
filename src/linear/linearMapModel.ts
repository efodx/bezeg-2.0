import {
    IDENTITY, isLinearMapExampleId, isMatrixEntry, LINEAR_MAP_EXAMPLE_IDS, LINEAR_MAP_EXAMPLES, LinearMapExampleId, Mat2,
    MATRIX_ENTRY_MAX, MATRIX_ENTRY_MIN, snapMatrixEntry, Vec2,
} from './matrix2';
import {ElementKind, isElementIndex, MapElement} from './composition2';

/**
 * Stored state of the linear maps graph (docs/adr/0025-linear-map-graph-and-snapped-matrices.md, sections 1 and 2). Pure
 * TypeScript: no React, JSXGraph or localization.
 *
 * Only these fields are stored. Images, determinant, eigen and singular data are recomputed from the validated state;
 * a Preset that carries such fields is accepted and they are ignored (unknown properties are dropped).
 * Imported entries are never snapped or clamped: an off-grid or out-of-range entry rejects the whole state. Numeric input
 * from the UI uses `snapEntryInput`, which snaps and reports whether it clamped.
 */
export const LINEAR_MAP_MODES = ['basis', 'determinant', 'eigen', 'ellipse', 'composition', 'iterate', 'tracedet'] as const;
export type LinearMapMode = typeof LINEAR_MAP_MODES[number];
export const isLinearMapMode = (value: unknown): value is LinearMapMode =>
    typeof value === 'string' && (LINEAR_MAP_MODES as readonly string[]).includes(value);

export type LinearMapExampleChoice = LinearMapExampleId | 'custom';

export const TEST_ANGLE_MIN = 0;
/** Exclusive upper bound, in degrees. */
export const TEST_ANGLE_MAX = 360;

export interface LinearMapState {
    readonly matrix: Mat2;
    /** Second matrix of the composition mode; absent otherwise. */
    readonly secondMatrix?: Mat2;
    readonly mode: LinearMapMode;
    /** Test-vector direction in degrees, in [0, 360). */
    readonly testAngle: number;
    readonly exampleId: LinearMapExampleChoice;
    readonly probeVisible: boolean;
    readonly curveVisible: boolean;
    readonly squareVisible: boolean;
    /** Start vector v0 of the iterate and tracedet modes (Batch D); absent means `DEFAULT_START`. Coordinates are multiples of 1/4 in [-4, 4]. */
    readonly start?: Vec2;
    /** Iteration step k of those modes, an integer in [0, ITERATE_STEP_MAX]; absent means 0. */
    readonly step?: number;
    /** The ellipse mode shows the conic x^T S x = 1 of the symmetric part instead of the image of the circle; absent means false. */
    readonly conicVisible?: boolean;
    /** Composition mode (Batch C): a chosen rotation or reflection for the first matrix; while set it replaces the stored entries. */
    readonly element?: MapElement;
    /** Composition mode: a chosen rotation or reflection for the second matrix. */
    readonly secondElement?: MapElement;
    /** Composition mode: the translation b of T(P) = c + M (P - c) + b, multiples of 1/4 in [-4, 4]; absent means (0, 0). */
    readonly translation?: Vec2;
    /** Composition mode: the pivot c of that map, on the same grid; absent means the origin. */
    readonly pivot?: Vec2;
}

/** The start vector of a state that stores none: the first L6 example, v0 = (1, 0). */
export const DEFAULT_START: Vec2 = [1, 0];
/** The number of iteration steps the iterate modes offer (lesson L6: the first N <= 30 iterates). */
export const ITERATE_STEP_MAX = 30;
export const startOf = (state: Pick<LinearMapState, 'start'>): Vec2 => state.start ?? DEFAULT_START;
export const stepOf = (state: Pick<LinearMapState, 'step'>): number => state.step ?? 0;

export const DEFAULT_LINEAR_MAP_STATE: LinearMapState = {
    matrix: IDENTITY,
    mode: 'basis',
    testAngle: 0,
    exampleId: 'identity',
    probeVisible: true,
    curveVisible: true,
    squareVisible: true,
};

export type LinearMapErrorReason =
    | 'not-an-object' | 'not-a-matrix' | 'not-finite' | 'off-grid' | 'out-of-range'
    | 'unknown-value' | 'not-boolean' | 'angle-out-of-range' | 'not-a-vector' | 'not-a-step' | 'not-an-element';

/** A structured rejection: `field` names the offending field (for example `matrix[1][0]`), `reason` is a stable code. */
export interface LinearMapError {
    readonly field: string;
    readonly reason: LinearMapErrorReason;
    readonly message: string;
}
export type LinearMapResult<T> = {readonly ok: true; readonly value: T} | {readonly ok: false; readonly error: LinearMapError};

const ok = <T>(value: T): LinearMapResult<T> => ({ok: true, value});
const fail = <T>(field: string, reason: LinearMapErrorReason, message: string): LinearMapResult<T> =>
    ({ok: false, error: {field, reason, message}});

const isRecord = (data: unknown): data is Record<string, unknown> =>
    data !== null && typeof data === 'object' && !Array.isArray(data);

const entryRange = `multiples of 1/4 from ${MATRIX_ENTRY_MIN} to ${MATRIX_ENTRY_MAX}`;

function parseEntry(value: unknown, field: string): LinearMapResult<number> {
    if (typeof value !== 'number' || !Number.isFinite(value)) return fail(field, 'not-finite', `${field} must be a finite number.`);
    if (value < MATRIX_ENTRY_MIN || value > MATRIX_ENTRY_MAX) return fail(field, 'out-of-range', `${field} is outside [${MATRIX_ENTRY_MIN}, ${MATRIX_ENTRY_MAX}]; entries are ${entryRange}.`);
    if (!isMatrixEntry(value)) return fail(field, 'off-grid', `${field} is not a multiple of 1/4; entries are ${entryRange}.`);
    return ok(value === 0 ? 0 : value);
}

/** Strict matrix parse: a 2x2 array of grid entries, else a structured error naming the entry. No snapping. */
export function parseMatrix(data: unknown, field: string): LinearMapResult<Mat2> {
    if (!Array.isArray(data) || data.length !== 2 || !data.every(row => Array.isArray(row) && row.length === 2)) {
        return fail(field, 'not-a-matrix', `${field} must be a 2x2 array of numbers.`);
    }
    const rows: number[][] = [];
    for (let r = 0; r < 2; r++) {
        const row: number[] = [];
        for (let c = 0; c < 2; c++) {
            const entry = parseEntry(data[r][c], `${field}[${r}][${c}]`);
            if (!entry.ok) return entry;
            row.push(entry.value);
        }
        rows.push(row);
    }
    return ok([[rows[0][0], rows[0][1]], [rows[1][0], rows[1][1]]] as Mat2);
}

function parseAngle(data: unknown, field: string): LinearMapResult<number> {
    if (typeof data !== 'number' || !Number.isFinite(data)) return fail(field, 'not-finite', `${field} must be a finite number of degrees.`);
    if (data < TEST_ANGLE_MIN || data >= TEST_ANGLE_MAX) return fail(field, 'angle-out-of-range', `${field} must be in [${TEST_ANGLE_MIN}, ${TEST_ANGLE_MAX}) degrees.`);
    return ok(data === 0 ? 0 : data);
}

/** Strict start vector: two grid coordinates (multiples of 1/4 in [-4, 4]); the zero vector is allowed. */
export function parseStart(data: unknown, field: string): LinearMapResult<Vec2> {
    if (!Array.isArray(data) || data.length !== 2) return fail(field, 'not-a-vector', `${field} must be an array of two numbers.`);
    const x = parseEntry(data[0], `${field}[0]`);
    if (!x.ok) return x;
    const y = parseEntry(data[1], `${field}[1]`);
    if (!y.ok) return y;
    return ok([x.value, y.value] as const);
}

/** Strict step: an integer from 0 to ITERATE_STEP_MAX. */
export function parseStep(data: unknown, field: string): LinearMapResult<number> {
    if (typeof data !== 'number' || !Number.isInteger(data) || data < 0 || data > ITERATE_STEP_MAX) {
        return fail(field, 'not-a-step', `${field} must be a whole number from 0 to ${ITERATE_STEP_MAX}.`);
    }
    return ok(data === 0 ? 0 : data);
}

/** Strict element: `{kind: 'rotation' | 'reflection', k}` with k an integer 0..23 (multiples of 15 degrees). */
export function parseElement(data: unknown, field: string): LinearMapResult<MapElement> {
    if (!isRecord(data)) return fail(field, 'not-an-element', `${field} must be an object {kind, k}.`);
    if (data.kind !== 'rotation' && data.kind !== 'reflection') return fail(`${field}.kind`, 'unknown-value', `${field}.kind must be 'rotation' or 'reflection'.`);
    if (!isElementIndex(data.k)) return fail(`${field}.k`, 'not-an-element', `${field}.k must be a whole number from 0 to 23 (multiples of 15 degrees).`);
    return ok({kind: data.kind, k: data.k === 0 ? 0 : data.k});
}

function parseExampleChoice(data: unknown, field: string): LinearMapResult<LinearMapExampleChoice> {
    if (data === 'custom' || isLinearMapExampleId(data)) return ok(data);
    return fail(field, 'unknown-value', `${field} must be 'custom' or one of: ${LINEAR_MAP_EXAMPLE_IDS.join(', ')}.`);
}

const optional = <T>(data: unknown, parse: (value: unknown) => LinearMapResult<T>): LinearMapResult<T> | undefined =>
    data === undefined || data === null ? undefined : parse(data);

const TOGGLES = ['probeVisible', 'curveVisible', 'squareVisible'] as const;

/**
 * Validates imported data. Returns the sanitized state (unknown and derived properties dropped, `secondMatrix` absent when
 * missing or null) or the first error in field order. Nothing is snapped or clamped.
 */
export function parseLinearMapState(data: unknown): LinearMapResult<LinearMapState> {
    if (!isRecord(data)) return fail('state', 'not-an-object', 'The linear map state must be an object.');
    const matrix = parseMatrix(data.matrix, 'matrix');
    if (!matrix.ok) return matrix;
    let secondMatrix: Mat2 | undefined;
    if (data.secondMatrix !== undefined && data.secondMatrix !== null) {
        const second = parseMatrix(data.secondMatrix, 'secondMatrix');
        if (!second.ok) return second;
        secondMatrix = second.value;
    }
    if (!isLinearMapMode(data.mode)) {
        return fail('mode', 'unknown-value', `mode must be one of: ${LINEAR_MAP_MODES.join(', ')}.`);
    }
    const testAngle = parseAngle(data.testAngle, 'testAngle');
    if (!testAngle.ok) return testAngle;
    const exampleId = parseExampleChoice(data.exampleId, 'exampleId');
    if (!exampleId.ok) return exampleId;
    for (const field of TOGGLES) {
        if (typeof data[field] !== 'boolean') return fail(field, 'not-boolean', `${field} must be true or false.`);
    }
    // The Batch D fields are optional: a Preset stored before them has neither and loads unchanged.
    let start: Vec2 | undefined;
    if (data.start !== undefined && data.start !== null) {
        const parsed = parseStart(data.start, 'start');
        if (!parsed.ok) return parsed;
        start = parsed.value;
    }
    let step: number | undefined;
    if (data.step !== undefined && data.step !== null) {
        const parsed = parseStep(data.step, 'step');
        if (!parsed.ok) return parsed;
        step = parsed.value;
    }
    // The ellipse mode's toggle is optional too: a Preset stored before it has none and loads with the image of the circle shown.
    let conicVisible: boolean | undefined;
    if (data.conicVisible !== undefined && data.conicVisible !== null) {
        if (typeof data.conicVisible !== 'boolean') return fail('conicVisible', 'not-boolean', 'conicVisible must be true or false.');
        conicVisible = data.conicVisible;
    }
    // The Batch C fields are optional too.
    const element = optional(data.element, v => parseElement(v, 'element'));
    if (element && !element.ok) return element;
    const secondElement = optional(data.secondElement, v => parseElement(v, 'secondElement'));
    if (secondElement && !secondElement.ok) return secondElement;
    const translation = optional(data.translation, v => parseStart(v, 'translation'));
    if (translation && !translation.ok) return translation;
    const pivot = optional(data.pivot, v => parseStart(v, 'pivot'));
    if (pivot && !pivot.ok) return pivot;
    return ok({
        matrix: matrix.value,
        ...(secondMatrix ? {secondMatrix} : {}),
        ...(element?.ok ? {element: element.value} : {}),
        ...(secondElement?.ok ? {secondElement: secondElement.value} : {}),
        ...(translation?.ok ? {translation: translation.value} : {}),
        ...(pivot?.ok ? {pivot: pivot.value} : {}),
        ...(conicVisible ? {conicVisible} : {}),
        ...(start ? {start} : {}),
        ...(step !== undefined ? {step} : {}),
        mode: data.mode,
        testAngle: testAngle.value,
        // A named example must match its matrix; otherwise the imported matrix is a custom one.
        exampleId: exampleId.value !== 'custom' && !sameMatrix(LINEAR_MAP_EXAMPLES[exampleId.value], matrix.value)
            ? 'custom'
            : exampleId.value,
        probeVisible: data.probeVisible as boolean,
        curveVisible: data.curveVisible as boolean,
        squareVisible: data.squareVisible as boolean,
    });
}

/** The state to store in a Preset: only the stored fields (no derived values). */
export const serializeLinearMapState = (state: LinearMapState): LinearMapState => ({
    matrix: state.matrix,
    ...(state.secondMatrix ? {secondMatrix: state.secondMatrix} : {}),
    ...(state.element ? {element: state.element} : {}),
    ...(state.secondElement ? {secondElement: state.secondElement} : {}),
    ...(state.translation ? {translation: state.translation} : {}),
    ...(state.pivot ? {pivot: state.pivot} : {}),
    ...(state.start ? {start: state.start} : {}),
    ...(state.step !== undefined ? {step: state.step} : {}),
    ...(state.conicVisible ? {conicVisible: true} : {}),
    mode: state.mode,
    testAngle: state.testAngle,
    exampleId: state.exampleId,
    probeVisible: state.probeVisible,
    curveVisible: state.curveVisible,
    squareVisible: state.squareVisible,
});

// ---- UI input path (snaps, reports clamping) ----

export interface SnappedEntry {
    readonly value: number;
    /** True when the input was outside [-4, 4] and was clamped. */
    readonly clamped: boolean;
    /** True when the stored value differs from the input (clamped or moved to the nearest quarter). */
    readonly adjusted: boolean;
}

/** Snap typed or dragged numeric input to the grid. A non-finite input is an error and never becomes a value. */
export function snapEntryInput(input: number, field = 'entry'): LinearMapResult<SnappedEntry> {
    if (typeof input !== 'number' || !Number.isFinite(input)) return fail(field, 'not-finite', `${field} must be a finite number.`);
    const value = snapMatrixEntry(input);
    return ok({value, clamped: input < MATRIX_ENTRY_MIN || input > MATRIX_ENTRY_MAX, adjusted: value !== input});
}

export type MatrixSlot = 'matrix' | 'secondMatrix';

/** Edits one entry from UI input: snaps, reports clamping, and sets `exampleId` to `custom` (for the first matrix). */
export function editMatrixEntry(
    state: LinearMapState, slot: MatrixSlot, row: 0 | 1, column: 0 | 1, input: number,
): LinearMapResult<{readonly state: LinearMapState; readonly clamped: boolean; readonly adjusted: boolean}> {
    const base = slot === 'matrix' ? state.matrix : state.secondMatrix;
    if (!base) return fail(slot, 'not-a-matrix', `${slot} is not set.`);
    const snapped = snapEntryInput(input, `${slot}[${row}][${column}]`);
    if (!snapped.ok) return snapped;
    const next: Mat2 = [
        row === 0 ? (column === 0 ? [snapped.value.value, base[0][1]] : [base[0][0], snapped.value.value]) : base[0],
        row === 1 ? (column === 0 ? [snapped.value.value, base[1][1]] : [base[1][0], snapped.value.value]) : base[1],
    ];
    const edited = slot === 'matrix' ? {...state, matrix: next, exampleId: 'custom' as const} : {...state, secondMatrix: next};
    return ok({state: edited, clamped: snapped.value.clamped, adjusted: snapped.value.adjusted});
}

const sameMatrix = (a: Mat2, b: Mat2): boolean =>
    a[0][0] === b[0][0] && a[0][1] === b[0][1] && a[1][0] === b[1][0] && a[1][1] === b[1][1];

/** Selecting an example sets the matrix and `exampleId`; the mode is kept. */
export const selectExample = (state: LinearMapState, id: LinearMapExampleId): LinearMapState =>
    ({...state, matrix: LINEAR_MAP_EXAMPLES[id], exampleId: id});

/** Mode change keeps the matrix. */
export const changeMode = (state: LinearMapState, mode: LinearMapMode): LinearMapState => ({...state, mode});

// ---- Scene-action payload validators (pure) ----

export interface SetMatrixPayload {readonly matrix: Mat2; readonly target: MatrixSlot}
export interface SetModePayload {readonly mode: LinearMapMode}
export interface SetTestVectorPayload {readonly angle: number}
export interface SetExamplePayload {readonly exampleId: LinearMapExampleId}

/** `{matrix, target?}`; target defaults to the first matrix. Scene data is strict: off-grid entries are rejected. */
export function validateSetMatrix(payload: unknown): LinearMapResult<SetMatrixPayload> {
    if (!isRecord(payload)) return fail('payload', 'not-an-object', 'set-matrix needs an object payload.');
    const target = payload.target ?? 'matrix';
    if (target !== 'matrix' && target !== 'secondMatrix') return fail('target', 'unknown-value', "target must be 'matrix' or 'secondMatrix'.");
    const matrix = parseMatrix(payload.matrix, 'matrix');
    if (!matrix.ok) return matrix;
    return ok({matrix: matrix.value, target});
}

export function validateSetMode(payload: unknown): LinearMapResult<SetModePayload> {
    if (!isRecord(payload)) return fail('payload', 'not-an-object', 'set-mode needs an object payload.');
    if (!isLinearMapMode(payload.mode)) return fail('mode', 'unknown-value', `mode must be one of: ${LINEAR_MAP_MODES.join(', ')}.`);
    return ok({mode: payload.mode});
}

export function validateSetTestVector(payload: unknown): LinearMapResult<SetTestVectorPayload> {
    if (!isRecord(payload)) return fail('payload', 'not-an-object', 'set-test-vector needs an object payload.');
    const angle = parseAngle(payload.angle, 'angle');
    if (!angle.ok) return angle;
    return ok({angle: angle.value});
}

export function validateSetExample(payload: unknown): LinearMapResult<SetExamplePayload> {
    if (!isRecord(payload)) return fail('payload', 'not-an-object', 'set-example needs an object payload.');
    if (!isLinearMapExampleId(payload.exampleId)) {
        return fail('exampleId', 'unknown-value', `exampleId must be one of: ${LINEAR_MAP_EXAMPLE_IDS.join(', ')}.`);
    }
    return ok({exampleId: payload.exampleId});
}

/** A scene-set matrix is not a named example, so `exampleId` becomes `custom`; setting the second matrix leaves it. */
export function applySetMatrix(state: LinearMapState, payload: SetMatrixPayload): LinearMapState {
    return payload.target === 'matrix'
        ? {...state, matrix: payload.matrix, exampleId: 'custom'}
        : {...state, secondMatrix: payload.matrix};
}
export const applySetMode = (state: LinearMapState, payload: SetModePayload): LinearMapState => changeMode(state, payload.mode);
export const applySetTestVector = (state: LinearMapState, payload: SetTestVectorPayload): LinearMapState =>
    ({...state, testAngle: payload.angle});
export const applySetExample = (state: LinearMapState, payload: SetExamplePayload): LinearMapState =>
    selectExample(state, payload.exampleId);

// ---- Batch D: start vector and iteration step ----

export interface SetStartPayload {readonly start: Vec2}
export interface StepPayload {readonly count: number}

/** `{start}`: two grid coordinates; scene data is strict, so an off-grid start is rejected, never snapped. */
export function validateSetStart(payload: unknown): LinearMapResult<SetStartPayload> {
    if (!isRecord(payload)) return fail('payload', 'not-an-object', 'set-start needs an object payload.');
    const start = parseStart(payload.start, 'start');
    if (!start.ok) return start;
    return ok({start: start.value});
}

/** `{count?}`: how many steps to advance, a whole number from 1 to ITERATE_STEP_MAX; the default is 1. */
export function validateStep(payload: unknown): LinearMapResult<StepPayload> {
    if (!isRecord(payload)) return fail('payload', 'not-an-object', 'step needs an object payload.');
    const count = payload.count ?? 1;
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 1 || count > ITERATE_STEP_MAX) {
        return fail('count', 'not-a-step', `count must be a whole number from 1 to ${ITERATE_STEP_MAX}.`);
    }
    return ok({count});
}

/** The start vector changes; the step stays, so the picture follows the start (as it follows the matrix). */
export const applySetStart = (state: LinearMapState, payload: SetStartPayload): LinearMapState => ({...state, start: payload.start});

/** Advances the step by `count`, stopping at ITERATE_STEP_MAX. */
export const applyStep = (state: LinearMapState, payload: StepPayload): LinearMapState =>
    ({...state, step: Math.min(ITERATE_STEP_MAX, stepOf(state) + payload.count)});

/** Snaps a typed or dragged start coordinate like a matrix entry (nearest quarter, clamped). */
export const snapStartInput = (input: number, field = 'start'): LinearMapResult<SnappedEntry> => snapEntryInput(input, field);

// ---- Batch C: the composition mode (slots A and B, elements, translation, pivot) ----

/** The two matrices of a composition: A is applied first, B second. */
export type CompositionSlot = 'first' | 'second';
export type SlotSource = 'free' | ElementKind;

/** The composition defaults of the lesson example (spec L5): A is the quarter turn R, B the reflection F in the x-axis; no translation, pivot at the origin. */
export const DEFAULT_FIRST_ELEMENT: MapElement = {kind: 'rotation', k: 6};
export const DEFAULT_SECOND_ELEMENT: MapElement = {kind: 'reflection', k: 0};

/** Whether the state stores anything of the composition mode (then entering the mode keeps it as it is). */
export const hasCompositionFields = (state: LinearMapState): boolean =>
    state.element !== undefined || state.secondElement !== undefined || state.secondMatrix !== undefined
    || state.translation !== undefined || state.pivot !== undefined;

/** The composition defaults: the two elements of the spec example, no free second matrix, no translation, no pivot. The other fields stay. */
export function compositionDefaults(state: LinearMapState): LinearMapState {
    const {secondMatrix: _second, translation: _translation, pivot: _pivot, ...rest} = state;
    // The free entries of slot A are the matrix the other modes share: Reset here leaves them (and the example) to those modes.
    return {...rest, element: DEFAULT_FIRST_ELEMENT, secondElement: DEFAULT_SECOND_ELEMENT};
}

/** True when the state is the composition defaults (the Reset button is then unavailable). */
export function isCompositionDefault(state: LinearMapState): boolean {
    return state.element?.kind === DEFAULT_FIRST_ELEMENT.kind && state.element.k === DEFAULT_FIRST_ELEMENT.k
        && state.secondElement?.kind === DEFAULT_SECOND_ELEMENT.kind && state.secondElement.k === DEFAULT_SECOND_ELEMENT.k
        && state.secondMatrix === undefined && state.translation === undefined && state.pivot === undefined;
}

export const elementOf = (state: Pick<LinearMapState, 'element' | 'secondElement'>, slot: CompositionSlot): MapElement | undefined =>
    slot === 'first' ? state.element : state.secondElement;

/** The free entries a slot stores: the second slot's are the identity until edited. */
export const freeEntriesOf = (state: Pick<LinearMapState, 'matrix' | 'secondMatrix'>, slot: CompositionSlot): Mat2 =>
    slot === 'first' ? state.matrix : state.secondMatrix ?? IDENTITY;

/** The source of a slot: its element's kind, or `free` entries. */
export const sourceOf = (state: Pick<LinearMapState, 'element' | 'secondElement'>, slot: CompositionSlot): SlotSource =>
    elementOf(state, slot)?.kind ?? 'free';

function withElement(state: LinearMapState, slot: CompositionSlot, element: MapElement | undefined): LinearMapState {
    if (slot === 'first') {
        const {element: _old, ...rest} = state;
        return element ? {...rest, element} : rest;
    }
    const {secondElement: _old, ...rest} = state;
    return element ? {...rest, secondElement: element} : rest;
}

/**
 * Chooses the rotation or reflection of a slot (a validated element), or clears it (`undefined`) so the stored free entries apply
 * again. The stored entries are kept either way.
 */
export function chooseElement(state: LinearMapState, slot: CompositionSlot, element: MapElement | undefined): LinearMapResult<LinearMapState> {
    if (element === undefined) return ok(withElement(state, slot, undefined));
    const parsed = parseElement(element, slot === 'first' ? 'element' : 'secondElement');
    if (!parsed.ok) return parsed;
    return ok(withElement(state, slot, parsed.value));
}

/** Changes the source of a slot from the chooser: a kind keeps the angle index of the current element, else starts at 0. */
export function setSlotSource(state: LinearMapState, slot: CompositionSlot, source: SlotSource): LinearMapState {
    if (source === 'free') return withElement(state, slot, undefined);
    return withElement(state, slot, {kind: source, k: elementOf(state, slot)?.k ?? 0});
}

/** The angle index k (0..23) of the chosen element of a slot; refused when the slot has no element or k is not an index. */
export function setElementIndex(state: LinearMapState, slot: CompositionSlot, k: number): LinearMapResult<LinearMapState> {
    const element = elementOf(state, slot);
    if (!element) return fail(slot === 'first' ? 'element' : 'secondElement', 'not-an-element', 'The slot has no chosen element.');
    return chooseElement(state, slot, {kind: element.kind, k});
}

/** Edits one free entry of a slot from UI input (snaps, reports clamping). The first slot also sets `exampleId` to `custom`. */
export function editSlotEntry(
    state: LinearMapState, slot: CompositionSlot, row: 0 | 1, column: 0 | 1, input: number,
): LinearMapResult<{readonly state: LinearMapState; readonly clamped: boolean; readonly adjusted: boolean}> {
    const base = slot === 'first' ? state : {...state, secondMatrix: state.secondMatrix ?? IDENTITY};
    return editMatrixEntry(base, slot === 'first' ? 'matrix' : 'secondMatrix', row, column, input);
}

export type VectorField = 'translation' | 'pivot';

/**
 * Sets one coordinate of the translation or the pivot from UI input: snapped to the quarter grid, clamped to [-4, 4]. A pivot that is
 * not yet stored starts at the origin; a translation at (0, 0).
 */
export function editVectorCoordinate(
    state: LinearMapState, field: VectorField, axis: 0 | 1, input: number,
): LinearMapResult<{readonly state: LinearMapState; readonly clamped: boolean; readonly adjusted: boolean}> {
    const snapped = snapEntryInput(input, `${field}[${axis}]`);
    if (!snapped.ok) return snapped;
    const current: Vec2 = state[field] ?? [0, 0];
    const next: Vec2 = axis === 0 ? [snapped.value.value, current[1]] : [current[0], snapped.value.value];
    return ok({state: {...state, [field]: next}, clamped: snapped.value.clamped, adjusted: snapped.value.adjusted});
}

/** Both coordinates in one write (a drag of the pivot handle). */
export function setVectorField(state: LinearMapState, field: VectorField, value: Vec2): LinearMapResult<LinearMapState> {
    const x = snapEntryInput(value[0], `${field}[0]`);
    if (!x.ok) return x;
    const y = snapEntryInput(value[1], `${field}[1]`);
    if (!y.ok) return y;
    return ok({...state, [field]: [x.value.value, y.value.value] as Vec2});
}

/** Turns the pivot on (at the origin, or where it was) or off (the field is dropped and the origin applies). */
export function setPivotUsed(state: LinearMapState, used: boolean): LinearMapState {
    if (used) return state.pivot ? state : {...state, pivot: [0, 0]};
    const {pivot: _pivot, ...rest} = state;
    return rest;
}

export interface ChooseElementPayload {readonly slot: CompositionSlot; readonly element?: MapElement}
export interface SetVectorPayload {readonly value: Vec2}

/** `{slot, element?}`; scene data is strict: the element is validated, never snapped. A missing or null element clears the choice. */
export function validateChooseElement(payload: unknown): LinearMapResult<ChooseElementPayload> {
    if (!isRecord(payload)) return fail('payload', 'not-an-object', 'choose-element needs an object payload.');
    if (payload.slot !== 'first' && payload.slot !== 'second') return fail('slot', 'unknown-value', "slot must be 'first' or 'second'.");
    if (payload.element === undefined || payload.element === null) return ok({slot: payload.slot});
    const element = parseElement(payload.element, 'element');
    if (!element.ok) return element;
    return ok({slot: payload.slot, element: element.value});
}
export const applyChooseElement = (state: LinearMapState, payload: ChooseElementPayload): LinearMapState =>
    withElement(state, payload.slot, payload.element);

/** `{translation}` or `{pivot}` (the field name selects the parser): two grid coordinates, strict. */
export function validateSetVector(payload: unknown, field: VectorField): LinearMapResult<SetVectorPayload> {
    if (!isRecord(payload)) return fail('payload', 'not-an-object', `set-${field} needs an object payload.`);
    const parsed = parseStart(payload[field], field);
    if (!parsed.ok) return parsed;
    return ok({value: parsed.value});
}
export const applySetVector = (state: LinearMapState, field: VectorField, payload: SetVectorPayload): LinearMapState =>
    ({...state, [field]: payload.value});
