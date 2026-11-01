import {Complex, COMPLEX_COORDINATE_MAX, COMPLEX_COORDINATE_MIN, complexMultiply, complexModulus, isComplexCoordinate, snapComplexCoordinate} from './complex';
import {COMPLEX_ROOT_DEGREE_MAX, COMPLEX_ROOT_DEGREE_MIN, isComplexRootDegree} from './complexRoots';

/**
 * The stored description of the roots demonstration (complex maps lesson M2). `example` records which named example the
 * operands started from (any valid operands may follow it). `rootsVisible` and `polygonVisible` say whether the n indexed roots
 * and the regular n-gon through them are shown, `testVisible` whether the test point z and z^n are shown; they are saved so a
 * reopened preset and a lesson checkpoint show the same scene. The roots, their moduli and arguments, z^n and the verdict are
 * never stored. w and z are on the 0.05 grid in [-2, 2]; the degree n is an integer in [2, 8].
 */
export interface ComplexRootsModel {
    readonly example: ComplexRootsExampleId;
    readonly wRe: number;
    readonly wIm: number;
    readonly degree: number;
    readonly rootsVisible: boolean;
    readonly polygonVisible: boolean;
    readonly testVisible: boolean;
    readonly zRe: number;
    readonly zIm: number;
}

export const COMPLEX_ROOTS_EXAMPLE_IDS = ['two-i', 'one-plus-i', 'negative-real', 'unity', 'zero'] as const;
export type ComplexRootsExampleId = typeof COMPLEX_ROOTS_EXAMPLE_IDS[number];

export const isComplexRootsExampleId = (value: unknown): value is ComplexRootsExampleId =>
    typeof value === 'string' && (COMPLEX_ROOTS_EXAMPLE_IDS as readonly string[]).includes(value);

export {COMPLEX_ROOT_DEGREE_MAX, COMPLEX_ROOT_DEGREE_MIN};

/**
 * Named examples: w = 2i with n = 3 (the spec's original 8i lies outside the shared coordinate range [-2, 2], so 2i is used: the angles are the same (30, 150, 270 degrees) and the
 * radius is 2^(1/3) instead of 2), w = 1 + i with n = 3, w = -1 with n = 2 (the argument is exactly pi), w = 1 with n = 4,
 * and w = 0 with n = 3.
 */
const EXAMPLE_FIELDS: Readonly<Record<ComplexRootsExampleId, {readonly w: Complex; readonly degree: number}>> = {
    'two-i': {w: {re: 0, im: 2}, degree: 3},
    'one-plus-i': {w: {re: 1, im: 1}, degree: 3},
    'negative-real': {w: {re: -1, im: 0}, degree: 2},
    unity: {w: {re: 1, im: 0}, degree: 4},
    zero: {w: {re: 0, im: 0}, degree: 3},
};

function exampleModel(example: ComplexRootsExampleId): ComplexRootsModel {
    const {w, degree} = EXAMPLE_FIELDS[example];
    return {example, wRe: w.re, wIm: w.im, degree, rootsVisible: false, polygonVisible: false, testVisible: false, zRe: 1, zIm: 0.5};
}

/** w = 2i, n = 3, with the roots, the polygon and the test point hidden so the lesson can ask for a prediction first. */
export const DEFAULT_COMPLEX_ROOTS_MODEL: ComplexRootsModel = exampleModel('two-i');

/** The model a named example starts from: its w and n, the default test point, every reveal hidden. */
export const COMPLEX_ROOTS_EXAMPLE_MODELS: Readonly<Record<ComplexRootsExampleId, ComplexRootsModel>> = Object.fromEntries(
    COMPLEX_ROOTS_EXAMPLE_IDS.map(id => [id, exampleModel(id)]),
) as Record<ComplexRootsExampleId, ComplexRootsModel>;

/** The points w and the test point z of a model. */
export const rootsModelPoints = (model: ComplexRootsModel): {readonly w: Complex; readonly z: Complex} =>
    ({w: {re: model.wRe, im: model.wIm}, z: {re: model.zRe, im: model.zIm}});

export const ROOTS_COORDINATE_FIELDS = ['wRe', 'wIm', 'zRe', 'zIm'] as const;
export const ROOTS_VISIBILITY_FIELDS = ['rootsVisible', 'polygonVisible', 'testVisible'] as const;

/** z^n for an integer n >= 1 by repeated multiplication (z^1 = z). */
export function complexIntegerPower(z: Complex, n: number): Complex {
    let result = z;
    for (let k = 1; k < n; k++) result = complexMultiply(result, z);
    return result;
}

/** How close z^n must be to w, relative to max(1, |w|), to be called a solution (z is a grid point, z^n carries rounding noise). */
export const ROOT_TEST_TOLERANCE = 1e-9;

/** True when z^n = w to within `ROOT_TEST_TOLERANCE`. */
export function solvesRootEquation(z: Complex, w: Complex, n: number): boolean {
    const power = complexIntegerPower(z, n);
    return complexModulus({re: power.re - w.re, im: power.im - w.im}) <= ROOT_TEST_TOLERANCE * Math.max(1, complexModulus(w));
}

export type RootsCoordinateField = typeof ROOTS_COORDINATE_FIELDS[number];
export type RootsVisibilityField = typeof ROOTS_VISIBILITY_FIELDS[number];

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** The rule a stored roots model broke. Callers localize it; the examples and the ranges travel with it. */
export type ComplexRootsIssue =
    | { readonly kind: 'example'; readonly allowed: readonly ComplexRootsExampleId[] }
    | { readonly kind: 'coordinate'; readonly field: RootsCoordinateField; readonly min: number; readonly max: number }
    | { readonly kind: 'degree'; readonly min: number; readonly max: number }
    | { readonly kind: 'visibility'; readonly field: RootsVisibilityField };

/** The rules an edit can break: a coordinate off the grid or outside the square, a degree that is not an integer in range, or an unknown example. */
export type ComplexRootsEditIssue =
    | { readonly kind: 'example'; readonly allowed: readonly ComplexRootsExampleId[] }
    | { readonly kind: 'coordinate'; readonly min: number; readonly max: number }
    | { readonly kind: 'degree'; readonly min: number; readonly max: number };

/** The answer for a whole stored model: the sanitized model or the first rule it broke (`issue` undefined = malformed). */
export type ComplexRootsCheck =
    | { readonly ok: true; readonly model: ComplexRootsModel }
    | { readonly ok: false; readonly issue: ComplexRootsIssue | undefined };

/** The answer for one edit: the next model (the same object when nothing changes) or the rule the edit would break. */
export type ComplexRootsEdit =
    | { readonly ok: true; readonly model: ComplexRootsModel }
    | { readonly ok: false; readonly issue: ComplexRootsEditIssue };

const reject = (issue: ComplexRootsIssue | undefined): ComplexRootsCheck => ({ok: false, issue});
const coordinateIssue: ComplexRootsEditIssue = {kind: 'coordinate', min: COMPLEX_COORDINATE_MIN, max: COMPLEX_COORDINATE_MAX};

/**
 * The single validity rule of a stored roots model: a known example, four grid coordinates in [-2, 2], an integer degree in
 * [2, 8] and three booleans. Unknown properties are dropped and grid values written exactly. Nothing is clamped. Rules are
 * checked in the order example, coordinates (wRe, wIm, zRe, zIm), degree, visibility; a missing or wrongly typed field gives
 * `issue: undefined`, except that a degree present but not an integer in range is a degree issue.
 */
export function checkComplexRootsModel(data: unknown): ComplexRootsCheck {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return reject(undefined);
    const record = data as Record<string, unknown>;
    if (!isComplexRootsExampleId(record.example)) return reject({kind: 'example', allowed: COMPLEX_ROOTS_EXAMPLE_IDS});
    for (const field of ROOTS_COORDINATE_FIELDS) {
        const value = record[field];
        if (isFiniteNumber(value) && !isComplexCoordinate(value)) return reject({kind: 'coordinate', field, min: COMPLEX_COORDINATE_MIN, max: COMPLEX_COORDINATE_MAX});
    }
    if (record.degree !== undefined && !isComplexRootDegree(record.degree)) return reject({kind: 'degree', min: COMPLEX_ROOT_DEGREE_MIN, max: COMPLEX_ROOT_DEGREE_MAX});
    for (const field of ROOTS_VISIBILITY_FIELDS) {
        if (record[field] !== undefined && typeof record[field] !== 'boolean') return reject({kind: 'visibility', field});
    }
    const coordinates: Record<string, number> = {};
    for (const field of ROOTS_COORDINATE_FIELDS) {
        const value = record[field];
        if (!isComplexCoordinate(value)) return reject(undefined);
        coordinates[field] = snapComplexCoordinate(value);
    }
    const visibility: Record<string, boolean> = {};
    for (const field of ROOTS_VISIBILITY_FIELDS) {
        const value = record[field];
        if (typeof value !== 'boolean') return reject(undefined);
        visibility[field] = value;
    }
    if (!isComplexRootDegree(record.degree)) return reject(undefined);
    return {
        ok: true,
        model: {
            example: record.example, wRe: coordinates.wRe, wIm: coordinates.wIm, degree: record.degree,
            rootsVisible: visibility.rootsVisible, polygonVisible: visibility.polygonVisible, testVisible: visibility.testVisible,
            zRe: coordinates.zRe, zIm: coordinates.zIm,
        },
    };
}

/**
 * Returns a sanitized model (unknown properties dropped, grid values written exactly) or undefined unless the data is a valid
 * model. Nothing is clamped: an off-grid or out-of-range value, a non-integer degree or a missing field rejects the whole model.
 */
export function parseComplexRootsModel(data: unknown): ComplexRootsModel | undefined {
    const check = checkComplexRootsModel(data);
    return check.ok ? check.model : undefined;
}

/** Choosing an example loads that example's w and n, the default test point and hides every reveal again. */
export function chooseComplexRootsExample(example: unknown): ComplexRootsEdit {
    if (!isComplexRootsExampleId(example)) return {ok: false, issue: {kind: 'example', allowed: COMPLEX_ROOTS_EXAMPLE_IDS}};
    return {ok: true, model: {...COMPLEX_ROOTS_EXAMPLE_MODELS[example]}};
}

/** The model with `patch` applied; the same object when no value changes. */
const patched = (model: ComplexRootsModel, patch: Partial<ComplexRootsModel>): ComplexRootsModel => {
    const next: ComplexRootsModel = {...model, ...patch};
    return (Object.keys(next) as (keyof ComplexRootsModel)[]).some(key => next[key] !== model[key]) ? next : model;
};

/** Moves w (`which` 'w') or the test point z (`which` 'z') to (re, im): both must be grid coordinates in range (never clamped). */
export function moveRootsPoint(model: ComplexRootsModel, which: 'w' | 'z', re: number, im: number): ComplexRootsEdit {
    if (!isComplexCoordinate(re) || !isComplexCoordinate(im)) return {ok: false, issue: coordinateIssue};
    const nextRe = snapComplexCoordinate(re), nextIm = snapComplexCoordinate(im);
    return {ok: true, model: patched(model, which === 'w' ? {wRe: nextRe, wIm: nextIm} : {zRe: nextRe, zIm: nextIm})};
}

/** Sets the degree n: an integer in [2, 8], never clamped. */
export function setRootsDegree(model: ComplexRootsModel, value: number): ComplexRootsEdit {
    if (!isComplexRootDegree(value)) return {ok: false, issue: {kind: 'degree', min: COMPLEX_ROOT_DEGREE_MIN, max: COMPLEX_ROOT_DEGREE_MAX}};
    return {ok: true, model: patched(model, {degree: value})};
}

/** Shows or hides one reveal; the same model when the flag already has that value. */
export function setRootsVisibility(model: ComplexRootsModel, field: RootsVisibilityField, visible: boolean): ComplexRootsModel {
    return patched(model, {[field]: visible});
}
