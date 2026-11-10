import {describe, expect, it} from 'vitest';
import {binomial} from './binomial';
import {ENUMERATION_CAP, enumeratePaths, pathCount, pathThrough} from './latticePaths';

/** DFS oracle: masks built step by step, step 0 most significant, U (0) before R (1). */
function dfs(a: number, b: number): number[] {
    const out: number[] = [];
    const go = (r: number, u: number, mask: number): void => {
        if (r === a && u === b) { out.push(mask); return; }
        if (u < b) go(r, u + 1, mask << 1);
        if (r < a) go(r + 1, u, (mask << 1) | 1);
    };
    go(0, 0, 0);
    return out;
}

/** Cell-by-cell count by addition. */
function grid(a: number, b: number): bigint {
    const g: bigint[][] = [];
    for (let x = 0; x <= a; x++) {
        g.push([]);
        for (let y = 0; y <= b; y++) g[x].push(x === 0 || y === 0 ? 1n : g[x - 1][y] + g[x][y - 1]);
    }
    return g[a][b];
}

describe('lattice paths', () => {
    it('cap is 12 and enumeration refuses above it', () => {
        expect(ENUMERATION_CAP).toBe(12);
        expect(enumeratePaths(6, 6)).toHaveLength(924);
        expect(() => enumeratePaths(7, 6)).toThrow(RangeError);
        expect(() => enumeratePaths(13, 0)).toThrow(RangeError);
        expect(() => enumeratePaths(-1, 2)).toThrow(RangeError);
    });

    it('matches the DFS oracle, in lexicographic order, for a+b <= 12', () => {
        for (let a = 0; a <= 12; a++) {
            for (let b = 0; a + b <= 12; b++) {
                const list = enumeratePaths(a, b);
                expect(list).toEqual(dfs(a, b));
                expect(BigInt(list.length)).toBe(pathCount(a, b));
                expect(new Set(list).size).toBe(list.length);
                expect(list).toEqual([...list].sort((x, y) => x - y));
            }
        }
    });

    it('pathCount equals the addition grid and reproduces CB1', () => {
        for (let a = 0; a <= 25; a++) for (let b = 0; b <= 25; b++) expect(pathCount(a, b)).toBe(grid(a, b));
        expect(pathCount(5, 3)).toBe(56n);
        expect(pathCount(6, 6)).toBe(924n);
        expect(pathCount(10, 10)).toBe(184756n);
        expect(pathCount(20, 20)).toBe(137846528820n);
        expect(pathCount(2, 2)).toBe(6n);
    });

    it('pathThrough is a product, and Pascal identity from the last step holds', () => {
        expect(pathThrough(5, 3, 2, 1)).toBe(binomial(3, 2) * binomial(5, 3));
        expect(pathCount(4, 3)).toBe(35n);
        expect(pathCount(3, 3) + pathCount(4, 2)).toBe(35n); // 20 + 15
        expect(pathCount(2, 3)).toBe(10n);
        expect(pathCount(1, 3) + pathCount(2, 2)).toBe(10n); // 4 + 6
        for (let a = 1; a <= 30; a++) {
            for (let b = 1; b <= 30; b++) {
                expect(pathThrough(a, b, a - 1, b) + pathThrough(a, b, a, b - 1)).toBe(pathCount(a, b));
            }
        }
        expect(() => pathThrough(3, 3, 4, 0)).toThrow(RangeError);
        expect(() => pathThrough(3, 3, 0, -1)).toThrow(RangeError);
    });
});
