// The overview fan (task 06 slice 3): the values a rest on a range puck's body draws as faint ghosts at once.
import type {RangeParameter} from '../../graphs/base/declare/graphDeclaration';
import {snapValue} from '../pucks/pucksModel';
import {planRangeSweep} from '../sweep/sweepModel';

/** How long the pointer rests on the body before the fan shows. */
export const FAN_REST_MS = 300;
export const FAN_COUNT = 5;

export interface FanValue {readonly value: number; /** One of the two values nearest the current one: drawn slightly stronger. */ readonly near: boolean}

/** {@link FAN_COUNT} evenly spaced values across the window a sweep from `current` would use, on the step grid, the current value left out. */
export function fanValues(parameter: Pick<RangeParameter, 'min' | 'max' | 'step' | 'sweep'>, current: number): number[] {
    const plan = planRangeSweep(parameter, current);
    const low = plan.centre - plan.halfWidth;
    const seen = new Set<number>();
    for (let i = 0; i < FAN_COUNT; i++) {
        const value = snapValue(low + (2 * plan.halfWidth * i) / (FAN_COUNT - 1), parameter);
        if (value !== current) seen.add(value);
    }
    return [...seen].sort((a, b) => a - b);
}

/** Marks the two values nearest `current` as near. */
export function fanWithNear(values: readonly number[], current: number): FanValue[] {
    const nearest = [...values].sort((a, b) => Math.abs(a - current) - Math.abs(b - current)).slice(0, 2);
    return values.map(value => ({value, near: nearest.includes(value)}));
}
