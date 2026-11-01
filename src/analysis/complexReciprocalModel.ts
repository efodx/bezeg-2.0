import {Complex, COMPLEX_COORDINATE_MAX, COMPLEX_COORDINATE_MIN, isComplexCoordinate, snapComplexCoordinate} from './complex';

/**
 * The stored description of the reciprocal demonstration (complex maps lesson M1). The named examples and their operands are
 * below; `example` records which one the operands started from (any valid operands may follow it). `reciprocalVisible`,
 * `quotientVisible` and `circleVisible` say whether 1/z (Show reciprocal), w/z (Show division) and the circle inversion of z
 * (Show inversion circle, with the draggable centre and radius) are shown, saved so a reopened preset and a lesson checkpoint
 * show the same scene. The conjugate, reciprocal, quotient, moduli, arguments and inversion image are never stored.
 * All coordinates are on the 0.05 grid in [-2, 2]; the radius is a multiple of 0.05 in [0.05, 2].
 */
export interface ComplexReciprocalModel {
    readonly example: ComplexReciprocalExampleId;
    readonly zRe: number;
    readonly zIm: number;
    readonly wRe: number;
    readonly wIm: number;
    readonly reciprocalVisible: boolean;
    readonly quotientVisible: boolean;
    readonly circleVisible: boolean;
    readonly centreRe: number;
    readonly centreIm: number;
    readonly radius: number;
}

export const COMPLEX_RECIPROCAL_EXAMPLE_IDS = ['outside', 'inside', 'unit-circle', 'division', 'zero'] as const;
export type ComplexReciprocalExampleId = typeof COMPLEX_RECIPROCAL_EXAMPLE_IDS[number];

export const isComplexReciprocalExampleId = (value: unknown): value is ComplexReciprocalExampleId =>
    typeof value === 'string' && (COMPLEX_RECIPROCAL_EXAMPLE_IDS as readonly string[]).includes(value);

export const INVERSION_RADIUS_MIN = 0.05;
export const INVERSION_RADIUS_MAX = COMPLEX_COORDINATE_MAX;
const GRID_NOISE = 1e-9;

/** True for a finite multiple of 0.05 within [0.05, 2] (noise below 1e-9 of a step tolerated). */
export function isInversionRadius(value: unknown): value is number {
    if (typeof value !== 'number' || !Number.isFinite(value)) return false;
    const units = value * 20;
    return Math.abs(units - Math.round(units)) <= GRID_NOISE && Math.round(units) >= 1 && Math.round(units) <= 40;
}

/** The grid radius nearest to `value`; does not clamp (callers check with `isInversionRadius`). Throws on a non-finite value. */
export function snapInversionRadius(value: number): number {
    if (!Number.isFinite(value)) throw new RangeError('The radius must be a finite number.');
    return Math.round(value * 20) / 20;
}

/** Operands of the named examples: z = 1 + i, 0.5 + 0.5i, 0.6 + 0.8i (on the unit circle), 1 - i (with w = 2 + i) and 0. */
const EXAMPLE_OPERANDS: Readonly<Record<ComplexReciprocalExampleId, {readonly z: Complex; readonly w: Complex}>> = {
    outside: {z: {re: 1, im: 1}, w: {re: 2, im: 1}},
    inside: {z: {re: 0.5, im: 0.5}, w: {re: 2, im: 1}},
    'unit-circle': {z: {re: 0.6, im: 0.8}, w: {re: 2, im: 1}},
    division: {z: {re: 1, im: -1}, w: {re: 2, im: 1}},
    zero: {z: {re: 0, im: 0}, w: {re: 2, im: 1}},
};

function exampleModel(example: ComplexReciprocalExampleId): ComplexReciprocalModel {
    const {z, w} = EXAMPLE_OPERANDS[example];
    return {
        example, zRe: z.re, zIm: z.im, wRe: w.re, wIm: w.im,
        reciprocalVisible: false, quotientVisible: false, circleVisible: false, centreRe: 0.5, centreIm: 0, radius: 1,
    };
}

/** z = 1 + i with 1/z, w/z and the inversion circle hidden, so the lesson can ask for a prediction first. */
export const DEFAULT_COMPLEX_RECIPROCAL_MODEL: ComplexReciprocalModel = exampleModel('outside');

/** The model a named example starts from: its operands, the default circle, every reveal hidden. */
export const COMPLEX_RECIPROCAL_EXAMPLE_MODELS: Readonly<Record<ComplexReciprocalExampleId, ComplexReciprocalModel>> = Object.fromEntries(
    COMPLEX_RECIPROCAL_EXAMPLE_IDS.map(id => [id, exampleModel(id)]),
) as Record<ComplexReciprocalExampleId, ComplexReciprocalModel>;

/** The operands z and w, and the inversion circle's centre, of a model. */
export const reciprocalModelPoints = (model: ComplexReciprocalModel): {readonly z: Complex; readonly w: Complex; readonly centre: Complex} =>
    ({z: {re: model.zRe, im: model.zIm}, w: {re: model.wRe, im: model.wIm}, centre: {re: model.centreRe, im: model.centreIm}});

export const RECIPROCAL_COORDINATE_FIELDS = ['zRe', 'zIm', 'wRe', 'wIm', 'centreRe', 'centreIm'] as const;
export const RECIPROCAL_VISIBILITY_FIELDS = ['reciprocalVisible', 'quotientVisible', 'circleVisible'] as const;

export type ReciprocalCoordinateField = typeof RECIPROCAL_COORDINATE_FIELDS[number];
export type ReciprocalVisibilityField = typeof RECIPROCAL_VISIBILITY_FIELDS[number];

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** The rule a stored reciprocal model broke. Callers localize it; the examples and the ranges travel with it. */
export type ComplexReciprocalIssue =
    | { readonly kind: 'example'; readonly allowed: readonly ComplexReciprocalExampleId[] }
    | { readonly kind: 'coordinate'; readonly field: ReciprocalCoordinateField; readonly min: number; readonly max: number }
    | { readonly kind: 'radius'; readonly min: number; readonly max: number }
    | { readonly kind: 'visibility'; readonly field: ReciprocalVisibilityField };

/** The rules an edit can break: a coordinate or the radius off the grid or outside its range, or an unknown example. */
export type ComplexReciprocalEditIssue =
    | { readonly kind: 'example'; readonly allowed: readonly ComplexReciprocalExampleId[] }
    | { readonly kind: 'coordinate'; readonly min: number; readonly max: number }
    | { readonly kind: 'radius'; readonly min: number; readonly max: number };

/** The answer for a whole stored model: the sanitized model or the first rule it broke (`issue` undefined = malformed). */
export type ComplexReciprocalCheck =
    | { readonly ok: true; readonly model: ComplexReciprocalModel }
    | { readonly ok: false; readonly issue: ComplexReciprocalIssue | undefined };

/** The answer for one edit: the next model (the same object when nothing changes) or the rule the edit would break. */
export type ComplexReciprocalEdit =
    | { readonly ok: true; readonly model: ComplexReciprocalModel }
    | { readonly ok: false; readonly issue: ComplexReciprocalEditIssue };

const reject = (issue: ComplexReciprocalIssue | undefined): ComplexReciprocalCheck => ({ok: false, issue});
const coordinateIssue: ComplexReciprocalEditIssue = {kind: 'coordinate', min: COMPLEX_COORDINATE_MIN, max: COMPLEX_COORDINATE_MAX};
const radiusIssue: ComplexReciprocalEditIssue = {kind: 'radius', min: INVERSION_RADIUS_MIN, max: INVERSION_RADIUS_MAX};

/**
 * The single validity rule of a stored reciprocal model: a known example, six grid coordinates in [-2, 2], three booleans and a
 * radius that is a multiple of 0.05 in [0.05, 2]. Unknown properties are dropped and grid values written exactly. Nothing is
 * clamped. Rules are checked in the order example, coordinates, radius, visibility; a missing or wrongly typed field gives
 * `issue: undefined`.
 */
export function checkComplexReciprocalModel(data: unknown): ComplexReciprocalCheck {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return reject(undefined);
    const record = data as Record<string, unknown>;
    if (!isComplexReciprocalExampleId(record.example)) return reject({kind: 'example', allowed: COMPLEX_RECIPROCAL_EXAMPLE_IDS});
    for (const field of RECIPROCAL_COORDINATE_FIELDS) {
        const value = record[field];
        if (isFiniteNumber(value) && !isComplexCoordinate(value)) return reject({kind: 'coordinate', field, min: COMPLEX_COORDINATE_MIN, max: COMPLEX_COORDINATE_MAX});
    }
    if (isFiniteNumber(record.radius) && !isInversionRadius(record.radius)) return reject({kind: 'radius', min: INVERSION_RADIUS_MIN, max: INVERSION_RADIUS_MAX});
    for (const field of RECIPROCAL_VISIBILITY_FIELDS) {
        if (record[field] !== undefined && typeof record[field] !== 'boolean') return reject({kind: 'visibility', field});
    }
    const coordinates: Record<string, number> = {};
    for (const field of RECIPROCAL_COORDINATE_FIELDS) {
        const value = record[field];
        if (!isComplexCoordinate(value)) return reject(undefined);
        coordinates[field] = snapComplexCoordinate(value);
    }
    const visibility: Record<string, boolean> = {};
    for (const field of RECIPROCAL_VISIBILITY_FIELDS) {
        const value = record[field];
        if (typeof value !== 'boolean') return reject(undefined);
        visibility[field] = value;
    }
    if (!isInversionRadius(record.radius)) return reject(undefined);
    return {
        ok: true,
        model: {
            example: record.example,
            zRe: coordinates.zRe, zIm: coordinates.zIm, wRe: coordinates.wRe, wIm: coordinates.wIm,
            reciprocalVisible: visibility.reciprocalVisible, quotientVisible: visibility.quotientVisible, circleVisible: visibility.circleVisible,
            centreRe: coordinates.centreRe, centreIm: coordinates.centreIm, radius: snapInversionRadius(record.radius),
        },
    };
}

/**
 * Returns a sanitized model (unknown properties dropped, grid values written exactly) or undefined unless the data is a valid
 * model. Nothing is clamped: an off-grid or out-of-range value, or a missing field, rejects the whole model.
 */
export function parseComplexReciprocalModel(data: unknown): ComplexReciprocalModel | undefined {
    const check = checkComplexReciprocalModel(data);
    return check.ok ? check.model : undefined;
}

/** Choosing an example loads that example's operands, the default circle and hides every reveal again. */
export function chooseComplexReciprocalExample(example: unknown): ComplexReciprocalEdit {
    if (!isComplexReciprocalExampleId(example)) return {ok: false, issue: {kind: 'example', allowed: COMPLEX_RECIPROCAL_EXAMPLE_IDS}};
    return {ok: true, model: {...COMPLEX_RECIPROCAL_EXAMPLE_MODELS[example]}};
}

/** The model with `patch` applied; the same object when no value changes. */
const patched = (model: ComplexReciprocalModel, patch: Partial<ComplexReciprocalModel>): ComplexReciprocalModel => {
    const next: ComplexReciprocalModel = {...model, ...patch};
    return (Object.keys(next) as (keyof ComplexReciprocalModel)[]).some(key => next[key] !== model[key]) ? next : model;
};

/** Moves operand z or w to (re, im): both must be grid coordinates in range (never clamped). */
export function moveReciprocalOperand(model: ComplexReciprocalModel, which: 'z' | 'w', re: number, im: number): ComplexReciprocalEdit {
    if (!isComplexCoordinate(re) || !isComplexCoordinate(im)) return {ok: false, issue: coordinateIssue};
    const nextRe = snapComplexCoordinate(re), nextIm = snapComplexCoordinate(im);
    return {ok: true, model: patched(model, which === 'z' ? {zRe: nextRe, zIm: nextIm} : {wRe: nextRe, wIm: nextIm})};
}

/** Moves the centre of the inversion circle to (re, im), both grid coordinates in range. */
export function moveReciprocalCentre(model: ComplexReciprocalModel, re: number, im: number): ComplexReciprocalEdit {
    if (!isComplexCoordinate(re) || !isComplexCoordinate(im)) return {ok: false, issue: coordinateIssue};
    return {ok: true, model: patched(model, {centreRe: snapComplexCoordinate(re), centreIm: snapComplexCoordinate(im)})};
}

/** Sets the radius of the inversion circle: a multiple of 0.05 in [0.05, 2], never clamped. */
export function setReciprocalRadius(model: ComplexReciprocalModel, value: number): ComplexReciprocalEdit {
    if (!isInversionRadius(value)) return {ok: false, issue: radiusIssue};
    return {ok: true, model: patched(model, {radius: snapInversionRadius(value)})};
}

/** Shows or hides one reveal; the same model when the flag already has that value. */
export function setReciprocalVisibility(model: ComplexReciprocalModel, field: ReciprocalVisibilityField, visible: boolean): ComplexReciprocalModel {
    return patched(model, {[field]: visible});
}
