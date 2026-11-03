import {FOURIER_EXAMPLE_IDS, FourierExampleId, isFourierExampleId} from './fourierExamples';
import {meanSquare, parsevalSum, PiecewiseLinearShape, realCoefficients, RealCoefficients} from './fourier';

/*
 * This module owns the rules of the Fourier coefficients model (lessons F2 and F4): what is valid, how an accepted value is
 * stored, and which rule a rejected value broke (a `FourierCoefficientsIssue`: data, never text). The Preset parser and the graph's
 * setters ask it; they only choose the words (`graphs/functions/fourierCoefficientsMessages`). It also holds the mathematics the
 * graph draws, on top of the kernel of `fourier`: the piecewise-linear shape the handles make (ADR 0034 section 2), its
 * coefficients (closed-form integration that splits at every breakpoint), the mean square, the Parseval sum and the signed product
 * f(x) * (cos kx or sin kx) as shaded polygons.
 *
 * One model serves both views, so a stored Preset does not change when the decay view is drawn (F4): the projection fields
 * (layout, handle values, K, selected coefficient, overlay) and the decay fields (three example selections, n, scale) are all
 * validated, whichever view is shown.
 */

const PI = Math.PI;

export const FOURIER_COEFFICIENTS_VIEWS = ['projection', 'decay'] as const;
export type FourierCoefficientsView = typeof FOURIER_COEFFICIENTS_VIEWS[number];
export const FOURIER_COEFFICIENTS_LAYOUTS = ['abs', 'jump', 'free'] as const;
export type FourierCoefficientsLayout = typeof FOURIER_COEFFICIENTS_LAYOUTS[number];
export const FOURIER_COEFFICIENT_TERMS = ['a', 'b'] as const;
export type FourierCoefficientTerm = typeof FOURIER_COEFFICIENT_TERMS[number];
export const FOURIER_DECAY_SCALES = ['linear', 'log'] as const;
export type FourierDecayScale = typeof FOURIER_DECAY_SCALES[number];

/** A handle value is a finite number in [-4, 4]. Drags and keyboard steps use the grid 0.05 (Shift 0.5); an import accepts any value in range, so exact pi survives. */
export const FOURIER_VALUE_MIN = -4;
export const FOURIER_VALUE_MAX = 4;
export const FOURIER_VALUE_STEP = 0.05;
export const FOURIER_VALUE_BIG_STEP = 0.5;
/** K, the highest harmonic of the spectrum and the partial sum. */
export const FOURIER_K_MIN = 1;
export const FOURIER_K_MAX = 32;
/** n of the decay view. */
export const FOURIER_DECAY_N_MIN = 1;
export const FOURIER_DECAY_N_MAX = 101;
export const FOURIER_DECAY_SELECTION_COUNT = 3;

/** One draggable value of a layout: where it sits and which side of the breakpoint it describes. `value` is a breakpoint without a jump. */
export interface FourierSlot {
    readonly index: number;
    readonly breakpoint: number;
    readonly x: number;
    readonly side: 'value' | 'left' | 'right';
}

interface LayoutSpec {
    readonly breakpoints: readonly number[];
    /** Whether the interior breakpoint i (1 .. n-2) is a jump. */
    readonly jumpAt: readonly boolean[];
    readonly seamJump: boolean;
    readonly defaults: readonly number[];
}

const LAYOUTS: Readonly<Record<FourierCoefficientsLayout, LayoutSpec>> = {
    abs: {breakpoints: [-PI, 0, PI], jumpAt: [false, false, false], seamJump: false, defaults: [PI, 0]},
    jump: {breakpoints: [-PI, 1, PI], jumpAt: [false, true, false], seamJump: true, defaults: [-1, -1, 1, 1]},
    free: {breakpoints: [-PI, -PI / 2, 0, PI / 2, PI], jumpAt: [false, false, false, false, false], seamJump: true, defaults: [0, 0, 0, 0, 0]},
};

export const isFourierLayout = (value: unknown): value is FourierCoefficientsLayout =>
    typeof value === 'string' && (FOURIER_COEFFICIENTS_LAYOUTS as readonly string[]).includes(value);

/** The breakpoints of a layout, from -pi to pi. */
export const fourierLayoutBreakpoints = (layout: FourierCoefficientsLayout): readonly number[] => LAYOUTS[layout].breakpoints;

/** The values of a layout in slot order, left to right; a jump gives its left value before its right value. */
export function fourierSlots(layout: FourierCoefficientsLayout): readonly FourierSlot[] {
    const spec = LAYOUTS[layout];
    const last = spec.breakpoints.length - 1;
    const slots: FourierSlot[] = [];
    const add = (breakpoint: number, side: FourierSlot['side']) =>
        slots.push({index: slots.length, breakpoint, x: spec.breakpoints[breakpoint], side});
    add(0, spec.seamJump ? 'right' : 'value');
    for (let i = 1; i < last; i++) {
        if (spec.jumpAt[i]) {
            add(i, 'left');
            add(i, 'right');
        } else {
            add(i, 'value');
        }
    }
    if (spec.seamJump) add(last, 'left');
    return slots;
}

export const fourierDefaultValues = (layout: FourierCoefficientsLayout): readonly number[] => LAYOUTS[layout].defaults;

/** The stored description: everything else (the shape, the coefficients, the sums) is recomputed. */
export interface FourierCoefficientsModel {
    readonly view: FourierCoefficientsView;
    readonly layout: FourierCoefficientsLayout;
    /** One value per slot of the layout. */
    readonly values: readonly number[];
    readonly K: number;
    readonly selected: { readonly term: FourierCoefficientTerm; readonly k: number };
    readonly overlay: boolean;
    readonly selections: readonly FourierExampleId[];
    readonly n: number;
    readonly scale: FourierDecayScale;
}

export const DEFAULT_FOURIER_COEFFICIENTS_MODEL: FourierCoefficientsModel = {
    view: 'projection',
    layout: 'abs',
    values: LAYOUTS.abs.defaults,
    K: 16,
    selected: {term: 'a', k: 1},
    overlay: true,
    selections: ['square', 'abs', 'smooth'],
    n: 11,
    scale: 'linear',
};

/** The rule a rejected value broke. Callers localize it; the range and the choices travel with it. */
export type FourierCoefficientsIssue =
    | { readonly kind: 'view'; readonly allowed: readonly FourierCoefficientsView[] }
    | { readonly kind: 'layout'; readonly allowed: readonly FourierCoefficientsLayout[] }
    | { readonly kind: 'values-count'; readonly expected: number }
    | { readonly kind: 'value'; readonly min: number; readonly max: number }
    | { readonly kind: 'handle'; readonly count: number }
    | { readonly kind: 'k'; readonly min: number; readonly max: number }
    | { readonly kind: 'term'; readonly allowed: readonly FourierCoefficientTerm[] }
    | { readonly kind: 'harmonic'; readonly min: number; readonly max: number }
    | { readonly kind: 'no-b0' }
    | { readonly kind: 'k-below-selected'; readonly selected: number }
    | { readonly kind: 'overlay' }
    | { readonly kind: 'selections'; readonly allowed: readonly FourierExampleId[]; readonly count: number }
    | { readonly kind: 'selections-distinct' }
    | { readonly kind: 'n'; readonly min: number; readonly max: number }
    | { readonly kind: 'scale'; readonly allowed: readonly FourierDecayScale[] };

export type FourierCoefficientsCheck =
    | { readonly ok: true; readonly model: FourierCoefficientsModel }
    | { readonly ok: false; readonly issue: FourierCoefficientsIssue | undefined };

export type FourierCoefficientsEdit =
    | { readonly ok: true; readonly model: FourierCoefficientsModel }
    | { readonly ok: false; readonly issue: FourierCoefficientsIssue };

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isInt = (value: unknown, min: number, max: number): value is number => isFiniteNumber(value) && Number.isInteger(value) && value >= min && value <= max;
const valueIssue = (): FourierCoefficientsIssue => ({kind: 'value', min: FOURIER_VALUE_MIN, max: FOURIER_VALUE_MAX});
const kIssue = (): FourierCoefficientsIssue => ({kind: 'k', min: FOURIER_K_MIN, max: FOURIER_K_MAX});
const nIssue = (): FourierCoefficientsIssue => ({kind: 'n', min: FOURIER_DECAY_N_MIN, max: FOURIER_DECAY_N_MAX});
const selectionsIssue = (): FourierCoefficientsIssue => ({kind: 'selections', allowed: FOURIER_EXAMPLE_IDS, count: FOURIER_DECAY_SELECTION_COUNT});
const isValue = (value: unknown): value is number => isFiniteNumber(value) && value >= FOURIER_VALUE_MIN && value <= FOURIER_VALUE_MAX;
const isView = (value: unknown): value is FourierCoefficientsView => typeof value === 'string' && (FOURIER_COEFFICIENTS_VIEWS as readonly string[]).includes(value);
const isTerm = (value: unknown): value is FourierCoefficientTerm => typeof value === 'string' && (FOURIER_COEFFICIENT_TERMS as readonly string[]).includes(value);
const isScale = (value: unknown): value is FourierDecayScale => typeof value === 'string' && (FOURIER_DECAY_SCALES as readonly string[]).includes(value);

/** The issue of a selected harmonic (term, k) for the order K, or undefined when it is allowed: 0 <= k <= K, and b_0 does not exist. */
function selectedIssue(term: FourierCoefficientTerm, k: number, K: number): FourierCoefficientsIssue | undefined {
    if (!isInt(k, 0, K)) return {kind: 'harmonic', min: 0, max: K};
    if (term === 'b' && k === 0) return {kind: 'no-b0'};
    return undefined;
}

/** Distinct ids from the closed example list, exactly three of them. */
function selectionsIssueOf(value: unknown): FourierCoefficientsIssue | undefined {
    if (!Array.isArray(value) || value.length !== FOURIER_DECAY_SELECTION_COUNT || !value.every(isFourierExampleId)) return selectionsIssue();
    return new Set(value).size === value.length ? undefined : {kind: 'selections-distinct'};
}

/**
 * The single validity rule of a stored model. Rules are checked in the order view, layout, values, K, selected, overlay,
 * selections, n, scale; a field of the wrong type or a missing field gives `issue: undefined` (the generic message), except where
 * the wrong value names a closed list (view, layout, term, scale, selections). Nothing is clamped or rounded; unknown properties
 * are dropped.
 */
export function checkFourierCoefficientsModel(data: unknown): FourierCoefficientsCheck {
    const reject = (issue: FourierCoefficientsIssue | undefined): FourierCoefficientsCheck => ({ok: false, issue});
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return reject(undefined);
    const {view, layout, values, K, selected, overlay, selections, n, scale} = data as Record<string, unknown>;
    if (!isView(view)) return reject({kind: 'view', allowed: FOURIER_COEFFICIENTS_VIEWS});
    if (!isFourierLayout(layout)) return reject({kind: 'layout', allowed: FOURIER_COEFFICIENTS_LAYOUTS});
    if (!Array.isArray(values)) return reject(undefined);
    const expected = fourierSlots(layout).length;
    if (values.length !== expected) return reject({kind: 'values-count', expected});
    if (values.some(value => !isFiniteNumber(value))) return reject(undefined);
    if (!values.every(isValue)) return reject(valueIssue());
    if (isFiniteNumber(K) && !isInt(K, FOURIER_K_MIN, FOURIER_K_MAX)) return reject(kIssue());
    if (!isInt(K, FOURIER_K_MIN, FOURIER_K_MAX)) return reject(undefined);
    if (selected === null || typeof selected !== 'object' || Array.isArray(selected)) return reject(undefined);
    const {term, k} = selected as Record<string, unknown>;
    if (!isTerm(term)) return reject({kind: 'term', allowed: FOURIER_COEFFICIENT_TERMS});
    if (!isFiniteNumber(k)) return reject(undefined);
    const selectedProblem = selectedIssue(term, k, K);
    if (selectedProblem) return reject(selectedProblem);
    if (typeof overlay !== 'boolean') return reject({kind: 'overlay'});
    const selectionsProblem = selectionsIssueOf(selections);
    if (selectionsProblem) return reject(selectionsProblem);
    if (isFiniteNumber(n) && !isInt(n, FOURIER_DECAY_N_MIN, FOURIER_DECAY_N_MAX)) return reject(nIssue());
    if (!isInt(n, FOURIER_DECAY_N_MIN, FOURIER_DECAY_N_MAX)) return reject(undefined);
    if (!isScale(scale)) return reject({kind: 'scale', allowed: FOURIER_DECAY_SCALES});
    return {
        ok: true,
        model: {view, layout, values: [...values], K, selected: {term, k}, overlay, selections: [...(selections as FourierExampleId[])], n, scale},
    };
}

/** Returns a sanitized model (unknown properties dropped) or undefined unless the data is a valid model. */
export function parseFourierCoefficientsModel(data: unknown): FourierCoefficientsModel | undefined {
    const check = checkFourierCoefficientsModel(data);
    return check.ok ? check.model : undefined;
}

const accept = (model: FourierCoefficientsModel, next: FourierCoefficientsModel): FourierCoefficientsEdit => ({ok: true, model: next === model ? model : next});

export function chooseFourierView(model: FourierCoefficientsModel, view: unknown): FourierCoefficientsEdit {
    if (!isView(view)) return {ok: false, issue: {kind: 'view', allowed: FOURIER_COEFFICIENTS_VIEWS}};
    return accept(model, view === model.view ? model : {...model, view});
}

/** Choosing a layout replaces the handle values by that layout's defaults (the values of one layout mean nothing in another). The same layout returns the same model. */
export function chooseFourierLayout(model: FourierCoefficientsModel, layout: unknown): FourierCoefficientsEdit {
    if (!isFourierLayout(layout)) return {ok: false, issue: {kind: 'layout', allowed: FOURIER_COEFFICIENTS_LAYOUTS}};
    return accept(model, layout === model.layout ? model : {...model, layout, values: [...LAYOUTS[layout].defaults]});
}

/** One handle value, by slot index; any finite value in [-4, 4] (the drag snaps to the grid before it calls this). */
export function setFourierValue(model: FourierCoefficientsModel, index: unknown, value: unknown): FourierCoefficientsEdit {
    const count = model.values.length;
    if (!isInt(index, 0, count - 1)) return {ok: false, issue: {kind: 'handle', count}};
    if (!isValue(value)) return {ok: false, issue: valueIssue()};
    if (value === model.values[index]) return accept(model, model);
    return accept(model, {...model, values: model.values.map((old, i) => i === index ? value : old)});
}

/** K in 1..32, never rounded; K may not drop below the selected harmonic (choose a lower harmonic first). */
export function changeFourierK(model: FourierCoefficientsModel, value: unknown): FourierCoefficientsEdit {
    if (!isInt(value, FOURIER_K_MIN, FOURIER_K_MAX)) return {ok: false, issue: kIssue()};
    if (value < model.selected.k) return {ok: false, issue: {kind: 'k-below-selected', selected: model.selected.k}};
    return accept(model, value === model.K ? model : {...model, K: value});
}

/** The selected coefficient: a_k or b_k with 0 <= k <= K; b_0 does not exist. */
export function selectFourierCoefficient(model: FourierCoefficientsModel, term: unknown, k: unknown): FourierCoefficientsEdit {
    if (!isTerm(term)) return {ok: false, issue: {kind: 'term', allowed: FOURIER_COEFFICIENT_TERMS}};
    if (!isFiniteNumber(k)) return {ok: false, issue: {kind: 'harmonic', min: 0, max: model.K}};
    const issue = selectedIssue(term, k, model.K);
    if (issue) return {ok: false, issue};
    return accept(model, term === model.selected.term && k === model.selected.k ? model : {...model, selected: {term, k}});
}

export function setFourierOverlay(model: FourierCoefficientsModel, overlay: unknown): FourierCoefficientsEdit {
    if (typeof overlay !== 'boolean') return {ok: false, issue: {kind: 'overlay'}};
    return accept(model, overlay === model.overlay ? model : {...model, overlay});
}

/** The decay view's three examples, distinct and from the closed list. */
export function chooseFourierSelections(model: FourierCoefficientsModel, selections: unknown): FourierCoefficientsEdit {
    const issue = selectionsIssueOf(selections);
    if (issue) return {ok: false, issue};
    return accept(model, {...model, selections: [...(selections as FourierExampleId[])]});
}

export function changeFourierDecayN(model: FourierCoefficientsModel, value: unknown): FourierCoefficientsEdit {
    if (!isInt(value, FOURIER_DECAY_N_MIN, FOURIER_DECAY_N_MAX)) return {ok: false, issue: nIssue()};
    return accept(model, value === model.n ? model : {...model, n: value});
}

export function chooseFourierScale(model: FourierCoefficientsModel, scale: unknown): FourierCoefficientsEdit {
    if (!isScale(scale)) return {ok: false, issue: {kind: 'scale', allowed: FOURIER_DECAY_SCALES}};
    return accept(model, scale === model.scale ? model : {...model, scale});
}

// ---- Mathematics ------------------------------------------------------------------------------------------------------

/** The grid value nearest to a dragged position, within [-4, 4]. */
export function snapFourierValue(value: number): number {
    const snapped = Math.round(value / FOURIER_VALUE_STEP) * FOURIER_VALUE_STEP;
    return Math.round(Math.min(FOURIER_VALUE_MAX, Math.max(FOURIER_VALUE_MIN, snapped)) * 1e9) / 1e9 + 0;
}

/** The piecewise-linear shape the handles make: breakpoints from -pi to pi, one-sided values at each. A seam without a jump shares one value. */
export function fourierShape(layout: FourierCoefficientsLayout, values: readonly number[]): PiecewiseLinearShape {
    const spec = LAYOUTS[layout];
    const slots = fourierSlots(layout);
    const count = spec.breakpoints.length;
    const left: number[] = new Array(count).fill(0);
    const right: number[] = new Array(count).fill(0);
    for (const slot of slots) {
        const value = values[slot.index];
        if (slot.side !== 'right') left[slot.breakpoint] = value;
        if (slot.side !== 'left') right[slot.breakpoint] = value;
    }
    if (!spec.seamJump) {
        // one shared seam value
        left[0] = right[0];
        right[count - 1] = right[0];
        left[count - 1] = right[0];
    } else {
        // the seam is one point of the periodic function: the value after -pi is the first, the value before pi the last
        left[0] = left[count - 1];
        right[count - 1] = right[0];
    }
    return {kind: 'piecewise-linear', breakpoints: spec.breakpoints, left, right};
}

/** The seam value shown at +-pi: the Dirichlet midpoint of the one-sided limits (equal to the shared value without a jump). */
export function fourierSeamMidpoint(shape: PiecewiseLinearShape): number {
    const last = shape.breakpoints.length - 1;
    return (shape.right[0] + shape.left[last]) / 2;
}

/** A linear piece of f from (x0, y0) to (x1, y1). */
export interface FourierShapePiece {
    readonly x0: number;
    readonly y0: number;
    readonly x1: number;
    readonly y1: number;
}

export function fourierShapePieces(shape: PiecewiseLinearShape): FourierShapePiece[] {
    const pieces: FourierShapePiece[] = [];
    for (let i = 0; i + 1 < shape.breakpoints.length; i++) {
        pieces.push({x0: shape.breakpoints[i], y0: shape.right[i], x1: shape.breakpoints[i + 1], y1: shape.left[i + 1]});
    }
    return pieces;
}

/** f(x) for x in (-pi, pi); at a jump the midpoint, at the seam the seam midpoint. */
export function fourierShapeValue(shape: PiecewiseLinearShape, x: number): number {
    const last = shape.breakpoints.length - 1;
    if (x <= shape.breakpoints[0] || x >= shape.breakpoints[last]) return fourierSeamMidpoint(shape);
    for (let i = 0; i < last; i++) {
        const p = shape.breakpoints[i];
        const q = shape.breakpoints[i + 1];
        if (x === q && i + 1 < last) return (shape.left[i + 1] + shape.right[i + 1]) / 2;
        if (x >= p && x <= q) return shape.right[i] + ((shape.left[i + 1] - shape.right[i]) * (x - p)) / (q - p);
    }
    return fourierSeamMidpoint(shape);
}

/** Everything the projection view shows, derived from one model. */
export interface FourierProjection {
    readonly shape: PiecewiseLinearShape;
    readonly coefficients: RealCoefficients;
    /** The selected coefficient a_k or b_k. */
    readonly selectedValue: number;
    /** (1/pi) int f^2 over [-pi, pi], exact for the shape. */
    /** (1/pi) int f^2 over [-pi, pi], the left side of Parseval's identity (twice the mean of f^2, so not called the mean square). */
    readonly squareIntegral: number;
    /** a_0^2/2 + sum_{k <= K} (a_k^2 + b_k^2). */
    readonly parseval: number;
    readonly seamMidpoint: number;
}

export function fourierProjection(model: FourierCoefficientsModel): FourierProjection {
    const shape = fourierShape(model.layout, model.values);
    const coefficients = realCoefficients(shape, model.K);
    const {term, k} = model.selected;
    return {
        shape,
        coefficients,
        selectedValue: term === 'a' ? coefficients.a[k] : coefficients.b[k],
        squareIntegral: meanSquare(shape),
        parseval: parsevalSum(coefficients, model.K),
        seamMidpoint: fourierSeamMidpoint(shape),
    };
}

/** The partial sum S_K at x. */
export function fourierPartialSumAt(coefficients: RealCoefficients, K: number, x: number): number {
    let s = coefficients.a[0] / 2;
    for (let k = 1; k <= K; k++) s += coefficients.a[k] * Math.cos(k * x) + coefficients.b[k] * Math.sin(k * x);
    return s;
}

/** The sample points of S_K over [-pi, pi]: at least 16 per period of the highest harmonic. */
export function fourierPartialSumSamples(coefficients: RealCoefficients, K: number): { x: number[]; y: number[] } {
    const count = Math.max(200, 16 * K + 1);
    const x: number[] = [];
    const y: number[] = [];
    for (let i = 0; i <= count; i++) {
        const xi = -PI + (2 * PI * i) / count;
        x.push(xi);
        y.push(fourierPartialSumAt(coefficients, K, xi));
    }
    return {x, y};
}

export interface FourierProductPolygons {
    /** The product f * harmonic as a polyline (it breaks at jumps by repeating the abscissa). */
    readonly line: { x: number[]; y: number[] };
    /** Closed polygon of max(product, 0) over the axis: it has area only where the product is positive. */
    readonly positive: { x: number[]; y: number[] };
    /** Closed polygon of min(product, 0) under the axis. */
    readonly negative: { x: number[]; y: number[] };
    /** The signed area int f * harmonic dx over [-pi, pi] by the trapezoid rule on these samples (a check against pi * a_k or pi * b_k). */
    readonly area: number;
}

/** The harmonic cos kx or sin kx. */
export const fourierHarmonic = (term: FourierCoefficientTerm, k: number, x: number): number => term === 'a' ? Math.cos(k * x) : Math.sin(k * x);

/**
 * The signed product f(x) * harmonic over [-pi, pi], sampled on every linear piece (so a jump or a corner is a sample boundary)
 * with at least 16 points per period of the harmonic and the zero crossings inserted, as shaded polygons.
 */
export function fourierProductPolygons(shape: PiecewiseLinearShape, term: FourierCoefficientTerm, k: number): FourierProductPolygons {
    const xs: number[] = [];
    const ys: number[] = [];
    let area = 0;
    for (const piece of fourierShapePieces(shape)) {
        const width = piece.x1 - piece.x0;
        const steps = Math.max(8, Math.ceil((width * Math.max(k, 1) * 16) / (2 * PI)));
        let previousX = NaN;
        let previousY = NaN;
        for (let i = 0; i <= steps; i++) {
            const x = i === steps ? piece.x1 : piece.x0 + (width * i) / steps;
            const f = piece.y0 + ((piece.y1 - piece.y0) * (x - piece.x0)) / width;
            const y = f * fourierHarmonic(term, k, x);
            if (i > 0) {
                area += ((y + previousY) / 2) * (x - previousX);
                if (previousY * y < 0) {
                    // a zero crossing between two samples: insert it so that the shaded parts end at the axis
                    const crossing = previousX + ((x - previousX) * previousY) / (previousY - y);
                    xs.push(crossing);
                    ys.push(0);
                }
            }
            xs.push(x);
            ys.push(y);
            previousX = x;
            previousY = y;
        }
    }
    const polygon = (pick: (y: number) => number) => {
        const x = [...xs, ...[...xs].reverse(), xs[0]];
        const y = [...ys.map(pick), ...xs.map(() => 0), pick(ys[0])];
        return {x, y};
    };
    return {line: {x: xs, y: ys}, positive: polygon(y => Math.max(y, 0)), negative: polygon(y => Math.min(y, 0)), area};
}
