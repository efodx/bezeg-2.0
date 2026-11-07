import {GEOMETRIC_SERIES_MAX_TERMS, geometricPartialSum, geometricSeriesLimit, geometricSeriesValues, geometricTerm} from './geometricSeries';

/*
 * This module owns the rules of the geometric-series model: what is valid, how a step advances it, and which rule a rejected value
 * broke (a `SeriesIssue`: data, never text). Localization stays outside (`graphs/functions/geometricSeriesMessages`).
 */

/** The first term a is a number in [A_MIN, A_MAX]; a = 0 is excluded (it has no meaningful limit marker), a < 0 only mirrors the picture. */
export const SERIES_A_MIN = 0.1;
export const SERIES_A_MAX = 5;
/** The ratio q reaches exactly -1 and 1, where the behaviour changes. */
export const SERIES_Q_MIN = -2;
export const SERIES_Q_MAX = 2;
/** The tolerance band half-width; 0 means no band. */
export const SERIES_TOLERANCE_MIN = 0;
export const SERIES_TOLERANCE_MAX = 1;
export const SERIES_TERMS_MIN = 1;
export const SERIES_TERMS_MAX = GEOMETRIC_SERIES_MAX_TERMS;
/** Transitions of a full run: from one revealed term to all of them. */
export const SERIES_MAX_STEPS = SERIES_TERMS_MAX - 1;

/** The stored description. `terms` is the iteration index (revealed terms); playback is not stored, so a reopened preset is paused. */
export interface GeometricSeriesModel {
    readonly a: number;
    readonly q: number;
    readonly terms: number;
    readonly tolerance: number;
}

export const SERIES_EXAMPLE_IDS = ['default', 'alternating', 'repeating-three', 'repeating-nine', 'divergent'] as const;
export type SeriesExampleId = typeof SERIES_EXAMPLE_IDS[number];

/** The model a named example starts from: one revealed term, no band. */
export const SERIES_EXAMPLE_MODELS: Readonly<Record<SeriesExampleId, GeometricSeriesModel>> = {
    'default': {a: 1, q: 0.5, terms: 1, tolerance: 0},
    'alternating': {a: 1, q: -0.5, terms: 1, tolerance: 0},
    'repeating-three': {a: 0.3, q: 0.1, terms: 1, tolerance: 0},
    'repeating-nine': {a: 0.9, q: 0.1, terms: 1, tolerance: 0},
    'divergent': {a: 1, q: -1, terms: 1, tolerance: 0},
};

export const isSeriesExampleId = (value: unknown): value is SeriesExampleId =>
    typeof value === 'string' && (SERIES_EXAMPLE_IDS as readonly string[]).includes(value);

export const defaultGeometricSeriesModel = (example: SeriesExampleId = 'default'): GeometricSeriesModel => ({...SERIES_EXAMPLE_MODELS[example]});

/** The example whose a and q the model has, or undefined for a custom series. */
export function seriesExampleOf(model: GeometricSeriesModel): SeriesExampleId | undefined {
    return SERIES_EXAMPLE_IDS.find(id => SERIES_EXAMPLE_MODELS[id].a === model.a && SERIES_EXAMPLE_MODELS[id].q === model.q);
}

/** The rule a rejected value broke; the ranges travel with it. */
export type SeriesIssue =
    | {readonly kind: 'a'; readonly min: number; readonly max: number}
    | {readonly kind: 'q'; readonly min: number; readonly max: number}
    | {readonly kind: 'tolerance'; readonly min: number; readonly max: number}
    | {readonly kind: 'terms'; readonly min: number; readonly max: number}
    | {readonly kind: 'example'; readonly allowed: readonly SeriesExampleId[]};

/** A stored value that is not an object at all; the other rules name a field. */
export type SeriesFileIssue = SeriesIssue | {readonly kind: 'object'};

export type SeriesCheck =
    | {readonly ok: true; readonly model: GeometricSeriesModel}
    | {readonly ok: false; readonly issue: SeriesFileIssue};

export type SeriesEdit =
    | {readonly ok: true; readonly model: GeometricSeriesModel}
    | {readonly ok: false; readonly issue: SeriesIssue};

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const inRange = (value: unknown, min: number, max: number): value is number => isFiniteNumber(value) && value >= min && value <= max;
const isTerms = (value: unknown): value is number => inRange(value, SERIES_TERMS_MIN, SERIES_TERMS_MAX) && Number.isInteger(value);

const aIssue: SeriesIssue = {kind: 'a', min: SERIES_A_MIN, max: SERIES_A_MAX};
const qIssue: SeriesIssue = {kind: 'q', min: SERIES_Q_MIN, max: SERIES_Q_MAX};
const toleranceIssue: SeriesIssue = {kind: 'tolerance', min: SERIES_TOLERANCE_MIN, max: SERIES_TOLERANCE_MAX};
const termsIssue: SeriesIssue = {kind: 'terms', min: SERIES_TERMS_MIN, max: SERIES_TERMS_MAX};

/**
 * The single validity rule of a stored model: a in [0.1, 5], q in [-2, 2], tolerance in [0, 1], an integer term count 1..50.
 * Nothing is clamped; non-finite numbers are rejected. Unknown properties are dropped. Every rejection names its rule: a missing
 * field, a field of the wrong type (a string-typed number) or a number out of range names that field, a non-object names the object.
 */
export function checkGeometricSeriesModel(data: unknown): SeriesCheck {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return {ok: false, issue: {kind: 'object'}};
    const {a, q, terms, tolerance} = data as Record<string, unknown>;
    if (!inRange(a, SERIES_A_MIN, SERIES_A_MAX)) return {ok: false, issue: aIssue};
    if (!inRange(q, SERIES_Q_MIN, SERIES_Q_MAX)) return {ok: false, issue: qIssue};
    if (!inRange(tolerance, SERIES_TOLERANCE_MIN, SERIES_TOLERANCE_MAX)) return {ok: false, issue: toleranceIssue};
    if (!isTerms(terms)) return {ok: false, issue: termsIssue};
    return {ok: true, model: {a, q, terms, tolerance}};
}

export function parseGeometricSeriesModel(data: unknown): GeometricSeriesModel | undefined {
    const check = checkGeometricSeriesModel(data);
    return check.ok ? check.model : undefined;
}

/** Choosing an example loads that example's model (a fresh object). */
export function chooseSeriesExample(example: unknown): SeriesEdit {
    if (!isSeriesExampleId(example)) return {ok: false, issue: {kind: 'example', allowed: SERIES_EXAMPLE_IDS}};
    return {ok: true, model: defaultGeometricSeriesModel(example)};
}

const edit = (model: GeometricSeriesModel, next: Partial<GeometricSeriesModel>): SeriesEdit => {
    const changed = (Object.keys(next) as (keyof GeometricSeriesModel)[]).some(key => next[key] !== model[key]);
    return {ok: true, model: changed ? {...model, ...next} : model};
};

/**
 * A committed a or q is rounded to 1e-12, so an accumulated slider step such as -0.9999999999999991 is stored as the exact -1 where
 * the behaviour changes. The range is checked on the rounded value.
 */
const commitRounded = (value: unknown): unknown => isFiniteNumber(value) ? Math.round(value * 1e12) / 1e12 : value;

export const setSeriesA = (model: GeometricSeriesModel, value: unknown): SeriesEdit => {
    const rounded = commitRounded(value);
    return inRange(rounded, SERIES_A_MIN, SERIES_A_MAX) ? edit(model, {a: rounded}) : {ok: false, issue: aIssue};
};
export const setSeriesQ = (model: GeometricSeriesModel, value: unknown): SeriesEdit => {
    const rounded = commitRounded(value);
    return inRange(rounded, SERIES_Q_MIN, SERIES_Q_MAX) ? edit(model, {q: rounded}) : {ok: false, issue: qIssue};
};
export const setSeriesTolerance = (model: GeometricSeriesModel, value: unknown): SeriesEdit =>
    inRange(value, SERIES_TOLERANCE_MIN, SERIES_TOLERANCE_MAX) ? edit(model, {tolerance: value}) : {ok: false, issue: toleranceIssue};
export const setSeriesTerms = (model: GeometricSeriesModel, value: unknown): SeriesEdit =>
    isTerms(value) ? edit(model, {terms: value}) : {ok: false, issue: termsIssue};

export interface SeriesStep {
    readonly model: GeometricSeriesModel;
    readonly advanced: boolean;
    /** 'complete' once the term cap is revealed, otherwise 'continue': the IterationController outcome. */
    readonly outcome: 'continue' | 'complete';
}

export const canAdvanceSeries = (model: GeometricSeriesModel): boolean => model.terms < SERIES_TERMS_MAX;

/** The one transition: reveal one more term. Next step and every playback step run it. At the cap nothing changes. */
export function nextSeriesStep(model: GeometricSeriesModel): SeriesStep {
    if (!canAdvanceSeries(model)) return {model, advanced: false, outcome: 'complete'};
    const terms = model.terms + 1;
    return {model: {...model, terms}, advanced: true, outcome: terms >= SERIES_TERMS_MAX ? 'complete' : 'continue'};
}

export const resetSeriesTerms = (model: GeometricSeriesModel): GeometricSeriesModel => ({...model, terms: SERIES_TERMS_MIN});

/** How the series behaves: converges (|q| < 1), oscillates between a and 0 (q = -1), or diverges. */
export type SeriesBehaviour = 'convergent' | 'oscillating' | 'divergent';

export function seriesBehaviour(model: Pick<GeometricSeriesModel, 'q'>): SeriesBehaviour {
    if (Math.abs(model.q) < 1) return 'convergent';
    return model.q === -1 ? 'oscillating' : 'divergent';
}

/** The numbers every part of the display is derived from. */
export interface SeriesView {
    readonly behaviour: SeriesBehaviour;
    /** a/(1-q) for |q| < 1, otherwise null: the marker is not drawn. */
    readonly limit: number | null;
    readonly lastTerm: number;
    readonly partialSum: number;
    /** |L - S_n| = |a q^n/(1-q)| when the series converges, evaluated directly. */
    readonly error: number | null;
}

export function seriesView(model: GeometricSeriesModel): SeriesView {
    // One evaluation owner: the error is the directly evaluated tail, not limit - S_n (see `analysis/geometricSeries`).
    const values = geometricSeriesValues(model.a, model.q, model.terms);
    return {behaviour: seriesBehaviour(model), limit: values.limit, lastTerm: values.term, partialSum: values.sum, error: values.tail};
}

/**
 * The y-range (bottom, top) that shows the series: 0, the terms, the partial sums and the limit, with headroom for the caption.
 * A divergent series is fitted to its first terms only, so its quick growth does not flatten the picture; later bars run off the board.
 * A tolerance band (tolerance > 0, only drawn for |q| < 1) adds limit ± tolerance, so its edges stay on the board.
 */
/** The share of the data span left empty above the highest bar or marker: the opaque top-right caption (five lines) sits there. */
export const SERIES_TOP_HEADROOM = 0.8;

export function seriesYRange(a: number, q: number, tolerance = 0): {bottom: number; top: number} {
    const count = Math.abs(q) <= 1 ? SERIES_TERMS_MAX : 8;
    let low = 0;
    let high = 0;
    const include = (value: number) => {
        low = Math.min(low, value);
        high = Math.max(high, value);
    };
    const limit = geometricSeriesLimit(a, q);
    if (limit !== null) {
        include(limit);
        if (tolerance > 0) {
            include(limit - tolerance);
            include(limit + tolerance);
        }
    }
    for (let k = 1; k <= count; k++) {
        include(geometricTerm(a, q, k));
        include(geometricPartialSum(a, q, k));
    }
    const span = high - low || 1;
    return {bottom: low - 0.12 * span, top: high + SERIES_TOP_HEADROOM * span};
}
