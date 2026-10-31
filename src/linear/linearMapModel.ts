import {
    IDENTITY, isLinearMapExampleId, isMatrixEntry, LINEAR_MAP_EXAMPLE_IDS, LINEAR_MAP_EXAMPLES, LinearMapExampleId, Mat2,
    MATRIX_ENTRY_MAX, MATRIX_ENTRY_MIN, snapMatrixEntry,
} from './matrix2';

/**
 * Stored state of the linear maps graph (docs/adr/0025-linear-map-graph-and-snapped-matrices.md, sections 1 and 2). Pure
 * TypeScript: no React, JSXGraph or localization.
 *
 * Only these fields are stored. Images, determinant, eigen and singular data are recomputed from the validated state;
 * a Preset that carries such fields is accepted and they are ignored (unknown properties are dropped).
 * Imported entries are never snapped or clamped: an off-grid or out-of-range entry rejects the whole state. Numeric input
 * from the UI uses `snapEntryInput`, which snaps and reports whether it clamped.
 */
export const LINEAR_MAP_MODES = ['basis', 'determinant', 'eigen', 'ellipse', 'composition'] as const;
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
}

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
    | 'unknown-value' | 'not-boolean' | 'angle-out-of-range';

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

function parseExampleChoice(data: unknown, field: string): LinearMapResult<LinearMapExampleChoice> {
    if (data === 'custom' || isLinearMapExampleId(data)) return ok(data);
    return fail(field, 'unknown-value', `${field} must be 'custom' or one of: ${LINEAR_MAP_EXAMPLE_IDS.join(', ')}.`);
}

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
    return ok({
        matrix: matrix.value,
        ...(secondMatrix ? {secondMatrix} : {}),
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
