import {BASE_MAX, BASE_MIN} from './schoolFunctions';
import {INVERSE_RESTRICTIONS, inversePair, InversePair, InverseRestriction, mirroredSlopes, MirroredSlopes} from './inverse';

/*
 * This module owns the rules of the inverse-function demonstration (school function lesson S2): which restriction is offered, which
 * base a and which abscissa x0 are valid, and which rule a rejected value broke (a `FunctionInverseIssue`: data, never text). The
 * Preset parser, the Preset collection's diagnosis and the graph's setters all ask it; they only choose the words
 * (`graphs/functions/functionInverseMessages`). The mathematics (the restrictions, the mirror point, the mirrored slopes) stays in `inverse.ts`.
 */

/** The one-to-one restrictions offered, named as they are stored: x^2 on x >= 0 with sqrt, a^x with log_a, e^x with ln. */
export const INVERSE_RESTRICTION_IDS = ['square', 'exp', 'natural'] as const;
export type InverseRestrictionId = typeof INVERSE_RESTRICTION_IDS[number];
export const isInverseRestrictionId = (value: unknown): value is InverseRestrictionId =>
    typeof value === 'string' && (INVERSE_RESTRICTION_IDS as readonly string[]).includes(value);

/** The range of the base a of a^x; a = 1 inside it is rejected. */
export const INVERSE_BASE_MIN = BASE_MIN;
export const INVERSE_BASE_MAX = BASE_MAX;
export const INVERSE_X0_STEP = 0.1;

/** The abscissa x0 of the point P = (x0, f(x0)) lies in this range; x^2 is restricted to x >= 0, so its range starts at 0. */
export const inverseX0Range = (restriction: InverseRestrictionId): readonly [number, number] => restriction === 'square' ? [0, 4] : [-3, 3];

export interface FunctionInverseModel {
    readonly restriction: InverseRestrictionId;
    /** The base a of a^x and log_a (used only with the restriction 'exp'; kept when another restriction is chosen). */
    readonly base: number;
    /** The abscissa of P on the forward curve. */
    readonly x0: number;
    /** Whether the inverse curve is drawn ("predict, then reveal"). */
    readonly inverseVisible: boolean;
    /** Whether the tangent at P and the mirrored tangent at P' are drawn. */
    readonly tangentVisible: boolean;
}

export const DEFAULT_FUNCTION_INVERSE_MODEL: FunctionInverseModel = {
    restriction: 'square', base: 2, x0: 2, inverseVisible: true, tangentVisible: true,
};

export type FunctionInverseIssue =
    | { readonly kind: 'restriction'; readonly allowed: readonly InverseRestrictionId[] }
    | { readonly kind: 'base-one' }
    | { readonly kind: 'range'; readonly field: 'base' | 'x0'; readonly min: number; readonly max: number }
    | { readonly kind: 'visibility'; readonly field: 'inverseVisible' | 'tangentVisible' };

export type FunctionInverseCheck =
    | { readonly ok: true; readonly model: FunctionInverseModel }
    | { readonly ok: false; readonly issue: FunctionInverseIssue | undefined };

export type FunctionInverseEdit =
    | { readonly ok: true; readonly model: FunctionInverseModel }
    | { readonly ok: false; readonly issue: FunctionInverseIssue };

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const restrictionIssue = (): FunctionInverseIssue => ({kind: 'restriction', allowed: INVERSE_RESTRICTION_IDS});

/** The issue a base value breaks (the kernel decides: 1 is excluded, the catalogue range applies), or undefined. */
function baseIssue(value: number): FunctionInverseIssue | undefined {
    const pair = inversePair({kind: 'exp', base: value});
    if (typeof pair !== 'string') return undefined;
    return pair === 'base-one' ? {kind: 'base-one'} : {kind: 'range', field: 'base', min: INVERSE_BASE_MIN, max: INVERSE_BASE_MAX};
}

function x0Issue(restriction: InverseRestrictionId, value: number): FunctionInverseIssue | undefined {
    const [min, max] = inverseX0Range(restriction);
    return Number.isFinite(value) && value >= min && value <= max ? undefined : {kind: 'range', field: 'x0', min, max};
}

/**
 * The single validity rule of a stored model: a known restriction, a base inside [0.2, 5] and different from 1, x0 inside the range
 * of the restriction, and boolean visibility flags. Unknown properties are dropped. Rules are checked in the order restriction, base,
 * x0, visibility; a field of the wrong type or a missing field gives `issue: undefined` (the generic message).
 */
export function checkFunctionInverseModel(data: unknown): FunctionInverseCheck {
    const reject = (issue: FunctionInverseIssue | undefined): FunctionInverseCheck => ({ok: false, issue});
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return reject(undefined);
    const {restriction, base, x0, inverseVisible, tangentVisible} = data as Record<string, unknown>;
    if (!isInverseRestrictionId(restriction)) return reject(restrictionIssue());
    if (!isFiniteNumber(base) || !isFiniteNumber(x0)) return reject(undefined);
    const issue = baseIssue(base) ?? x0Issue(restriction, x0);
    if (issue) return reject(issue);
    if (typeof inverseVisible !== 'boolean') return reject(inverseVisible === undefined ? undefined : {kind: 'visibility', field: 'inverseVisible'});
    if (typeof tangentVisible !== 'boolean') return reject(tangentVisible === undefined ? undefined : {kind: 'visibility', field: 'tangentVisible'});
    return {ok: true, model: {restriction, base, x0, inverseVisible, tangentVisible}};
}

/** Returns a sanitized model (unknown properties dropped) or undefined when the data is not a valid model. */
export function parseFunctionInverseModel(data: unknown): FunctionInverseModel | undefined {
    const check = checkFunctionInverseModel(data);
    return check.ok ? check.model : undefined;
}

/** Sets the base a: rejected (never clamped) when not finite, outside [0.2, 5] or equal to 1. */
export function setInverseBase(model: FunctionInverseModel, value: number): FunctionInverseEdit {
    const issue = baseIssue(value);
    if (issue) return {ok: false, issue};
    return {ok: true, model: model.base === value ? model : {...model, base: value}};
}

/** Moves P: rejected (never clamped) when x0 is not finite or outside the range of the current restriction. */
export function moveInversePoint(model: FunctionInverseModel, value: number): FunctionInverseEdit {
    const issue = x0Issue(model.restriction, value);
    if (issue) return {ok: false, issue};
    return {ok: true, model: model.x0 === value ? model : {...model, x0: value}};
}

/** Changing the restriction keeps the base and keeps x0 when it is still in range (x0 < 0 is not on the x^2 restriction), else x0 becomes 2 (square) or 1. */
export function chooseInverseRestriction(model: FunctionInverseModel, restriction: unknown): FunctionInverseEdit {
    if (!isInverseRestrictionId(restriction)) return {ok: false, issue: restrictionIssue()};
    if (restriction === model.restriction) return {ok: true, model};
    const x0 = x0Issue(restriction, model.x0) === undefined ? model.x0 : restriction === 'square' ? 2 : 1;
    return {ok: true, model: {...model, restriction, x0}};
}

/** The kernel restriction of a valid model. */
export const restrictionOf = (model: FunctionInverseModel): InverseRestriction => {
    if (model.restriction === 'exp') return {kind: 'exp', base: model.base};
    return INVERSE_RESTRICTIONS.find(r => r.kind === model.restriction) ?? {kind: 'square'};
};

/** The forward and inverse curves of a valid model (a valid model never has a rejected base). */
export const inversePairOf = (model: FunctionInverseModel): InversePair => {
    const pair = inversePair(restrictionOf(model));
    if (typeof pair === 'string') throw new Error(`invalid inverse model: ${pair}`);
    return pair;
};

/** P, its mirror P' and the slopes there (defined for a valid model, whose x0 lies in the domain of the forward curve). */
export const inverseSlopesOf = (model: FunctionInverseModel): MirroredSlopes | undefined => mirroredSlopes(inversePairOf(model), model.x0);

/**
 * Whether the exponential/logarithm pair has asymptotes to show: the inverse (ln, log_a) has the domain x > 0 and the vertical
 * asymptote x = 0, and the forward curve (a^x, e^x) the horizontal asymptote y = 0. The square-root pair has neither.
 */
export const hasAsymptotes = (model: FunctionInverseModel): boolean => model.restriction !== 'square';
