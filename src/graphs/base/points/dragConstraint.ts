import type {Point2} from "./placement";

export interface AxisBounds {
    x?: readonly [number, number];
    y?: readonly [number, number];
}

export interface ConstraintOptions {
    step?: number;
    bounds?: AxisBounds;
}

function clean(value: number): number {
    return Number(value.toPrecision(12));
}

/** Rounds to the step grid, half away from zero (as NumberInput does). */
function snap(value: number, step: number): number {
    return clean(Math.sign(value) * Math.round(Math.abs(value) / step) * step);
}

function constrainAxis(value: number, step: number | undefined, bounds: readonly [number, number] | undefined): number {
    const grid = step && step > 0 ? step : undefined;
    const v = grid ? snap(value, grid) : value;
    if (!bounds) return v;
    const [min, max] = bounds;
    if (v >= min && v <= max) return v;
    if (v < min) {
        const onGrid = grid ? clean(Math.ceil(clean(min / grid)) * grid) : min;
        return onGrid <= max ? onGrid : min;
    }
    const onGrid = grid ? clean(Math.floor(clean(max / grid)) * grid) : max;
    return onGrid >= min ? onGrid : max;
}

/**
 * Snaps each coordinate to `step` and clamps silently to per-axis `bounds`; the clamp stays on the grid when the bounds are on it.
 * No notice type exists here: a mathematical refusal (a position the graph's maths cannot accept) stays the graph's own decision.
 */
export function constrainPoint(raw: Point2, options: ConstraintOptions = {}): Point2 {
    const {step, bounds} = options;
    return [constrainAxis(raw[0], step, bounds?.x), constrainAxis(raw[1], step, bounds?.y)];
}

/** The keyboard nudge: `constrainPoint(point + delta)`, so it behaves like a drag. */
export function stepPoint(point: Point2, delta: Point2, options: ConstraintOptions = {}): Point2 {
    return constrainPoint([point[0] + delta[0], point[1] + delta[1]], options);
}
