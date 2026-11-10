import { bezierTrack, type Track, type Vec2 } from './tracks';

/** Gravitational acceleration of the model; a constant, not editable. */
export const G = 9.81;
/** The substitution t = t0 + (t1 - t0) s^p: p = 2 cancels the 1/sqrt singularity at a slanted start (contract). */
export const DESCENT_SUBSTITUTION_POWER = 2;
export const DESCENT_PANELS = 200;

const GL5_NODES = [0, 0.5384693101056831, -0.5384693101056831, 0.906179845938664, -0.906179845938664];
const GL5_WEIGHTS = [0.5688888888888889, 0.4786286704993665, 0.4786286704993665, 0.2369268850561891, 0.2369268850561891];

export interface DescentOptions {
    /** Exponent p of the substitution t = tStart + (t1 - tStart) s^p. */
    power?: number;
    panels?: number;
}

/** Speed law integrand |γ'(t)| / sqrt(2 g h(t)) with drop h; +Infinity where the drop is not positive. */
function timeIntegrand(track: Track, yStart: number, g: number, t: number): number {
    const h = track.y(t) - yStart;
    if (!(h > 0)) return Infinity;
    const v = track.velocity(t);
    return Math.hypot(v[0], v[1]) / Math.sqrt(2 * g * h);
}

/**
 * Time for a bead released at rest at parameter tStart to reach t1: T = ∫ |γ'| / sqrt(2 g (y - y(tStart))) dt,
 * with t = tStart + (t1 - tStart) s^p and composite 5-point Gauss–Legendre on s in [0, 1]. Returns 0 when
 * tStart >= t1. The drop must be positive after tStart (see {@link classifyBezier}); otherwise the result
 * is Infinity or NaN and the caller must not display it.
 */
export function descentTimeFrom(track: Track, tStart: number, g: number = G, options: DescentOptions = {}): number {
    const p = options.power ?? DESCENT_SUBSTITUTION_POWER;
    const panels = options.panels ?? DESCENT_PANELS;
    const span = track.t1 - tStart;
    if (!(span > 0)) return 0;
    const yStart = track.y(tStart);
    const f = (s: number): number => {
        const t = tStart + span * Math.pow(s, p);
        return timeIntegrand(track, yStart, g, t) * p * span * Math.pow(s, p - 1);
    };
    const hw = 0.5 / panels;
    let sum = 0;
    for (let k = 0; k < panels; k++) {
        const mid = (2 * k + 1) * hw;
        let panel = 0;
        for (let j = 0; j < 5; j++) panel += GL5_WEIGHTS[j] * f(mid + hw * GL5_NODES[j]);
        sum += panel * hw;
    }
    return sum;
}

/** Descent time from the start of the track (t0) to its end. */
export function descentTime(track: Track, g: number = G, options: DescentOptions = {}): number {
    return descentTimeFrom(track, track.t0, g, options);
}

/** Negative control: plain midpoint rule in t with `nodes` nodes. Converges slowly at a slanted start. */
export function midpointDescentTime(track: Track, g: number = G, nodes = 1000): number {
    const yStart = track.y(track.t0);
    const dt = (track.t1 - track.t0) / nodes;
    let sum = 0;
    for (let k = 0; k < nodes; k++) sum += timeIntegrand(track, yStart, g, track.t0 + (k + 0.5) * dt);
    return sum * dt;
}

export type Admissibility = 'ok' | 'above-start' | 'never-starts';

/**
 * Exact admissibility test for a Bézier track on snapped control points (x, depth), with P0 = (0, 0):
 * all depths y_i >= 0, y_1 > 0 and y_n > 0. A cusp start (P1 = P0) uses the first control point that
 * differs from P0 in place of P1. Sufficient, not necessary.
 * - `above-start`: some depth is negative, or the end is not strictly below the start (y_n = 0).
 * - `never-starts`: horizontal start tangent (y_1 = 0 with P1 != P0), or all points equal P0.
 */
export function classifyBezier(controls: readonly Vec2[]): Admissibility {
    if (controls.length < 2) throw new RangeError('A Bézier track needs at least two control points.');
    if (controls[0][0] !== 0 || controls[0][1] !== 0) throw new RangeError('The track must start at P0 = (0, 0).');
    if (controls.some(p => p[1] < 0)) return 'above-start';
    const first = controls.find(p => p[0] !== 0 || p[1] !== 0);
    if (first === undefined) return 'never-starts';
    if (!(first[1] > 0)) return 'never-starts';
    if (!(controls[controls.length - 1][1] > 0)) return 'above-start';
    return 'ok';
}

export type BezierDescent = { kind: 'ok'; time: number } | { kind: 'above-start' } | { kind: 'never-starts' };

/** Time of a Bézier track, or the reason it is not timed. Never returns Infinity or NaN. */
export function bezierDescent(controls: readonly Vec2[], g: number = G): BezierDescent {
    const kind = classifyBezier(controls);
    if (kind !== 'ok') return { kind };
    return { kind: 'ok', time: descentTime(bezierTrack(controls), g) };
}
