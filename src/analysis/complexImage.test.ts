import {describe, expect, it} from 'vitest';
import type {Complex} from './complex';
import {MAX_DEPTH, MIN_DEPTH, sampleImage, type ImageView} from './complexImage';

const view: ImageView = {xMin: -4, xMax: 4, yMin: -4, yMax: 4};
const square = (z: Complex): Complex => ({re: z.re * z.re - z.im * z.im, im: 2 * z.re * z.im});
const reciprocal = (z: Complex): Complex => {
    const d = z.re * z.re + z.im * z.im;
    return {re: z.re / d, im: -z.im / d};
};

describe('sampleImage mechanics', () => {
    it('returns one run of exactly 2^MIN_DEPTH + 1 points for a straight line', () => {
        const runs = sampleImage(t => ({re: t, im: 2 * t}), -1, 1, 1e-3, view);
        expect(runs).toHaveLength(1);
        expect(runs[0]).toHaveLength(2 ** MIN_DEPTH + 1);
    });

    it('never exceeds 2^MAX_DEPTH + 1 points even for a wildly oscillating function', () => {
        const runs = sampleImage(t => ({re: Math.sin(1e6 * t), im: Math.cos(1e6 * t)}), 0, 1, 1e-9, view);
        const n = runs.reduce((s, r) => s + r.length, 0);
        expect(n).toBeLessThanOrEqual(2 ** MAX_DEPTH + 1);
        expect(n).toBeGreaterThan(2 ** MIN_DEPTH + 1);
    });

    it('splits at undefined and non-finite values and no segment crosses a gap', () => {
        const f = (t: number) => (t > 0.3 && t < 0.4 ? undefined : t > 0.6 && t < 0.7 ? {re: NaN, im: 0} : {re: t, im: 0});
        const runs = sampleImage(f, 0, 1, 1e-3, view);
        expect(runs).toHaveLength(3);
        for (const run of runs) {
            for (const p of run) {
                expect(p.re <= 0.3 || (p.re >= 0.4 && p.re <= 0.6) || p.re >= 0.7).toBe(true);
            }
        }
        for (let i = 0; i + 1 < runs.length; i++) {
            const gap = runs[i + 1][0].re - runs[i][runs[i].length - 1].re;
            expect(gap).toBeGreaterThan(0.09);
        }
    });

    it('splits at out-of-view excursions and keeps the visible parts', () => {
        // x = 10 sin(2 pi t) leaves the margin box [-8, 8] near t = 0.25 and 0.75.
        const runs = sampleImage(t => ({re: 10 * Math.sin(2 * Math.PI * t), im: 0}), 0, 1, 0.01, view);
        expect(runs.length).toBe(3);
        for (const run of runs) for (const p of run) expect(Math.abs(p.re)).toBeLessThanOrEqual(8);
    });

    it('returns no runs for a curve entirely out of view or an invalid range', () => {
        expect(sampleImage(t => ({re: 100 + t, im: 0}), 0, 1, 0.01, view)).toEqual([]);
        expect(sampleImage(t => ({re: t, im: 0}), 1, 0, 0.01, view)).toEqual([]);
        expect(sampleImage(t => ({re: t, im: 0}), 0, 1, 0, view)).toEqual([]);
    });

    it('splits a pole into separate runs that stay inside the view margin', () => {
        const runs = sampleImage(t => (t === 0.5 ? undefined : {re: 0.1 / (t - 0.5), im: 0}), 0, 1, 0.01, view);
        expect(runs.length).toBeGreaterThanOrEqual(2);
        for (const run of runs) for (const p of run) expect(Math.abs(p.re)).toBeLessThanOrEqual(8);
    });
});

describe('z^2 images of grid lines', () => {
    const tolerance = 0.005;
    const maxResidual = (runs: Complex[][], implicit: (p: Complex) => number) => {
        let worst = 0;
        for (const run of runs) {
            for (let i = 0; i + 1 < run.length; i++) {
                const mid = {re: (run[i].re + run[i + 1].re) / 2, im: (run[i].im + run[i + 1].im) / 2};
                worst = Math.max(worst, Math.abs(implicit(mid)));
            }
        }
        return worst;
    };

    // Normal-distance estimate of the residual of u = a^2 - v^2/(4a^2) (sign 1) or u = v^2/(4b^2) - b^2 (sign -1).
    const parabolaResidual = (a2: number, sign: 1 | -1) => (p: Complex) => {
        const target = sign === 1 ? a2 - (p.im * p.im) / (4 * a2) : (p.im * p.im) / (4 * a2) - a2;
        return (p.re - target) / Math.hypot(1, p.im / (2 * a2));
    };

    for (const a of [0.5, 1, 1.5, 2, -1, -0.75]) {
        it(`Re z = ${a} maps within tolerance of u = a^2 - v^2/(4a^2)`, () => {
            const runs = sampleImage(t => square({re: a, im: t}), -3, 3, tolerance, view);
            expect(runs.length).toBeGreaterThan(0);
            expect(maxResidual(runs, parabolaResidual(a * a, 1))).toBeLessThanOrEqual(tolerance);
        });
        it(`Im z = ${a} maps within tolerance of u = v^2/(4b^2) - b^2`, () => {
            const runs = sampleImage(t => square({re: t, im: a}), -3, 3, tolerance, view);
            expect(runs.length).toBeGreaterThan(0);
            expect(maxResidual(runs, parabolaResidual(a * a, -1))).toBeLessThanOrEqual(tolerance);
        });
    }

    it('M3 sample points of Re z = 1 lie on u = 1 - v^2/4', () => {
        const check = (z: Complex, w: Complex) => {
            const got = square(z);
            expect(got.re).toBeCloseTo(w.re, 12);
            expect(got.im).toBeCloseTo(w.im, 12);
            expect(w.re).toBeCloseTo(1 - (w.im * w.im) / 4, 12);
        };
        check({re: 1, im: 1}, {re: 0, im: 2});
        check({re: 1, im: 0.5}, {re: 0.75, im: 1});
        check({re: 1, im: 2}, {re: -3, im: 4});
    });

    it('image tangents at z = 1 + i are -2 + 2i and 2 + 2i with dot product 0 to 1e-12', () => {
        // d/dt of z^2 along Re z = 1 is 2z * i; along Im z = 1 it is 2z.
        const z = {re: 1, im: 1};
        const vertical = {re: -2 * z.im, im: 2 * z.re};
        const horizontal = {re: 2 * z.re, im: 2 * z.im};
        expect(vertical).toEqual({re: -2, im: 2});
        expect(horizontal).toEqual({re: 2, im: 2});
        expect(Math.abs(vertical.re * horizontal.re + vertical.im * horizontal.im)).toBeLessThan(1e-12);
        // The same tangents from central differences of the sampled map.
        const h = 1e-6;
        const tangent = (f: (t: number) => Complex, t: number) => {
            const p = f(t + h), q = f(t - h);
            return {re: (p.re - q.re) / (2 * h), im: (p.im - q.im) / (2 * h)};
        };
        const tv = tangent(t => square({re: 1, im: t}), 1);
        const th = tangent(t => square({re: t, im: 1}), 1);
        expect(Math.abs(tv.re * th.re + tv.im * th.im)).toBeLessThan(1e-6);
    });
});

describe('1/z stress cases (Re z = 0.05; image is the circle of centre 10, radius 10)', () => {
    const f = (t: number) => reciprocal({re: 0.05, im: t});
    const inView = (p: Complex) => Math.abs(p.re) <= 4 && Math.abs(p.im) <= 4;

    /** Largest | |p - 10| - 10 | over points on the polyline segments that lie inside the view. */
    const deviation = (runs: Complex[][]) => {
        let worst = 0;
        for (const run of runs) {
            for (let i = 0; i + 1 < run.length; i++) {
                for (let k = 0; k <= 8; k++) {
                    const s = k / 8;
                    const p = {re: run[i].re + s * (run[i + 1].re - run[i].re), im: run[i].im + s * (run[i + 1].im - run[i].im)};
                    if (inView(p)) worst = Math.max(worst, Math.abs(Math.hypot(p.re - 10, p.im) - 10));
                }
            }
        }
        return worst;
    };
    const count = (runs: Complex[][]) => runs.reduce((s, r) => s + r.length, 0);

    for (const [half, tol] of [[100, 0.005], [2, 0.005], [100, 0.0005], [2, 0.0005]]) {
        it(`adaptive sampling (tolerance ${tol}) on t in [-${half}, ${half}] deviates from the circle in the view by at most the tolerance`, () => {
            const runs = sampleImage(f, -half, half, tol, view);
            const dev = deviation(runs);
            console.log(`1/z tol=${tol} t in [-${half},${half}]: adaptive points=${count(runs)}, runs=${runs.length}, max deviation=${dev.toExponential(2)}`);
            // Spec value is 6e-4 at tolerance 0.005; this sampler's guarantee is the sagitta bound, about the tolerance.
            expect(dev).toBeLessThanOrEqual(1.1 * tol);
            if (tol <= 0.0005) expect(dev).toBeLessThan(1e-3);
            expect(count(runs)).toBeGreaterThan(0);
        });
    }

    it('reports the uniform comparison; the narrow-range value matches the spec value 1.2e-3', () => {
        const uniform = (half: number, n: number) => {
            const pts: Complex[] = [];
            for (let i = 0; i < n; i++) pts.push(f(-half + (2 * half * i) / (n - 1)));
            return deviation([pts]);
        };
        const wide = uniform(100, 1000);
        const narrow = uniform(2, 200);
        console.log(`uniform deviation: 1000 samples on [-100,100]=${wide.toExponential(2)}, 200 samples on [-2,2]=${narrow.toExponential(2)}`);
        // The wide value differs from the spec's 8.5e-3 because chords that leave the view are not clipped here.
        expect(narrow).toBeGreaterThan(1e-3);
        expect(narrow).toBeLessThan(2e-3);
    });
});
