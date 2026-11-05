import {EVOLUTE_SAMPLES, EVOLUTE_MAX_RADIUS_FACTOR, evoluteTrace, evolutePointAt} from './EvoluteOverlay';
import {PARABOLA_CONTROL_POINTS} from './CurvatureBezierCurveGraph';

type Pt = [number, number];

/** Independent Bernstein evaluation and derivatives (does not use the curvature kernel). */
function bernstein(points: Pt[], t: number): Pt {
    const n = points.length - 1;
    let x = 0, y = 0;
    for (let i = 0; i <= n; i++) {
        let binom = 1;
        for (let k = 0; k < i; k++) binom = binom * (n - k) / (k + 1);
        const b = binom * t ** i * (1 - t) ** (n - i);
        x += b * points[i][0];
        y += b * points[i][1];
    }
    return [x, y];
}

/** The parameter of sample i of a trace over [0, tEnd]. */
const sampleT = (i: number, tEnd: number) => tEnd * i / (EVOLUTE_SAMPLES - 1);

/** The parabola y = x^2 for x = 2t - 1 has the evolute (-4x^3, 3x^2 + 1/2); written here, not taken from the code under test. */
const parabolaEvolute = (t: number): Pt => {
    const x = 2 * t - 1;
    return [-4 * x ** 3, 3 * x ** 2 + 0.5];
};

const CUBIC: Pt[] = [[0, 0], [1, 0], [2, 1], [3, 3]];
/** An S-shaped cubic: kappa changes sign once, at t = 1/2 (symmetric about the centre). */
const S_CUBIC: Pt[] = [[0, 0], [1, 2], [2, -2], [3, 0]];
const STRAIGHT: Pt[] = [[0, 0], [1, 1], [2, 2], [3, 3]];

const hasNaN = (n: number) => Number.isNaN(n);

describe('L4(1): evolute points equal the closed form on the parabola', () => {
    test('evolutePointAt matches (-4x^3, 3x^2 + 1/2) to 1e-9 at many parameters', () => {
        let checked = 0;
        for (let i = 0; i <= 200; i++) {
            const t = i / 200;
            const e = evolutePointAt(PARABOLA_CONTROL_POINTS, t)!;
            const [ex, ey] = parabolaEvolute(t);
            expect(e).toBeDefined();
            expect(Math.abs(e[0] - ex)).toBeLessThan(1e-9);
            expect(Math.abs(e[1] - ey)).toBeLessThan(1e-9);
            checked++;
        }
        expect(checked).toBe(201);
        const atOne = evolutePointAt(PARABOLA_CONTROL_POINTS, 1)!;
        expect(atOne[0]).toBeCloseTo(-4, 9);
        expect(atOne[1]).toBeCloseTo(3.5, 9);
        const atVertex = evolutePointAt(PARABOLA_CONTROL_POINTS, 0.5)!;
        expect(atVertex[0]).toBeCloseTo(0, 9);
        expect(atVertex[1]).toBeCloseTo(0.5, 9);
    });

    test('every sample of the full trace is the closed-form point of its parameter, and the trace has the fixed sample count', () => {
        const trace = evoluteTrace(PARABOLA_CONTROL_POINTS, 1);
        expect(trace.x).toHaveLength(EVOLUTE_SAMPLES);
        expect(trace.y).toHaveLength(EVOLUTE_SAMPLES);
        for (let i = 0; i < EVOLUTE_SAMPLES; i++) {
            const [ex, ey] = parabolaEvolute(sampleT(i, 1));
            expect(Math.abs(trace.x[i] - ex)).toBeLessThan(1e-9);
            expect(Math.abs(trace.y[i] - ey)).toBeLessThan(1e-9);
        }
        expect([trace.x[0], trace.y[0]]).toEqual([expect.closeTo(4, 9), expect.closeTo(3.5, 9)]);
        expect([trace.x[EVOLUTE_SAMPLES - 1], trace.y[EVOLUTE_SAMPLES - 1]]).toEqual([expect.closeTo(-4, 9), expect.closeTo(3.5, 9)]);
    });

    test('the evolute has a cusp at the vertex: the trace direction reverses there', () => {
        const trace = evoluteTrace(PARABOLA_CONTROL_POINTS, 1);
        // y = 3x^2 + 1/2 falls to 1/2 at the vertex and rises again, while x keeps decreasing: a cusp pointing up at (0, 1/2).
        let minIndex = 0;
        for (let i = 1; i < EVOLUTE_SAMPLES; i++) if (trace.y[i] < trace.y[minIndex]) minIndex = i;
        expect(Math.abs(sampleT(minIndex, 1) - 0.5)).toBeLessThan(1 / (EVOLUTE_SAMPLES - 1));
        expect(trace.y[minIndex]).toBeCloseTo(0.5, 3);
        expect(trace.y[minIndex - 5] - trace.y[minIndex - 6]).toBeLessThan(0);
        expect(trace.y[minIndex + 6] - trace.y[minIndex + 5]).toBeGreaterThan(0);
        // x never reverses, so the reversal of the direction is the vertical component's sign change.
        for (let i = 1; i < EVOLUTE_SAMPLES; i++) expect(trace.x[i] - trace.x[i - 1]).toBeLessThan(0);
    });

    test('a trace to a parameter stops at that parameter', () => {
        const trace = evoluteTrace(PARABOLA_CONTROL_POINTS, 0.3);
        expect(trace.x).toHaveLength(EVOLUTE_SAMPLES);
        const [lx, ly] = parabolaEvolute(0.3);
        expect(trace.x[EVOLUTE_SAMPLES - 1]).toBeCloseTo(lx, 9);
        expect(trace.y[EVOLUTE_SAMPLES - 1]).toBeCloseTo(ly, 9);
        expect([trace.x[0], trace.y[0]]).toEqual([expect.closeTo(4, 9), expect.closeTo(3.5, 9)]);
    });
});

describe('L4(2): the normal is tangent to the evolute (non-symmetric cubic)', () => {
    test('the central difference of the evolute is parallel to the normal of the curve', () => {
        let compared = 0;
        for (const t of [0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95]) {
            const h = 1e-5;
            const before = evolutePointAt(CUBIC, t - h)!;
            const after = evolutePointAt(CUBIC, t + h)!;
            const dE: Pt = [(after[0] - before[0]) / (2 * h), (after[1] - before[1]) / (2 * h)];
            const p0 = bernstein(CUBIC, t - h);
            const p1 = bernstein(CUBIC, t + h);
            const tangent: Pt = [p1[0] - p0[0], p1[1] - p0[1]];
            const speed = Math.hypot(...tangent);
            const normal: Pt = [-tangent[1] / speed, tangent[0] / speed];
            const length = Math.hypot(...dE);
            expect(length).toBeGreaterThan(1e-3);
            // Parallel to the normal means perpendicular to the curve's tangent.
            expect(Math.abs(dE[0] * tangent[0] + dE[1] * tangent[1]) / (length * speed)).toBeLessThan(1e-6);
            expect(Math.abs(dE[0] * normal[1] - dE[1] * normal[0]) / length).toBeLessThan(1e-6);
            compared++;
        }
        expect(compared).toBe(7);
    });
});

describe('L4(3): inflections, straight curves and breaks', () => {
    test('an S-shaped cubic: the trace breaks at the inflection and no piece joins samples of opposite curvature sign', () => {
        const trace = evoluteTrace(S_CUBIC, 1);
        const nanAt = trace.x.map((_, i) => i).filter(i => hasNaN(trace.x[i]));
        // The interesting input was reached: two pieces, one per side of the inflection at t = 1/2.
        expect(nanAt.length).toBeGreaterThanOrEqual(1);
        expect(nanAt.every(i => hasNaN(trace.y[i]))).toBe(true);
        expect(trace.x.filter(v => !hasNaN(v)).length).toBeGreaterThan(20);
        // Every plotted segment (two neighbouring non-NaN entries) lies on one side: map each point back to its sign via the curve.
        const signOf = (x: number, y: number): number => {
            // The point is the centre of curvature: find the sample whose evolute point it is and read the sign of kappa from the curve.
            let best = -1, bestDistance = Infinity;
            for (let k = 0; k <= 2000; k++) {
                const e = evolutePointAt(S_CUBIC, k / 2000);
                if (!e) continue;
                const d = Math.hypot(e[0] - x, e[1] - y);
                if (d < bestDistance) { bestDistance = d; best = k; }
            }
            const t = best / 2000, h = 1e-4;
            const a = bernstein(S_CUBIC, t - h), b = bernstein(S_CUBIC, t), c = bernstein(S_CUBIC, t + h);
            const d1: Pt = [(c[0] - a[0]) / (2 * h), (c[1] - a[1]) / (2 * h)];
            const d2: Pt = [(c[0] - 2 * b[0] + a[0]) / (h * h), (c[1] - 2 * b[1] + a[1]) / (h * h)];
            return Math.sign(d1[0] * d2[1] - d1[1] * d2[0]);
        };
        let segments = 0;
        for (let i = 1; i < trace.x.length; i++) {
            if (hasNaN(trace.x[i]) || hasNaN(trace.x[i - 1])) continue;
            segments++;
            expect(signOf(trace.x[i], trace.y[i])).toBe(signOf(trace.x[i - 1], trace.y[i - 1]));
        }
        expect(segments).toBeGreaterThan(20);
        // Both signs occur, so the break really separates opposite sides.
        const signs = new Set(trace.x.map((x, i) => hasNaN(x) ? 0 : signOf(x, trace.y[i])));
        expect(signs.has(1)).toBe(true);
        expect(signs.has(-1)).toBe(true);
    });

    test('a sign change between two neighbouring samples with finite points on both sides still breaks (no huge-radius cut involved)', () => {
        // Few samples, so the neighbouring samples straddle the inflection at 1/2 with finite centres of curvature on both sides.
        const trace = evoluteTrace(S_CUBIC, 1, 4);
        expect(trace.x.some(hasNaN)).toBe(true);
        const finite = trace.x.filter(v => !hasNaN(v));
        expect(finite.length).toBe(4);
        for (const [i, x] of trace.x.entries()) if (hasNaN(x)) expect(hasNaN(trace.y[i])).toBe(true);
    });

    test('centres of curvature farther than the cut-off are dropped, so no segment runs off to a huge point', () => {
        // 20000 samples put some within 1e-4 of the inflection at t = 1/2, where the radius of curvature is far beyond the cut-off.
        const samples = 20000;
        const trace = evoluteTrace(S_CUBIC, 1, samples);
        const scale = Math.hypot(3, 4);
        let farthest = 0;
        for (let i = 0; i < trace.x.length; i++) {
            if (hasNaN(trace.x[i])) continue;
            farthest = Math.max(farthest, Math.hypot(trace.x[i], trace.y[i]));
        }
        // The input was reached: points out to the cut-off are kept, none beyond it (the curve itself lies within one extent of the origin).
        expect(farthest).toBeGreaterThan(0.5 * EVOLUTE_MAX_RADIUS_FACTOR * scale);
        expect(farthest).toBeLessThan((EVOLUTE_MAX_RADIUS_FACTOR + 1) * scale);
    });

    test('an undefined (singular) sample between defined ones breaks the trace once', () => {
        // r'(1/2) = 0 for these control points; three samples are t = 0, 1/2, 1.
        const cusped: Pt[] = [[0, 0], [1, 1], [1, 0], [0, 1]];
        const trace = evoluteTrace(cusped, 1, 3);
        expect(trace.x).toHaveLength(3);
        expect(hasNaN(trace.x[1]) && hasNaN(trace.y[1])).toBe(true);
        expect(hasNaN(trace.x[0]) || hasNaN(trace.x[2])).toBe(false);
    });

    test('collinear control points give no points at all and do not throw', () => {
        expect(() => evoluteTrace(STRAIGHT, 1)).not.toThrow();
        const trace = evoluteTrace(STRAIGHT, 1);
        expect(trace).toEqual({x: [], y: []});
        expect(evolutePointAt(STRAIGHT, 0.4)).toBeUndefined();
        // Fewer than two points, a repeated point (singular) and a non-finite end are quietly empty too.
        expect(evoluteTrace([[1, 1]], 1)).toEqual({x: [], y: []});
        expect(evoluteTrace([[1, 1], [1, 1], [1, 1]], 1)).toEqual({x: [], y: []});
        expect(evoluteTrace(PARABOLA_CONTROL_POINTS, NaN)).toEqual({x: [], y: []});
    });

    test('a singular sample breaks the trace instead of joining its neighbours', () => {
        // r'(0) = 0 for a doubled first point: the first sample is singular and is dropped, the rest is one piece.
        const doubled: Pt[] = [[0, 0], [0, 0], [1, 1], [2, 0]];
        const trace = evoluteTrace(doubled, 1);
        expect(trace.x.length).toBeGreaterThan(0);
        expect(hasNaN(trace.x[0])).toBe(false);
        expect(trace.x.every((x, i) => hasNaN(x) === hasNaN(trace.y[i]))).toBe(true);
    });
});
