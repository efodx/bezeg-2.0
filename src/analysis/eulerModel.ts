import {
    EULER_EXAMPLE_IDS, EULER_X_MAX, EULER_X_MIN, EulerExample, eulerExample, EulerExampleId, eulerPath, EulerPath, EulerPoint, EulerStep,
    isEulerExampleId, isEulerStep, STEP_SIZES, EULER_Y_BOUND, EULER_MAX_STEPS,
} from './odeEuler';
import {cleanNoise} from './numbers';
import {displayedError} from './quadratureModel';

/*
 * This module owns the rules of the Euler demonstration model (direction field and Euler's method, numerical methods lesson N5): what
 * is valid, how an accepted value is normalized, which rule a rejected value broke (an `EulerIssue`: data, never text) and the numbers
 * a view shows. The Preset parser, the Preset collection's diagnosis and the graph's setters all ask it; they only choose the words
 * (`graphs/functions/eulerMessages`). The mathematics (F, the exact solutions, the polyline) lives in `analysis/odeEuler`.
 */

/** The initial value y0 is kept inside this band (far inside the kernel's termination bound), so a run starts on screen. */
export const EULER_Y0_BOUND = 10;
/** The grid a dragged initial point snaps to. */
export const EULER_DRAG_STEP = 0.05;

/** The stored description of the Euler demonstration. Polylines, end values and errors are recomputed, never stored. */
export interface EulerModel {
    readonly example: EulerExampleId;
    readonly x0: number;
    readonly y0: number;
    readonly step: EulerStep;
    readonly xEnd: number;
    /** The dashed exact solution is drawn. */
    readonly showExact: boolean;
    /** How many Euler steps are shown, or null for all of them (the step-by-step reveal). */
    readonly revealed: number | null;
}

export const DEFAULT_EULER_MODEL: EulerModel = {example: 'exponential', x0: 0, y0: 1, step: 0.5, xEnd: 1, showExact: true, revealed: null};

export type EulerCoordinate = 'x0' | 'xEnd';

/** The rule a rejected value broke. Callers localize it; the allowed values and ranges travel with it. */
export type EulerIssue =
    | { readonly kind: 'example'; readonly allowed: readonly EulerExampleId[] }
    | { readonly kind: 'x-range'; readonly coordinates: readonly EulerCoordinate[]; readonly min: number; readonly max: number }
    | { readonly kind: 'y-range'; readonly min: number; readonly max: number }
    | { readonly kind: 'order'; readonly moving?: EulerCoordinate }
    | { readonly kind: 'step'; readonly allowed: readonly EulerStep[] }
    | { readonly kind: 'toggle'; readonly field: 'showExact' }
    | { readonly kind: 'reveal'; readonly min: number; readonly max: number };

export type EulerCheck =
    | { readonly ok: true; readonly model: EulerModel }
    | { readonly ok: false; readonly issue: EulerIssue | undefined };

export type EulerEdit =
    | { readonly ok: true; readonly model: EulerModel }
    | { readonly ok: false; readonly issue: EulerIssue };

const reject = (issue: EulerIssue | undefined): EulerCheck => ({ok: false, issue});
const isInX = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= EULER_X_MIN && value <= EULER_X_MAX;
const isInY = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= EULER_Y0_BOUND;
const isReveal = (value: unknown): value is number | null =>
    value === null || (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= EULER_MAX_STEPS);

const exampleIssue: EulerIssue = {kind: 'example', allowed: EULER_EXAMPLE_IDS};
const stepIssue: EulerIssue = {kind: 'step', allowed: STEP_SIZES};
const xIssue = (coordinates: readonly EulerCoordinate[]): EulerIssue => ({kind: 'x-range', coordinates, min: EULER_X_MIN, max: EULER_X_MAX});
const yIssue: EulerIssue = {kind: 'y-range', min: -EULER_Y0_BOUND, max: EULER_Y0_BOUND};
const revealIssue: EulerIssue = {kind: 'reveal', min: 0, max: EULER_MAX_STEPS};

/**
 * The single validity rule of a stored model: a known example, x0 and xEnd in [-10, 10] with x0 <= xEnd, |y0| <= 10, a step of the
 * closed list, a boolean exact-curve toggle and a reveal count (a whole number from 0 to 320, or null for all steps). Unknown properties are
 * dropped. Rules are checked in the order example, x range, y range, order, step, toggle, reveal; a wrong type or a missing field gives
 * `issue: undefined`.
 */
export function checkEulerModel(data: unknown): EulerCheck {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return reject(undefined);
    const {example, x0, y0, step, xEnd, showExact, revealed} = data as Record<string, unknown>;
    if (!isEulerExampleId(example)) return reject(exampleIssue);
    const finite = (value: unknown) => typeof value === 'number' && Number.isFinite(value);
    if (finite(x0) && finite(xEnd) && (!isInX(x0) || !isInX(xEnd))) {
        return reject(xIssue((['x0', 'xEnd'] as const).filter(coordinate => !isInX({x0, xEnd}[coordinate]))));
    }
    if (finite(y0) && !isInY(y0)) return reject(yIssue);
    if (finite(x0) && finite(xEnd) && (x0 as number) > (xEnd as number)) return reject({kind: 'order'});
    if (step !== undefined && !isEulerStep(step) && typeof step === 'number') return reject(stepIssue);
    if (showExact !== undefined && typeof showExact !== 'boolean') return reject({kind: 'toggle', field: 'showExact'});
    if (typeof revealed === 'number' && !isReveal(revealed)) return reject(revealIssue);
    if (!isInX(x0) || !isInX(xEnd) || !isInY(y0) || !isEulerStep(step) || typeof showExact !== 'boolean' || !isReveal(revealed)) return reject(undefined);
    return {ok: true, model: {example, x0, y0, step, xEnd, showExact, revealed}};
}

/** Returns a sanitized model or undefined unless the data is a valid model. */
export function parseEulerModel(data: unknown): EulerModel | undefined {
    const check = checkEulerModel(data);
    return check.ok ? check.model : undefined;
}

export function chooseEulerExample(model: EulerModel, example: unknown): EulerEdit {
    if (!isEulerExampleId(example)) return {ok: false, issue: exampleIssue};
    return {ok: true, model: example === model.example ? model : {...model, example, revealed: null}};
}

export function chooseEulerStep(model: EulerModel, step: unknown): EulerEdit {
    if (!isEulerStep(step)) return {ok: false, issue: stepIssue};
    return {ok: true, model: step === model.step ? model : {...model, step, revealed: null}};
}

/** Moves the initial point: rejected unless both coordinates are in range and x0 stays at most xEnd. */
export function moveEulerInitial(model: EulerModel, x0: number, y0: number): EulerEdit {
    if (!isInX(x0)) return {ok: false, issue: xIssue(['x0'])};
    if (!isInY(y0)) return {ok: false, issue: yIssue};
    const nextX = cleanNoise(x0);
    const nextY = cleanNoise(y0);
    if (nextX > model.xEnd) return {ok: false, issue: {kind: 'order', moving: 'x0'}};
    return {ok: true, model: nextX === model.x0 && nextY === model.y0 ? model : {...model, x0: nextX, y0: nextY, revealed: null}};
}

export const setEulerX0 = (model: EulerModel, x0: number): EulerEdit => moveEulerInitial(model, x0, model.y0);
export const setEulerY0 = (model: EulerModel, y0: number): EulerEdit => moveEulerInitial(model, model.x0, y0);

/** Sets the end x: rejected unless in range and at least x0. */
export function setEulerEnd(model: EulerModel, xEnd: number): EulerEdit {
    if (!isInX(xEnd)) return {ok: false, issue: xIssue(['xEnd'])};
    const next = cleanNoise(xEnd);
    if (next < model.x0) return {ok: false, issue: {kind: 'order', moving: 'xEnd'}};
    return {ok: true, model: next === model.xEnd ? model : {...model, xEnd: next, revealed: null}};
}

export const setEulerShowExact = (model: EulerModel, showExact: boolean): EulerModel => showExact === model.showExact ? model : {...model, showExact};
export const setEulerRevealed = (model: EulerModel, revealed: number | null): EulerModel => revealed === model.revealed ? model : {...model, revealed};

/** The number of Euler steps from x0 to xEnd (the last one shortened when xEnd is off the grid). */
export const plannedSteps = (model: EulerModel): number => Math.ceil((model.xEnd - model.x0) / model.step);

/**
 * The next reveal count for "Next step": from all steps shown it starts at the first step; after the last step it shows all.
 * A run that stops early has fewer steps than planned, so the count is cut to the steps that exist.
 */
export function nextRevealed(model: EulerModel, available: number): number | null {
    const next = (model.revealed ?? 0) + 1;
    return next >= available ? null : next;
}

/** The exact solution through (x0, y0) exists on [x0, xEnd] (y' = y^2 from y0 > 0 has a pole at x0 + 1/y0). */
export function exactReaches(model: EulerModel): boolean {
    if (model.example !== 'blow-up' || model.y0 <= 0) return true;
    return model.xEnd < model.x0 + 1 / model.y0;
}

/** The exact solution at x, or NaN outside [x0, xEnd], beyond a pole or beyond the bound that the Euler run also uses. */
export function exactAt(model: EulerModel, x: number): number {
    if (!(x >= model.x0 && x <= model.xEnd)) return NaN;
    const value = eulerExample(model.example).exact(model.x0, model.y0)(x);
    if (!Number.isFinite(value) || Math.abs(value) > EULER_Y_BOUND) return NaN;
    if (model.example === 'blow-up' && model.y0 > 0 && x >= model.x0 + 1 / model.y0) return NaN;
    return value;
}

/** The numbers a view shows, all derived from the model. */
export interface EulerView {
    readonly example: EulerExample;
    readonly path: EulerPath;
    /** The Euler steps taken before the run ended (nodes minus one). */
    readonly stepsTaken: number;
    /** The nodes that are drawn: all of them, or the first `revealed` steps. */
    readonly visibleNodes: readonly EulerPoint[];
    /** The Euler value at xEnd, when the run reached it. */
    readonly endValue?: number;
    readonly exact?: number;
    /** The displayed absolute error at xEnd (4 significant digits). */
    readonly error?: number;
    /** 2h when it is on the step list. */
    readonly doubleStep?: EulerStep;
    readonly doubleError?: number;
    /** doubleError / error, from the displayed errors; undefined without a coarser step, a finished run of it, or a zero error. */
    readonly ratio?: number;
}

/** The Euler end value of a run, or undefined when it did not reach xEnd. */
function endOf(path: EulerPath): number | undefined {
    return path.termination === 'reached-end' ? path.nodes[path.nodes.length - 1].y : undefined;
}

export function eulerView(model: EulerModel): EulerView {
    const example = eulerExample(model.example);
    const path = eulerPath(example, model.x0, model.y0, model.step, model.xEnd);
    const stepsTaken = path.nodes.length - 1;
    const visibleNodes = model.revealed === null ? path.nodes : path.nodes.slice(0, Math.min(model.revealed, stepsTaken) + 1);
    const endValue = endOf(path);
    // The same pole check and |y| bound as the drawn exact curve.
    const exactValue = exactAt(model, model.xEnd);
    const exact = Number.isFinite(exactValue) ? exactValue : undefined;
    const error = endValue !== undefined && exact !== undefined ? displayedError(Math.abs(exact - endValue)) : undefined;
    const doubled = model.step * 2;
    const doubleStep = isEulerStep(doubled) ? doubled : undefined;
    let doubleError: number | undefined;
    if (doubleStep !== undefined && exact !== undefined) {
        const doubleEnd = endOf(eulerPath(example, model.x0, model.y0, doubleStep, model.xEnd));
        if (doubleEnd !== undefined) doubleError = displayedError(Math.abs(exact - doubleEnd));
    }
    const ratio = doubleError !== undefined && error !== undefined && error !== 0 ? doubleError / error : undefined;
    return {example, path, stepsTaken, visibleNodes, endValue, exact, error, doubleStep, doubleError, ratio};
}
