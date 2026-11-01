import {
    isTaylorCenter, isTaylorDegree, isTaylorExampleId, isTaylorX, TAYLOR_DEGREE_MAX, TAYLOR_DEGREE_MIN, TAYLOR_EXAMPLE_IDS, taylorExample, TaylorExampleId,
} from './taylor';
import {cleanNumber} from './numbers';

/**
 * The stored description of the Taylor approximation demonstration. `boundVisible` says whether the Lagrange remainder bound
 * is shown (the Show error bound action); it is saved with the preset so a reopened preset and a lesson checkpoint show the
 * same scene. The polynomial, the errors and the bound are never stored: they are recomputed from the other fields.
 */
export interface TaylorModel {
    readonly example: TaylorExampleId;
    readonly center: number;
    readonly degree: number;
    readonly x: number;
    readonly boundVisible: boolean;
}

/** e^x about 0 with T_1 at x = 1 (T_1(1) = 2 against e); the bound is hidden so the lesson can ask for a prediction first. */
export const DEFAULT_TAYLOR_MODEL: TaylorModel = {example: 'exp', center: 0, degree: 1, x: 1, boundVisible: false};

/**
 * The model a named example starts from. 1/(1 - x) starts inside its convergence interval (x = 0.5); the lesson moves the
 * point outside it on purpose. The flat function keeps its fixed center 0.
 */
export const TAYLOR_EXAMPLE_MODELS: Readonly<Record<TaylorExampleId, TaylorModel>> = {
    exp: DEFAULT_TAYLOR_MODEL,
    sine: {example: 'sine', center: 0, degree: 3, x: 2, boundVisible: false},
    geometric: {example: 'geometric', center: 0, degree: 3, x: 0.5, boundVisible: false},
    flat: {example: 'flat', center: 0, degree: 3, x: 1, boundVisible: false},
};

/** The rule a rejected value broke. Callers localize it; the range and the examples travel with it, so nobody restates them. */
export type TaylorIssue =
    | { readonly kind: 'example'; readonly allowed: readonly TaylorExampleId[] }
    /** The center must lie in [min, max] of `example`; min === max means the center is fixed (the flat function). */
    | { readonly kind: 'center'; readonly example: TaylorExampleId; readonly min: number; readonly max: number }
    | { readonly kind: 'degree'; readonly min: number; readonly max: number }
    | { readonly kind: 'x'; readonly example: TaylorExampleId; readonly min: number; readonly max: number }
    | { readonly kind: 'visibility' };

/** The rules an edit can break: the stored-model rules except the visibility flag, which is a boolean by construction. */
export type TaylorEditIssue = Exclude<TaylorIssue, { kind: 'visibility' }>;

/** The answer for a whole stored model; `issue` is undefined when the data is malformed and no rule applies. */
export type TaylorCheck =
    | { readonly ok: true; readonly model: TaylorModel }
    | { readonly ok: false; readonly issue: TaylorIssue | undefined };

/** The answer for one edit: the next model (the same object when nothing changes) or the rule the edit would break. */
export type TaylorEdit =
    | { readonly ok: true; readonly model: TaylorModel }
    | { readonly ok: false; readonly issue: TaylorEditIssue };

const reject = (issue: TaylorIssue | undefined): TaylorCheck => ({ok: false, issue});
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const centerIssue = (example: TaylorExampleId): TaylorEditIssue => {
    const definition = taylorExample(example);
    return {kind: 'center', example, min: definition.centerMin, max: definition.centerMax};
};
const degreeIssue: TaylorEditIssue = {kind: 'degree', min: TAYLOR_DEGREE_MIN, max: TAYLOR_DEGREE_MAX};
const xIssue = (example: TaylorExampleId): TaylorEditIssue => {
    const definition = taylorExample(example);
    return {kind: 'x', example, min: definition.xMin, max: definition.xMax};
};

/**
 * The single validity rule of a stored Taylor model: a known example, a center and an evaluation point inside that example's
 * domains (the flat example only accepts center 0), an integer degree 0..10 and a boolean `boundVisible`. Nothing is clamped.
 * Unknown properties are dropped. Rules are checked in the order example, center, degree, x, visibility; a field of the wrong
 * type or a missing field gives `issue: undefined`.
 */
export function checkTaylorModel(data: unknown): TaylorCheck {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return reject(undefined);
    const {example, center, degree, x, boundVisible} = data as Record<string, unknown>;
    if (!isTaylorExampleId(example)) return reject({kind: 'example', allowed: TAYLOR_EXAMPLE_IDS});
    const definition = taylorExample(example);
    if (isFiniteNumber(center) && !isTaylorCenter(definition, center)) return reject(centerIssue(example));
    if (isFiniteNumber(degree) && !isTaylorDegree(degree)) return reject(degreeIssue);
    if (isFiniteNumber(x) && !isTaylorX(definition, x)) return reject(xIssue(example));
    if (boundVisible !== undefined && typeof boundVisible !== 'boolean') return reject({kind: 'visibility'});
    if (!isTaylorCenter(definition, center) || !isTaylorDegree(degree) || !isTaylorX(definition, x) || typeof boundVisible !== 'boolean') return reject(undefined);
    return {ok: true, model: {example, center, degree, x, boundVisible}};
}

/** Returns a sanitized model (unknown properties dropped) or undefined unless the data is a valid model. */
export function parseTaylorModel(data: unknown): TaylorModel | undefined {
    const check = checkTaylorModel(data);
    return check.ok ? check.model : undefined;
}

/** Choosing an example loads that example's model and hides the error bound again. */
export function chooseTaylorExample(example: unknown): TaylorEdit {
    if (!isTaylorExampleId(example)) return {ok: false, issue: {kind: 'example', allowed: TAYLOR_EXAMPLE_IDS}};
    return {ok: true, model: {...TAYLOR_EXAMPLE_MODELS[example], boundVisible: false}};
}

/** Moves the center: rejected (never clamped) unless it lies in the example's center range; the value is normalized. */
export function setTaylorCenter(model: TaylorModel, value: number): TaylorEdit {
    if (!isTaylorCenter(taylorExample(model.example), value)) return {ok: false, issue: centerIssue(model.example)};
    const next = cleanNumber(value);
    return {ok: true, model: next === model.center ? model : {...model, center: next}};
}

/** Sets the degree: rejected unless an integer from 0 to 10. */
export function setTaylorDegree(model: TaylorModel, value: number): TaylorEdit {
    if (!isTaylorDegree(value)) return {ok: false, issue: degreeIssue};
    return {ok: true, model: value === model.degree ? model : {...model, degree: value}};
}

/** Moves the evaluation point: rejected (never clamped) unless it lies in the example's domain; the value is normalized. */
export function setTaylorX(model: TaylorModel, value: number): TaylorEdit {
    if (!isTaylorX(taylorExample(model.example), value)) return {ok: false, issue: xIssue(model.example)};
    const next = cleanNumber(value);
    return {ok: true, model: next === model.x ? model : {...model, x: next}};
}
