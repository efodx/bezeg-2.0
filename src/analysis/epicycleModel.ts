import {FourierComplex} from './fourier';
import {
    ClosedLoop,
    EPICYCLE_MAX_N,
    LoopCoefficients,
    LoopParametrization,
    LoopPoint,
    LoopSpan,
    Parametrization,
    coefficientAt,
    epicycleChain,
    evaluateLoop,
    loopCoefficients,
    loopParametrization,
    traceSum,
} from './closedSpline';

/*
 * The rules of the epicycle model (Fourier series lesson F5; ADR 0034 section 4, ADR 0040): what is valid, how an accepted edit is
 * stored, and which rule a rejected value broke (an `EpicycleIssue`: data, never text). The graph and the Preset parser ask it.
 *
 * The model owns each vertex once. `validateLoop` compares only the first and the last end point, so a stored span list could hide a
 * broken interior joint; here span i always runs from vertex i to vertex (i + 1) mod m, and `epicycleLoop` builds the kernel's
 * `ClosedLoop` with the first end point equal to the last by construction.
 *
 * Nothing is clamped or rounded by the model: out-of-range input is rejected with its reason. Imports accept any finite value in
 * range (so kappa of the circle survives exactly); the graph snaps drags and keyboard steps with `snapEpicycleValue`.
 */

export {EPICYCLE_MAX_N};
export const EPICYCLE_MIN_VERTICES = 4;
export const EPICYCLE_MAX_VERTICES = 8;
export const EPICYCLE_COORDINATE_MIN = -3;
export const EPICYCLE_COORDINATE_MAX = 3;
export const EPICYCLE_VALUE_STEP = 0.05;
export const EPICYCLE_VALUE_BIG_STEP = 0.5;
export const EPICYCLE_DEFAULT_N = 5;
/** Number of samples of the drawn trace and of the sampled error: t_j = 2 pi j / 2000. */
export const EPICYCLE_TRACE_SAMPLES = 2000;

export const EPICYCLE_PARAMETRIZATIONS = ['equal', 'chord'] as const;
export const EPICYCLE_EXAMPLE_IDS = ['circle', 'diamond', 'uneven'] as const;
export type EpicycleExampleId = typeof EPICYCLE_EXAMPLE_IDS[number];

export type EpicycleSpan =
    | {readonly kind: 'line'}
    | {readonly kind: 'cubic'; readonly c1: LoopPoint; readonly c2: LoopPoint};

export interface EpicycleModel {
    readonly vertices: readonly LoopPoint[];
    /** Span i runs from vertex i to vertex (i + 1) mod m; same length as `vertices`. */
    readonly spans: readonly EpicycleSpan[];
    readonly N: number;
    readonly parametrization: Parametrization;
}

/** The rule a rejected value broke. Callers localize it; the range and the choices travel with it. */
export type EpicycleIssue =
    | {readonly kind: 'vertex-count'; readonly min: number; readonly max: number}
    | {readonly kind: 'spans-count'; readonly expected: number}
    | {readonly kind: 'span-kind'}
    | {readonly kind: 'coordinate'; readonly min: number; readonly max: number}
    | {readonly kind: 'n'; readonly min: number; readonly max: number}
    | {readonly kind: 'parametrization'; readonly allowed: readonly Parametrization[]}
    | {readonly kind: 'example'; readonly allowed: readonly EpicycleExampleId[]}
    | {readonly kind: 'index'}
    | {readonly kind: 'no-control'};

export type EpicycleCheck =
    | {readonly ok: true; readonly model: EpicycleModel}
    | {readonly ok: false; readonly issue: EpicycleIssue | undefined};

export type EpicycleEdit =
    | {readonly ok: true; readonly model: EpicycleModel}
    | {readonly ok: false; readonly issue: EpicycleIssue};

const KAPPA = (4 / 3) * (Math.SQRT2 - 1);

const pt = (x: number, y: number): LoopPoint => ({x, y});
const cubic = (c1x: number, c1y: number, c2x: number, c2y: number): EpicycleSpan => ({kind: 'cubic', c1: pt(c1x, c1y), c2: pt(c2x, c2y)});

const CIRCLE_VERTICES: readonly LoopPoint[] = [pt(1, 0), pt(0, 1), pt(-1, 0), pt(0, -1)];

function circleModel(): EpicycleModel {
    // Tangent at a is (-a.y, a.x); the second handle of a span points back along the tangent at its end vertex.
    const spans = CIRCLE_VERTICES.map((a, i): EpicycleSpan => {
        const b = CIRCLE_VERTICES[(i + 1) % 4];
        return cubic(a.x - KAPPA * a.y, a.y + KAPPA * a.x, b.x + KAPPA * b.y, b.y - KAPPA * b.x);
    });
    return {vertices: CIRCLE_VERTICES.map((p) => ({...p})), spans, N: EPICYCLE_DEFAULT_N, parametrization: 'equal'};
}

function diamondModel(): EpicycleModel {
    return {
        vertices: CIRCLE_VERTICES.map((p) => ({...p})),
        spans: CIRCLE_VERTICES.map((): EpicycleSpan => ({kind: 'line'})),
        N: EPICYCLE_DEFAULT_N,
        parametrization: 'equal',
    };
}

/** Six cubic spans on the 0,05 grid; the longest chord (2,55) is 3,6 times the shortest (0,71), so `chord` differs visibly from `equal`. */
function unevenModel(): EpicycleModel {
    return {
        vertices: [pt(-2, -1), pt(-1.5, -0.5), pt(-1, 1.5), pt(1, 2), pt(2, 0), pt(0.5, -1.5)],
        spans: [
            cubic(-2.15, -0.65, -1.95, -0.45),
            cubic(-1.25, 0.45, -1.05, 1.15),
            cubic(-0.15, 1.95, 0.55, 2.15),
            cubic(1.65, 1.15, 1.95, 0.45),
            cubic(1.4, -0.9, 0.9, -1.4),
            cubic(-0.65, -1.55, -1.45, -1.35),
        ],
        N: EPICYCLE_DEFAULT_N,
        parametrization: 'equal',
    };
}

const EXAMPLE_BUILDERS: Readonly<Record<EpicycleExampleId, () => EpicycleModel>> = {
    circle: circleModel,
    diamond: diamondModel,
    uneven: unevenModel,
};

export const DEFAULT_EPICYCLE_EXAMPLE: EpicycleExampleId = 'circle';

export const isEpicycleExampleId = (value: unknown): value is EpicycleExampleId =>
    typeof value === 'string' && (EPICYCLE_EXAMPLE_IDS as readonly string[]).includes(value);

/** A fresh model of an example, with the default N and the `equal` parametrization. */
export function epicycleExample(id: EpicycleExampleId): EpicycleModel {
    return EXAMPLE_BUILDERS[id]();
}

export const defaultEpicycleModel = (): EpicycleModel => epicycleExample(DEFAULT_EPICYCLE_EXAMPLE);

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const inRange = (value: unknown): value is number => isFiniteNumber(value) && value >= EPICYCLE_COORDINATE_MIN && value <= EPICYCLE_COORDINATE_MAX;
const isPoint = (value: unknown): value is LoopPoint =>
    value !== null && typeof value === 'object' && !Array.isArray(value) && isFiniteNumber((value as LoopPoint).x) && isFiniteNumber((value as LoopPoint).y);
const isParametrization = (value: unknown): value is Parametrization =>
    typeof value === 'string' && (EPICYCLE_PARAMETRIZATIONS as readonly string[]).includes(value);
const isN = (value: unknown): value is number => isFiniteNumber(value) && Number.isInteger(value) && value >= 0 && value <= EPICYCLE_MAX_N;

const coordinateIssue = (): EpicycleIssue => ({kind: 'coordinate', min: EPICYCLE_COORDINATE_MIN, max: EPICYCLE_COORDINATE_MAX});
const nIssue = (): EpicycleIssue => ({kind: 'n', min: 0, max: EPICYCLE_MAX_N});
const parametrizationIssue = (): EpicycleIssue => ({kind: 'parametrization', allowed: EPICYCLE_PARAMETRIZATIONS});
const vertexCountIssue = (): EpicycleIssue => ({kind: 'vertex-count', min: EPICYCLE_MIN_VERTICES, max: EPICYCLE_MAX_VERTICES});

/** Every point of the model: vertices, then the controls of the cubic spans. */
function allPoints(model: Pick<EpicycleModel, 'vertices' | 'spans'>): LoopPoint[] {
    const points = [...model.vertices];
    for (const span of model.spans) {
        if (span.kind === 'cubic') points.push(span.c1, span.c2);
    }
    return points;
}

/**
 * The single validity rule of a stored model. Rules are checked in the order vertices (count, finiteness, range), spans (count,
 * kind, controls), N, parametrization. A missing or wrongly typed field gives `issue: undefined` (the generic message) except where
 * the value names a closed list or a range (N, parametrization, coordinates, counts). Nothing is clamped or rounded; unknown
 * properties are dropped.
 */
export function checkEpicycleModel(data: unknown): EpicycleCheck {
    const reject = (issue: EpicycleIssue | undefined): EpicycleCheck => ({ok: false, issue});
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return reject(undefined);
    const {vertices, spans, N, parametrization} = data as Record<string, unknown>;
    if (!Array.isArray(vertices)) return reject(undefined);
    if (vertices.length < EPICYCLE_MIN_VERTICES || vertices.length > EPICYCLE_MAX_VERTICES) return reject(vertexCountIssue());
    if (!vertices.every(isPoint)) return reject(undefined);
    if (!vertices.every((p: LoopPoint) => inRange(p.x) && inRange(p.y))) return reject(coordinateIssue());
    if (!Array.isArray(spans)) return reject(undefined);
    if (spans.length !== vertices.length) return reject({kind: 'spans-count', expected: vertices.length});
    const cleanSpans: EpicycleSpan[] = [];
    for (const span of spans) {
        if (span === null || typeof span !== 'object' || Array.isArray(span)) return reject({kind: 'span-kind'});
        const {kind, c1, c2} = span as Record<string, unknown>;
        if (kind === 'line') {
            cleanSpans.push({kind: 'line'});
        } else if (kind === 'cubic') {
            if (!isPoint(c1) || !isPoint(c2)) return reject(undefined);
            if (!inRange(c1.x) || !inRange(c1.y) || !inRange(c2.x) || !inRange(c2.y)) return reject(coordinateIssue());
            cleanSpans.push({kind: 'cubic', c1: pt(c1.x, c1.y), c2: pt(c2.x, c2.y)});
        } else {
            return reject({kind: 'span-kind'});
        }
    }
    if (isFiniteNumber(N) && !isN(N)) return reject(nIssue());
    if (!isN(N)) return reject(undefined);
    if (!isParametrization(parametrization)) return reject(parametrizationIssue());
    return {
        ok: true,
        model: {vertices: vertices.map((p: LoopPoint) => pt(p.x, p.y)), spans: cleanSpans, N, parametrization},
    };
}

/** Returns a sanitized model or undefined unless the data is a valid model. */
export function parseEpicycleModel(data: unknown): EpicycleModel | undefined {
    const check = checkEpicycleModel(data);
    return check.ok ? check.model : undefined;
}

// ---- Examples ---------------------------------------------------------------------------------------------------------------

/** The example whose loop (vertices and spans) the model still has, whatever N and the parametrization; undefined after an edit. */
export function matchEpicycleExample(model: EpicycleModel): EpicycleExampleId | undefined {
    const same = (a: LoopPoint, b: LoopPoint) => a.x === b.x && a.y === b.y;
    return EPICYCLE_EXAMPLE_IDS.find((id) => {
        const e = epicycleExample(id);
        return e.vertices.length === model.vertices.length
            && e.vertices.every((v, i) => same(v, model.vertices[i]))
            && e.spans.every((s, i) => {
                const o = model.spans[i];
                if (s.kind === 'line' || o.kind === 'line') return s.kind === o.kind;
                return same(s.c1, o.c1) && same(s.c2, o.c2);
            });
    });
}

/** Choosing an example resets the loop and keeps N and the parametrization. */
export function chooseEpicycleExample(model: EpicycleModel, id: unknown): EpicycleEdit {
    if (!isEpicycleExampleId(id)) return {ok: false, issue: {kind: 'example', allowed: EPICYCLE_EXAMPLE_IDS}};
    return {ok: true, model: {...epicycleExample(id), N: model.N, parametrization: model.parametrization}};
}

// ---- Edits ------------------------------------------------------------------------------------------------------------------

export function setEpicycleN(model: EpicycleModel, value: unknown): EpicycleEdit {
    if (!isN(value)) return {ok: false, issue: nIssue()};
    return {ok: true, model: value === model.N ? model : {...model, N: value}};
}

export function setEpicycleParametrization(model: EpicycleModel, value: unknown): EpicycleEdit {
    if (!isParametrization(value)) return {ok: false, issue: parametrizationIssue()};
    return {ok: true, model: value === model.parametrization ? model : {...model, parametrization: value}};
}

function finishEdit(model: EpicycleModel, vertices: readonly LoopPoint[], spans: readonly EpicycleSpan[]): EpicycleEdit {
    const next = {...model, vertices, spans};
    if (!allPoints(next).every((p) => inRange(p.x) && inRange(p.y))) return {ok: false, issue: coordinateIssue()};
    return {ok: true, model: next};
}

const isIndex = (value: unknown, count: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < count;

/**
 * Moves vertex `index` to (x, y). Its two adjacent cubic controls (the first control of the span leaving it and the second control
 * of the span arriving at it) move by the same delta; if that puts any point out of range, the whole edit is rejected.
 */
export function moveEpicycleVertex(model: EpicycleModel, index: unknown, x: unknown, y: unknown): EpicycleEdit {
    const m = model.vertices.length;
    if (!isIndex(index, m)) return {ok: false, issue: {kind: 'index'}};
    if (!inRange(x) || !inRange(y)) return {ok: false, issue: coordinateIssue()};
    const dx = x - model.vertices[index].x;
    const dy = y - model.vertices[index].y;
    const previous = (index + m - 1) % m;
    const vertices = model.vertices.map((v, i) => (i === index ? pt(x, y) : v));
    const spans = model.spans.map((span, i): EpicycleSpan => {
        if (span.kind !== 'cubic') return span;
        if (i === index) return {kind: 'cubic', c1: pt(span.c1.x + dx, span.c1.y + dy), c2: span.c2};
        if (i === previous) return {kind: 'cubic', c1: span.c1, c2: pt(span.c2.x + dx, span.c2.y + dy)};
        return span;
    });
    return finishEdit(model, vertices, spans);
}

/** Moves one control (1 or 2 of span `index`) only; corners are allowed. */
export function moveEpicycleControl(model: EpicycleModel, index: unknown, which: unknown, x: unknown, y: unknown): EpicycleEdit {
    if (!isIndex(index, model.spans.length) || (which !== 1 && which !== 2)) return {ok: false, issue: {kind: 'index'}};
    const span = model.spans[index];
    if (span.kind !== 'cubic') return {ok: false, issue: {kind: 'no-control'}};
    if (!inRange(x) || !inRange(y)) return {ok: false, issue: coordinateIssue()};
    const moved: EpicycleSpan = which === 1 ? {kind: 'cubic', c1: pt(x, y), c2: span.c2} : {kind: 'cubic', c1: span.c1, c2: pt(x, y)};
    return finishEdit(model, model.vertices, model.spans.map((s, i) => (i === index ? moved : s)));
}

/** The grid value nearest to a dragged position (step 0,05, or 0,5 with `big`), within [-3, 3]. */
export function snapEpicycleValue(value: number, big = false): number {
    const step = big ? EPICYCLE_VALUE_BIG_STEP : EPICYCLE_VALUE_STEP;
    const snapped = Math.round(value / step) * step;
    return Math.round(Math.min(EPICYCLE_COORDINATE_MAX, Math.max(EPICYCLE_COORDINATE_MIN, snapped)) * 1e9) / 1e9 + 0;
}

// ---- Mathematics ------------------------------------------------------------------------------------------------------------

/** The kernel's loop: span i from vertex i to vertex (i + 1) mod m, so the first end point equals the last by construction. */
export function epicycleLoop(model: EpicycleModel): ClosedLoop {
    const m = model.vertices.length;
    const spans: LoopSpan[] = model.spans.map((span, i) => {
        const a = model.vertices[i];
        const b = model.vertices[(i + 1) % m];
        return span.kind === 'line' ? [a, b] : [a, span.c1, span.c2, b];
    });
    return {spans};
}

/** What depends on the loop and the parametrization only: coefficients up to `EPICYCLE_MAX_N`, so an N change needs no quadrature. */
export interface EpicycleAnalysis {
    readonly loop: ClosedLoop;
    readonly parametrization: LoopParametrization;
    readonly coefficients: LoopCoefficients;
    /** `chord` was requested but a chord was zero, so `equal` was used. */
    readonly fellBack: boolean;
}

export function analyzeEpicycle(model: EpicycleModel): EpicycleAnalysis {
    const loop = epicycleLoop(model);
    const parametrization = loopParametrization(loop, model.parametrization);
    const {fellBack, ...coefficients} = loopCoefficients(loop, EPICYCLE_MAX_N, model.parametrization);
    return {loop, parametrization, coefficients, fellBack};
}

/** The partial sum S_N at the trace samples t_j = 2 pi j / 2000. */
export function epicycleTrace(analysis: EpicycleAnalysis, N: number): FourierComplex[] {
    return traceSum(analysis.coefficients, N, EPICYCLE_TRACE_SAMPLES);
}

/** The original loop z at the trace samples. */
export function epicycleLoopSamples(analysis: EpicycleAnalysis): FourierComplex[] {
    return Array.from({length: EPICYCLE_TRACE_SAMPLES}, (_, j) =>
        evaluateLoop(analysis.loop, analysis.parametrization.spanEnds, (2 * Math.PI * j) / EPICYCLE_TRACE_SAMPLES));
}

/** max_j |z(t_j) - S_N(t_j)| over the same 2000 samples as the trace. */
export function maxTraceError(analysis: EpicycleAnalysis, N: number, loopSamples = epicycleLoopSamples(analysis), trace = epicycleTrace(analysis, N)): number {
    let worst = 0;
    for (let j = 0; j < trace.length; j++) {
        worst = Math.max(worst, Math.hypot(loopSamples[j].re - trace[j].re, loopSamples[j].im - trace[j].im));
    }
    return worst;
}

export interface EpicycleTerm {
    readonly k: number;
    readonly modulus: number;
}

/** The terms |k| <= N in chain order (k = 0 excluded) with |c_k|, and the centre |c_0|. */
export function epicycleTerms(analysis: EpicycleAnalysis, N: number): {centre: number; terms: EpicycleTerm[]} {
    const chain = epicycleChain(analysis.coefficients, N, 0);
    const mod = (k: number) => {
        const c = coefficientAt(analysis.coefficients, k);
        return Math.hypot(c.re, c.im);
    };
    return {centre: mod(0), terms: chain.order.map((k) => ({k, modulus: mod(k)}))};
}
