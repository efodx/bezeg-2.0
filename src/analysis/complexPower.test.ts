import {describe, expect, it} from 'vitest';
import {complexIntegerPower} from './complexRootsModel';
import {COMPLEX_POWER_MAX, exactIntegerPower, polarPower} from './complexPower';

const deg = (radians: number) => radians * 180 / Math.PI;

describe('polarPower', () => {
    it('reproduces the 1 + i, n = 5 example', () => {
        const p = polarPower({re: 1, im: 1}, 5);
        expect(p.modulus).toBeCloseTo(4 * Math.SQRT2, 12);
        expect(p.modulus).toBeCloseTo(5.65685, 5);
        expect(deg(p.unwrappedAngle as number)).toBeCloseTo(225, 10);
        expect(deg(p.principalAngle as number)).toBeCloseTo(-135, 10);
    });

    it('reproduces 0.8 + 0.6 i: modulus 1 and the wrapped angle, with n = 10 rejected as out of range', () => {
        expect(() => polarPower({re: 0.8, im: 0.6}, 10)).toThrow(RangeError);
        const p = polarPower({re: 0.8, im: 0.6}, 8);
        expect(p.modulus).toBeCloseTo(1, 12);
        expect(deg(p.unwrappedAngle as number)).toBeCloseTo(8 * 36.8698976458, 8);
        expect(deg(p.principalAngle as number)).toBeCloseTo(8 * 36.8698976458 - 360, 8);
    });

    it('walks 0.5 + 0.5 i through 90, 180 and a full turn', () => {
        const half = {re: 0.5, im: 0.5};
        expect(deg(polarPower(half, 2).principalAngle as number)).toBeCloseTo(90, 12);
        expect(polarPower(half, 2).modulus).toBeCloseTo(0.5, 15);
        expect(polarPower(half, 4).principalAngle).toBeCloseTo(Math.PI, 12);
        expect(polarPower(half, 8).principalAngle as number).toBeCloseTo(0, 12);
        expect(deg(polarPower(half, 8).unwrappedAngle as number)).toBeCloseTo(360, 10);
        expect(polarPower(half, 8).modulus).toBeCloseTo(0.0625, 15);
    });

    it('wraps the principal argument into (-pi, pi] while the unwrapped angle keeps growing', () => {
        const z = {re: 1, im: 1};
        for (let n = 1; n <= 8; n++) {
            const p = polarPower(z, n);
            expect(p.unwrappedAngle).toBeCloseTo(n * Math.PI / 4, 12);
            expect(p.principalAngle as number).toBeGreaterThan(-Math.PI);
            expect(p.principalAngle as number).toBeLessThanOrEqual(Math.PI + 1e-15);
        }
        expect(polarPower(z, 8).unwrappedAngle as number).toBeGreaterThan(Math.PI);
        expect(Math.abs(polarPower(z, 8).principalAngle as number)).toBeLessThan(1e-12);
        expect(polarPower(z, 5).principalAngle as number).toBeLessThan(0);
    });

    it('gives no angles for z = 0', () => {
        expect(polarPower({re: 0, im: 0}, 3)).toEqual({modulus: 0, unwrappedAngle: undefined, principalAngle: undefined});
    });

    it('agrees with repeated multiplication on 1000 seeded grid points and n up to 8', () => {
        let seed = 12345;
        const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
        for (let i = 0; i < 1000; i++) {
            const z = {re: (Math.floor(next() * 81) - 40) / 20, im: (Math.floor(next() * 81) - 40) / 20};
            const n = 1 + Math.floor(next() * COMPLEX_POWER_MAX);
            if (z.re === 0 && z.im === 0) continue;
            const p = polarPower(z, n);
            const oracle = complexIntegerPower(z, n);
            const scale = Math.max(1, Math.hypot(oracle.re, oracle.im));
            // Independent polar form: r^n (cos n phi + i sin n phi), from Math.atan2 and Math.pow.
            const r = Math.hypot(z.re, z.im);
            const phi = Math.atan2(z.im, z.re);
            expect(Math.abs(p.modulus - Math.pow(r, n)) / scale).toBeLessThan(1e-12);
            expect(Math.abs(p.modulus * Math.cos(n * phi) - oracle.re) / scale).toBeLessThan(1e-12);
            expect(Math.abs(p.modulus * Math.sin(n * phi) - oracle.im) / scale).toBeLessThan(1e-12);
            // Kernel angles against the oracle: both the unwrapped and the principal angle give the repeated product.
            expect(Math.abs(p.modulus * Math.cos(p.unwrappedAngle as number) - oracle.re) / scale).toBeLessThan(1e-12);
            expect(Math.abs(p.modulus * Math.sin(p.principalAngle as number) - oracle.im) / scale).toBeLessThan(1e-12);
            expect(Math.abs(Math.hypot(oracle.re, oracle.im) - p.modulus) / scale).toBeLessThan(1e-12);
            expect(p.unwrappedAngle).toBeCloseTo(n * phi, 12);
            expect(Math.abs(p.principalAngle as number)).toBeLessThanOrEqual(Math.PI);
            expect(p.principalAngle as number).toBeGreaterThan(-Math.PI);
        }
    });

    it('gives principal angle pi for odd and 0 for even powers of -1', () => {
        for (let n = 1; n <= 8; n++) {
            const p = polarPower({re: -1, im: 0}, n);
            expect(p.principalAngle).toBeCloseTo(n % 2 === 1 ? Math.PI : 0, 12);
            expect(p.unwrappedAngle).toBeCloseTo(n * Math.PI, 12);
        }
    });

    it('throws RangeError for exponents outside 1..8', () => {
        for (const n of [0, 9, -1, 1.5, NaN]) expect(() => polarPower({re: 1, im: 1}, n)).toThrow(RangeError);
    });
});

describe('exactIntegerPower', () => {
    it('makes (1 + i)^8 exactly 16', () => {
        expect(exactIntegerPower(1, 1, 8)).toEqual({re: 16, im: 0});
        expect(Object.is(exactIntegerPower(1, 1, 8).im, 0)).toBe(true);
    });

    it('gives -4 - 4i for (1 + i)^5 and the powers of i', () => {
        expect(exactIntegerPower(1, 1, 5)).toEqual({re: -4, im: -4});
        expect(exactIntegerPower(0, 1, 4)).toEqual({re: 1, im: 0});
        expect(exactIntegerPower(0, 1, 3)).toEqual({re: 0, im: -1});
    });

    it('decides 0.8 + 0.6 i on the unit circle exactly: (16 + 12i) has modulus 20', () => {
        const p = exactIntegerPower(16, 12, 2);
        expect(p).toEqual({re: 16 * 16 - 12 * 12, im: 2 * 16 * 12});
        expect(p.re ** 2 + p.im ** 2).toBe(20 ** 4);
    });

    it('agrees with complexIntegerPower on a sample and with a BigInt oracle at the corner of the range', () => {
        for (let a = -40; a <= 40; a += 7) {
            for (let b = -40; b <= 40; b += 9) {
                for (let n = 1; n <= 8; n++) {
                    let re = BigInt(a);
                    let im = BigInt(b);
                    for (let k = 1; k < n; k++) [re, im] = [re * BigInt(a) - im * BigInt(b), re * BigInt(b) + im * BigInt(a)];
                    expect(exactIntegerPower(a, b, n)).toEqual({re: Number(re), im: Number(im)});
                    const oracle = complexIntegerPower({re: a, im: b}, n);
                    expect(Math.abs(oracle.re - Number(re))).toBeLessThanOrEqual(1e-12 * Math.max(1, Math.abs(Number(re))));
                }
            }
        }
        let re = 40n;
        let im = 40n;
        for (let k = 1; k < 8; k++) [re, im] = [re * 40n - im * 40n, re * 40n + im * 40n];
        expect(exactIntegerPower(40, 40, 8)).toEqual({re: Number(re), im: Number(im)});
        expect(Number.isSafeInteger(exactIntegerPower(40, 40, 8).re)).toBe(true);
    });

    it('throws RangeError beyond n = 8, beyond 40 grid units, or for non-integers', () => {
        expect(() => exactIntegerPower(1, 1, 9)).toThrow(RangeError);
        expect(() => exactIntegerPower(1, 1, 0)).toThrow(RangeError);
        expect(() => exactIntegerPower(41, 0, 2)).toThrow(RangeError);
        expect(() => exactIntegerPower(0, -41, 2)).toThrow(RangeError);
        expect(() => exactIntegerPower(0.5, 1, 2)).toThrow(RangeError);
    });
});
