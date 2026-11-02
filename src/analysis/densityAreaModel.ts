import {normalPdf, normalProbability, normalStrips, zScore} from './distributions';

/*
 * The model of lesson P1 (density and probability as area, `prob-density`): X ~ N(mu, sigma^2) and an interval [a, b]. This
 * module owns validity (a `DensityAreaIssue` is data, never text; the words live in `graphs/functions/densityAreaMessages`) and
 * the numbers the graph draws and reads out. The mathematics comes from the kernel `distributions.ts`; nothing is added to the
 * function catalogue (`FUNCTION_IDS`).
 *
 * Limits (documented, never clamped silently on import): mu in [-200, 200]; sigma in [0.1, 20]; a and b in [-400, 400]. The bound
 * limit is absolute, not relative to mu and sigma, so changing mu or sigma never makes a stored bound invalid; 400 = 200 + 10 * 20
 * covers mu +- 10 sigma for every allowed mu and sigma. A typed bound is stored as typed; only a drag snaps to 0.01.
 */

export const DENSITY_MU_LIMIT = 200;
export const DENSITY_SIGMA_MIN = 0.1;
export const DENSITY_SIGMA_MAX = 20;
export const DENSITY_BOUND_LIMIT = 400;
/** A drag of a bound snaps to this grid, as the bounds of the definite integral do. */
export const DENSITY_DRAG_STEP = 0.01;
/** An interval narrower than this fraction of sigma gets the "very thin" note. */
export const DENSITY_THIN_FRACTION = 0.02;
/** The area is drawn from this many trapezoid strips, over the part of [a, b] within mu +- DENSITY_DRAW_SIGMAS * sigma. */
export const DENSITY_FILL_STRIPS = 240;
export const DENSITY_DRAW_SIGMAS = 10;

export interface DensityAreaModel {
    readonly mu: number;
    readonly sigma: number;
    readonly a: number;
    readonly b: number;
}

export const DEFAULT_DENSITY_AREA_MODEL: DensityAreaModel = {mu: 0, sigma: 1, a: -1, b: 1};

export const DENSITY_EXAMPLE_IDS = ['standard', 'iq'] as const;
export type DensityExampleId = typeof DENSITY_EXAMPLE_IDS[number];
export const isDensityExampleId = (value: unknown): value is DensityExampleId =>
    typeof value === 'string' && (DENSITY_EXAMPLE_IDS as readonly string[]).includes(value);

/** The two named examples of the lesson: N(0, 1) with mu +- sigma, and N(100, 15) with P(85 <= X <= 130) = 0.81859. */
export const DENSITY_EXAMPLES: Readonly<Record<DensityExampleId, DensityAreaModel>> = {
    standard: DEFAULT_DENSITY_AREA_MODEL,
    iq: {mu: 100, sigma: 15, a: 85, b: 130},
};

/** The example whose mu and sigma the model has, or undefined (a custom curve). */
export function densityExampleOf(model: DensityAreaModel): DensityExampleId | undefined {
    return (Object.keys(DENSITY_EXAMPLES) as DensityExampleId[]).find(id => DENSITY_EXAMPLES[id].mu === model.mu && DENSITY_EXAMPLES[id].sigma === model.sigma);
}

export type DensityAreaIssue =
    | { readonly kind: 'mu'; readonly limit: number }
    | { readonly kind: 'sigma'; readonly min: number; readonly max: number }
    | { readonly kind: 'bound'; readonly field: 'a' | 'b'; readonly limit: number }
    | { readonly kind: 'example'; readonly allowed: readonly string[] };

export type DensityAreaCheck =
    | { readonly ok: true; readonly model: DensityAreaModel }
    | { readonly ok: false; readonly issue: DensityAreaIssue | undefined };

export type DensityAreaEdit =
    | { readonly ok: true; readonly model: DensityAreaModel }
    | { readonly ok: false; readonly issue: DensityAreaIssue };

const inRange = (value: unknown, limit: number): value is number => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit;
const isSigma = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= DENSITY_SIGMA_MIN && value <= DENSITY_SIGMA_MAX;

const muIssue = (): DensityAreaIssue => ({kind: 'mu', limit: DENSITY_MU_LIMIT});
const sigmaIssue = (): DensityAreaIssue => ({kind: 'sigma', min: DENSITY_SIGMA_MIN, max: DENSITY_SIGMA_MAX});
const boundIssue = (field: 'a' | 'b'): DensityAreaIssue => ({kind: 'bound', field, limit: DENSITY_BOUND_LIMIT});

/**
 * The validity rule of a stored model. Rules are checked in the order mu, sigma, a, b. A non-object gives `issue: undefined`
 * (the generic message). Unknown properties are dropped; nothing is clamped or rounded. a > b is a valid model (an empty interval).
 */
export function checkDensityAreaModel(data: unknown): DensityAreaCheck {
    const reject = (issue: DensityAreaIssue | undefined): DensityAreaCheck => ({ok: false, issue});
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return reject(undefined);
    const {mu, sigma, a, b} = data as Record<string, unknown>;
    if (!inRange(mu, DENSITY_MU_LIMIT)) return reject(muIssue());
    if (!isSigma(sigma)) return reject(sigmaIssue());
    if (!inRange(a, DENSITY_BOUND_LIMIT)) return reject(boundIssue('a'));
    if (!inRange(b, DENSITY_BOUND_LIMIT)) return reject(boundIssue('b'));
    return {ok: true, model: {mu, sigma, a, b}};
}

export function parseDensityAreaModel(data: unknown): DensityAreaModel | undefined {
    const check = checkDensityAreaModel(data);
    return check.ok ? check.model : undefined;
}

export function setDensityMu(model: DensityAreaModel, value: unknown): DensityAreaEdit {
    if (!inRange(value, DENSITY_MU_LIMIT)) return {ok: false, issue: muIssue()};
    return {ok: true, model: value === model.mu ? model : {...model, mu: value}};
}

export function setDensitySigma(model: DensityAreaModel, value: unknown): DensityAreaEdit {
    if (!isSigma(value)) return {ok: false, issue: sigmaIssue()};
    return {ok: true, model: value === model.sigma ? model : {...model, sigma: value}};
}

export function setDensityBound(model: DensityAreaModel, field: 'a' | 'b', value: unknown): DensityAreaEdit {
    if (!inRange(value, DENSITY_BOUND_LIMIT)) return {ok: false, issue: boundIssue(field)};
    return {ok: true, model: value === model[field] ? model : {...model, [field]: value}};
}

/** Chooses a named example: all four numbers at once; anything that is not an example id is refused. */
export function chooseDensityExample(model: DensityAreaModel, id: unknown): DensityAreaEdit {
    if (!isDensityExampleId(id)) return {ok: false, issue: {kind: 'example', allowed: DENSITY_EXAMPLE_IDS}};
    const next = DENSITY_EXAMPLES[id];
    return {ok: true, model: next.mu === model.mu && next.sigma === model.sigma && next.a === model.a && next.b === model.b ? model : {...next}};
}

// ---- Mathematics ------------------------------------------------------------------------------------------------------

/**
 * `interval`: a < b. `thin`: a < b but narrower than DENSITY_THIN_FRACTION * sigma. `point`: a = b (probability 0 for a continuous
 * variable). `reversed`: a > b, an empty interval (probability 0, nothing drawn).
 */
export type DensityIntervalKind = 'interval' | 'thin' | 'point' | 'reversed';

export interface DensityAreaView {
    readonly kind: DensityIntervalKind;
    /** P(a <= X <= b) = Phi(z_b) - Phi(z_a); 0 for a >= b. Right of the mean it is a difference of tails, so far tails keep their digits. */
    readonly probability: number;
    readonly za: number;
    readonly zb: number;
}

export function densityAreaView(model: DensityAreaModel): DensityAreaView {
    const {mu, sigma, a, b} = model;
    const kind: DensityIntervalKind = a > b ? 'reversed' : a === b ? 'point' : b - a < DENSITY_THIN_FRACTION * sigma ? 'thin' : 'interval';
    return {kind, probability: normalProbability(a, b, mu, sigma), za: zScore(a, mu, sigma), zb: zScore(b, mu, sigma)};
}

/**
 * The filled area as one closed polygon (x and y lists) from trapezoid strips of the density over [a, b] cut to mu +- 10 sigma
 * (the density there is below 1e-22, invisible); empty for a >= b or an interval outside that window.
 */
export function densityAreaFill(model: DensityAreaModel): { x: number[]; y: number[] } {
    const {mu, sigma, a, b} = model;
    const from = Math.max(a, mu - DENSITY_DRAW_SIGMAS * sigma);
    const to = Math.min(b, mu + DENSITY_DRAW_SIGMAS * sigma);
    if (!(a < b) || !(from < to)) return {x: [], y: []};
    const strips = normalStrips(from, to, DENSITY_FILL_STRIPS, mu, sigma);
    const last = strips[strips.length - 1];
    // Up the left edge, along the curve, down the right edge, back along the axis.
    return {
        x: [from, ...strips.map(s => s.x0), last.x1, last.x1, from],
        y: [0, ...strips.map(s => s.y0), last.y1, 0, 0],
    };
}

/** The view that fits the curve (left, top, right, bottom): mu +- 4 sigma, from just below the axis to just above the peak. */
export function fitDensityView(model: DensityAreaModel): [number, number, number, number] {
    const peak = normalPdf(model.mu, model.mu, model.sigma);
    return [model.mu - 4 * model.sigma, 1.25 * peak, model.mu + 4 * model.sigma, -0.2 * peak];
}
