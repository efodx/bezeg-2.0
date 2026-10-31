import {describe, expect, it} from 'vitest';
import {Complex, complexArgument, complexModulus, complexMultiply} from './complex';
import {nthRoots} from './complexRoots';

const rootsOf = (w: Complex, n: number) => {
    const r = nthRoots(w, n);
    if (r.kind !== 'roots') throw new Error('expected roots');
    return r;
};
const deg = (rad: number) => rad * 180 / Math.PI;

describe('nthRoots values (acceptance 1)', () => {
    it('w = 8i, n = 3', () => {
        const {roots} = rootsOf({re: 0, im: 8}, 3);
        const expected = [[Math.sqrt(3), 1, 30], [-Math.sqrt(3), 1, 150], [0, -2, -90]];
        expected.forEach(([re, im, angle], k) => {
            expect(Math.abs(roots[k].point.re - re)).toBeLessThan(1e-12);
            expect(Math.abs(roots[k].point.im - im)).toBeLessThan(1e-12);
            expect(deg(roots[k].argument)).toBeCloseTo(angle, 9);
            expect(roots[k].index).toBe(k);
        });
    });
    it('w = 1 + i, n = 3', () => {
        const r = rootsOf({re: 1, im: 1}, 3);
        expect(r.radius).toBeCloseTo(Math.pow(2, 1 / 6), 12);
        expect(r.radius).toBeCloseTo(1.12246, 5);
        [15, 135, -105].forEach((a, k) => expect(deg(r.roots[k].argument)).toBeCloseTo(a, 9));
    });
    it('every root satisfies z^n = w, sum 0, product (-1)^(n+1) w', () => {
        const ws: Complex[] = [{re: 1, im: 1}, {re: -2, im: 0.35}, {re: 0.05, im: -2}, {re: 2, im: 2}, {re: -0.05, im: 0}];
        for (const w of ws) {
            for (let n = 2; n <= 8; n++) {
                const {roots} = rootsOf(w, n);
                expect(roots).toHaveLength(n);
                let sum: Complex = {re: 0, im: 0};
                let product: Complex = {re: 1, im: 0};
                for (const {point} of roots) {
                    let power: Complex = {re: 1, im: 0};
                    for (let i = 0; i < n; i++) power = complexMultiply(power, point);
                    expect(complexModulus({re: power.re - w.re, im: power.im - w.im})).toBeLessThan(1e-12 * complexModulus(w));
                    sum = {re: sum.re + point.re, im: sum.im + point.im};
                    product = complexMultiply(product, point);
                }
                const sign = n % 2 === 1 ? 1 : -1;
                expect(complexModulus(sum)).toBeLessThan(1e-12 * Math.max(1, complexModulus(w)));
                expect(complexModulus({re: product.re - sign * w.re, im: product.im - sign * w.im}))
                    .toBeLessThan(1e-12 * complexModulus(w));
            }
        }
    });
});

describe('w = 0 and invalid degrees (acceptance 2)', () => {
    it('returns the single root 0 with multiplicity n', () => {
        for (let n = 2; n <= 8; n++) {
            expect(nthRoots({re: 0, im: 0}, n)).toEqual({kind: 'zero', degree: n, root: {re: 0, im: 0}, multiplicity: n});
        }
        expect(nthRoots({re: -0, im: 0}, 4).kind).toBe('zero');
    });
    it('rejects other degrees with a typed result', () => {
        for (const n of [1, 0, 9, -3, 2.5, NaN, Infinity]) expect(nthRoots({re: 1, im: 0}, n)).toEqual({kind: 'invalid-degree'});
    });
});

describe('ordering and branch cut (acceptance 3)', () => {
    const args = (w: Complex) => rootsOf(w, 3).roots.map(r => deg(r.argument));
    it('follows the convention just above and below the negative real axis', () => {
        const above = args({re: -8, im: 1e-12});
        const below = args({re: -8, im: -1e-12});
        [60, 180, -60].forEach((a, k) => expect(Math.abs(above[k] - a)).toBeLessThan(1e-6));
        [-60, 60, -180].forEach((a, k) => expect(Math.abs(below[k] - a)).toBeLessThan(1e-6));
    });
    it('the set of roots is the same across the cut to 1e-12', () => {
        const a = rootsOf({re: -8, im: 1e-12}, 3).roots.map(r => r.point);
        const b = rootsOf({re: -8, im: -1e-12}, 3).roots.map(r => r.point);
        for (const p of a) {
            expect(Math.min(...b.map(q => complexModulus({re: p.re - q.re, im: p.im - q.im})))).toBeLessThan(1e-11);
        }
    });
    it('an exactly negative real w has argument exactly pi and root 0 at pi/n', () => {
        for (let n = 2; n <= 8; n++) {
            const r = rootsOf({re: -8, im: 0}, n);
            expect(r.argument).toBe(Math.PI);
            expect(r.argument).toBe(complexArgument({re: -8, im: 0}));
            expect(r.roots[0].argument).toBeCloseTo(Math.PI / n, 12);
        }
        expect(rootsOf({re: -0.05, im: -0}, 5).argument).toBe(Math.PI);
    });
});
