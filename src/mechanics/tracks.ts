import type { DerivativeSource } from '../bezeg/impl/curve/curvature';
import { cycloidSource } from '../bezeg/impl/curve/parametric-sources';

/** A point or vector as [x, depth]: the second coordinate is the depth y, measured downwards from the start. */
export type Vec2 = readonly [number, number];

/**
 * A track is the curve a bead slides on, working in depth (y downwards, y = 0 at the start).
 * `velocity` is the exact derivative of `point` in the track's own parameter t in [t0, t1].
 */
export interface Track {
    point(t: number): Vec2;
    velocity(t: number): Vec2;
    /** Depth at parameter t, equal to point(t)[1]. */
    y(t: number): number;
    t0: number;
    t1: number;
}

function makeTrack(point: (t: number) => Vec2, velocity: (t: number) => Vec2, t0: number, t1: number): Track {
    return { point, velocity, y: t => point(t)[1], t0, t1 };
}

/** Straight line from a to b, parameter t in [0, 1]. */
export function lineTrack(a: Vec2, b: Vec2): Track {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    return makeTrack(t => [a[0] + t * dx, a[1] + t * dy], () => [dx, dy], 0, 1);
}

/**
 * Circular arc with the given centre and radius, parameter t in [0, 1] mapped linearly to the
 * angle a0 + t (a1 - a0); the point is centre + radius (cos a, sin a) with the second coordinate the depth.
 */
export function arcTrack(centre: Vec2, radius: number, a0: number, a1: number): Track {
    const sweep = a1 - a0;
    return makeTrack(
        t => {
            const a = a0 + t * sweep;
            return [centre[0] + radius * Math.cos(a), centre[1] + radius * Math.sin(a)];
        },
        t => {
            const a = a0 + t * sweep;
            return [-radius * Math.sin(a) * sweep, radius * Math.cos(a) * sweep];
        },
        0,
        1,
    );
}

/**
 * Depth adapter: wraps a derivative source whose second coordinate is already a depth
 * (the cycloid y = r(1 - cos θ) grows downwards from its cusp) as a track on [t0, t1].
 * `depth` optionally replaces `y` by a numerically stable form of the same function.
 */
export function trackFromDepthSource(
    source: DerivativeSource,
    t0: number,
    t1: number,
    depth?: (t: number) => number,
): Track {
    const track = makeTrack(
        t => source.at(t).point,
        t => source.at(t).d1,
        t0,
        t1,
    );
    return depth === undefined ? track : { ...track, y: depth };
}

/**
 * Cycloid x = r(θ - sin θ), depth y = r(1 - cos θ), parameter θ in [theta0, theta1], via `cycloidSource`.
 * The depth used by the speed law is the equal 2 r sin²(θ/2): 1 - cos θ loses all relative accuracy
 * near the cusp, where the quadrature samples θ ~ 1e-6.
 */
export function cycloidTrack(radius: number, theta0: number, theta1: number): Track {
    return trackFromDepthSource(cycloidSource(radius), theta0, theta1, t => 2 * radius * Math.sin(t / 2) ** 2);
}

function binomialRow(n: number): number[] {
    const row = [1];
    for (let k = 1; k <= n; k++) row.push((row[k - 1] * (n - k + 1)) / k);
    return row;
}

/** Sum of Bernstein terms c[i] B_{m,i}(t) of degree m = c.length - 1, on a plain array. */
function bernsteinSum(c: readonly number[], t: number, binom: readonly number[]): number {
    const m = c.length - 1;
    let sum = 0;
    for (let i = 0; i <= m; i++) sum += binom[i] * Math.pow(t, i) * Math.pow(1 - t, m - i) * c[i];
    return sum;
}

/** Bézier track through the control points (x, depth), parameter t in [0, 1]; needs at least two points. */
export function bezierTrack(controls: readonly Vec2[]): Track {
    const n = controls.length - 1;
    if (n < 1) throw new RangeError('A Bézier track needs at least two control points.');
    const xs = controls.map(p => p[0]);
    const ys = controls.map(p => p[1]);
    const dxs = xs.slice(1).map((v, i) => n * (v - xs[i]));
    const dys = ys.slice(1).map((v, i) => n * (v - ys[i]));
    const binomN = binomialRow(n);
    const binomD = binomialRow(n - 1);
    return makeTrack(
        t => [bernsteinSum(xs, t, binomN), bernsteinSum(ys, t, binomN)],
        t => [bernsteinSum(dxs, t, binomD), bernsteinSum(dys, t, binomD)],
        0,
        1,
    );
}
