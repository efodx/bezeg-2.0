import {describe, expect, it} from 'vitest';
import {circularMotion, eulerPoint, expSeriesPartial} from './eulerCircle';

describe('eulerPoint', () => {
    it('gives exact axis points at multiples of 90 degrees, also negative and beyond a turn', () => {
        expect(eulerPoint(0)).toEqual({re: 1, im: 0, exact: true});
        expect(eulerPoint(90)).toEqual({re: 0, im: 1, exact: true});
        expect(eulerPoint(180)).toEqual({re: -1, im: 0, exact: true});
        expect(eulerPoint(270)).toEqual({re: 0, im: -1, exact: true});
        expect(eulerPoint(-90)).toEqual({re: 0, im: -1, exact: true});
        expect(eulerPoint(450)).toEqual({re: 0, im: 1, exact: true});
        expect(Object.is(eulerPoint(-360).im, 0)).toBe(true);
    });

    it('marks other angles as computed and reproduces theta = 30 degrees', () => {
        const p = eulerPoint(30);
        expect(p.exact).toBe(false);
        expect(p.re).toBeCloseTo(0.8660254, 7);
        expect(p.im).toBeCloseTo(0.5, 15);
    });

    it('stays on the unit circle to 1e-15 at every integer degree and obeys the product rule on 360 pairs', () => {
        for (let d = 0; d < 360; d++) expect(Math.abs(Math.hypot(eulerPoint(d).re, eulerPoint(d).im) - 1)).toBeLessThan(1e-15);
        for (let i = 0; i < 360; i++) {
            const a = (i * 7) % 360;
            const b = (i * 13 + 5) % 360;
            const x = eulerPoint(a);
            const y = eulerPoint(b);
            const sum = eulerPoint(a + b);
            // Spec: the product rule holds to 4e-15 (about 20 ulp) on the 360-pair grid.
            expect(Math.abs(x.re * y.re - x.im * y.im - sum.re)).toBeLessThan(4e-15);
            expect(Math.abs(x.re * y.im + x.im * y.re - sum.im)).toBeLessThan(4e-15);
        }
        const s = eulerPoint(30);
        const t = eulerPoint(45);
        expect(s.re * t.re - s.im * t.im).toBeCloseTo(0.258819, 6);
        expect(s.re * t.im + s.im * t.re).toBeCloseTo(0.9659258, 7);
    });

    it('throws RangeError for a non-integer angle', () => {
        expect(() => eulerPoint(0.5)).toThrow(RangeError);
        expect(() => eulerPoint(NaN)).toThrow(RangeError);
    });
});

describe('circularMotion', () => {
    it('reproduces omega = 2 at t = pi/12', () => {
        const m = circularMotion(2, Math.PI / 12);
        expect(m.position.re).toBeCloseTo(0.8660254, 7);
        expect(m.position.im).toBeCloseTo(0.5, 15);
        expect(m.velocity.re).toBeCloseTo(-1, 12);
        expect(m.velocity.im).toBeCloseTo(1.7320508, 7);
        expect(Math.hypot(m.velocity.re, m.velocity.im)).toBeCloseTo(2, 12);
        expect(m.velocity.re * m.position.re + m.velocity.im * m.position.im).toBeCloseTo(0, 12);
        expect(m.acceleration.re).toBeCloseTo(-4 * m.position.re, 12);
        expect(m.acceleration.im).toBeCloseTo(-4 * m.position.im, 12);
    });

    it('matches central differences of the position and of the velocity', () => {
        const h = 1e-6;
        for (const [omega, t] of [[2, Math.PI / 12], [-3, 0.7], [0.5, 4]]) {
            const m = circularMotion(omega, t);
            const before = circularMotion(omega, t - h);
            const after = circularMotion(omega, t + h);
            expect(Math.abs((after.position.re - before.position.re) / (2 * h) - m.velocity.re)).toBeLessThan(1e-8);
            expect(Math.abs((after.position.im - before.position.im) / (2 * h) - m.velocity.im)).toBeLessThan(1e-8);
            expect(Math.abs((after.velocity.re - before.velocity.re) / (2 * h) - m.acceleration.re)).toBeLessThan(1e-8);
            expect(Math.abs((after.velocity.im - before.velocity.im) / (2 * h) - m.acceleration.im)).toBeLessThan(1e-8);
        }
    });

    it('is periodic with period 2 pi / omega and throws RangeError for non-finite input', () => {
        const a = circularMotion(2, 0.3).position;
        const b = circularMotion(2, 0.3 + Math.PI).position;
        expect(Math.hypot(a.re - b.re, a.im - b.im)).toBeLessThan(1e-12);
        expect(() => circularMotion(Infinity, 1)).toThrow(RangeError);
        expect(() => circularMotion(1, NaN)).toThrow(RangeError);
    });
});

describe('expSeriesPartial', () => {
    const factorial = (k: number): number => (k <= 1 ? 1 : k * factorial(k - 1));

    it('reproduces the listed partial sums at theta = pi', () => {
        const at = (n: number) => expSeriesPartial(Math.PI, n);
        expect(at(1).re).toBe(1);
        expect(at(1).im).toBeCloseTo(3.1416, 4);
        expect(at(3).re).toBeCloseTo(-3.9348, 4);
        expect(at(3).im).toBeCloseTo(-2.03, 2);
        expect(at(5).re).toBeCloseTo(0.1239, 4);
        expect(at(5).im).toBeCloseTo(0.524, 3);
        expect(at(9).re).toBeCloseTo(-0.976, 3);
        expect(at(9).im).toBeCloseTo(0.0069, 4);
        expect(at(13).re).toBeCloseTo(-0.9999, 4);
        expect(at(13).im).toBeCloseTo(2.1e-5, 6);
        expect(at(21).re).toBeCloseTo(-1, 7);
        expect(at(21).im).toBeCloseTo(1.0e-11, 12);
        expect(at(30).re).toBeCloseTo(-1, 14);
        expect(Math.abs(at(30).im)).toBeLessThan(1e-14);
    });

    it('equals the direct Taylor partial sums of cos and sin and stays within the closed-form tail bound of Math.cos and Math.sin', () => {
        for (const theta of [Math.PI, 0.5, -2, 3.5]) {
            for (let N = 1; N <= 30; N++) {
                let cosSum = 0;
                let sinSum = 0;
                for (let k = 0; k <= N; k++) {
                    const term = Math.pow(theta, k) / factorial(k);
                    if (k % 4 === 0) cosSum += term;
                    else if (k % 4 === 1) sinSum += term;
                    else if (k % 4 === 2) cosSum -= term;
                    else sinSum -= term;
                }
                const p = expSeriesPartial(theta, N);
                expect(Math.abs(p.re - cosSum)).toBeLessThan(1e-12);
                expect(Math.abs(p.im - sinSum)).toBeLessThan(1e-12);
                // Tail of the exponential series: |theta|^(N+1)/(N+1)! / (1 - |theta|/(N+2)) while |theta| < N + 2.
                const x = Math.abs(theta);
                if (x < N + 2) {
                    const bound = Math.pow(x, N + 1) / factorial(N + 1) / (1 - x / (N + 2));
                    const error = Math.hypot(p.re - Math.cos(theta), p.im - Math.sin(theta));
                    expect(error).toBeLessThanOrEqual(bound + 1e-15);
                }
            }
        }
    });

    it('is below 1e-10 from (cos pi, sin pi) at degree 21', () => {
        const p = expSeriesPartial(Math.PI, 21);
        expect(Math.hypot(p.re - Math.cos(Math.PI), p.im - Math.sin(Math.PI))).toBeLessThan(1e-10);
    });

    it('throws RangeError for degrees outside 1..30 or non-finite theta', () => {
        for (const n of [0, 31, 2.5, NaN]) expect(() => expSeriesPartial(1, n)).toThrow(RangeError);
        expect(() => expSeriesPartial(Infinity, 3)).toThrow(RangeError);
    });
});
