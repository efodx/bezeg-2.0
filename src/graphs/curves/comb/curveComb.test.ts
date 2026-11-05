import {combAtJoin, polynomialBezierSource} from "../../../bezeg/impl/curve/curvature";
import {C1QuadraticBezierSpline} from "../../../bezeg/impl/curve/C1QuadraticBezierSpline";
import {C2CubicBezierSpline} from "../../../bezeg/impl/curve/C2CubicBezierSpline";
import {PointImpl} from "../../../bezeg/impl/point/point-impl";
import {BezierSpline} from "../../../bezeg/impl/curve/bezier-spline";
import {CLIP_MARK_HALF_LENGTH, computeComb, largestJoin, SpanRows, teethPerSpan} from "./curveComb";

/** y = x^2 on [-1, 1] as a quadratic Bezier (x = 2t - 1). Independent closed form: kappa = 2 / (1 + 4x^2)^(3/2). */
const PARABOLA: SpanRows = [[[-1, 1], [0, -1], [1, 1]]];

/** The tooth of y = x^2 at abscissa x: base (x, x^2), tip base - gain * kappa * N with N the left unit normal (-2x, 1) / sqrt(1 + 4x^2). */
function parabolaTooth(x: number, gain: number) {
    const s = Math.sqrt(1 + 4 * x * x);
    const kappa = 2 / (s * s * s);
    const normal = [-2 * x / s, 1 / s];
    const tangent = [1 / s, 2 * x / s];
    return {kappa, tangent, tip: [x - gain * kappa * normal[0], x * x - gain * kappa * normal[1]]};
}

/** The finite runs of a NaN-separated array pair. */
function runs(xs: number[], ys: number[]): Array<Array<[number, number]>> {
    const result: Array<Array<[number, number]>> = [[]];
    xs.forEach((x, i) => {
        if (Number.isNaN(x)) { if (result[result.length - 1].length) result.push([]); }
        else result[result.length - 1].push([x, ys[i]]);
    });
    return result.filter(run => run.length > 0);
}

const modelPoints = (raw: number[][]) => raw.map(([x, y]) => new PointImpl(x, y));
const spanRowsOf = (spline: BezierSpline): number[][][] => spline.getUnderlyingCurves().map(c => c.getPoints().map(p => [p.X(), p.Y()]));

const C1_POINTS = [[-4, 3], [-4, -3], [-1, -3], [-1, 3], [3, 3], [4, -3]];

describe('L3 (1): teeth are normal to the curve and have length gain * |kappa|', () => {
    const gain = 0.3;
    const comb = computeComb(PARABOLA, 64, gain);

    test('every tooth matches the closed form of the parabola to 1e-9', () => {
        expect(comb.toothCount).toBe(64);
        expect(comb.clippedCount).toBe(0);
        for (let k = 0; k < comb.toothCount; k++) {
            const base: [number, number] = [comb.teethX[3 * k], comb.teethY[3 * k]];
            const tip: [number, number] = [comb.teethX[3 * k + 1], comb.teethY[3 * k + 1]];
            expect(Number.isNaN(comb.teethX[3 * k + 2])).toBe(true);
            // The base lies on the curve.
            expect(Math.abs(base[1] - base[0] ** 2)).toBeLessThan(1e-9);
            const expected = parabolaTooth(base[0], gain);
            expect(Math.abs(tip[0] - expected.tip[0])).toBeLessThan(1e-9);
            expect(Math.abs(tip[1] - expected.tip[1])).toBeLessThan(1e-9);
            // Normal to the tangent, and gain * |kappa| long.
            const tooth = [tip[0] - base[0], tip[1] - base[1]];
            expect(Math.abs(tooth[0] * expected.tangent[0] + tooth[1] * expected.tangent[1])).toBeLessThan(1e-9);
            expect(Math.abs(Math.hypot(tooth[0], tooth[1]) - gain * expected.kappa)).toBeLessThan(1e-9);
        }
    });

    test('the tip line passes through the tips of all teeth, in order', () => {
        const tips = runs(comb.tipX, comb.tipY);
        expect(tips).toHaveLength(1);
        expect(tips[0]).toHaveLength(64);
        tips[0].forEach(([x, y], k) => {
            expect(x).toBe(comb.teethX[3 * k + 1]);
            expect(y).toBe(comb.teethY[3 * k + 1]);
        });
    });
});

describe('the requested count is shared across the spans', () => {
    test.each([[64, 1, 64], [64, 4, 16], [64, 5, 13], [64, 20, 8], [256, 2, 128], [8, 1, 8], [1000, 1, 256]])(
        'count %i over %i spans gives %i teeth per span', (count, spans, expected) => {
            expect(teethPerSpan(count, spans)).toBe(expected);
        });

    test('a four-span spline draws the shared count in total', () => {
        const spans = spanRowsOf(new C1QuadraticBezierSpline(modelPoints(C1_POINTS)));
        expect(spans.length).toBe(4);
        expect(computeComb(spans, 64, 1).toothCount).toBe(64);
    });
});

describe('L3 (2): nothing straddles a knot and join jumps equal the kernel', () => {
    // y = x^2 on [-1, 0] and y = 2x^2 on [0, 1] meet at the origin with kappa 2 on the left and 4 on the right.
    const left = [[-1, 1], [-0.5, 0], [0, 0]];
    const right = [[0, 0], [0.5, 0], [1, 2]];
    const comb = computeComb([left, right], 64, 0.2);

    test('the tip line is cut at the span end: two runs of 32, no segment from one span into the next', () => {
        const tips = runs(comb.tipX, comb.tipY);
        expect(tips.map(run => run.length)).toEqual([32, 32]);
        // The NaN separators sit exactly after each span's run, on the real arrays.
        expect(Number.isNaN(comb.tipX[32])).toBe(true);
        expect(Number.isNaN(comb.tipX[65])).toBe(true);
        tips[0].forEach(([x]) => expect(x).toBeLessThanOrEqual(0 + 0.2 * 4));
    });

    test('both end teeth of the join are drawn: two teeth at one base', () => {
        // Last tooth of span one and first tooth of span two share the base at the origin.
        const lastLeft = 3 * 31, firstRight = 3 * 32;
        expect([comb.teethX[lastLeft], comb.teethY[lastLeft]]).toEqual([0, 0]);
        expect([comb.teethX[firstRight], comb.teethY[firstRight]]).toEqual([0, 0]);
        expect(Math.hypot(comb.teethX[lastLeft + 1], comb.teethY[lastLeft + 1])).toBeCloseTo(0.2 * 2, 9);
        expect(Math.hypot(comb.teethX[firstRight + 1], comb.teethY[firstRight + 1])).toBeCloseTo(0.2 * 4, 9);
    });

    test('the join jump equals the closed form and the kernel', () => {
        expect(comb.joins).toHaveLength(1);
        const [join] = comb.joins;
        expect(join.kappaLeft).toBeCloseTo(2, 9);
        expect(join.kappaRight).toBeCloseTo(4, 9);
        expect(join.jump).toBeCloseTo(2, 9);
        const kernel = combAtJoin({source: polynomialBezierSource(left), t: 1}, {source: polynomialBezierSource(right), t: 0});
        expect(join.kappaLeft).toBe(kernel.kappaLeft);
        expect(join.kappaRight).toBe(kernel.kappaRight);
        expect(join.jump).toBe(kernel.jump);
        expect(largestJoin(comb.joins)).toBe(join);
    });

    test('a join between two identical-curvature spans has jump 0 and never negative zero', () => {
        const same = computeComb([left, [[0, 0], [0.5, 0], [1, 1]]], 64, 1).joins[0];
        expect(Object.is(same.jump, -0)).toBe(false);
        expect(same.jump).toBeCloseTo(0, 9);
    });
});

describe('L3 (3): curvature continuity of splines', () => {
    function seeded(seed: number) {
        let state = seed >>> 0;
        return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
    }

    test.each([0, 0.5, 1])('a C2 cubic spline with alpha %d has equal one-sided curvature at every regular join, over seeded random control points', alpha => {
        const random = seeded(20261105);
        let reached = 0, skipped = 0;
        for (let trial = 0; trial < 40; trial++) {
            const count = 5 + Math.floor(random() * 4);
            const points = Array.from({length: count}, () => [random() * 10 - 5, random() * 10 - 5]);
            const spline = new C2CubicBezierSpline(modelPoints(points));
            spline.setAlpha(alpha);
            for (const join of computeComb(spanRowsOf(spline), 64, 1).joins) {
                if (join.jump === undefined) { skipped++; continue; }
                reached++;
                const scale = Math.max(1, Math.abs(join.kappaLeft!), Math.abs(join.kappaRight!));
                expect(Math.abs(join.jump)).toBeLessThan(1e-8 * scale);
            }
        }
        expect(reached).toBeGreaterThan(50);
        expect(skipped).toBeLessThan(reached);
    });

    test('the C1 quadratic default shows a non-zero jump at its joins', () => {
        const comb = computeComb(spanRowsOf(new C1QuadraticBezierSpline(modelPoints(C1_POINTS))), 64, 1);
        expect(comb.joins).toHaveLength(3);
        for (const join of comb.joins) expect(Math.abs(join.jump!)).toBeGreaterThan(0.05);
    });
});

describe('L3 (e): singular samples leave a gap, clipped teeth leave a mark', () => {
    // r'(t) = 2(2 - 3t, 0) vanishes at t = 2/3, which is the 43rd of 64 equally spaced samples.
    const turning = [[[-1, 0], [1, 0], [0, 0]]];

    test('the singular sample is omitted from the teeth and breaks the tip line there', () => {
        const comb = computeComb(turning, 64, 1);
        expect(comb.toothCount).toBe(63);
        const tips = runs(comb.tipX, comb.tipY);
        expect(tips.map(run => run.length)).toEqual([42, 21]);
        // The break is a NaN between the two runs, not a segment across the gap.
        expect(Number.isNaN(comb.tipX[42])).toBe(true);
    });

    test('a singular first sample leaves no leading separator and no gap is invented', () => {
        // b0 = b1: r'(0) = 0.
        const comb = computeComb([[[0, 0], [0, 0], [1, 1], [2, 0]]], 64, 1);
        expect(comb.toothCount).toBe(63);
        expect(Number.isNaN(comb.tipX[0])).toBe(false);
        expect(runs(comb.tipX, comb.tipY)).toHaveLength(1);
    });

    test('a clipped tooth gets a cross-bar at its tip, normal to the tooth; unclipped teeth get none', () => {
        const clipped = computeComb(PARABOLA, 64, 6);
        expect(clipped.clippedCount).toBeGreaterThan(0);
        expect(clipped.clippedX).toHaveLength(3 * clipped.clippedCount);
        // Clipped teeth all have the visible maximum, which is the curve's length scale (COMB_MAX_TOOTH_FACTOR = 1).
        const lengthOf = (k: number) => Math.hypot(clipped.teethX[3 * k + 1] - clipped.teethX[3 * k], clipped.teethY[3 * k + 1] - clipped.teethY[3 * k]);
        const scale = Math.max(...Array.from({length: clipped.toothCount}, (_, k) => lengthOf(k)));
        expect(scale).toBeGreaterThan(1);
        let found = 0;
        for (let k = 0; k < clipped.toothCount; k++) {
            const base = [clipped.teethX[3 * k], clipped.teethY[3 * k]], tip = [clipped.teethX[3 * k + 1], clipped.teethY[3 * k + 1]];
            if (Math.abs(lengthOf(k) - scale) > 1e-9) continue;
            const j = 3 * found++;
            const a = [clipped.clippedX[j], clipped.clippedY[j]], b = [clipped.clippedX[j + 1], clipped.clippedY[j + 1]];
            expect([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2][0]).toBeCloseTo(tip[0], 9);
            expect([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2][1]).toBeCloseTo(tip[1], 9);
            expect((b[0] - a[0]) * (tip[0] - base[0]) + (b[1] - a[1]) * (tip[1] - base[1])).toBeCloseTo(0, 9);
            expect(Math.hypot(b[0] - a[0], b[1] - a[1])).toBeCloseTo(2 * CLIP_MARK_HALF_LENGTH * scale, 9);
        }
        expect(found).toBe(clipped.clippedCount);
        const unclipped = computeComb(PARABOLA, 64, 0.1);
        expect(unclipped.clippedCount).toBe(0);
        expect(unclipped.clippedX).toHaveLength(0);
    });

    test('a span with fewer than two control points draws nothing and does not throw', () => {
        expect(computeComb([[[0, 0]]], 64, 1).toothCount).toBe(0);
    });
});
