import {describe, expect, it} from 'vitest';
import {binomial} from './binomial';
import {pascalRow} from './pascal';

describe('pascalRow', () => {
    it('equals binomial for every entry, n <= 200', () => {
        for (let n = 0; n <= 200; n++) {
            const row = pascalRow(n);
            expect(row).toHaveLength(n + 1);
            for (let k = 0; k <= n; k++) expect(row[k]).toBe(binomial(n, k));
        }
    });

    it('reproduces the CB5 row 10, sum 2^n and alternating sum', () => {
        expect(pascalRow(10)).toEqual([1n, 10n, 45n, 120n, 210n, 252n, 210n, 120n, 45n, 10n, 1n]);
        for (let n = 0; n <= 60; n++) {
            const row = pascalRow(n);
            expect(row.reduce((s, x) => s + x, 0n)).toBe(2n ** BigInt(n));
            const alt = row.reduce((s, x, k) => (k % 2 ? s - x : s + x), 0n);
            expect(alt).toBe(n === 0 ? 1n : 0n);
        }
        // hockey stick: C(3,3)+C(4,3)+...+C(7,3) = 1+4+10+20+35 = 70 = C(8,4)
        expect([0, 1, 2, 3, 4].reduce((s, j) => s + pascalRow(3 + j)[3], 0n)).toBe(70n);
        expect(pascalRow(8)[4]).toBe(70n);
    });

    it('rejects invalid rows', () => {
        expect(() => pascalRow(-1)).toThrow(RangeError);
        expect(() => pascalRow(201)).toThrow(RangeError);
        expect(() => pascalRow(2.5)).toThrow(RangeError);
    });

    it('is exact at C(60,30) where a double recurrence is not', () => {
        expect(pascalRow(60)[30]).toBe(118264581564861424n);
        expect(binomial(60, 30)).toBe(118264581564861424n);
        let row = [1];
        let firstInexact: [number, number, number] | null = null;
        for (let r = 1; r <= 60; r++) {
            const next = [1];
            for (let k = 1; k < r; k++) next.push(row[k - 1] + row[k]);
            next.push(1);
            row = next;
            if (firstInexact === null) {
                const exactRow = pascalRow(r);
                const k = row.findIndex((x, j) => BigInt(x) !== exactRow[j]);
                if (k >= 0) firstInexact = [r, k, row[k]];
            }
        }
        // The double recurrence first loses exactness in row 57: C(57,25) = 9929472283517787 is odd and above 2^53.
        expect(firstInexact).toEqual([57, 25, 9929472283517788]);
        expect(binomial(57, 25)).toBe(9929472283517787n);
        // C(60,30) is a multiple of 16, so the double recurrence lands on it exactly;
        // only its shortest printed form differs from the count.
        expect(BigInt(row[30])).toBe(118264581564861424n);
        expect(String(row[30])).toBe('118264581564861420');
        expect(String(row[30])).not.toBe(String(binomial(60, 30)));
    });
});
