/**
 * Where to draw a point at infinity. An ideal point has no coordinates, only a direction, so it is shown as an arrow along
 * that direction at a fixed distance, never as a huge finite point. Pure: no board, no React.
 */
export interface IdealMarker {
    /** Start and end of the arrow, in board units. */
    readonly from: readonly [number, number];
    readonly to: readonly [number, number];
    /** Unit direction of the arrow. */
    readonly unit: readonly [number, number];
}

/**
 * The unit vector of an exact integer direction, with its sign chosen so that it points along `toward` (the vector from the
 * centre of projection to the original point). Returns undefined for the zero direction. An ideal point is the same
 * point for `d` and `-d`; the sign only decides which way the arrow is drawn.
 */
export function orientedUnit(direction: readonly [bigint, bigint], toward: readonly [number, number]): readonly [number, number] | undefined {
    if (direction[0] === 0n && direction[1] === 0n) return undefined;
    // Scale down by the larger magnitude first so the Number conversion stays exact enough and never overflows.
    const big = (v: bigint) => (v < 0n ? -v : v);
    const larger = big(direction[0]) > big(direction[1]) ? big(direction[0]) : big(direction[1]);
    const shift = Math.max(0, larger.toString(2).length - 52);
    const dx = Number(direction[0] >> BigInt(shift));
    const dy = Number(direction[1] >> BigInt(shift));
    const length = Math.hypot(dx, dy);
    if (length === 0) return undefined;
    const sign = dx * toward[0] + dy * toward[1] < 0 ? -1 : 1;
    return [sign * dx / length, sign * dy / length];
}

/** The arrow marking an ideal point: from `distance` to `distance + length` along `unit` from `anchor`. */
export function idealMarker(anchor: readonly [number, number], unit: readonly [number, number], distance = 6, length = 1.6): IdealMarker {
    return {
        from: [anchor[0] + unit[0] * distance, anchor[1] + unit[1] * distance],
        to: [anchor[0] + unit[0] * (distance + length), anchor[1] + unit[1] * (distance + length)],
        unit,
    };
}
