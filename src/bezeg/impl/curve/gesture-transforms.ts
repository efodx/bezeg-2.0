/**
 * Pure mathematics of the curve rotate and resize gestures. No JSXGraph or React:
 * the adapter supplies pointer coordinates and applies the results to the curve.
 */

/** Radii and box extents below this length (in graph units) count as degenerate. */
export const GESTURE_DEGENERATE_TOLERANCE = 1e-9;

/**
 * Signed rotation angle (radians, counter-clockwise positive in graph coordinates)
 * that turns the ray centre->previous onto the ray centre->current.
 * The pivot is `centre`. The result lies in (-PI, PI], so a step of any size up to a
 * half turn is exact. Returns 0 when either radius is degenerate.
 */
export function rotationAngle(
    centre: readonly [number, number],
    previous: readonly [number, number],
    current: readonly [number, number],
): number {
    const ax = previous[0] - centre[0];
    const ay = previous[1] - centre[1];
    const bx = current[0] - centre[0];
    const by = current[1] - centre[1];
    if (Math.hypot(ax, ay) < GESTURE_DEGENERATE_TOLERANCE || Math.hypot(bx, by) < GESTURE_DEGENERATE_TOLERANCE) return 0;
    return Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
}

/**
 * Scale factor along one axis for a resize step. `delta` is the pointer displacement
 * along the axis, `direction` (+1 or -1) says which side of the box the dragged handle is on,
 * `extent` is the box size along the axis. The box is scaled about its centre, so a handle
 * moved by delta changes the extent by 2 * delta: factor = (extent + 2 * delta * direction) / extent.
 * A degenerate extent gives 1. A negative factor (mirroring past the centre) is kept.
 */
function axisScale(delta: number, direction: number, extent: number): number {
    if (!(Math.abs(extent) >= GESTURE_DEGENERATE_TOLERANCE)) return 1;
    return (2 * delta * direction + extent) / extent;
}

/**
 * x and y scale factors for a resize step about the bounding-box centre.
 * `box` is [minX, maxX, minY, maxY]; `delta` the pointer displacement since the previous step;
 * `direction` the handle signs [xDir, yDir].
 * Returns null (refused: leave the curve unchanged) when a factor is non-finite or exactly 0,
 * since a zero factor would collapse the curve irreversibly.
 */
export function resizeScale(
    box: readonly [number, number, number, number],
    delta: readonly [number, number],
    direction: readonly [number, number],
): { xScale: number; yScale: number } | null {
    const xScale = axisScale(delta[0], direction[0], box[1] - box[0]);
    const yScale = axisScale(delta[1], direction[1], box[3] - box[2]);
    if (!Number.isFinite(xScale) || !Number.isFinite(yScale) || xScale === 0 || yScale === 0) return null;
    return {xScale, yScale};
}
