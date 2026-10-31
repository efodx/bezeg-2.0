import {describe, expect, it} from 'vitest';
import {chaikinStep, uniformQuadraticSegment} from '../bezeg/impl/curve/bspline';
import {fourPointStep, MAX_SUBDIVISION_ROUNDS, subdivisionRounds} from './subdivision';

const DEFAULT = [[0, 0], [1, 2], [3, 3], [4, 0]];
const SQUARE = [[0, 0], [4, 0], [4, 4], [0, 4]];

describe('fourPointStep', () => {
    it('reproduces the spec default (2, 2.8125) on edge p1p2', () => {
        const out = fourPointStep(DEFAULT, false);
        expect(out[3]).toEqual([2, 2.8125]);
    });

    it('keeps every old vertex in place after every round', () => {
        for (const closed of [false, true]) {
            let polygon = DEFAULT;
            for (let round = 0; round < MAX_SUBDIVISION_ROUNDS; round++) {
                const next = fourPointStep(polygon, closed);
                polygon.forEach((p, i) => expect(next[2 * i]).toEqual(p));
                polygon = next;
            }
        }
    });

    it('has exact counts: closed 2n, open 2n - 1 (and 2^k n closed after k rounds)', () => {
        expect(fourPointStep(SQUARE, true)).toHaveLength(8);
        expect(fourPointStep(DEFAULT, false)).toHaveLength(7);
        expect(fourPointStep([[0, 0], [2, 2]], false)).toEqual([[0, 0], [1, 1], [2, 2]]);
        const stages = subdivisionRounds(SQUARE, true, 'four-point', 6);
        stages.forEach((stage, k) => expect(stage).toHaveLength(4 * 2 ** k));
    });

    it('open end rule inserts midpoints on the two end edges only', () => {
        const out = fourPointStep([[0, 0], [1, 2], [3, 3], [4, 0], [6, 1]], false);
        expect(out[1]).toEqual([0.5, 1]);
        expect(out[7]).toEqual([5, 0.5]);
        // interior edge p1p2 uses (-p0 + 9p1 + 9p2 - p3) / 16
        expect(out[3][0]).toBeCloseTo((-0 + 9 * 1 + 9 * 3 - 4) / 16, 12);
        expect(out[3][1]).toBeCloseTo((-0 + 9 * 2 + 9 * 3 - 0) / 16, 12);
    });

    it('w = 1/16 reproduces cubic data on uniform samples exactly: x^3 at -3,-1,1,3 inserts 0', () => {
        const cubic = [-3, -1, 1, 3].map(x => [x, x ** 3]);
        const out = fourPointStep(cubic, false);
        expect(out[3][0]).toBeCloseTo(0, 14);
        expect(out[3][1]).toBeCloseTo(0, 12);
        // general cubic on a longer sample: the inserted interior points lie on the cubic
        const f = (x: number) => 2 * x ** 3 - x ** 2 + 3 * x - 5;
        const samples = [0, 1, 2, 3, 4, 5].map(x => [x, f(x)]);
        const mid = fourPointStep(samples, false);
        for (const i of [1, 2, 3]) {
            const [x, y] = mid[2 * i + 1];
            expect(x).toBeCloseTo(i + 0.5, 12);
            expect(y).toBeCloseTo(f(x), 10);
        }
    });

    it('does not reproduce degree 4 (so the cubic test is not vacuous)', () => {
        const samples = [-3, -1, 1, 3].map(x => [x, x ** 4]);
        expect(Math.abs(fourPointStep(samples, false)[3][1])).toBeGreaterThan(1);
    });

    it('w = 0 is linear midpoint insertion', () => {
        for (const closed of [false, true]) {
            const out = fourPointStep(DEFAULT, closed, 0);
            const n = DEFAULT.length;
            const edges = closed ? n : n - 1;
            for (let i = 0; i < edges; i++) {
                const a = DEFAULT[i];
                const b = DEFAULT[(i + 1) % n];
                expect(out[2 * i + 1]).toEqual([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
            }
        }
    });

    it('converges: the offset of inserted points from edge midpoints shrinks geometrically', () => {
        const stages = subdivisionRounds(SQUARE, true, 'four-point', 6);
        const gaps: number[] = [];
        for (let k = 0; k < 6; k++) {
            const next = stages[k + 1];
            let worst = 0;
            stages[k].forEach((_, i) => {
                const a = next[2 * i];
                const b = next[(2 * i + 2) % next.length];
                const m = next[2 * i + 1];
                worst = Math.max(worst, Math.hypot(m[0] - (a[0] + b[0]) / 2, m[1] - (a[1] + b[1]) / 2));
            });
            gaps.push(worst);
        }
        expect(gaps[0]).toBeGreaterThan(0);
        for (let k = 1; k < gaps.length; k++) {
            expect(gaps[k]).toBeLessThan(gaps[k - 1] * 0.6);
        }
    });

    it('rejects invalid input', () => {
        expect(() => fourPointStep([[0, 0]], false)).toThrow(RangeError);
        expect(() => fourPointStep([[0, 0], [1, 1]], true)).toThrow(RangeError);
        expect(() => fourPointStep([[0, 0], [1, NaN]], false)).toThrow(RangeError);
        expect(() => fourPointStep([[0, 0], [1]], false)).toThrow(RangeError);
        expect(() => fourPointStep(DEFAULT, false, NaN)).toThrow(RangeError);
        expect(() => subdivisionRounds(DEFAULT, false, 'chaikin', 7)).toThrow(RangeError);
        expect(() => subdivisionRounds(DEFAULT, false, 'chaikin', 1.5)).toThrow(RangeError);
    });
});

describe('Chaikin via the imported B-spline kernel', () => {
    it('spec default: edge p1p2 becomes (1.5, 2.25) and (2.5, 2.75)', () => {
        const out = chaikinStep(DEFAULT, false);
        expect(out[3]).toEqual([1.5, 2.25]);
        expect(out[4]).toEqual([2.5, 2.75]);
    });

    it('straddling-midpoint identity equals uniformQuadraticSegment(P0, P1, P2, 1/2) = (1.125, 1.875)', () => {
        const [P0, P1, P2] = DEFAULT;
        const out = chaikinStep([P0, P1, P2], false);
        const before = out[2]; // 1/4 P0 + 3/4 P1 (out[0] = P0, out[1] = 3/4 P0 + 1/4 P1)
        const after = out[3]; // 3/4 P1 + 1/4 P2
        expect(before).toEqual([0.75, 1.5]);
        expect(after).toEqual([1.5, 2.25]);
        const mid = [(before[0] + after[0]) / 2, (before[1] + after[1]) / 2];
        expect(mid[0]).toBeCloseTo(1.125, 14);
        expect(mid[1]).toBeCloseTo(1.875, 14);
        const seg = uniformQuadraticSegment(P0, P1, P2, 0.5);
        expect(mid[0]).toBeCloseTo(seg[0], 14);
        expect(mid[1]).toBeCloseTo(seg[1], 14);
    });

    it('open Chaikin keeps its end points; counts 2(n-1)+2 open and 2^k n closed', () => {
        const stages = subdivisionRounds(DEFAULT, false, 'chaikin', 4);
        stages.forEach(stage => {
            expect(stage[0]).toEqual(DEFAULT[0]);
            expect(stage[stage.length - 1]).toEqual(DEFAULT[3]);
        });
        expect(stages[1]).toHaveLength(8);
        const closed = subdivisionRounds(SQUARE, true, 'chaikin', 6);
        closed.forEach((stage, k) => expect(stage).toHaveLength(4 * 2 ** k));
    });

    it('repeated closed Chaikin rounds approach the uniform quadratic B-spline samples', () => {
        const P = SQUARE;
        const stages = subdivisionRounds(P, true, 'chaikin', 6);
        const targets: number[][] = [];
        for (let i = 0; i < P.length; i++) {
            const a = P[i];
            const b = P[(i + 1) % 4];
            const c = P[(i + 2) % 4];
            targets.push(uniformQuadraticSegment(a, b, c, 0), uniformQuadraticSegment(a, b, c, 0.5));
        }
        const dist = (stage: number[][]) =>
            Math.max(...targets.map(t => Math.min(...stage.map(p => Math.hypot(p[0] - t[0], p[1] - t[1])))));
        expect(dist(stages[6])).toBeLessThan(0.05);
        expect(dist(stages[6])).toBeLessThan(dist(stages[3]) / 4);
    });
});
