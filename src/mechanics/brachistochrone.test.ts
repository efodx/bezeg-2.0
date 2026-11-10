import { describe, expect, it } from 'vitest';
import { brachistochrone } from './brachistochrone';
import { descentTime, G } from './descentTime';
import type { Vec2 } from './tracks';

/** Independent solver: root of (θ - sin θ) - ratio (1 - cos θ) on [1e-3, 2π - 1e-6] by 100 bisections. */
function solveTheta(ratio: number): number {
    const f = (th: number) => th - Math.sin(th) - ratio * (1 - Math.cos(th));
    let lo = 1e-3;
    let hi = 2 * Math.PI - 1e-6;
    for (let i = 0; i < 100; i++) {
        const mid = (lo + hi) / 2;
        if (f(mid) < 0) lo = mid;
        else hi = mid;
    }
    return (lo + hi) / 2;
}

describe('brachistochrone', () => {
    it('MC2 default B = (3.25, 2): theta_B = 3.194665, r = 1.000704, T = 1.02034', () => {
        const b = brachistochrone([3.25, 2]);
        expect(b.theta).toBeCloseTo(3.194665, 6);
        expect(b.r).toBeCloseTo(1.000704, 6);
        expect(b.time).toBeCloseTo(1.02034, 5);
    });

    it('MC1 end point of one arch (pi, 2) gives theta = pi, r = 1', () => {
        const b = brachistochrone([Math.PI, 2]);
        expect(b.theta).toBeCloseTo(Math.PI, 12);
        expect(b.r).toBeCloseTo(1, 12);
        expect(b.time).toBeCloseTo(Math.PI / Math.sqrt(G), 12);
    });

    it('theta_B agrees with an independent bisection and the cycloid passes through B to 1e-12', () => {
        const ends: Vec2[] = [[3.25, 2], [0.25, 3], [4, 0.25], [1, 1], [Math.PI, 2], [6, 0.5], [0.5, 4]];
        for (const B of ends) {
            const b = brachistochrone(B);
            expect(Math.abs(b.theta - solveTheta(B[0] / B[1]))).toBeLessThan(1e-9);
            const p = b.track.point(b.theta);
            expect(Math.abs(p[0] - B[0])).toBeLessThan(1e-12);
            expect(Math.abs(p[1] - B[1])).toBeLessThan(1e-12);
        }
    });

    it('closed-form time equals the quadrature on the same cycloid', () => {
        for (const B of [[3.25, 2], [0.25, 3], [4, 0.25], [1, 1]] as Vec2[]) {
            const b = brachistochrone(B);
            expect(Math.abs(descentTime(b.track) - b.time)).toBeLessThan(1e-12 * Math.max(1, b.time));
        }
    });

    it('the cycloid beats the line to the same end point', () => {
        const B: Vec2 = [3.25, 2];
        const lineT = Math.hypot(...B) / Math.sqrt(G) * Math.sqrt(1); // L / sqrt(g) holds only for B = (x, 2)
        expect(lineT).toBeCloseTo(1.21838, 5);
        expect(brachistochrone(B).time).toBeLessThan(lineT);
    });

    it('rejects end points that are not strictly right of and below the start', () => {
        expect(() => brachistochrone([0, 1])).toThrow(RangeError);
        expect(() => brachistochrone([1, 0])).toThrow(RangeError);
        expect(() => brachistochrone([-1, 1])).toThrow(RangeError);
    });
});
