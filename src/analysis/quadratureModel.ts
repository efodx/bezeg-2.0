import {catalogFunction, FUNCTION_IDS, FunctionId, isFunctionId} from './functions';
import {BOUND_MAX, BOUND_MIN, exactIntegral, isBound, isSubintervalCount, N_MAX, N_MIN} from './riemann';
import {absoluteError, errorRatio, isSimpsonCount, simpsonRule, SIMPSON_N_MAX, SIMPSON_N_MIN, trapezoidRule} from './quadrature';
import {cleanNoise} from './numbers';

/*
 * This module owns the rules of the quadrature model (trapezoid and Simpson rules, numerical methods lesson N4): what is valid, how
 * an accepted value is normalized, which rule a rejected value broke (a `QuadratureIssue`: data, never text) and the numbers a view
 * shows. The Preset parser, the Preset collection's diagnosis and the graph's setters all ask it; they only choose the words
 * (`graphs/functions/quadratureMessages`). The rules live in `analysis/quadrature`; Simpson is deliberately not a `SumMethod`
 * (ADR 0023 section 3), so the stored integral Presets are unchanged.
 */

export const QUADRATURE_RULES = ['trapezoid', 'simpson'] as const;
export type QuadratureRule = typeof QUADRATURE_RULES[number];
export const isQuadratureRule = (value: unknown): value is QuadratureRule =>
    typeof value === 'string' && (QUADRATURE_RULES as readonly string[]).includes(value);

/** The stored description of the quadrature demonstration. Approximations, errors and ratios are recomputed, never stored. */
export interface QuadratureModel {
    readonly rule: QuadratureRule;
    readonly fn: FunctionId;
    readonly a: number;
    readonly b: number;
    readonly n: number;
}

/** The lesson's example: the integral of sin x over [0, pi] is 2. */
export const DEFAULT_QUADRATURE_MODEL: QuadratureModel = {rule: 'trapezoid', fn: 'sin', a: 0, b: Math.PI, n: 2};

/** The gap a drag keeps between the bounds (the bounds' drag grid); typed values only need a < b. */
export const QUADRATURE_MIN_WIDTH = 0.01;

/** The allowed n for a rule: Simpson needs an even number. */
export interface CountRule {
    readonly min: number;
    readonly max: number;
    readonly step: number;
}
export const countRule = (rule: QuadratureRule): CountRule =>
    rule === 'simpson' ? {min: SIMPSON_N_MIN, max: SIMPSON_N_MAX, step: 2} : {min: N_MIN, max: N_MAX, step: 1};
export const isCountFor = (rule: QuadratureRule, n: unknown): n is number => rule === 'simpson' ? isSimpsonCount(n) : isSubintervalCount(n);

export type QuadratureEndpoint = 'a' | 'b';

/** The rule a rejected value broke. Callers localize it; the allowed values and ranges travel with it. */
export type QuadratureIssue =
    | { readonly kind: 'rule'; readonly allowed: readonly QuadratureRule[] }
    | { readonly kind: 'function'; readonly allowed: readonly FunctionId[] }
    | { readonly kind: 'range'; readonly endpoints: readonly QuadratureEndpoint[]; readonly min: number; readonly max: number }
    | { readonly kind: 'order'; readonly moving?: QuadratureEndpoint }
    /** n is outside the rule's range, or odd for Simpson (`even`). */
    | { readonly kind: 'count'; readonly rule: QuadratureRule; readonly min: number; readonly max: number; readonly even: boolean };

export type QuadratureCheck =
    | { readonly ok: true; readonly model: QuadratureModel }
    | { readonly ok: false; readonly issue: QuadratureIssue | undefined };

/** The answer for one edit: the next model (the same object when nothing changes) and, when n was changed, how. */
export type QuadratureEdit =
    | { readonly ok: true; readonly model: QuadratureModel; readonly adjustedFrom?: number }
    | { readonly ok: false; readonly issue: QuadratureIssue };

const reject = (issue: QuadratureIssue | undefined): QuadratureCheck => ({ok: false, issue});
const rangeIssue = (endpoints: readonly QuadratureEndpoint[]): QuadratureIssue => ({kind: 'range', endpoints, min: BOUND_MIN, max: BOUND_MAX});
const countIssue = (rule: QuadratureRule): QuadratureIssue => {
    const {min, max} = countRule(rule);
    return {kind: 'count', rule, min, max, even: rule === 'simpson'};
};
const ruleIssue: QuadratureIssue = {kind: 'rule', allowed: QUADRATURE_RULES};
const functionIssue: QuadratureIssue = {kind: 'function', allowed: FUNCTION_IDS};

/**
 * The single validity rule of a stored model: a known rule and function, bounds a < b in [BOUND_MIN, BOUND_MAX] and an integer n that
 * the rule allows (1 to 150; 2 to 150 and even for Simpson: odd n is rejected, never rounded). Unknown properties are dropped.
 * Rules are checked in the order rule, function, range, order, count; a wrong type or a missing field gives `issue: undefined`.
 */
export function checkQuadratureModel(data: unknown): QuadratureCheck {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return reject(undefined);
    const {rule, fn, a, b, n} = data as Record<string, unknown>;
    if (!isQuadratureRule(rule)) return reject(ruleIssue);
    if (!isFunctionId(fn)) return reject(functionIssue);
    if (typeof a === 'number' && typeof b === 'number' && Number.isFinite(a) && Number.isFinite(b)) {
        if (!isBound(a) || !isBound(b)) return reject(rangeIssue((['a', 'b'] as const).filter(endpoint => !isBound({a, b}[endpoint]))));
        if (!(a < b)) return reject({kind: 'order'});
    }
    if (typeof n === 'number' && Number.isFinite(n) && !isCountFor(rule, n)) return reject(countIssue(rule));
    if (!isBound(a) || !isBound(b) || !isCountFor(rule, n)) return reject(undefined);
    return {ok: true, model: {rule, fn, a, b, n}};
}

/** Returns a sanitized model or undefined unless the data is a valid model. */
export function parseQuadratureModel(data: unknown): QuadratureModel | undefined {
    const check = checkQuadratureModel(data);
    return check.ok ? check.model : undefined;
}

export function chooseQuadratureFunction(model: QuadratureModel, fn: unknown): QuadratureEdit {
    if (!isFunctionId(fn)) return {ok: false, issue: functionIssue};
    return {ok: true, model: fn === model.fn ? model : {...model, fn}};
}

/**
 * Switching the rule keeps the function, the bounds and n. Simpson needs an even n, so an odd n is raised by one (never rounded
 * silently): the edit reports `adjustedFrom`, and the graph states the adjustment next to the control.
 */
export function chooseQuadratureRule(model: QuadratureModel, rule: unknown): QuadratureEdit {
    if (!isQuadratureRule(rule)) return {ok: false, issue: ruleIssue};
    if (rule === model.rule) return {ok: true, model};
    if (isCountFor(rule, model.n)) return {ok: true, model: {...model, rule}};
    const next = model.n + 1;
    return {ok: true, model: {...model, rule, n: next}, adjustedFrom: model.n};
}

/** Sets n: rejected (never rounded) unless the rule allows it. */
export function setQuadratureCount(model: QuadratureModel, n: unknown): QuadratureEdit {
    if (!isCountFor(model.rule, n)) return {ok: false, issue: countIssue(model.rule)};
    return {ok: true, model: n === model.n ? model : {...model, n}};
}

/** Moves one bound: rejected unless finite, in range and keeping a < b. */
export function moveQuadratureEndpoint(model: QuadratureModel, endpoint: QuadratureEndpoint, value: number): QuadratureEdit {
    if (!isBound(value)) return {ok: false, issue: rangeIssue([endpoint])};
    const next = cleanNoise(value);
    const other = endpoint === 'a' ? model.b : model.a;
    const ordered = endpoint === 'a' ? next < other : next > other;
    if (!ordered) return {ok: false, issue: {kind: 'order', moving: endpoint}};
    return {ok: true, model: next === model[endpoint] ? model : {...model, [endpoint]: next}};
}

/** The numbers a view shows, all derived from the model. */
export interface QuadratureView {
    readonly approximation: number;
    /** The exact value from the catalogue's antiderivative. */
    readonly exact: number;
    readonly error: number;
    /** n / 2 when it is valid for the rule (Simpson: even and at least 2), else undefined. */
    readonly halfN?: number;
    readonly halfError?: number;
    /** halfError / error, or undefined when there is no n / 2 or the error is zero. */
    readonly ratio?: number;
}

/** The approximation of the model's rule with n subintervals (n is not checked against the rule here; callers pass valid n). */
export function quadratureApproximation(model: QuadratureModel, n: number = model.n): number {
    const fn = catalogFunction(model.fn);
    return model.rule === 'simpson' ? simpsonRule(fn, model.a, model.b, n) : trapezoidRule(fn, model.a, model.b, n);
}

/** Significant digits of a displayed error. */
export const ERROR_DISPLAY_DIGITS = 4;

/** An error as displayed (4 significant digits, below 1e-12 zero, as `formatSignificant` shows it); the ratio is computed from these values so it equals the quotient of the displayed errors. */
export const displayedError = (error: number): number =>
    Math.abs(error) < 1e-12 ? 0 : Number(error.toPrecision(ERROR_DISPLAY_DIGITS));

export function quadratureView(model: QuadratureModel): QuadratureView {
    const exact = exactIntegral(catalogFunction(model.fn), model.a, model.b);
    const approximation = quadratureApproximation(model);
    const error = displayedError(absoluteError(approximation, exact));
    const half = model.n / 2;
    if (!isCountFor(model.rule, half)) return {approximation, exact, error};
    const halfError = displayedError(absoluteError(quadratureApproximation(model, half), exact));
    const ratio = errorRatio(halfError, error);
    return ratio === null ? {approximation, exact, error, halfN: half, halfError} : {approximation, exact, error, halfN: half, halfError, ratio};
}
