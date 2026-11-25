// The values a sweep visits (task 06 slice 5): pure functions of the start value and the elapsed time.
import type {CountParameter, RangeParameter} from '../../graphs/base/declare/graphDeclaration';
import {snapValue} from '../pucks/pucksModel';

/** A range swings this share of its whole range to each side of where it started (owner decision; the feel slice tunes it). */
export const DEFAULT_SWEEP_HALF_WIDTH_SHARE = 0.25;
/** A range's sine period in ms. */
export const DEFAULT_SWEEP_PERIOD_MS = 4000;
/** A count steps once per this many ms. */
export const COUNT_SWEEP_STEP_MS = 600;
/** A count stays within this many steps of where it started (or its bounds). */
export const COUNT_SWEEP_REACH = 3;

export interface RangeSweep {
    readonly centre: number;
    readonly halfWidth: number;
    readonly period: number;
    /** Phase (radians) at which the sine passes through the start value, so the sweep begins without a jump. */
    readonly phase: number;
}

/**
 * The swing of `parameter` from `start`: half-width the declared (or 25 % of the range) clamped to half the range, the
 * window slid inside the range when the start is near an end, and the sine started at `start`.
 */
export function planRangeSweep(parameter: Pick<RangeParameter, 'min' | 'max' | 'sweep'>, start: number): RangeSweep {
    const span = parameter.max - parameter.min;
    const usable = (value: number | undefined): value is number => value !== undefined && Number.isFinite(value) && value > 0;
    const declared = parameter.sweep?.halfWidth;
    const halfWidth = Math.min(span / 2, usable(declared) ? declared : span * DEFAULT_SWEEP_HALF_WIDTH_SHARE);
    const period = usable(parameter.sweep?.period) ? parameter.sweep.period : DEFAULT_SWEEP_PERIOD_MS;
    const low = Math.min(parameter.max - 2 * halfWidth, Math.max(parameter.min, start - halfWidth));
    const centre = low + halfWidth;
    const ratio = halfWidth > 0 ? Math.max(-1, Math.min(1, (start - centre) / halfWidth)) : 0;
    return {centre, halfWidth, period, phase: Math.asin(ratio)};
}

/** The value `elapsed` ms into the sweep, on the parameter's step grid. */
export function rangeSweepValue(parameter: Pick<RangeParameter, 'min' | 'max' | 'step'>, plan: RangeSweep, elapsed: number): number {
    const angle = plan.phase + (2 * Math.PI * elapsed) / plan.period;
    return snapValue(plan.centre + plan.halfWidth * Math.sin(angle), parameter);
}

export interface CountSweep {readonly low: number; readonly high: number; readonly start: number}

export function planCountSweep(parameter: Pick<CountParameter, 'min' | 'max'>, start: number): CountSweep {
    return {low: Math.max(parameter.min, start - COUNT_SWEEP_REACH), high: Math.min(parameter.max, start + COUNT_SWEEP_REACH), start};
}

/** The count `elapsed` ms into the sweep: one step per {@link COUNT_SWEEP_STEP_MS}, up first (down from the top), bouncing between the ends. */
export function countSweepValue(plan: CountSweep, elapsed: number): number {
    const length = plan.high - plan.low;
    if (length <= 0) return plan.start;
    const unfolded = (plan.start - plan.low + Math.floor(elapsed / COUNT_SWEEP_STEP_MS)) % (2 * length);
    return plan.low + (unfolded <= length ? unfolded : 2 * length - unfolded);
}
