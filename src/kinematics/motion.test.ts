import {describe, expect, it} from "vitest";
import {cycloidSource} from "../bezeg/impl/curve/parametric-sources";
import type {DerivativeSource} from "../bezeg/impl/curve/curvature";
import {arcLengthBetween} from "../bezeg/impl/kernels/arc-length";
import {
    circularSource, G, projectileSource, projectileSummary, reparametrize, sineWarp, tangentialStatus,
} from "./motion";

const H = 1e-5;

/** Central finite differences of the position and of r'; independent of the analytic d1, d2. */
function finiteDifferences(src: DerivativeSource, t: number) {
    const p = (s: number) => src.at(s).point;
    const d = (s: number) => src.at(s).d1;
    return {
        d1: [0, 1].map(i => (p(t + H)[i] - p(t - H)[i]) / (2 * H)),
        d2: [0, 1].map(i => (d(t + H)[i] - d(t - H)[i]) / (2 * H)),
    };
}

function expectFiniteDifferenceMatch(src: DerivativeSource, ts: number[]) {
    for (const t of ts) {
        const fd = finiteDifferences(src, t);
        const exact = src.at(t);
        for (const i of [0, 1]) {
            expect(fd.d1[i]).toBeCloseTo(exact.d1[i], 7);
            expect(fd.d2[i]).toBeCloseTo(exact.d2[i], 5);
        }
    }
}

function simpsonLength(src: DerivativeSource, a: number, b: number, n = 4000): number {
    const f = (t: number) => Math.hypot(...src.at(t).d1);
    const h = (b - a) / n;
    let s = f(a) + f(b);
    for (let i = 1; i < n; i++) {
        s += f(a + i * h) * (i % 2 ? 4 : 2);
    }
    return s * h / 3;
}

describe('G', () => {
    it('is 9.81', () => {
        expect(G).toBe(9.81);
    });
});

describe('projectileSource', () => {
    it('matches the closed forms', () => {
        const src = projectileSource(20, 45);
        const c = Math.SQRT1_2 * 20;
        const at1 = src.at(1);
        expect(at1.point[0]).toBeCloseTo(14.1421, 4);
        expect(at1.point[1]).toBeCloseTo(9.2371, 4);
        expect(at1.d1[0]).toBeCloseTo(c, 12);
        expect(at1.d1[1]).toBeCloseTo(c - 9.81, 12);
        expect(Math.hypot(...at1.d1)).toBeCloseTo(14.7908, 4);
        expect(at1.d2).toEqual([0, -9.81]);
    });

    it('agrees with central finite differences', () => {
        expectFiniteDifferenceMatch(projectileSource(20, 30), [0, 0.7, 1.9, 3]);
    });

    it('rejects out-of-range and non-finite input', () => {
        expect(() => projectileSource(20, 4.9)).toThrow(RangeError);
        expect(() => projectileSource(20, 85.1)).toThrow(RangeError);
        expect(() => projectileSource(20, NaN)).toThrow(RangeError);
        expect(() => projectileSource(Infinity, 45)).toThrow(RangeError);
        expect(() => projectileSource(0, 45)).toThrow(RangeError);
        expect(() => projectileSource(20, 45, 0)).toThrow(RangeError);
        expect(() => projectileSource(20, 5)).not.toThrow();
        expect(() => projectileSource(20, 85)).not.toThrow();
    });
});

describe('circularSource', () => {
    it('matches the closed forms of the KN4 example', () => {
        const src = circularSource(2, Math.PI / 2);
        const at = src.at(1);
        expect(at.point[0]).toBeCloseTo(0, 12);
        expect(at.point[1]).toBeCloseTo(2, 12);
        expect(at.d1[0]).toBeCloseTo(-3.14159, 4);
        expect(at.d1[1]).toBeCloseTo(0, 12);
        expect(at.d2[0]).toBeCloseTo(0, 12);
        expect(at.d2[1]).toBeCloseTo(-4.9348, 4);
    });

    it('agrees with central finite differences', () => {
        expectFiniteDifferenceMatch(circularSource(3, 1.75), [0, 0.4, 2.2, 5]);
    });

    it('rejects R and omega outside their ranges and non-finite input', () => {
        expect(() => circularSource(0.4, 1)).toThrow(RangeError);
        expect(() => circularSource(4.1, 1)).toThrow(RangeError);
        expect(() => circularSource(1, 0.4)).toThrow(RangeError);
        expect(() => circularSource(1, 4.1)).toThrow(RangeError);
        expect(() => circularSource(NaN, 1)).toThrow(RangeError);
        expect(() => circularSource(1, Infinity)).toThrow(RangeError);
        expect(() => circularSource(0.5, 4)).not.toThrow();
        expect(() => circularSource(4, 0.5)).not.toThrow();
    });
});

describe('reparametrize', () => {
    const unit = circularSource(1, 1);

    it('matches the KN2 closed-form values (speed 1 + b cos t)', () => {
        const warped = reparametrize(unit, sineWarp(0.5));
        for (const [t, speed] of [[0, 1.5], [Math.PI / 2, 1], [Math.PI, 0.5]] as const) {
            expect(Math.hypot(...warped.at(t).d1)).toBeCloseTo(speed, 12);
        }
        // Closed form of r'' for theta = t + b sin t on the unit circle, written out by hand:
        // r'' = -theta'^2 (cos, sin) + theta'' (-sin, cos).
        for (const t of [0, 0.8, Math.PI / 2, 2.5, Math.PI]) {
            const th = t + 0.5 * Math.sin(t);
            const th1 = 1 + 0.5 * Math.cos(t);
            const th2 = -0.5 * Math.sin(t);
            const d2 = warped.at(t).d2;
            expect(d2[0]).toBeCloseTo(-th1 * th1 * Math.cos(th) - th2 * Math.sin(th), 12);
            expect(d2[1]).toBeCloseTo(-th1 * th1 * Math.sin(th) + th2 * Math.cos(th), 12);
        }
    });

    it('keeps the path: points lie on the unit circle', () => {
        const warped = reparametrize(unit, sineWarp(0.9));
        for (let i = 0; i < 50; i++) {
            const [x, y] = warped.at(i * 0.13).point;
            expect(Math.hypot(x, y)).toBeCloseTo(1, 12);
        }
    });

    it('agrees with finite differences of its own position', () => {
        expectFiniteDifferenceMatch(reparametrize(unit, sineWarp(0.7)), [0, 0.9, 2, 4]);
        expectFiniteDifferenceMatch(reparametrize(cycloidSource(1), sineWarp(0.4)), [0.3, 1.7, 3]);
    });

    it('reaches the quarter turn at t = 1.1206 instead of pi/2', () => {
        const warped = reparametrize(unit, sineWarp(0.5));
        let lo = 0;
        let hi = Math.PI / 2;
        for (let i = 0; i < 80; i++) {
            const mid = (lo + hi) / 2;
            if (warped.at(mid).point[0] > 0) {
                lo = mid;
            } else {
                hi = mid;
            }
        }
        expect(lo).toBeCloseTo(1.1206, 4);
    });

    it('rejects b near 1, negative or non-finite b, and a non-finite phi', () => {
        expect(() => sineWarp(0.91)).toThrow(RangeError);
        expect(() => sineWarp(0.99)).toThrow(RangeError);
        expect(() => sineWarp(1)).toThrow(RangeError);
        expect(() => sineWarp(-0.1)).toThrow(RangeError);
        expect(() => sineWarp(NaN)).toThrow(RangeError);
        expect(() => sineWarp(0.9)).not.toThrow();
        expect(() => reparametrize(unit, () => [NaN, 1, 0]).at(0)).toThrow(RangeError);
    });
});

describe('arc length', () => {
    it('is 2 pi for both parametrizations of the unit circle', () => {
        const unit = circularSource(1, 1);
        const warped = reparametrize(unit, sineWarp(0.5));
        const opts = {subintervals: 24};
        expect(arcLengthBetween(unit, 0, 2 * Math.PI, opts)).toBeCloseTo(2 * Math.PI, 9);
        expect(arcLengthBetween(warped, 0, 2 * Math.PI, opts)).toBeCloseTo(2 * Math.PI, 9);
        expect(simpsonLength(unit, 0, 2 * Math.PI)).toBeCloseTo(2 * Math.PI, 9);
        expect(simpsonLength(warped, 0, 2 * Math.PI)).toBeCloseTo(2 * Math.PI, 9);
    });

    it('is 8 for the cycloid arch (rolling radius 1)', () => {
        const c = cycloidSource(1);
        expect(arcLengthBetween(c, 0, 2 * Math.PI, {subintervals: 24})).toBeCloseTo(8, 9);
        expect(simpsonLength(c, 0, 2 * Math.PI)).toBeCloseTo(8, 6);
    });
});

describe('projectileSummary', () => {
    const bisect = (src: DerivativeSource, lo: number, hi: number) => {
        for (let i = 0; i < 200; i++) {
            const mid = (lo + hi) / 2;
            if (src.at(mid).point[1] > 0) {
                lo = mid;
            } else {
                hi = mid;
            }
        }
        return lo;
    };

    it('matches the KN3 numbers', () => {
        const s45 = projectileSummary(20, 45);
        expect(s45.flightTime).toBeCloseTo(2.8832, 4);
        expect(s45.range).toBeCloseTo(40.7747, 4);
        expect(s45.maxHeight).toBeCloseTo(10.1937, 4);
        expect(s45.apexTime).toBeCloseTo(1.4416, 4);
        expect(s45.vx).toBeCloseTo(14.1421, 4);
        expect(s45.vy).toBeCloseTo(14.1421, 4);
        const s30 = projectileSummary(20, 30);
        const s60 = projectileSummary(20, 60);
        expect(s30.range).toBeCloseTo(35.3119, 4);
        expect(s60.range).toBeCloseTo(35.3119, 4);
        expect(s30.maxHeight).toBeCloseTo(5.0968, 4);
        expect(s60.maxHeight).toBeCloseTo(15.2905, 4);
        expect(s30.range / s60.range).toBeCloseTo(1, 12);
    });

    it('matches the range formula v0^2 sin(2a) / g to 1e-12 relative', () => {
        for (const [v0, a] of [[20, 45], [5, 5], [30, 85], [17, 33]]) {
            const expected = v0 * v0 * Math.sin(2 * a * Math.PI / 180) / G;
            expect(Math.abs(projectileSummary(v0, a).range - expected) / expected).toBeLessThan(1e-12);
        }
    });

    it('matches bisection on y(t) = 0 and the apex of the source', () => {
        for (const [v0, a] of [[20, 45], [20, 30], [8, 75], [30, 5]]) {
            const src = projectileSource(v0, a);
            const s = projectileSummary(v0, a);
            const tEnd = bisect(src, s.flightTime / 2, s.flightTime * 2);
            expect(tEnd).toBeCloseTo(s.flightTime, 9);
            expect(src.at(tEnd).point[0]).toBeCloseTo(s.range, 8);
            expect(src.at(s.apexTime).d1[1]).toBeCloseTo(0, 12);
            expect(src.at(s.apexTime).point[1]).toBeCloseTo(s.maxHeight, 10);
        }
    });

    it('has the parabola path y = x tan a - g x^2 / (2 v0^2 cos^2 a)', () => {
        const src = projectileSource(20, 45);
        const al = Math.PI / 4;
        for (const t of [0.3, 1, 2.5]) {
            const [x, y] = src.at(t).point;
            expect(y).toBeCloseTo(x * Math.tan(al) - G * x * x / (2 * 400 * Math.cos(al) ** 2), 10);
        }
    });

    it('rejects invalid input', () => {
        expect(() => projectileSummary(20, 90)).toThrow(RangeError);
        expect(() => projectileSummary(NaN, 45)).toThrow(RangeError);
    });
});

describe('tangentialStatus', () => {
    it('is constant speed for circular motion by id, whatever the computed a_T', () => {
        expect(tangentialStatus('circular', 1e-15, 5)).toBe('constant-speed');
        expect(tangentialStatus('circular', 0.3, 5)).toBe('constant-speed');
    });

    it('never gives the projectile a constant-speed label', () => {
        expect(tangentialStatus('projectile', 4, G)).toBe('speeding-up');
        expect(tangentialStatus('projectile', -4, G)).toBe('slowing-down');
        expect(tangentialStatus('projectile', 0, G)).toBe('stationary-approx');
    });

    it('uses the 1e-9 |r\'\'| threshold for other sources, with KN5 t = pi and KN2 t = 0', () => {
        expect(tangentialStatus('generic', 1e-9 * 0.5, 1)).toBe('stationary-approx');
        expect(tangentialStatus('generic', 2e-9, 1)).toBe('speeding-up');
        expect(tangentialStatus('generic', -2e-9, 1)).toBe('slowing-down');
        // Cycloid at t = pi: a_T = cos(pi/2) is about 6e-17 in floating point.
        const c = cycloidSource(1).at(Math.PI);
        const aT = (c.d1[0] * c.d2[0] + c.d1[1] * c.d2[1]) / Math.hypot(...c.d1);
        expect(tangentialStatus('generic', aT, Math.hypot(...c.d2))).toBe('stationary-approx');
        // KN2 t = 0: the warped circle has a_T = 0 up to rounding.
        const w = reparametrize(circularSource(1, 1), sineWarp(0.5)).at(0);
        const aT0 = (w.d1[0] * w.d2[0] + w.d1[1] * w.d2[1]) / Math.hypot(...w.d1);
        expect(tangentialStatus('generic', aT0, Math.hypot(...w.d2))).toBe('stationary-approx');
    });

    it('rejects non-finite input', () => {
        expect(() => tangentialStatus('generic', NaN, 1)).toThrow(RangeError);
    });
});

describe('apex curvature', () => {
    it('projectile curvature at the apex is g / vx^2', () => {
        const p = projectileSource(20, 45).at(projectileSummary(20, 45).apexTime);
        const vx = p.d1[0];
        const kappa = Math.abs(p.d1[0] * p.d2[1] - p.d1[1] * p.d2[0]) / Math.hypot(...p.d1) ** 3;
        expect(kappa).toBeCloseTo(G / (vx * vx), 12);
        expect(kappa).toBeCloseTo(0.04905, 5);
    });
});
