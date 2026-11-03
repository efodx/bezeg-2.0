import {crossesAtZero, MAX_POLY_DEGREE, polyDegree, polyYIntercept} from './polynomial';
import {POLY_BOUNDS, PolySpec} from './schoolFunctions';
import {
    addZero, checkZeroList, moveZero, removeZero, setZeroMultiplicity, ZeroEntry, ZeroListEdit, ZeroListEvent, ZeroListIssue, zeroListSpec,
} from './zeroListModel';

/*
 * The model of the polynomial-zeros demonstration (school function graphs S3): p(x) = k * prod (x - z_i)^m_i with up to five zeros of
 * multiplicity 1..3 and total degree at most 5. This module owns validity, normalization and the structured issues (data, never
 * text); the zero list rules are shared with the rational-function graph (`zeroListModel`). The Preset parser, the Preset
 * collection's diagnosis and the graph's setters all ask it; they only choose the words (`graphs/functions/polynomialZerosMessages`).
 * The mathematics stays in `polynomial.ts` and `schoolFunctions.ts`.
 */

export const POLYNOMIAL_EXAMPLE_IDS = ['default', 'triple', 'degree-five'] as const;
export type PolynomialExampleId = typeof POLYNOMIAL_EXAMPLE_IDS[number];
export const isPolynomialExampleId = (value: unknown): value is PolynomialExampleId =>
    typeof value === 'string' && (POLYNOMIAL_EXAMPLE_IDS as readonly string[]).includes(value);

export interface PolynomialZerosModel {
    readonly k: number;
    /** In the order of the gliders on the board; the order has no mathematical meaning. */
    readonly zeros: readonly ZeroEntry[];
    /** Whether the derivative curve p' is drawn. */
    readonly derivativeVisible: boolean;
}

interface PolynomialExample {readonly k: number; readonly zeros: readonly ZeroEntry[]}

/**
 * The examples: (x + 2)(x - 1)^2 = x^3 - 3x + 2; (x - 1)^3; and a degree-5 curve 0.2 (x + 3)(x + 1)^2 (x - 2)^2 with multiplicities
 * 1, 2, 2, whose touching points and bumps lie inside the default view [-6, 6] x [-8, 8] (its largest bump is 3.5).
 */
export const POLYNOMIAL_EXAMPLES: Readonly<Record<PolynomialExampleId, PolynomialExample>> = {
    default: {k: 1, zeros: [{z: -2, m: 1}, {z: 1, m: 2}]},
    triple: {k: 1, zeros: [{z: 1, m: 3}]},
    'degree-five': {k: 0.2, zeros: [{z: -3, m: 1}, {z: -1, m: 2}, {z: 2, m: 2}]},
};

export const polynomialExampleModel = (id: PolynomialExampleId): PolynomialZerosModel => ({
    k: POLYNOMIAL_EXAMPLES[id].k, zeros: POLYNOMIAL_EXAMPLES[id].zeros, derivativeVisible: false,
});

export const DEFAULT_POLYNOMIAL_ZEROS_MODEL: PolynomialZerosModel = polynomialExampleModel('default');

/** The example a model's polynomial equals (independent of the order of the zeros and of the derivative switch), if any. */
export const exampleOfPolynomial = (model: PolynomialZerosModel): PolynomialExampleId | undefined =>
    POLYNOMIAL_EXAMPLE_IDS.find(id => {
        const example = POLYNOMIAL_EXAMPLES[id];
        const mine = [...model.zeros].sort((p, q) => p.z - q.z);
        return model.k === example.k && mine.length === example.zeros.length && mine.every((e, i) => e.z === example.zeros[i].z && e.m === example.zeros[i].m);
    });

/** The rule a rejected value broke. Callers localize it; the range and the allowed values travel with it. */
export type PolynomialZerosIssue =
    | ZeroListIssue
    | { readonly kind: 'k-zero' }
    | { readonly kind: 'k-range'; readonly min: number; readonly max: number }
    | { readonly kind: 'example'; readonly allowed: readonly PolynomialExampleId[] }
    | { readonly kind: 'visibility' };

export type PolynomialZerosCheck =
    | { readonly ok: true; readonly model: PolynomialZerosModel }
    | { readonly ok: false; readonly issue: PolynomialZerosIssue | undefined };

export type PolynomialZerosEdit =
    | { readonly ok: true; readonly model: PolynomialZerosModel; readonly event?: ZeroListEvent }
    | { readonly ok: false; readonly issue: PolynomialZerosIssue };

const kIssue = (k: number): PolynomialZerosIssue | undefined => {
    if (!Number.isFinite(k) || k < POLY_BOUNDS.k[0] || k > POLY_BOUNDS.k[1]) return {kind: 'k-range', min: POLY_BOUNDS.k[0], max: POLY_BOUNDS.k[1]};
    return k === 0 ? {kind: 'k-zero'} : undefined;
};

/**
 * The single validity rule of a stored model: k a non-zero finite number inside POLY_BOUNDS.k, a valid zero list (degree at most
 * MAX_POLY_DEGREE, see `checkZeroList`) and a boolean derivativeVisible. Unknown properties are dropped; equal zeros are merged.
 * A field of the wrong type or a missing field gives `issue: undefined` (the generic message).
 */
export function checkPolynomialZerosModel(data: unknown): PolynomialZerosCheck {
    const reject = (issue: PolynomialZerosIssue | undefined): PolynomialZerosCheck => ({ok: false, issue});
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return reject(undefined);
    const {k, zeros, derivativeVisible} = data as Record<string, unknown>;
    if (typeof k !== 'number') return reject(undefined);
    const kProblem = kIssue(k);
    if (kProblem) return reject(kProblem);
    const list = checkZeroList(zeros, MAX_POLY_DEGREE);
    if (!list.ok) return reject(list.issue);
    if (typeof derivativeVisible !== 'boolean') return reject(derivativeVisible === undefined ? undefined : {kind: 'visibility'});
    return {ok: true, model: {k, zeros: list.zeros, derivativeVisible}};
}

/** Returns a sanitized model (unknown properties dropped) or undefined when the data is not a valid model. */
export function parsePolynomialZerosModel(data: unknown): PolynomialZerosModel | undefined {
    const check = checkPolynomialZerosModel(data);
    return check.ok ? check.model : undefined;
}

const withZeros = (model: PolynomialZerosModel, edit: ZeroListEdit): PolynomialZerosEdit =>
    !edit.ok ? edit : {ok: true, model: edit.zeros === model.zeros ? model : {...model, zeros: edit.zeros}, event: edit.event};

/** Sets k: rejected (never clamped) when not finite, zero or out of range. */
export function setPolynomialK(model: PolynomialZerosModel, k: number): PolynomialZerosEdit {
    const issue = kIssue(k);
    if (issue) return {ok: false, issue};
    return {ok: true, model: model.k === k ? model : {...model, k}};
}

/** Moves a zero to x on the grid; meeting another zero merges them (see `moveZero`). */
export const movePolynomialZero = (model: PolynomialZerosModel, index: number, x: number): PolynomialZerosEdit =>
    withZeros(model, moveZero(model.zeros, index, x));

export const setPolynomialMultiplicity = (model: PolynomialZerosModel, index: number, m: unknown): PolynomialZerosEdit =>
    withZeros(model, setZeroMultiplicity(model.zeros, index, m, MAX_POLY_DEGREE));

export const addPolynomialZero = (model: PolynomialZerosModel): PolynomialZerosEdit => withZeros(model, addZero(model.zeros, MAX_POLY_DEGREE));

export const removePolynomialZero = (model: PolynomialZerosModel, index: number): PolynomialZerosEdit => withZeros(model, removeZero(model.zeros, index));

/** Chooses an example: its k and zeros; the derivative switch is kept. */
export function choosePolynomialExample(model: PolynomialZerosModel, id: unknown): PolynomialZerosEdit {
    if (!isPolynomialExampleId(id)) return {ok: false, issue: {kind: 'example', allowed: POLYNOMIAL_EXAMPLE_IDS}};
    return {ok: true, model: {...polynomialExampleModel(id), derivativeVisible: model.derivativeVisible}};
}

/** The kernel spec of the model (zeros sorted). */
export const polynomialSpecOf = (model: PolynomialZerosModel): PolySpec => zeroListSpec(model.k, model.zeros);

/** The behaviour for large |x|, from the sign of k and the parity of the degree. */
export type EndBehaviour =
    | { readonly kind: 'constant' }
    | { readonly kind: 'ends'; readonly left: 'up' | 'down'; readonly right: 'up' | 'down' };

export function endBehaviour(spec: PolySpec): EndBehaviour {
    const degree = polyDegree(spec);
    if (degree === 0) return {kind: 'constant'};
    const right = spec.k > 0 ? 'up' : 'down';
    const left = degree % 2 === 0 ? right : right === 'up' ? 'down' : 'up';
    return {kind: 'ends', left, right};
}

export interface ZeroFact {
    readonly z: number;
    readonly m: number;
    /** The graph crosses the x axis (odd multiplicity) or touches it (even). */
    readonly crosses: boolean;
    /** p'(z) = 0, which holds exactly for m >= 2. */
    readonly derivativeVanishes: boolean;
}

export interface PolynomialFacts {
    readonly spec: PolySpec;
    readonly degree: number;
    readonly end: EndBehaviour;
    readonly yIntercept: number;
    /** Sorted increasingly. */
    readonly zeros: readonly ZeroFact[];
}

export function polynomialFacts(model: PolynomialZerosModel): PolynomialFacts {
    const spec = polynomialSpecOf(model);
    return {
        spec,
        degree: polyDegree(spec),
        end: endBehaviour(spec),
        yIntercept: polyYIntercept(spec),
        zeros: spec.zeros.map(e => ({z: e.z, m: e.m, crosses: crossesAtZero(e.m), derivativeVanishes: e.m >= 2})),
    };
}
