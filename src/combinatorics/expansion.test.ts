import {describe, expect, it} from 'vitest';
import {expandBinomial, expandShifted} from './expansion';

/** Oracle: repeated polynomial multiplication by (x + c); index 0 is x^n. */
function multiply(n: number, c: number): bigint[] {
    let poly: bigint[] = [1n];
    for (let i = 0; i < n; i++) {
        const next = new Array<bigint>(poly.length + 1).fill(0n);
        poly.forEach((v, j) => { next[j] += v; next[j + 1] += v * BigInt(c); });
        poly = next;
    }
    return poly;
}

describe('expansion', () => {
    it('expandShifted matches repeated multiplication, n <= 30, |c| <= 9', () => {
        for (let n = 0; n <= 30; n++) for (let c = -9; c <= 9; c++) expect(expandShifted(n, c)).toEqual(multiply(n, c));
    });

    it('reproduces the CB4 numbers', () => {
        expect(expandBinomial(4)).toEqual([1n, 4n, 6n, 4n, 1n]);
        expect(expandShifted(5, 2)).toEqual([1n, 10n, 40n, 80n, 80n, 32n]);
        expect(expandShifted(5, 2)[2]).toBe(40n);
        expect(expandShifted(5, 2).reduce((s, x) => s + x, 0n)).toBe(243n);
    });

    it('row sums are 2^n and the alternating sum is 0 (1 for n = 0)', () => {
        for (let n = 0; n <= 60; n++) {
            expect(expandBinomial(n).reduce((s, x) => s + x, 0n)).toBe(2n ** BigInt(n));
            expect(expandShifted(n, 1)).toEqual(expandBinomial(n));
            expect(expandShifted(n, -1).reduce((s, x) => s + x, 0n)).toBe(n === 0 ? 1n : 0n);
        }
    });

    it('rejects invalid input', () => {
        expect(() => expandShifted(3, 10)).toThrow(RangeError);
        expect(() => expandShifted(3, -10)).toThrow(RangeError);
        expect(() => expandShifted(3, 0.5)).toThrow(RangeError);
        expect(() => expandShifted(201, 1)).toThrow(RangeError);
        expect(() => expandBinomial(-1)).toThrow(RangeError);
    });
});
