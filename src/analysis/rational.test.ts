import {describe, expect, it} from 'vitest';
import {analyzeRational, rationalRemainderAt} from './rational';
import type {PolySpec} from './schoolFunctions';

const lin = (z: number, k = 1): PolySpec => ({k, zeros: [{z, m: 1}]});
const quad = (z1: number, z2: number): PolySpec => ({k: 1, zeros: [{z: z1, m: 1}, {z: z2, m: 1}]});

describe('rational analysis (S4)', () => {
    it('writes (x^2-1)/(x-2) as x + 2 + 3/(x-2)', () => {
        const a = analyzeRational(quad(-1, 1), lin(2));
        expect(a.quotient).toEqual([2, 1]);
        expect(a.remainder).toEqual([3]);
        expect(a.asymptote).toEqual({kind: 'oblique', slope: 1, intercept: 2});
        expect(rationalRemainderAt(a, 10)).toBe(0.375);
        expect(a.poles).toEqual([{x: 2, multiplicity: 1}]);
        expect(a.holes).toEqual([]);
    });

    it('finds the hole of (x^2-1)/(x-1) at (1, 2)', () => {
        const a = analyzeRational(quad(-1, 1), lin(1));
        expect(a.holes).toEqual([{x: 1, y: 2}]);
        expect(a.poles).toEqual([]);
        expect(a.asymptote).toEqual({kind: 'oblique', slope: 1, intercept: 1});
    });

    it('gives the horizontal asymptote and far values of (2x^2-2)/(x^2-4)', () => {
        // Spec S4 horizontal default: 2(x-1)(x+1)/((x-2)(x+2)) -> 2, value 2 + 6/96 = 2.0625 at x = 10.
        const a = analyzeRational({k: 2, zeros: [{z: -1, m: 1}, {z: 1, m: 1}]}, quad(-2, 2));
        expect(a.asymptote).toEqual({kind: 'horizontal', y: 2});
        expect(a.reducedNumerator.zeros.map(e => e.z)).toEqual([-1, 1]);
        expect(a.holes).toEqual([]);
        expect(a.poles.map(p => p.x)).toEqual([-2, 2]);
        expect(2 + rationalRemainderAt(a, 10)).toBeCloseTo(2.0625, 12);
    });

    it('has no oblique asymptote unless deg p = deg q + 1', () => {
        const cubic: PolySpec = {k: 1, zeros: [{z: 0, m: 3}]};
        expect(analyzeRational(cubic, lin(1)).asymptote.kind).toBe('none');
        expect(analyzeRational(lin(0), quad(1, 2)).asymptote).toEqual({kind: 'horizontal', y: 0});
    });

    it('keeps pole multiplicity and turns a higher numerator multiplicity into a zero-limit hole', () => {
        const a = analyzeRational(lin(1), {k: 1, zeros: [{z: 1, m: 3}]});
        expect(a.poles).toEqual([{x: 1, multiplicity: 2}]);
        expect(a.holes).toEqual([]);
        const b = analyzeRational({k: 1, zeros: [{z: 1, m: 2}]}, lin(1));
        expect(b.holes).toEqual([{x: 1, y: 0}]);
        expect(b.reducedNumerator.zeros).toEqual([{z: 1, m: 1}]);
    });

    it('merges repeated zeros before comparing and reports it', () => {
        const a = analyzeRational({k: 1, zeros: [{z: 1, m: 1}, {z: 1, m: 1}]}, lin(1));
        expect(a.mergedNumerator).toBe(true);
        expect(a.mergedDenominator).toBe(false);
        expect(a.holes).toEqual([{x: 1, y: 0}]);
    });
});
