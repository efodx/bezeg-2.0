/**
 * Classical fourth-order Runge-Kutta integrator for the plane systems of the phase-portrait family.
 * Pure TypeScript: no React, JSXGraph, localization or graph state. The step is fixed (no adaptive step), so a drawn
 * orbit is a numerical illustration of the solution, never a proof (docs/specs/phase-portraits-lessons.md, Kernels 1).
 * Every early stop is reported with its reason and time; nothing is silently clipped.
 */
import type {Vec2} from '../linear/matrix2';

/** Fixed step h = 0.02. For snapped matrices h|lambda| <= 0.16, far inside the RK4 stability interval (about 2.785). */
export const RK4_STEP = 0.02;
/** An orbit is abandoned once the Euclidean norm of the state exceeds this. */
export const RK4_MAX_NORM = 1e6;

/** Autonomous vector field s' = f(s). */
export type VectorField = (s: Vec2) => Vec2;

/** Rectangular view; leaving it ends the orbit. */
export interface View {
    readonly xMin: number;
    readonly xMax: number;
    readonly yMin: number;
    readonly yMax: number;
}

export type StopReason = 'complete' | 'non-finite' | 'diverged' | 'left-view';

export interface Rk4Result {
    /** Start point and every accepted state. On `non-finite` the offending state is not included; on `diverged` and
     *  `left-view` the state that triggered the stop is the last point. */
    readonly points: readonly Vec2[];
    /** Signed time of the last point in `points`. */
    readonly lastTime: number;
    readonly stop: StopReason;
}

/** One RK4 step of signed size h: s + h/6 (k1 + 2 k2 + 2 k3 + k4). */
export function rk4Step(f: VectorField, s: Vec2, h: number): Vec2 {
    const k1 = f(s);
    const k2 = f([s[0] + (h / 2) * k1[0], s[1] + (h / 2) * k1[1]]);
    const k3 = f([s[0] + (h / 2) * k2[0], s[1] + (h / 2) * k2[1]]);
    const k4 = f([s[0] + h * k3[0], s[1] + h * k3[1]]);
    return [
        s[0] + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
        s[1] + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
    ];
}

const outside = (s: Vec2, v: View): boolean => s[0] < v.xMin || s[0] > v.xMax || s[1] < v.yMin || s[1] > v.yMax;

/**
 * Integrates from s0 over the signed horizon `duration` (negative integrates backward) with whole steps of h
 * (default RK4_STEP) and one shorter final step when the horizon is not a multiple of h.
 */
export function integrate(
    f: VectorField,
    s0: Vec2,
    duration: number,
    options: { h?: number; view?: View } = {},
): Rk4Result {
    const h = options.h ?? RK4_STEP;
    if (!(h > 0) || !Number.isFinite(h)) throw new RangeError(`Step ${h} must be positive and finite`);
    if (!Number.isFinite(duration)) throw new RangeError('Duration must be finite');
    const sign = duration < 0 ? -1 : 1;
    const wholeSteps = Math.floor(Math.abs(duration) / h + 1e-9);
    const rest = Math.abs(duration) - wholeSteps * h;
    const points: Vec2[] = [s0];
    let state = s0;
    let time = 0;
    if (options.view && outside(s0, options.view)) return {points, lastTime: 0, stop: 'left-view'};
    const total = wholeSteps + (rest > 1e-12 ? 1 : 0);
    for (let i = 0; i < total; i++) {
        const size = i < wholeSteps ? h : rest;
        const next = rk4Step(f, state, sign * size);
        if (!Number.isFinite(next[0]) || !Number.isFinite(next[1])) {
            return {points, lastTime: time, stop: 'non-finite'};
        }
        state = next;
        time += sign * size;
        points.push(state);
        if (Math.hypot(state[0], state[1]) > RK4_MAX_NORM) return {points, lastTime: time, stop: 'diverged'};
        if (options.view && outside(state, options.view)) return {points, lastTime: time, stop: 'left-view'};
    }
    return {points, lastTime: time, stop: 'complete'};
}
