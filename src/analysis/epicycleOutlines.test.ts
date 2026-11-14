import {describe, expect, it} from 'vitest';
import {coefficientAt} from './closedSpline';
import {EPICYCLE_OUTLINE_DATA} from './epicycleOutlines';
import {
    EPICYCLE_COORDINATE_MAX,
    EPICYCLE_COORDINATE_MIN,
    EPICYCLE_OUTLINE_IDS,
    analyzeEpicycle,
    epicycleExample,
    epicycleTrace,
    maxTraceError,
} from './epicycleModel';

const COUNTS = {slovenia: 200, cat: 160, blossom: 200} as const;
/** The sampled maximum error at N = 5, 20, 50 observed when the data was generated, with headroom of about 15 percent. */
const ERROR_LIMIT_AT_50 = {slovenia: 0.046, cat: 0.052, blossom: 0.006} as const;

const dist = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe('outline data', () => {
    it('ships exactly the three outlines, each naming its source', () => {
        expect(Object.keys(EPICYCLE_OUTLINE_DATA)).toEqual([...EPICYCLE_OUTLINE_IDS]);
        for (const id of EPICYCLE_OUTLINE_IDS) {
            expect(EPICYCLE_OUTLINE_DATA[id].id).toBe(id);
            expect(EPICYCLE_OUTLINE_DATA[id].source.length).toBeGreaterThan(40);
        }
        expect(EPICYCLE_OUTLINE_DATA.slovenia.source).toContain('Natural Earth');
        expect(EPICYCLE_OUTLINE_DATA.slovenia.source).toContain('public domain');
    });

    for (const id of EPICYCLE_OUTLINE_IDS) {
        describe(id, () => {
            const points = EPICYCLE_OUTLINE_DATA[id].points;

            it('has its documented point count and 3-decimal coordinates', () => {
                expect(points.length).toBe(COUNTS[id]);
                for (const [x, y] of points) {
                    expect(Math.round(x * 1000) / 1000).toBe(x);
                    expect(Math.round(y * 1000) / 1000).toBe(y);
                }
            });

            it('is closed without repeating a point: no equal consecutive points, first not repeated at the end', () => {
                for (let i = 0; i < points.length; i++) {
                    const next = points[(i + 1) % points.length];
                    expect(points[i][0] === next[0] && points[i][1] === next[1]).toBe(false);
                }
            });

            it('lies inside [-2,5; 2,5] in both axes (the model range is [-3, 3]) and fills it', () => {
                const xs = points.map((p) => p[0]);
                const ys = points.map((p) => p[1]);
                for (const v of [...xs, ...ys]) {
                    expect(v).toBeGreaterThanOrEqual(-2.5);
                    expect(v).toBeLessThanOrEqual(2.5);
                    expect(v).toBeGreaterThanOrEqual(EPICYCLE_COORDINATE_MIN);
                    expect(v).toBeLessThanOrEqual(EPICYCLE_COORDINATE_MAX);
                }
                const extent = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
                expect(extent).toBeGreaterThan(4.99);
                expect(extent).toBeLessThanOrEqual(5.0001);
            });

            it('is evenly spaced: every chord is within 2 percent of the mean chord', () => {
                const chords = points.map((p, i) => dist(p, points[(i + 1) % points.length]));
                const mean = chords.reduce((a, b) => a + b, 0) / chords.length;
                for (const c of chords) expect(Math.abs(c - mean) / mean).toBeLessThan(0.02);
            });

            it('does not cross itself and runs counterclockwise', () => {
                const n = points.length;
                const orient = (p: readonly number[], q: readonly number[], r: readonly number[]) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
                let crossings = 0;
                for (let i = 0; i < n; i++) {
                    for (let j = i + 2; j < n; j++) {
                        if (i === 0 && j === n - 1) continue;
                        const a = points[i];
                        const b = points[(i + 1) % n];
                        const c = points[j];
                        const d = points[(j + 1) % n];
                        if (orient(a, b, c) * orient(a, b, d) < 0 && orient(c, d, a) * orient(c, d, b) < 0) crossings++;
                    }
                }
                expect(crossings).toBe(0);
                const area = points.reduce((s, p, i) => s + (p[0] * points[(i + 1) % n][1] - points[(i + 1) % n][0] * p[1]), 0) / 2;
                expect(area).toBeGreaterThan(0);
            });
        });
    }
});

describe('outline mathematics', () => {
    /** The polygon parametrised on span i by t in [2 pi i / m, 2 pi (i + 1) / m], integrated here with composite Simpson, independent of the kernel. */
    function directCoefficient(points: readonly (readonly [number, number])[], k: number): {re: number; im: number} {
        const m = points.length;
        const h = (2 * Math.PI) / m;
        const SUB = 64; // Simpson sub-intervals per span; the integrand is a low-frequency trigonometric times a line
        let re = 0;
        let im = 0;
        for (let i = 0; i < m; i++) {
            const a = points[i];
            const b = points[(i + 1) % m];
            const f = (u: number) => {
                const t = h * (i + u);
                const x = a[0] + u * (b[0] - a[0]);
                const y = a[1] + u * (b[1] - a[1]);
                // (x + i y) e^{-ikt}
                return [x * Math.cos(k * t) + y * Math.sin(k * t), y * Math.cos(k * t) - x * Math.sin(k * t)];
            };
            let sr = 0;
            let si = 0;
            for (let s = 0; s <= SUB; s++) {
                const weight = s === 0 || s === SUB ? 1 : s % 2 ? 4 : 2;
                const [fr, fi] = f(s / SUB);
                sr += weight * fr;
                si += weight * fi;
            }
            re += (sr * h) / (3 * SUB);
            im += (si * h) / (3 * SUB);
        }
        return {re: re / (2 * Math.PI), im: im / (2 * Math.PI)};
    }

    for (const id of EPICYCLE_OUTLINE_IDS) {
        it(`${id}: the model's coefficients equal a direct numerical integration to 1e-6`, () => {
            const analysis = analyzeEpicycle(epicycleExample(id));
            for (const k of [-5, -1, 0, 1, 5, 20]) {
                const model = coefficientAt(analysis.coefficients, k);
                const direct = directCoefficient(EPICYCLE_OUTLINE_DATA[id].points, k);
                expect(Math.abs(model.re - direct.re)).toBeLessThan(1e-6);
                expect(Math.abs(model.im - direct.im)).toBeLessThan(1e-6);
            }
        });

        it(`${id}: the sampled maximum error does not increase over N = 5, 20, 50 and is small at 50`, () => {
            const analysis = analyzeEpicycle(epicycleExample(id));
            const [e5, e20, e50] = [5, 20, 50].map((N) => maxTraceError(analysis, N));
            expect(e20).toBeLessThanOrEqual(e5);
            expect(e50).toBeLessThanOrEqual(e20);
            expect(e50).toBeLessThan(e5 / 2);
            expect(e50).toBeLessThan(ERROR_LIMIT_AT_50[id]);
            // The trace has the documented number of samples.
            expect(epicycleTrace(analysis, 50).length).toBe(2000);
        });
    }
});
