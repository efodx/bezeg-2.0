import {describe, expect, it} from 'vitest';
import {compound, conformalRate, eApprox, relative, simple} from './interest';

describe('interest', () => {
    it('reproduces the RG3 default example', () => {
        expect(simple(1000, 0.05, 10)).toBeCloseTo(1500, 9);
        expect(compound(1000, 0.05, 10)).toBeCloseTo(1628.89, 2);
        expect(relative(1000, 0.05, 12, 10)).toBeCloseTo(1647.01, 2);
        expect(1000 * Math.exp(0.05 * 10)).toBeCloseTo(1648.72, 2);
        expect(conformalRate(0.05, 12) * 100).toBeCloseTo(0.407412, 6);
    });

    it('matches closed forms: compound by repeated multiplication, simple by repeated addition', () => {
        let c = 1000;
        let s = 1000;
        for (let year = 1; year <= 40; year++) {
            c *= 1.05;
            s += 50;
            expect(Math.abs(compound(1000, 0.05, year) - c)).toBeLessThan(1e-9 * c);
            expect(simple(1000, 0.05, year)).toBeCloseTo(s, 9);
        }
        expect(compound(1000, 0.05, 1)).toBeCloseTo(relative(1000, 0.05, 1, 1), 9);
    });

    it('conformal round trip reproduces the yearly growth within 1e-9 relative', () => {
        for (const m of [1, 2, 4, 12, 365]) {
            for (const p of [0.005, 0.05, 0.12, 0.5]) {
                const perPart = conformalRate(p, m);
                const viaParts = 1000 * Math.pow(1 + perPart, m * 10);
                const direct = compound(1000, p, 10);
                expect(Math.abs(viaParts - direct) / direct, `m=${m} p=${p}`).toBeLessThan(1e-9);
            }
        }
        expect(conformalRate(0.05, 1)).toBeCloseTo(0.05, 15);
    });

    it('relative interest grows with m toward e^(p t)', () => {
        const values = [1, 2, 4, 12, 365].map(m => relative(1000, 0.05, m, 10));
        for (let i = 1; i < values.length; i++) expect(values[i]).toBeGreaterThan(values[i - 1]);
        expect(values[4]).toBeLessThan(1000 * Math.exp(0.5));
    });

    it('eApprox gives the RG3 table and rejects n > 10^6', () => {
        const expected: [number, number][] = [[1, 2], [10, 2.593742], [100, 2.704814], [1000, 2.716924], [1_000_000, 2.718280]];
        for (const [n, v] of expected) expect(eApprox(n)).toBeCloseTo(v, 6);
        expect(Math.abs(eApprox(1_000_000) - Math.E)).toBeLessThan(2e-6);
        expect(() => eApprox(1_000_001)).toThrow(RangeError);
        expect(() => eApprox(1e15)).toThrow(RangeError);
        expect(() => eApprox(0)).toThrow(RangeError);
        expect(() => eApprox(2.5)).toThrow(RangeError);
    });

    it('rejects non-finite inputs and bad parts per year', () => {
        expect(() => simple(NaN, 0.05, 1)).toThrow(RangeError);
        expect(() => compound(1, Infinity, 1)).toThrow(RangeError);
        expect(() => relative(1, 0.05, 0, 1)).toThrow(RangeError);
        expect(() => conformalRate(0.05, 1.5)).toThrow(RangeError);
    });
});
