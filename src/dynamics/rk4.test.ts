import {describe, expect, it} from 'vitest';
import type {Mat2, Vec2} from '../linear/matrix2';
import {integrate, RK4_MAX_NORM, RK4_STEP, rk4Step, VectorField} from './rk4';

const linear = (m: Mat2): VectorField => ([x, y]) => [m[0][0] * x + m[0][1] * y, m[1][0] * x + m[1][1] * y];

/** Independent oracle: e^{tA} by a Taylor series of the matrix exponential (scaled and squared for accuracy). */
function expm(m: Mat2, t: number): Mat2 {
    const mul = (p: Mat2, q: Mat2): Mat2 => [
        [p[0][0] * q[0][0] + p[0][1] * q[1][0], p[0][0] * q[0][1] + p[0][1] * q[1][1]],
        [p[1][0] * q[0][0] + p[1][1] * q[1][0], p[1][0] * q[0][1] + p[1][1] * q[1][1]],
    ];
    const squarings = 6;
    const s = t / 2 ** squarings;
    const a: Mat2 = [[m[0][0] * s, m[0][1] * s], [m[1][0] * s, m[1][1] * s]];
    let term: Mat2 = [[1, 0], [0, 1]];
    let sum: Mat2 = [[1, 0], [0, 1]];
    for (let k = 1; k <= 25; k++) {
        const next = mul(term, a);
        term = [[next[0][0] / k, next[0][1] / k], [next[1][0] / k, next[1][1] / k]];
        sum = [[sum[0][0] + term[0][0], sum[0][1] + term[0][1]], [sum[1][0] + term[1][0], sum[1][1] + term[1][1]]];
    }
    for (let i = 0; i < squarings; i++) sum = mul(sum, sum);
    return sum;
}

const exact = (m: Mat2, x0: Vec2, t: number): Vec2 => {
    const e = expm(m, t);
    return [e[0][0] * x0[0] + e[0][1] * x0[1], e[1][0] * x0[0] + e[1][1] * x0[1]];
};
const last = (points: readonly Vec2[]): Vec2 => points[points.length - 1];
const dist = (p: Vec2, q: Vec2): number => Math.hypot(p[0] - q[0], p[1] - q[1]);
const end = (m: Mat2, x0: Vec2, T: number, h: number): Vec2 => last(integrate(linear(m), x0, T, {h}).points);

const NODE: Mat2 = [[-4, -1], [-2, -3]];
const SPIRAL: Mat2 = [[-0.25, -1], [1, -0.25]];
const CENTRE: Mat2 = [[0, -1], [1, 0]];

describe('rk4', () => {
    it('uses the fixed step 0.02', () => {
        expect(RK4_STEP).toBe(0.02);
        expect(integrate(linear(CENTRE), [1, 0], 1).points).toHaveLength(51);
    });

    it('is exact for a constant field and for one step of the decay x\' = -x to the Taylor order', () => {
        expect(rk4Step(() => [2, -3], [1, 1], 0.5)).toEqual([2, -0.5]);
        const h = 0.1;
        const [x] = rk4Step(linear([[-1, 0], [0, -1]]), [1, 0], h);
        expect(x).toBeCloseTo(1 - h + h ** 2 / 2 - h ** 3 / 6 + h ** 4 / 24, 15);
    });

    it('matches the closed solutions of the checked examples', () => {
        // node: x(1) = 2/3 e^-5 (1,1) + 1/3 e^-2 (1,-2)
        const node = end(NODE, [1, 0], 1, 0.05);
        const closed: Vec2 = [
            (2 / 3) * Math.exp(-5) + (1 / 3) * Math.exp(-2),
            (2 / 3) * Math.exp(-5) - (2 / 3) * Math.exp(-2),
        ];
        expect(dist(node, closed)).toBeLessThan(5e-6);
        expect(closed[0]).toBeCloseTo(0.0496037, 6);
        expect(closed[1]).toBeCloseTo(-0.0857316, 6);
        // spiral: x(10) = e^-2.5 (cos 10, sin 10)
        const spiral = end(SPIRAL, [1, 0], 10, 0.1);
        const closedSpiral: Vec2 = [Math.exp(-2.5) * Math.cos(10), Math.exp(-2.5) * Math.sin(10)];
        expect(dist(spiral, closedSpiral)).toBeLessThan(5e-6);
        expect(closedSpiral[0]).toBeCloseTo(-0.068875, 6);
        // centre, default step: rotation by angle t
        const centre = last(integrate(linear(CENTRE), [1, 0], 10).points);
        expect(dist(centre, [Math.cos(10), Math.sin(10)])).toBeLessThan(1e-7);
    });

    it('agrees with the matrix exponential for several matrices, forward and backward', () => {
        const matrices: Mat2[] = [NODE, SPIRAL, [[1, 0], [0, -1]], [[0.5, 1], [0, 0.5]], [[4, 1], [2, 3]], [[0, 0], [0, 0]]];
        for (const m of matrices) {
            for (const T of [2.5, -2.5]) {
                const x0: Vec2 = [0.7, -1.3];
                const want = exact(m, x0, T);
                expect(dist(last(integrate(linear(m), x0, T).points), want)).toBeLessThan(1e-4 * (1 + Math.hypot(...want)));
            }
        }
    });

    it('shows fourth-order error scaling: halving h divides the global error by about 16', () => {
        const errors = [0.2, 0.1, 0.05, 0.025].map(h => dist(end(CENTRE, [1, 0], 10, h), [Math.cos(10), Math.sin(10)]));
        expect(errors[0]).toBeCloseTo(1.3e-4, 5);
        expect(errors[1]).toBeCloseTo(8.3e-6, 7);
        expect(errors[2]).toBeCloseTo(5.2e-7, 8);
        for (let i = 0; i < 3; i++) expect(errors[i] / errors[i + 1]).toBeGreaterThan(15);
        for (let i = 0; i < 3; i++) expect(errors[i] / errors[i + 1]).toBeLessThan(17);
        // a mixed-eigenvalue example scales the same way
        const mixed = [0.05, 0.025, 0.0125].map(h => dist(end(NODE, [1, 0], 1, h), exact(NODE, [1, 0], 1)));
        for (let i = 0; i < 2; i++) expect(mixed[i] / mixed[i + 1]).toBeGreaterThan(14);
        for (let i = 0; i < 2; i++) expect(mixed[i] / mixed[i + 1]).toBeLessThan(18);
    });

    it('keeps the radius on the centre almost constant (RK4 drifts, but 1e-6 only)', () => {
        const r = Math.hypot(...end(CENTRE, [1, 0], 10, 0.1));
        expect(r).toBeCloseTo(0.9999993, 7);
        expect(Math.hypot(...end(CENTRE, [1, 0], 10, 0.05))).toBeCloseTo(0.99999998, 8);
    });

    it('handles a horizon that is not a multiple of h with a shorter last step', () => {
        const result = integrate(linear(CENTRE), [1, 0], 0.5, {h: 0.2});
        expect(result.points).toHaveLength(4);
        expect(result.lastTime).toBeCloseTo(0.5, 12);
        expect(dist(last(result.points), [Math.cos(0.5), Math.sin(0.5)])).toBeLessThan(1e-5);
    });

    it('reports every stop, never clipping silently', () => {
        const done = integrate(linear(SPIRAL), [1, 0], 1);
        expect(done.stop).toBe('complete');
        const nan = integrate(() => [Number.NaN, 0], [1, 0], 1);
        expect(nan.stop).toBe('non-finite');
        expect(nan.points).toEqual([[1, 0]]);
        const inf = integrate(([x]) => [x * x * 1e300, 0], [1e10, 0], 1);
        expect(inf.stop).toBe('non-finite');
        const grow = integrate(linear([[1, 0], [0, 1]]), [1, 0], 20);
        expect(grow.stop).toBe('diverged');
        expect(Math.hypot(...last(grow.points))).toBeGreaterThan(RK4_MAX_NORM);
        expect(grow.lastTime).toBeLessThan(20);
        expect(Math.hypot(...grow.points[grow.points.length - 2])).toBeLessThanOrEqual(RK4_MAX_NORM);
        const view = {xMin: -2, xMax: 2, yMin: -2, yMax: 2};
        const left = integrate(linear([[1, 0], [0, 1]]), [1, 0], 5, {view});
        expect(left.stop).toBe('left-view');
        expect(last(left.points)[0]).toBeGreaterThan(2);
        expect(integrate(linear(CENTRE), [1, 0], 5, {view}).stop).toBe('complete');
    });

    it('reports left-view with only the start point when the seed is outside the view', () => {
        const view = {xMin: -2, xMax: 2, yMin: -2, yMax: 2};
        const r = integrate(linear(CENTRE), [3, 0], 5, {view});
        expect(r.stop).toBe('left-view');
        expect(r.points).toEqual([[3, 0]]);
        expect(r.lastTime).toBe(0);
    });

    it('integrates backward in time and rejects invalid options', () => {
        const forward = integrate(linear(NODE), [1, 0], 1);
        const back = integrate(linear(NODE), last(forward.points), -1);
        expect(dist(last(back.points), [1, 0])).toBeLessThan(1e-5);
        expect(back.lastTime).toBeCloseTo(-1, 12);
        expect(() => integrate(linear(NODE), [1, 0], 1, {h: 0})).toThrow(RangeError);
        expect(() => integrate(linear(NODE), [1, 0], Number.NaN)).toThrow(RangeError);
    });
});
