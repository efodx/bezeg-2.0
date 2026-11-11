import {describe, expect, it} from 'vitest';
import {runArea, runGalton, runIntervals, runWalks} from './runners';
import {
    areaPoints, ballSlot, galtonBallPaths, intervalHalfWidth, intervalSamples, SAMPLE_COUNT_MAX, walkPaths,
} from './samplePaths';

const SEEDS = [0, 1, 42, 777, 999999];

/** Slot counts of the runner for trials `first` ... `first + count - 1`: difference of two prefixes (prefix property). */
function galtonRunnerRange(seed: number, rows: number, p: number, first: number, count: number): number[] {
    const a = new Uint32Array(rows + 1);
    const b = new Uint32Array(rows + 1);
    runGalton(seed, rows, p, first - 1, a);
    runGalton(seed, rows, p, first - 1 + count, b);
    return Array.from(b, (value, i) => value - a[i]);
}

describe('galtonBallPaths (oracle: runGalton)', () => {
    it.each(SEEDS)('slot tallies of the paths equal the runner, seed %i, several sizes', seed => {
        for (const [rows, p, first, count] of [[10, 50, 1, 1000], [12, 35, 1, 10], [5, 95, 7, 300], [1, 5, 1, 1], [10, 50, 501, 500]]) {
            const paths = galtonBallPaths(seed, rows, p, first, count);
            const counts = new Array<number>(rows + 1).fill(0);
            for (let b = 0; b < count; b++) counts[ballSlot(paths, b)]++;
            expect(counts).toEqual(galtonRunnerRange(seed, rows, p, first, count));
        }
    });
    it('every path starts at 0, grows by 0 or 1 a peg and is deterministic', () => {
        const a = galtonBallPaths(42, 10, 50, 1, 50);
        for (let b = 0; b < 50; b++) {
            expect(a.rights[b * 11]).toBe(0);
            for (let r = 1; r <= 10; r++) {
                const step = a.rights[b * 11 + r] - a.rights[b * 11 + r - 1];
                expect(step === 0 || step === 1).toBe(true);
            }
        }
        expect(galtonBallPaths(42, 10, 50, 1, 50).rights).toEqual(a.rights);
        expect(galtonBallPaths(43, 10, 50, 1, 50).rights).not.toEqual(a.rights);
    });
    it('the spec heap at seed 42 is reproduced from drawn paths (0,12,38,118,218,229,207,125,42,11,0)', () => {
        const paths = galtonBallPaths(42, 10, 50, 1, 1000);
        const counts = new Array<number>(11).fill(0);
        for (let b = 0; b < 1000; b++) counts[ballSlot(paths, b)]++;
        expect(counts).toEqual([0, 12, 38, 118, 218, 229, 207, 125, 42, 11, 0]);
    });
    it('refuses a bad range or rows', () => {
        expect(() => galtonBallPaths(42, 10, 50, 0, 1)).toThrow(RangeError);
        expect(() => galtonBallPaths(42, 10, 50, 1, SAMPLE_COUNT_MAX + 1)).toThrow(RangeError);
        expect(() => galtonBallPaths(42, 0, 50, 1, 1)).toThrow(RangeError);
    });
});

describe('areaPoints (oracle: runArea)', () => {
    it.each(SEEDS)('inside tally of the points equals the runner, seed %i', seed => {
        for (const [first, count] of [[1, 1000], [1, 100], [1, 1], [251, 750]]) {
            const points = areaPoints(seed, first, count);
            const a = new Uint32Array(1);
            const b = new Uint32Array(1);
            runArea(seed, first - 1, a);
            runArea(seed, first - 1 + count, b);
            expect(points.inside.reduce((s, v) => s + v, 0)).toBe(b[0] - a[0]);
        }
    });
    it('coordinates are in [0, 1) and the inside flag agrees with the floating test away from the boundary', () => {
        const points = areaPoints(42, 1, 1000);
        for (let i = 0; i < 1000; i++) {
            expect(points.x[i]).toBeGreaterThanOrEqual(0);
            expect(points.x[i]).toBeLessThan(1);
            const r2 = points.x[i] ** 2 + points.y[i] ** 2;
            if (Math.abs(r2 - 1) > 1e-9) expect(points.inside[i]).toBe(r2 < 1 ? 1 : 0);
        }
    });
    it('the first 100 points at seed 42 hold 76 inside (spec RS3)', () => {
        expect(areaPoints(42, 1, 100).inside.reduce((s, v) => s + v, 0)).toBe(76);
        expect(areaPoints(42, 1, 1000).inside.reduce((s, v) => s + v, 0)).toBe(779);
    });
});

describe('walkPaths (oracle: runWalks)', () => {
    it.each(SEEDS)('end positions equal the runner tallies, seed %i', seed => {
        for (const [steps, first, count] of [[100, 1, 1000], [400, 1, 10], [1, 1, 5], [37, 200, 300]]) {
            const paths = walkPaths(seed, steps, first, count);
            const counts = new Array<number>(steps + 1).fill(0);
            let zeros = 0;
            let sumSquares = 0;
            for (let w = 0; w < count; w++) {
                const end = paths.positions[w * (steps + 1) + steps];
                counts[(end + steps) / 2]++;
                if (end === 0) zeros++;
                sumSquares += end * end;
            }
            const a = new Uint32Array(steps + 1);
            const b = new Uint32Array(steps + 1);
            const sa = runWalks(seed, first - 1, steps, a);
            const sb = runWalks(seed, first - 1 + count, steps, b);
            expect(counts).toEqual(Array.from(b, (value, i) => value - a[i]));
            expect(zeros).toBe(sb.zeros - sa.zeros);
            expect(sumSquares).toBe(sb.sumSquares - sa.sumSquares);
        }
    });
    it('a path moves by one each step from 0 and the spec sign-invariant numbers hold (zeros 68, rms 10,31)', () => {
        const paths = walkPaths(42, 100, 1, 1000);
        let zeros = 0;
        let sumSquares = 0;
        for (let w = 0; w < 1000; w++) {
            expect(paths.positions[w * 101]).toBe(0);
            for (let s = 1; s <= 100; s++) expect(Math.abs(paths.positions[w * 101 + s] - paths.positions[w * 101 + s - 1])).toBe(1);
            const end = paths.positions[w * 101 + 100];
            if (end === 0) zeros++;
            sumSquares += end * end;
        }
        expect(zeros).toBe(68);
        expect(Math.sqrt(sumSquares / 1000)).toBeCloseTo(10.31, 2);
    });
});

describe('intervalSamples (oracle: runIntervals)', () => {
    it.each(SEEDS)('miss flags equal the runner, seed %i', seed => {
        for (const [size, first, count] of [[36, 1, 100], [16, 1, 50], [100, 3, 20], [36, 40, 60]]) {
            const samples = intervalSamples(seed, size, first, count);
            const out = new Uint8Array(first - 1 + count);
            runIntervals(seed, first - 1 + count, size, out);
            expect(Array.from(samples.missed)).toEqual(Array.from(out.subarray(first - 1)));
        }
    });
    it('seed 42, 100 intervals of 36: intervals 21 and 28 miss, as in the spec', () => {
        const samples = intervalSamples(42, 36, 1, 100);
        const misses = Array.from(samples.missed, (m, i) => (m === 1 ? i + 1 : 0)).filter(v => v > 0);
        expect(misses).toEqual([21, 28]);
        samples.sums.forEach(sum => {
            expect(Number.isInteger(sum)).toBe(true);
            expect(sum).toBeGreaterThanOrEqual(0);
            expect(sum).toBeLessThanOrEqual(99 * 36);
        });
    });
    it('half-width for 36 draws is 9,4296 (spec RS6)', () => {
        expect(intervalHalfWidth(36)).toBeCloseTo(9.4296, 3);
    });
});
