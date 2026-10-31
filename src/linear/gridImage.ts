import {apply, type Mat2, type Vec2} from './matrix2';

export interface GridImageLine {
    /** 'x' for the image of the line x = value, 'y' for y = value. */
    readonly axis: 'x' | 'y';
    readonly value: number;
    /** Images of the window endpoints of the line. Both finite; equal when the map collapses the line to a point. */
    readonly from: Vec2;
    readonly to: Vec2;
}

/**
 * Images of the grid lines x = k and y = k over the window [-halfExtent, halfExtent]^2, with k = -halfExtent, ...,
 * halfExtent in steps of `step`. The line x = k maps to the line through k*a1 with direction a2 (and symmetrically).
 * Only arithmetic: a singular matrix yields collapsed lines or points, never a division. No clipping to a view box.
 * Half extent 6 with step 1 gives 13 + 13 = 26 lines.
 */
export function gridImage(m: Mat2, halfExtent: number, step: number): GridImageLine[] {
    if (!Number.isFinite(halfExtent) || halfExtent < 0) throw new RangeError('The grid range must be finite and non-negative.');
    if (!Number.isFinite(step) || step <= 0) throw new RangeError('The grid step must be finite and positive.');
    const count = Math.round((2 * halfExtent) / step);
    const lines: GridImageLine[] = [];
    for (const axis of ['x', 'y'] as const) {
        for (let i = 0; i <= count; i++) {
            const value = i === count ? halfExtent : -halfExtent + i * step;
            const lo: Vec2 = axis === 'x' ? [value, -halfExtent] : [-halfExtent, value];
            const hi: Vec2 = axis === 'x' ? [value, halfExtent] : [halfExtent, value];
            lines.push({axis, value, from: apply(m, lo), to: apply(m, hi)});
        }
    }
    return lines;
}
