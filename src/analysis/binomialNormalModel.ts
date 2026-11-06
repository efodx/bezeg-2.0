import {
    BINOMIAL_N_MAX, binomialCdf, binomialMasses, binomialMean, binomialNormalCdf, binomialNormalPmf, binomialPmf,
    binomialStandardDeviation, normalPdf, poissonCdf, poissonPmf,
} from './distributions';

/*
 * The model of lesson P2 (from binomial to normal, `prob-binomial-normal`): X ~ B(n, p), an integer threshold k, the continuity
 * correction toggle and the optional Poisson overlay. This module owns validity (a `BinomialNormalIssue` is data, never text; the
 * words belong to the graph's message module) and the numbers the graph draws and reads out. The mathematics comes from the kernel
 * `distributions.ts`; nothing is added to the function catalogue (`FUNCTION_IDS`).
 *
 * Limits (documented, never clamped silently on import): n an integer in 1..BINOMIAL_N_MAX; p in the open interval (0, 1), and p
 * at exactly 0 or 1 is refused with its own issue (the variance np(1 - p) is zero, so there is no normal curve; decision curves
 * handler 28, spec P2 criterion 2); k an integer in 0..n. Lowering n below a stored k moves k to n: that is an explicit edit, the
 * only adjustment the model makes, and import never does it.
 */

export const BINOMIAL_NORMAL_N_MAX = BINOMIAL_N_MAX;

export interface BinomialNormalModel {
    readonly n: number;
    readonly p: number;
    /** The threshold of P(X <= k). */
    readonly k: number;
    /** Continuity correction k + 1/2 in the normal approximation; on by default. */
    readonly correction: boolean;
    /** Poisson(np) bars over the binomial ones; off by default. */
    readonly poisson: boolean;
}

export const DEFAULT_BINOMIAL_NORMAL_MODEL: BinomialNormalModel = {n: 20, p: 0.5, k: 8, correction: true, poisson: false};

export const BINOMIAL_NORMAL_EXAMPLE_IDS = ['fair20', 'fair100', 'rare'] as const;
export type BinomialNormalExampleId = typeof BINOMIAL_NORMAL_EXAMPLE_IDS[number];
export const isBinomialNormalExampleId = (value: unknown): value is BinomialNormalExampleId =>
    typeof value === 'string' && (BINOMIAL_NORMAL_EXAMPLE_IDS as readonly string[]).includes(value);

/**
 * The spec's three cases: B(20, 1/2) with P(X <= 8); B(100, 1/2) with P(X <= 45); B(100, 0.02) (lambda = 2) with the Poisson bars
 * shown and k = 2. Every example has the correction on.
 */
export const BINOMIAL_NORMAL_EXAMPLES: Readonly<Record<BinomialNormalExampleId, BinomialNormalModel>> = {
    fair20: DEFAULT_BINOMIAL_NORMAL_MODEL,
    fair100: {n: 100, p: 0.5, k: 45, correction: true, poisson: false},
    rare: {n: 100, p: 0.02, k: 2, correction: true, poisson: true},
};

const sameModel = (a: BinomialNormalModel, b: BinomialNormalModel): boolean =>
    a.n === b.n && a.p === b.p && a.k === b.k && a.correction === b.correction && a.poisson === b.poisson;

/** The example whose n and p the model has, or undefined (a custom distribution). */
export function binomialNormalExampleOf(model: BinomialNormalModel): BinomialNormalExampleId | undefined {
    return BINOMIAL_NORMAL_EXAMPLE_IDS.find(id => BINOMIAL_NORMAL_EXAMPLES[id].n === model.n && BINOMIAL_NORMAL_EXAMPLES[id].p === model.p);
}

export type BinomialNormalIssue =
    | { readonly kind: 'n'; readonly max: number }
    /** `degenerate`: p is exactly 0 or 1 (variance zero); otherwise p is not a number in (0, 1). */
    | { readonly kind: 'p'; readonly degenerate: boolean }
    | { readonly kind: 'k'; readonly max: number }
    | { readonly kind: 'flag'; readonly field: 'correction' | 'poisson' }
    | { readonly kind: 'example'; readonly allowed: readonly string[] };

export type BinomialNormalCheck =
    | { readonly ok: true; readonly model: BinomialNormalModel }
    | { readonly ok: false; readonly issue: BinomialNormalIssue | undefined };

export type BinomialNormalEdit =
    | { readonly ok: true; readonly model: BinomialNormalModel }
    | { readonly ok: false; readonly issue: BinomialNormalIssue };

const isN = (value: unknown): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= BINOMIAL_NORMAL_N_MAX;
const isP = (value: unknown): value is number => typeof value === 'number' && value > 0 && value < 1;
const isK = (value: unknown, n: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= n;

const nIssue = (): BinomialNormalIssue => ({kind: 'n', max: BINOMIAL_NORMAL_N_MAX});
const pIssue = (value: unknown): BinomialNormalIssue => ({kind: 'p', degenerate: value === 0 || value === 1});
const kIssue = (n: number): BinomialNormalIssue => ({kind: 'k', max: n});

/**
 * The validity rule of a stored model, checked in the order n, p, k, correction, poisson. A non-object gives `issue: undefined`
 * (the generic message). Unknown properties are dropped; nothing is clamped or rounded.
 */
export function checkBinomialNormalModel(data: unknown): BinomialNormalCheck {
    const reject = (issue: BinomialNormalIssue | undefined): BinomialNormalCheck => ({ok: false, issue});
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return reject(undefined);
    const {n, p, k, correction, poisson} = data as Record<string, unknown>;
    if (!isN(n)) return reject(nIssue());
    if (!isP(p)) return reject(pIssue(p));
    if (!isK(k, n)) return reject(kIssue(n));
    if (typeof correction !== 'boolean') return reject({kind: 'flag', field: 'correction'});
    if (typeof poisson !== 'boolean') return reject({kind: 'flag', field: 'poisson'});
    return {ok: true, model: {n, p, k, correction, poisson}};
}

export function parseBinomialNormalModel(data: unknown): BinomialNormalModel | undefined {
    const check = checkBinomialNormalModel(data);
    return check.ok ? check.model : undefined;
}

/** Sets n; a k above the new n moves to n. */
export function setBinomialN(model: BinomialNormalModel, value: unknown): BinomialNormalEdit {
    if (!isN(value)) return {ok: false, issue: nIssue()};
    if (value === model.n) return {ok: true, model};
    return {ok: true, model: {...model, n: value, k: Math.min(model.k, value)}};
}

export function setBinomialP(model: BinomialNormalModel, value: unknown): BinomialNormalEdit {
    if (!isP(value)) return {ok: false, issue: pIssue(value)};
    return {ok: true, model: value === model.p ? model : {...model, p: value}};
}

/** Sets the threshold: an integer in 0..n (a drag rounds before it calls this). */
export function setBinomialK(model: BinomialNormalModel, value: unknown): BinomialNormalEdit {
    if (!isK(value, model.n)) return {ok: false, issue: kIssue(model.n)};
    return {ok: true, model: value === model.k ? model : {...model, k: value}};
}

export function setBinomialFlag(model: BinomialNormalModel, field: 'correction' | 'poisson', value: unknown): BinomialNormalEdit {
    if (typeof value !== 'boolean') return {ok: false, issue: {kind: 'flag', field}};
    return {ok: true, model: value === model[field] ? model : {...model, [field]: value}};
}

/** The lesson choice of the continuity correction: 'on' or 'off'. */
export const BINOMIAL_CORRECTION_CHOICES = ['on', 'off'] as const;

/** Sets the correction from a lesson choice; anything but 'on' or 'off' is refused like a non-boolean flag. */
export function chooseBinomialCorrection(model: BinomialNormalModel, value: unknown): BinomialNormalEdit {
    return setBinomialFlag(model, 'correction', value === 'on' ? true : value === 'off' ? false : value);
}

/** Chooses a named example: every field at once; anything that is not an example id is refused. */
export function chooseBinomialNormalExample(model: BinomialNormalModel, id: unknown): BinomialNormalEdit {
    if (!isBinomialNormalExampleId(id)) return {ok: false, issue: {kind: 'example', allowed: BINOMIAL_NORMAL_EXAMPLE_IDS}};
    const next = BINOMIAL_NORMAL_EXAMPLES[id];
    return {ok: true, model: sameModel(next, model) ? model : {...next}};
}

// ---- Mathematics ------------------------------------------------------------------------------------------------------

export interface BinomialNormalView {
    readonly mean: number;
    readonly sigma: number;
    /** lambda = np of the Poisson comparison. */
    readonly lambda: number;
    /** P(X <= k), the sum of the binomial mass terms (kernel `binomialCdf`, never a table). */
    readonly exact: number;
    /** Phi((k + 1/2 - np) / sigma) and Phi((k - np) / sigma): both are always computed; `correction` picks the one drawn. */
    readonly corrected: number;
    readonly uncorrected: number;
    /** P(Y <= k) for Y ~ Poisson(np). */
    readonly poisson: number;
    /** Absolute errors against `exact`, for this n, p and k only (no rate). */
    readonly correctedError: number;
    readonly uncorrectedError: number;
    readonly poissonError: number;
    /** The same comparison for the single value P(X = k): binomial, corrected normal (area over [k - 1/2, k + 1/2]), Poisson. */
    readonly massAtK: { readonly exact: number; readonly corrected: number; readonly poisson: number };
}

export function binomialNormalView(model: BinomialNormalModel): BinomialNormalView {
    const {n, p, k} = model;
    const lambda = n * p;
    const exact = binomialCdf(n, p, k);
    const corrected = binomialNormalCdf(n, p, k, true);
    const uncorrected = binomialNormalCdf(n, p, k, false);
    const poisson = poissonCdf(lambda, k);
    return {
        mean: binomialMean(n, p),
        sigma: binomialStandardDeviation(n, p),
        lambda,
        exact,
        corrected,
        uncorrected,
        poisson,
        correctedError: Math.abs(corrected - exact),
        uncorrectedError: Math.abs(uncorrected - exact),
        poissonError: Math.abs(poisson - exact),
        massAtK: {exact: binomialPmf(n, p, k), corrected: binomialNormalPmf(n, p, k, true), poisson: poissonPmf(lambda, k)},
    };
}

/**
 * Bars of the masses `masses[j]` at j = first, first + 1, ... as one open polyline (x and y lists) for a single JSXGraph curve, so
 * the object count does not depend on n. Each bar spans [j - width/2, j + width/2] and is drawn up, across and down to the axis;
 * width 1 gives the touching histogram bars whose area is the mass (the bar of k spans [k - 1/2, k + 1/2], the reason for the
 * continuity correction). Four points per bar.
 */
export function barsPolyline(masses: readonly number[], width = 1, first = 0): { x: number[]; y: number[] } {
    const x: number[] = [];
    const y: number[] = [];
    const half = width / 2;
    masses.forEach((mass, i) => {
        const j = first + i;
        x.push(j - half, j - half, j + half, j + half);
        y.push(0, mass, mass, 0);
    });
    return {x, y};
}

/** The binomial bars of the model, P(X = 0..n). */
export const binomialBars = (model: BinomialNormalModel) => barsPolyline(binomialMasses(model.n, model.p));

/** The shaded bars of P(X <= k), j = 0..k. */
export const binomialShadedBars = (model: BinomialNormalModel) => barsPolyline(binomialMasses(model.n, model.p).slice(0, model.k + 1));

/**
 * The Poisson(np) bars over 0..n, narrower (`width`) so the binomial bars stay visible beneath them. The Poisson mass above n
 * (`tail`) is not drawn; it is reported so the graph can say so when it is visible.
 */
export function poissonBars(model: BinomialNormalModel, width = 0.5): { x: number[]; y: number[]; tail: number } {
    const lambda = model.n * model.p;
    const masses = Array.from({length: model.n + 1}, (_, j) => poissonPmf(lambda, j));
    return {...barsPolyline(masses, width), tail: Math.max(0, 1 - poissonCdf(lambda, model.n))};
}

/** The density of the approximating normal N(np, np(1 - p)). */
export function binomialNormalDensity(model: BinomialNormalModel): (x: number) => number {
    const mu = binomialMean(model.n, model.p);
    const sigma = binomialStandardDeviation(model.n, model.p);
    return x => normalPdf(x, mu, sigma);
}

/**
 * The view that fits the bars (left, top, right, bottom): np +- 4 sigma and every bar with mass above FIT_MASS_MIN, widened by one bar, cut to [-1, n + 1], from just below the
 * axis to above the highest binomial bar and (when shown) Poisson bar, and the normal peak up to 1.5 times that height.
 */
/** Bars with a mass above this always lie inside the fitted view. */
export const FIT_MASS_MIN = 1e-6;

/** The view's top over the peak: a peak near the left edge (a rare event) stays clear of the board caption. */
export const FIT_TOP_FACTOR = 1.4;

export function fitBinomialNormalView(model: BinomialNormalModel): [number, number, number, number] {
    const {n, p} = model;
    const mu = binomialMean(n, p);
    const sigma = binomialStandardDeviation(n, p);
    const masses = binomialMasses(n, p);
    let barPeak = Math.max(...masses);
    if (model.poisson) {
        const lambda = n * p;
        barPeak = Math.max(barPeak, poissonPmf(lambda, Math.floor(lambda)));
    }
    // A very small sigma gives a normal peak 1/(sigma sqrt(2 pi)) far above every bar; it may leave the view so the bars stay readable.
    const peak = Math.max(barPeak, Math.min(normalPdf(mu, mu, sigma), 1.5 * barPeak));
    // Every bar above FIT_MASS_MIN is inside the view as well as np +- 4 sigma (the binomial tails reach past 4 sigma at small n).
    let first = Math.floor(mu - 4 * sigma);
    let last = Math.ceil(mu + 4 * sigma);
    masses.forEach((mass, j) => {
        if (mass > FIT_MASS_MIN) {
            first = Math.min(first, j);
            last = Math.max(last, j);
        }
    });
    if (model.poisson) {
        const lambda = n * p;
        for (let j = last + 1; j <= n && poissonPmf(lambda, j) > FIT_MASS_MIN; j++) last = j;
    }
    const left = Math.max(-1, first - 1);
    const right = Math.min(n + 1, last + 1);
    return [left, FIT_TOP_FACTOR * peak, right, -0.2 * peak];
}
