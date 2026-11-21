import type {RangeParam} from '../a1/paramRegistry';

/** Height (px) of the strip along the bottom of a puck that counts as "aiming at the track". */
const AIM_HEIGHT = 17;

/** Where on a slider puck's track the pointer is (0..1), or undefined when it is over the label part of the puck. */
export function trackFraction(puck: Element, x: number, y: number): number | undefined {
    const box = puck.getBoundingClientRect();
    if (y < box.bottom - AIM_HEIGHT || y > box.bottom || x < box.left || x > box.right) return undefined;
    const track = puck.querySelector('.ux-puck-track')?.getBoundingClientRect();
    if (!track || track.width < 8) return undefined;
    return Math.max(0, Math.min(1, (x - track.left) / track.width));
}

/** The slider value a track position stands for, snapped to the step. */
export function valueAt(entry: RangeParam, fraction: number): number {
    const raw = entry.min + fraction * (entry.max - entry.min);
    const snapped = Math.round((raw - entry.min) / entry.step) * entry.step + entry.min;
    return Number(Math.max(entry.min, Math.min(entry.max, snapped)).toPrecision(8));
}

/** The value a press without movement at this point should jump to, for the puck's own pointer-up. */
export function jumpValue(entry: RangeParam, puck: Element, x: number, y: number): number | undefined {
    const fraction = trackFraction(puck, x, y);
    return fraction === undefined ? undefined : valueAt(entry, fraction);
}
