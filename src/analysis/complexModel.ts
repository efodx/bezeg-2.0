import {
    Complex, COMPLEX_COORDINATE_MAX, COMPLEX_COORDINATE_MIN, COMPLEX_MAX_OPERAND_MODULUS, complexArgument, complexExampleOperands, COMPLEX_EXAMPLE_IDS,
    ComplexExampleId, complexModulus, isComplexCoordinate, isComplexExampleId, isZero, snapComplexCoordinate, snapPolarToGrid,
} from './complex';

/*
 * This module owns the rules of the complex multiplication model: what is valid, how an accepted value is normalized, and which
 * rule a rejected value broke (a `ComplexIssue` or `ComplexEditIssue`: data, never text). The Preset parser, the Preset
 * collection's diagnosis and the graph's setters all ask it; they only choose the words (`graphs/complex/complexMessages`).
 */

/**
 * The stored description of the complex multiplication demonstration. `example` records which named example the operands
 * started from (any valid operands may follow it, as with the other demonstrations); `productVisible` and `anglesVisible` say
 * whether the product arrow (Show product) and the argument arcs (Show arguments) are shown, saved so a reopened preset and a
 * lesson checkpoint show the same scene. The product, moduli, arguments and polar forms are never stored: they are recomputed.
 * Operand coordinates are on the 0.05 grid in [-2, 2].
 */
export interface ComplexModel {
    readonly example: ComplexExampleId;
    readonly zRe: number;
    readonly zIm: number;
    readonly wRe: number;
    readonly wIm: number;
    readonly productVisible: boolean;
    readonly anglesVisible: boolean;
}

function exampleModel(example: ComplexExampleId): ComplexModel {
    const {z, w} = complexExampleOperands(example);
    return {example, zRe: z.re, zIm: z.im, wRe: w.re, wIm: w.im, productVisible: false, anglesVisible: false};
}

/** (1 + i) i with the product and the arcs hidden, so the lesson can ask for a prediction before revealing -1 + i. */
export const DEFAULT_COMPLEX_MODEL: ComplexModel = exampleModel('rotation-i');

/** The model a named example starts from: its two operands, product and arcs hidden. */
export const COMPLEX_EXAMPLE_MODELS: Readonly<Record<ComplexExampleId, ComplexModel>> = Object.fromEntries(
    COMPLEX_EXAMPLE_IDS.map(id => [id, exampleModel(id)]),
) as Record<ComplexExampleId, ComplexModel>;

/** The operands z and w of a model. */
export const complexModelOperands = (model: ComplexModel): {readonly z: Complex; readonly w: Complex} =>
    ({z: {re: model.zRe, im: model.zIm}, w: {re: model.wRe, im: model.wIm}});

/** The largest argument, in radians, that the typed-argument field accepts (the field takes -2 pi to 2 pi). */
export const MAX_TYPED_ARGUMENT = 2 * Math.PI;

export type ComplexCoordinateField = 'zRe' | 'zIm' | 'wRe' | 'wIm';
export type ComplexVisibilityField = 'productVisible' | 'anglesVisible';
export const COMPLEX_COORDINATE_FIELDS: readonly ComplexCoordinateField[] = ['zRe', 'zIm', 'wRe', 'wIm'];
export const COMPLEX_VISIBILITY_FIELDS: readonly ComplexVisibilityField[] = ['productVisible', 'anglesVisible'];

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** The rule a stored model broke. Callers localize it; the examples and the range travel with it. */
export type ComplexIssue =
    | { readonly kind: 'example'; readonly allowed: readonly ComplexExampleId[] }
    | { readonly kind: 'coordinate'; readonly field: ComplexCoordinateField; readonly min: number; readonly max: number }
    | { readonly kind: 'visibility'; readonly field: ComplexVisibilityField };

/** The rules an edit can break: a coordinate off the grid or outside the square, and the polar typing of w. */
export type ComplexEditIssue =
    | { readonly kind: 'example'; readonly allowed: readonly ComplexExampleId[] }
    | { readonly kind: 'coordinate'; readonly min: number; readonly max: number }
    /** The typed modulus is not a number in [0, max]. */
    | { readonly kind: 'modulus-range'; readonly max: number }
    /** The typed modulus, rounded to the grid along the argument of w, leaves the square. */
    | { readonly kind: 'modulus-grid'; readonly max: number }
    | { readonly kind: 'argument-range'; readonly max: number }
    /** w is 0, so its argument is undefined. */
    | { readonly kind: 'argument-zero' }
    | { readonly kind: 'argument-grid'; readonly max: number };

/** The answer for a whole stored model: the sanitized model or the first rule it broke (`issue` undefined = malformed). */
export type ComplexCheck =
    | { readonly ok: true; readonly model: ComplexModel }
    | { readonly ok: false; readonly issue: ComplexIssue | undefined };

/** The answer for one edit: the next model (the same object when nothing changes) or the rule the edit would break. */
export type ComplexEdit =
    | { readonly ok: true; readonly model: ComplexModel }
    | { readonly ok: false; readonly issue: ComplexEditIssue };

const reject = (issue: ComplexIssue | undefined): ComplexCheck => ({ok: false, issue});
const coordinateIssue: ComplexEditIssue = {kind: 'coordinate', min: COMPLEX_COORDINATE_MIN, max: COMPLEX_COORDINATE_MAX};

/**
 * The single validity rule of a stored model: a known example, four coordinates that are finite numbers on the 0.05 grid within
 * [-2, 2] and two booleans. Unknown properties are dropped and coordinates written as exact grid values. Nothing is clamped.
 * Rules are checked in the order example, coordinates (zRe, zIm, wRe, wIm), visibility; a missing or wrongly typed field gives
 * `issue: undefined`.
 */
export function checkComplexModel(data: unknown): ComplexCheck {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return reject(undefined);
    const record = data as Record<string, unknown>;
    const {example, zRe, zIm, wRe, wIm, productVisible, anglesVisible} = record;
    if (!isComplexExampleId(example)) return reject({kind: 'example', allowed: COMPLEX_EXAMPLE_IDS});
    for (const field of COMPLEX_COORDINATE_FIELDS) {
        const value = record[field];
        if (isFiniteNumber(value) && !isComplexCoordinate(value)) return reject({kind: 'coordinate', field, min: COMPLEX_COORDINATE_MIN, max: COMPLEX_COORDINATE_MAX});
    }
    for (const field of COMPLEX_VISIBILITY_FIELDS) {
        if (record[field] !== undefined && typeof record[field] !== 'boolean') return reject({kind: 'visibility', field});
    }
    if (!isComplexCoordinate(zRe) || !isComplexCoordinate(zIm) || !isComplexCoordinate(wRe) || !isComplexCoordinate(wIm)) return reject(undefined);
    if (typeof productVisible !== 'boolean' || typeof anglesVisible !== 'boolean') return reject(undefined);
    return {
        ok: true,
        model: {
            example,
            zRe: snapComplexCoordinate(zRe), zIm: snapComplexCoordinate(zIm),
            wRe: snapComplexCoordinate(wRe), wIm: snapComplexCoordinate(wIm),
            productVisible, anglesVisible,
        },
    };
}

/** Returns a sanitized model (unknown properties dropped) or undefined unless the data is a valid model. */
export function parseComplexModel(data: unknown): ComplexModel | undefined {
    const check = checkComplexModel(data);
    return check.ok ? check.model : undefined;
}

/** Choosing an example loads that example's operands and hides the product and the arcs again. */
export function chooseComplexExample(example: unknown): ComplexEdit {
    if (!isComplexExampleId(example)) return {ok: false, issue: {kind: 'example', allowed: COMPLEX_EXAMPLE_IDS}};
    return {ok: true, model: {...COMPLEX_EXAMPLE_MODELS[example]}};
}

/** Moves one operand to (re, im): both must be grid coordinates in range (never clamped). The same model when nothing changes. */
export function moveComplexOperand(model: ComplexModel, which: 'z' | 'w', re: number, im: number): ComplexEdit {
    if (!isComplexCoordinate(re) || !isComplexCoordinate(im)) return {ok: false, issue: coordinateIssue};
    const nextRe = snapComplexCoordinate(re), nextIm = snapComplexCoordinate(im);
    const [reKey, imKey] = which === 'z' ? (['zRe', 'zIm'] as const) : (['wRe', 'wIm'] as const);
    if (nextRe === model[reKey] && nextIm === model[imKey]) return {ok: true, model};
    return {ok: true, model: {...model, [reKey]: nextRe, [imKey]: nextIm}};
}

/** w with the typed modulus and the argument of the current w (the positive real axis when w is 0); a modulus of 0 gives w = 0. */
export function setComplexWModulus(model: ComplexModel, value: number): ComplexEdit {
    if (!Number.isFinite(value) || value < 0 || value > COMPLEX_MAX_OPERAND_MODULUS + 1e-9) {
        return {ok: false, issue: {kind: 'modulus-range', max: COMPLEX_MAX_OPERAND_MODULUS}};
    }
    if (value === 0) return moveComplexOperand(model, 'w', 0, 0);
    const snapped = snapPolarToGrid(value, complexArgument(complexModelOperands(model).w) ?? 0);
    if (!snapped) return {ok: false, issue: {kind: 'modulus-grid', max: COMPLEX_MAX_OPERAND_MODULUS}};
    return moveComplexOperand(model, 'w', snapped.re, snapped.im);
}

/** w with the typed argument and the modulus of the current w; refused when w is 0, whose argument is undefined. */
export function setComplexWArgument(model: ComplexModel, value: number): ComplexEdit {
    if (!Number.isFinite(value) || Math.abs(value) > MAX_TYPED_ARGUMENT + 1e-9) {
        return {ok: false, issue: {kind: 'argument-range', max: MAX_TYPED_ARGUMENT}};
    }
    const {w} = complexModelOperands(model);
    if (isZero(w)) return {ok: false, issue: {kind: 'argument-zero'}};
    const snapped = snapPolarToGrid(complexModulus(w), value);
    if (!snapped) return {ok: false, issue: {kind: 'argument-grid', max: MAX_TYPED_ARGUMENT}};
    return moveComplexOperand(model, 'w', snapped.re, snapped.im);
}

/** Shows or hides the product or the arcs; the same model when the flag already has that value. */
export function setComplexVisibility(model: ComplexModel, field: ComplexVisibilityField, visible: boolean): ComplexModel {
    return model[field] === visible ? model : {...model, [field]: visible};
}
