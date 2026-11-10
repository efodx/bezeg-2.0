import {describe, expect, it} from 'vitest';
import type {Mat2, Vec2} from '../linear/matrix2';
import {classifyPlane} from './classify2';
import {integrate} from './rk4';
import {
    equilibriumJacobian,
    isHyperbolic,
    isHyperbolicEquilibrium,
    isSystemId,
    SYSTEM_IDS,
    systemEquilibria,
    systemField,
    systemJacobian,
} from './systems2';

const A: Mat2 = [[-4, -1], [-2, -3]];
const last = (points: readonly Vec2[]): Vec2 => points[points.length - 1];

/** Central-difference Jacobian, the independent oracle for the analytic ones. */
function numericJacobian(id: typeof SYSTEM_IDS[number], p: Vec2, matrix: Mat2): Mat2 {
    const f = systemField(id, matrix);
    const e = 1e-6;
    const col = (dx: number, dy: number): Vec2 => {
        const hi = f([p[0] + dx, p[1] + dy]);
        const lo = f([p[0] - dx, p[1] - dy]);
        return [(hi[0] - lo[0]) / (2 * e), (hi[1] - lo[1]) / (2 * e)];
    };
    const cx = col(e, 0);
    const cy = col(0, e);
    return [[cx[0], cy[0]], [cx[1], cy[1]]];
}

describe('system catalogue', () => {
    it('has the closed ids', () => {
        expect(SYSTEM_IDS).toEqual(['linear', 'pendulum', 'weak-spiral']);
        expect(isSystemId('pendulum')).toBe(true);
        expect(isSystemId('lorenz')).toBe(false);
        expect(isSystemId(undefined)).toBe(false);
    });

    it('has analytic Jacobians equal to central differences within 1e-8', () => {
        for (const id of SYSTEM_IDS) {
            for (let i = -6; i <= 6; i++) {
                for (let j = -6; j <= 6; j++) {
                    const p: Vec2 = [i * 0.53, j * 0.41];
                    const analytic = systemJacobian(id, p, A);
                    const numeric = numericJacobian(id, p, A);
                    for (const r of [0, 1]) for (const c of [0, 1]) {
                        expect(Math.abs(analytic[r][c] - numeric[r][c])).toBeLessThan(1e-8);
                    }
                }
            }
        }
    });

    it('has integer Jacobians at the listed equilibria and the checked tau, delta', () => {
        expect(systemEquilibria('pendulum')).toEqual([[0, 0], [Math.PI, 0], [-Math.PI, 0]]);
        expect(equilibriumJacobian('pendulum', 1, A)).toEqual([[0, 1], [1, 0]]);
        expect(equilibriumJacobian('pendulum', 2, A)).toEqual([[0, 1], [1, 0]]);
        expect(equilibriumJacobian('pendulum', 0, A)).toEqual([[0, 1], [-1, 0]]);
        expect(equilibriumJacobian('weak-spiral', 0, A)).toEqual([[0, -1], [1, 0]]);
        expect(equilibriumJacobian('linear', 0, A)).toEqual(A);
        expect(Object.is(equilibriumJacobian('weak-spiral', 0, A)[0][0], 0)).toBe(true);
        expect(classifyPlane(equilibriumJacobian('pendulum', 1, A))).toMatchObject({tau: 0, delta: -1});
        expect(classifyPlane(equilibriumJacobian('pendulum', 0, A))).toMatchObject({tau: 0, delta: 1});
        expect(classifyPlane(equilibriumJacobian('pendulum', 1, A)).type).toEqual({kind: 'saddle'});
        expect(classifyPlane(equilibriumJacobian('weak-spiral', 0, A)).type).toEqual({kind: 'centre'});
        expect(() => equilibriumJacobian('weak-spiral', 1, A)).toThrow(RangeError);
    });

    it('decides hyperbolicity exactly: delta != 0 and not (delta > 0 and tau = 0)', () => {
        expect(isHyperbolicEquilibrium('pendulum', 1, A)).toBe(true); // saddle
        expect(isHyperbolicEquilibrium('pendulum', 0, A)).toBe(false); // centre
        expect(isHyperbolicEquilibrium('weak-spiral', 0, A)).toBe(false); // centre linearization
        expect(isHyperbolicEquilibrium('linear', 0, A)).toBe(true);
        expect(isHyperbolic([[0, 1], [0, 0]])).toBe(false); // delta = 0
        expect(isHyperbolic([[0.25, -1], [1, -0.25]])).toBe(false); // tau = 0, delta > 0
        expect(isHyperbolic([[0.25, -1], [1, 0]])).toBe(true);
        expect(isHyperbolic([[-1, 0], [0, 2]])).toBe(true);
        // not applied at a general point: the Jacobian there is off the grid
        expect(() => isHyperbolic(systemJacobian('pendulum', [1, 0], A))).toThrow(RangeError);
    });

    it('reproduces the PP2 pendulum numbers (energy drift, half-period)', () => {
        const f = systemField('pendulum', A);
        const H = ([t, w]: Vec2) => (w * w) / 2 - Math.cos(t);
        const orbit = integrate(f, [1, 0], 100, {h: 0.05});
        const H0 = H([1, 0]);
        expect(H0).toBeCloseTo(-0.540302, 6);
        const drift = Math.max(...orbit.points.map(p => Math.abs(H(p) - H0)));
        expect(drift).toBeLessThan(2e-7);
        expect(drift).toBeGreaterThan(1e-7);
        // half-period: first time omega returns to 0 from (1,0) going down, by linear interpolation at h = 0.001
        const half = integrate(f, [1, 0], 4, {h: 0.001}).points;
        const k = half.findIndex((p, i) => i > 0 && p[1] > 0);
        const frac = -half[k - 1][1] / (half[k][1] - half[k - 1][1]);
        expect((k - 1 + frac) * 0.001).toBeCloseTo(3.349988, 4);
        expect(H([0, 1.9])).toBeCloseTo(0.805, 12); // swing
        expect(H([0, 2])).toBe(1); // exactly the separatrix on the omega-axis (spec says 2: it is H = 1)
        expect(H([0, 2.5])).toBeGreaterThan(1); // rotation
    });

    it('reproduces the PP3 weak-spiral numbers against the polar closed form', () => {
        const f = systemField('weak-spiral', A);
        const radius = (r0: number, t: number, h: number) => Math.hypot(...last(integrate(f, [r0, 0], t, {h}).points));
        const closed = (r0: number, t: number) => r0 / Math.sqrt(1 + 2 * r0 * r0 * t);
        expect(closed(1, 1)).toBeCloseTo(0.5773503, 7);
        expect(radius(1, 1, 0.05)).toBeCloseTo(0.5773502, 7);
        expect(closed(0.1, 10)).toBeCloseTo(0.0912871, 7);
        expect(Math.abs(radius(0.1, 10, 0.05) - closed(0.1, 10))).toBeLessThan(1e-7);
        expect(closed(1, 10)).toBeCloseTo(0.2182179, 7);
        expect(Math.abs(radius(1, 10, 0.02) - closed(1, 10))).toBeLessThan(1e-7);
        // the polar angle advances at rate 1: at t = 1 the point is r(1) (cos 1, sin 1)
        const p = last(integrate(f, [1, 0], 1, {h: 0.01}).points);
        expect(Math.atan2(p[1], p[0])).toBeCloseTo(1, 6);
    });

    it('linear field applies the matrix', () => {
        expect(systemField('linear', A)([1, 0])).toEqual([-4, -2]);
    });
});
