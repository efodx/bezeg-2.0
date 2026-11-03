import {MAX_POLY_DEGREE, polyDegree, polyValue} from './polynomial';
import {analyzeRational, RationalAnalysis, rationalRemainderAt} from './rational';
import {POLY_BOUNDS, PolySpec} from './schoolFunctions';
import {
    addZero, checkZeroList, moveZero, removeZero, setZeroMultiplicity, ZeroEntry, ZeroListEdit, ZeroListEvent, ZeroListIssue, zeroListSpec,
} from './zeroListModel';

/*
 * The model of the rational-function demonstration (school function graphs S4): f(x) = p(x) / q(x) with
 * p = k * prod (x - a_i)^m_i (numerator) and q = prod (x - b_j)^n_j (denominator, monic). There is one overall k, carried by the
 * numerator: a second factor on the denominator would only rescale k, and a monic q keeps the readout of poles and the division
 * p/q = quotient + r/q free of a redundant constant. Each list has total degree at most 5 (the S3 rules, shared through
 * `zeroListModel`). A denominator without zeros is allowed (f is then a polynomial); the denominator cannot be identically
 * zero by construction, since it is a product of linear factors. This module owns validity, normalization and the structured
 * issues (data, never text); the Preset parser, the Preset collection's diagnosis and the graph's setters all ask it, and
 * `graphs/functions/rationalFunctionMessages` chooses the words. The mathematics (holes, poles, asymptotes, division) stays in
 * `rational.ts`; an exact common zero of the two lists is a hole and never a pole.
 */

export const RATIONAL_EXAMPLE_IDS = ['oblique', 'hole', 'horizontal', 'double-pole'] as const;
export type RationalExampleId = typeof RATIONAL_EXAMPLE_IDS[number];
export const isRationalExampleId = (value: unknown): value is RationalExampleId =>
    typeof value === 'string' && (RATIONAL_EXAMPLE_IDS as readonly string[]).includes(value);

/** The probe x of the remainder term r(x)/q(x) ranges over this interval. */
export const PROBE_BOUNDS = [-10, 10] as const;
/** The default probe: the value of the specification (remainder 0.375 at x = 10 for (x^2 - 1)/(x - 2)). */
export const DEFAULT_PROBE = 10;

export interface RationalFunctionModel {
    /** The factor of the numerator; the denominator is monic. */
    readonly k: number;
    /** In the order of the gliders on the board; the order has no mathematical meaning. */
    readonly numerator: readonly ZeroEntry[];
    readonly denominator: readonly ZeroEntry[];
    /** Where the remainder term r(x)/q(x) is read. */
    readonly probe: number;
}

interface RationalExample {
    readonly k: number;
    readonly numerator: readonly ZeroEntry[];
    readonly denominator: readonly ZeroEntry[];
}

/**
 * The examples: (x^2 - 1)/(x - 2) = x + 2 + 3/(x - 2) (oblique asymptote y = x + 2); (x^2 - 1)/(x - 1) = x + 1 with a hole at
 * (1, 2); 2(x - 1)(x + 1)/((x - 2)(x + 2)) (horizontal asymptote y = 2); and 4x/((x + 2)(x - 1)^2), whose simple pole at -2 changes
 * the sign of f and whose double pole at 1 does not (horizontal asymptote y = 0, since deg p < deg q).
 */
export const RATIONAL_EXAMPLES: Readonly<Record<RationalExampleId, RationalExample>> = {
    oblique: {k: 1, numerator: [{z: -1, m: 1}, {z: 1, m: 1}], denominator: [{z: 2, m: 1}]},
    hole: {k: 1, numerator: [{z: -1, m: 1}, {z: 1, m: 1}], denominator: [{z: 1, m: 1}]},
    horizontal: {k: 2, numerator: [{z: -1, m: 1}, {z: 1, m: 1}], denominator: [{z: -2, m: 1}, {z: 2, m: 1}]},
    'double-pole': {k: 4, numerator: [{z: 0, m: 1}], denominator: [{z: -2, m: 1}, {z: 1, m: 2}]},
};

export const rationalExampleModel = (id: RationalExampleId, probe: number = DEFAULT_PROBE): RationalFunctionModel => ({
    k: RATIONAL_EXAMPLES[id].k, numerator: RATIONAL_EXAMPLES[id].numerator, denominator: RATIONAL_EXAMPLES[id].denominator, probe,
});

export const DEFAULT_RATIONAL_FUNCTION_MODEL: RationalFunctionModel = rationalExampleModel('oblique');

const sameList = (a: readonly ZeroEntry[], b: readonly ZeroEntry[]): boolean => {
    const mine = [...a].sort((p, q) => p.z - q.z);
    const other = [...b].sort((p, q) => p.z - q.z);
    return mine.length === other.length && mine.every((e, i) => e.z === other[i].z && e.m === other[i].m);
};

/** The example a model's fraction equals (independent of the order of the zeros and of the probe), if any. */
export const exampleOfRational = (model: RationalFunctionModel): RationalExampleId | undefined =>
    RATIONAL_EXAMPLE_IDS.find(id => {
        const example = RATIONAL_EXAMPLES[id];
        return model.k === example.k && sameList(model.numerator, example.numerator) && sameList(model.denominator, example.denominator);
    });

/** The rule a rejected value broke. Callers localize it; the range and the allowed values travel with it. */
export type RationalFunctionIssue =
    | ZeroListIssue
    | { readonly kind: 'k-zero' }
    | { readonly kind: 'k-range'; readonly min: number; readonly max: number }
    | { readonly kind: 'probe-range'; readonly min: number; readonly max: number }
    | { readonly kind: 'example'; readonly allowed: readonly RationalExampleId[] };

export type RationalFunctionCheck =
    | { readonly ok: true; readonly model: RationalFunctionModel }
    | { readonly ok: false; readonly issue: RationalFunctionIssue | undefined };

/** The outcome of an edit; `event` reports two zeros of one list that met and merged. */
export type RationalFunctionEdit =
    | { readonly ok: true; readonly model: RationalFunctionModel; readonly event?: ZeroListEvent }
    | { readonly ok: false; readonly issue: RationalFunctionIssue };

const kIssue = (k: number): RationalFunctionIssue | undefined => {
    if (!Number.isFinite(k) || k < POLY_BOUNDS.k[0] || k > POLY_BOUNDS.k[1]) return {kind: 'k-range', min: POLY_BOUNDS.k[0], max: POLY_BOUNDS.k[1]};
    return k === 0 ? {kind: 'k-zero'} : undefined;
};

const probeIssue = (x: number): RationalFunctionIssue | undefined =>
    Number.isFinite(x) && x >= PROBE_BOUNDS[0] && x <= PROBE_BOUNDS[1] ? undefined : {kind: 'probe-range', min: PROBE_BOUNDS[0], max: PROBE_BOUNDS[1]};

/**
 * The single validity rule of a stored model: k a non-zero finite number inside POLY_BOUNDS.k, two valid zero lists (each of total
 * degree at most MAX_POLY_DEGREE, see `checkZeroList`; the denominator may be empty) and a probe inside PROBE_BOUNDS. Unknown
 * properties are dropped; equal zeros of one list are merged. A field of the wrong type or a missing field gives
 * `issue: undefined` (the generic message).
 */
export function checkRationalFunctionModel(data: unknown): RationalFunctionCheck {
    const reject = (issue: RationalFunctionIssue | undefined): RationalFunctionCheck => ({ok: false, issue});
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return reject(undefined);
    const {k, numerator, denominator, probe} = data as Record<string, unknown>;
    if (typeof k !== 'number' || typeof probe !== 'number') return reject(undefined);
    const kProblem = kIssue(k);
    if (kProblem) return reject(kProblem);
    const top = checkZeroList(numerator, MAX_POLY_DEGREE);
    if (!top.ok) return reject(top.issue);
    const bottom = checkZeroList(denominator, MAX_POLY_DEGREE);
    if (!bottom.ok) return reject(bottom.issue);
    const probeProblem = probeIssue(probe);
    if (probeProblem) return reject(probeProblem);
    return {ok: true, model: {k, numerator: top.zeros, denominator: bottom.zeros, probe}};
}

/** Returns a sanitized model (unknown properties dropped) or undefined when the data is not a valid model. */
export function parseRationalFunctionModel(data: unknown): RationalFunctionModel | undefined {
    const check = checkRationalFunctionModel(data);
    return check.ok ? check.model : undefined;
}

/** Which list of the fraction an edit addresses. */
export type RationalPart = 'numerator' | 'denominator';

const withList = (model: RationalFunctionModel, part: RationalPart, edit: ZeroListEdit): RationalFunctionEdit =>
    !edit.ok ? edit : {ok: true, model: edit.zeros === model[part] ? model : {...model, [part]: edit.zeros}, event: edit.event};

/** Sets k: rejected (never clamped) when not finite, zero or out of range. */
export function setRationalK(model: RationalFunctionModel, k: number): RationalFunctionEdit {
    const issue = kIssue(k);
    if (issue) return {ok: false, issue};
    return {ok: true, model: model.k === k ? model : {...model, k}};
}

/** Sets the probe of the remainder term: rejected (never clamped) outside PROBE_BOUNDS. */
export function setRationalProbe(model: RationalFunctionModel, x: number): RationalFunctionEdit {
    const issue = probeIssue(x);
    if (issue) return {ok: false, issue};
    return {ok: true, model: model.probe === x ? model : {...model, probe: x}};
}

/**
 * Moves a zero of the numerator or the denominator to x on the grid. Zeros of one list that meet merge (see `moveZero`); a
 * numerator zero that lands on a denominator zero is not merged with it: the two lists then share a zero, which `analyzeRational`
 * reads as a hole.
 */
export const moveRationalZero = (model: RationalFunctionModel, part: RationalPart, index: number, x: number): RationalFunctionEdit =>
    withList(model, part, moveZero(model[part], index, x));

export const setRationalMultiplicity = (model: RationalFunctionModel, part: RationalPart, index: number, m: unknown): RationalFunctionEdit =>
    withList(model, part, setZeroMultiplicity(model[part], index, m, MAX_POLY_DEGREE));

export const addRationalZero = (model: RationalFunctionModel, part: RationalPart): RationalFunctionEdit =>
    withList(model, part, addZero(model[part], MAX_POLY_DEGREE));

export const removeRationalZero = (model: RationalFunctionModel, part: RationalPart, index: number): RationalFunctionEdit =>
    withList(model, part, removeZero(model[part], index));

/** Chooses an example: its k and zeros; the probe is kept. */
export function chooseRationalExample(model: RationalFunctionModel, id: unknown): RationalFunctionEdit {
    if (!isRationalExampleId(id)) return {ok: false, issue: {kind: 'example', allowed: RATIONAL_EXAMPLE_IDS}};
    return {ok: true, model: rationalExampleModel(id, model.probe)};
}

/** The kernel specs of the fraction (zeros sorted, the denominator monic). */
export const rationalSpecsOf = (model: RationalFunctionModel): { readonly numerator: PolySpec; readonly denominator: PolySpec } => ({
    numerator: zeroListSpec(model.k, model.numerator), denominator: zeroListSpec(1, model.denominator),
});

/** The one-sided behaviour of f at a pole: it runs off to +infinity or -infinity. */
export type PoleSide = 'up' | 'down';

export interface PoleFact {
    readonly x: number;
    readonly multiplicity: number;
    /** Odd multiplicity: f changes sign across the pole (one side +infinity, the other -infinity); even: both sides alike. */
    readonly signChanges: boolean;
    readonly left: PoleSide;
    readonly right: PoleSide;
}

export interface RationalFacts {
    readonly analysis: RationalAnalysis;
    /** Whether a common factor was cancelled (a hole, or a pole of smaller multiplicity than in q). */
    readonly cancelled: boolean;
    /** The zeros of f: the zeros of the reduced numerator, sorted. */
    readonly zeros: readonly { readonly z: number; readonly m: number }[];
    readonly poles: readonly PoleFact[];
    /** deg p and deg q of the reduced fraction. */
    readonly degreeNumerator: number;
    readonly degreeDenominator: number;
    /** The probe: x, whether f is defined there (neither pole nor hole) and the remainder term r(x)/q(x) there (when defined). */
    readonly probe: { readonly x: number; readonly defined: boolean; readonly remainderTerm: number | undefined };
}

/** The side of a pole x: sign of f just left and right of it (a step small against the 0.1 grid, so no other zero is between). */
const poleSides = (analysis: RationalAnalysis, x: number): { left: PoleSide; right: PoleSide } => {
    const sign = (at: number) => Math.sign(polyValue(analysis.reducedNumerator, at) / polyValue(analysis.reducedDenominator, at)) < 0 ? 'down' : 'up';
    return {left: sign(x - 1e-6), right: sign(x + 1e-6)};
};

export function rationalFacts(model: RationalFunctionModel): RationalFacts {
    const {numerator, denominator} = rationalSpecsOf(model);
    const analysis = analyzeRational(numerator, denominator);
    const excluded = new Set([...analysis.holes.map(h => h.x), ...analysis.poles.map(p => p.x)]);
    const defined = Number.isFinite(model.probe) && !excluded.has(model.probe);
    return {
        analysis,
        cancelled: polyDegree(analysis.reducedNumerator) < polyDegree(analysis.numerator),
        zeros: [...analysis.reducedNumerator.zeros].sort((a, b) => a.z - b.z).map(e => ({z: e.z, m: e.m})),
        poles: analysis.poles.map(pole => ({
            x: pole.x, multiplicity: pole.multiplicity, signChanges: pole.multiplicity % 2 === 1, ...poleSides(analysis, pole.x),
        })),
        degreeNumerator: polyDegree(analysis.reducedNumerator),
        degreeDenominator: polyDegree(analysis.reducedDenominator),
        probe: {x: model.probe, defined, remainderTerm: defined ? rationalRemainderAt(analysis, model.probe) : undefined},
    };
}
