import {describe, expect, it} from 'vitest';
import {guidedExampleHighlightRecipes} from './guidedExampleHighlights';
import {
    bezierPoint, phQuinticControlPoints, phQuinticOffsetPoint, phQuinticPoint, phQuinticVelocity, rationalBezierPoint,
    rationalControlPoints, rationalWeightsSecondTwo, weightedWarp, affineLessonControlPoints, bernsteinValue, bezierSegmentControls,
    decasteljauRows, defaultQuarticControlPoints, elevationCubicControlPoints, extrapolationCubicControlPoints, rotateAboutMean,
    subdivisionCubicControlPoints, symmetricCubicControlPoints,
} from './guidedExampleHighlightExpectations';

describe('independent highlight expectations', () => {
    it('quintic PH: the offset is d away from the curve, perpendicular to r\', on the right for d>0', () => {
        for (const t of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
            const [rx, ry] = phQuinticPoint(t), [ox, oy] = phQuinticOffsetPoint(t, 0.5), [vx, vy] = phQuinticVelocity(t);
            expect(Math.hypot(ox - rx, oy - ry)).toBeCloseTo(0.5, 12);
            expect((ox - rx) * vx + (oy - ry) * vy).toBeCloseTo(0, 12);
            expect(vx * (oy - ry) - vy * (ox - rx)).toBeLessThan(0); // cross(r', O-r) < 0: right of the direction of travel
        }
    });

    it('quintic PH: the S1 offset at t = 0.5, d = 0.5 is the independently computed literal point', () => {
        const [ox, oy] = phQuinticOffsetPoint(0.5, 0.5);
        expect(ox).toBeCloseTo(0.091236, 6);
        expect(oy).toBeCloseTo(-0.561494, 6);
    });

    it('quintic PH: the integrated curve agrees with the degree-5 Bézier of the derived control points and the lesson endpoint', () => {
        for (const t of [0, 0.3, 0.5, 1]) {
            const [bx, by] = bezierPoint(phQuinticControlPoints, t), [rx, ry] = phQuinticPoint(t);
            expect(bx).toBeCloseTo(rx, 12);
            expect(by).toBeCloseTo(ry, 12);
        }
        expect(phQuinticPoint(1)[0]).toBeCloseTo(1 / 3, 12);
        expect(phQuinticPoint(1)[1]).toBeCloseTo(16 / 15, 12);
        expect(phQuinticControlPoints.length).toBe(6);
    });

    it('rational: R(1/2) for weights (1,2,1,1) is (-9/11, 21/11) and the end points are P_0 and P_3', () => {
        const [x, y] = rationalBezierPoint(rationalControlPoints, rationalWeightsSecondTwo, 0.5);
        expect(x).toBeCloseTo(-9 / 11, 12);
        expect(y).toBeCloseTo(21 / 11, 12);
        expect(rationalBezierPoint(rationalControlPoints, rationalWeightsSecondTwo, 0)).toEqual([-4, -3]);
        expect(rationalBezierPoint(rationalControlPoints, rationalWeightsSecondTwo, 1)).toEqual([4, -3]);
        expect(rationalBezierPoint(rationalControlPoints, [1, 1, 1, 1], 0.5)).toEqual([0, 1.5]);
    });

    it('weighted parameterization: phi_{1/4}(1/4, 1/2, 3/4) = 1/2, 3/4, 9/10, fixes 0 and 1, and alpha=1/2 is the identity', () => {
        expect([0.25, 0.5, 0.75].map(t => weightedWarp(0.25, t))).toEqual([0.5, 0.75, 0.9].map(v => expect.closeTo(v, 12)));
        expect(weightedWarp(0.25, 0)).toBe(0);
        expect(weightedWarp(0.25, 1)).toBe(1);
        expect(weightedWarp(0.5, 0.3)).toBeCloseTo(0.3, 12);
        expect(weightedWarp(0.25, 0.25)).toBeCloseTo(3 * 0.25 / (1 + 2 * 0.25), 12);
    });

    it('registers the three sample recipes with nonempty checks', () => {
        for (const id of ['ph-curves.offsets.ph-quintic-offsets', 'rational-curves.why-rational.rational-weight',
            'parametrization.weighted-knot.weighted-parameterization']) {
            const recipe = guidedExampleHighlightRecipes[id];
            expect(recipe.kind).toBe('highlight');
            if (recipe.kind === 'highlight') {
                expect(recipe.expectChange).toBe(true);
                expect(recipe.checks.curves?.length).toBeGreaterThan(0);
                expect(recipe.checks.points?.length).toBeGreaterThan(0);
            }
        }
    });
});

const near = (a: readonly number[], b: readonly number[], digits = 9) => a.forEach((value, i) => expect(value).toBeCloseTo(b[i], digits));
const distance = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe('bezier-curves chapter highlight expectations (batch 03a)', () => {
    it('affine: the quarter turn about the mean (3,1) gives the lesson controls and B_T(1/2) = (9/4, 1)', () => {
        const turned = rotateAboutMean(affineLessonControlPoints, Math.PI / 2);
        [[4, -1], [1, 0], [2, 2], [5, 3]].forEach((expected, i) => near(turned[i], expected));
        near(bezierPoint(affineLessonControlPoints, 0.5), [3, 7 / 4]);
        near(bezierPoint(turned, 0.5), [9 / 4, 1]);
    });

    it('bernstein: the cubic weights at t = 1/2 are 1/8, 3/8, 3/8, 1/8 and add to 1 at every sample', () => {
        [1 / 8, 3 / 8, 3 / 8, 1 / 8].forEach((expected, i) => expect(bernsteinValue(3, i, 0.5)).toBeCloseTo(expected, 12));
        for (const t of [0, 0.1, 0.5, 0.9, 1]) expect([0, 1, 2, 3].reduce((sum, i) => sum + bernsteinValue(3, i, t), 0)).toBeCloseTo(1, 12);
    });

    it('symmetric cubic: B(1/2) = (0,1) and the curve stays inside the hull (the rectangle [-3,3] x [-2,2])', () => {
        near(bezierPoint(symmetricCubicControlPoints, 0.5), [0, 1]);
        for (let k = 0; k <= 100; k++) {
            const [x, y] = bezierPoint(symmetricCubicControlPoints, k / 100);
            expect(Math.abs(x)).toBeLessThanOrEqual(3 + 1e-12);
            expect(Math.abs(y)).toBeLessThanOrEqual(2 + 1e-12);
        }
    });

    it('de Casteljau rows: the symmetric cubic at 1/2 gives (-3,0),(0,2),(3,0); (-3/2,1),(3/2,1); (0,1); the quartic ends at (0,7/4)', () => {
        const rows = decasteljauRows(symmetricCubicControlPoints, 0.5);
        expect(rows.map(row => row.length)).toEqual([3, 2, 1]);
        [[-3, 0], [0, 2], [3, 0]].forEach((expected, i) => near(rows[0][i], expected));
        [[-1.5, 1], [1.5, 1]].forEach((expected, i) => near(rows[1][i], expected));
        near(rows[2][0], [0, 1]);
        const quartic = decasteljauRows(defaultQuarticControlPoints, 0.5);
        expect(quartic.map(row => row.length)).toEqual([4, 3, 2, 1]);
        near(quartic[3][0], [0, 7 / 4]);
    });

    it('alternative recursion: B(t) = (1-t) C1(t) + t C2(t) for the helper curves of p0..p3 and p1..p4, at t = 1/4', () => {
        const c1 = bezierPoint(defaultQuarticControlPoints.slice(0, 4), 0.25), c2 = bezierPoint(defaultQuarticControlPoints.slice(1), 0.25);
        const main = bezierPoint(defaultQuarticControlPoints, 0.25);
        near(main, [0.75 * c1[0] + 0.25 * c2[0], 0.75 * c1[1] + 0.25 * c2[1]]);
        expect(distance(c1, main)).toBeCloseTo(0.25 * distance(c1, c2), 12);
    });

    it('subdivision: the cut at 1/2 gives the lesson left part and a right part sharing (0, 3/2); each part traces the original', () => {
        const left = bezierSegmentControls(subdivisionCubicControlPoints, 0, 0.5), right = bezierSegmentControls(subdivisionCubicControlPoints, 0.5, 1);
        [[-4, -3], [-3.5, 0], [-1.75, 1.5], [0, 1.5]].forEach((expected, i) => near(left[i], expected));
        near(right[0], [0, 1.5]);
        near(right[3], [4, -3]);
        for (const u of [0, 0.25, 0.5, 0.75, 1]) {
            near(bezierPoint(left, u), bezierPoint(subdivisionCubicControlPoints, u / 2));
            near(bezierPoint(right, u), bezierPoint(subdivisionCubicControlPoints, (1 + u) / 2));
        }
    });

    it('repeated subdivision: the polygon-to-curve distance shrinks by about 4 per halving and is below 0.05 after three', () => {
        const maxDistance = (steps: number) => {
            let worst = 0;
            for (let k = 0; k < 2 ** steps; k++) {
                const piece = bezierSegmentControls(subdivisionCubicControlPoints, k / 2 ** steps, (k + 1) / 2 ** steps);
                for (let j = 0; j <= 20; j++) {
                    const curvePoint = bezierPoint(piece, j / 20);
                    let best = Infinity;
                    for (let e = 0; e < 3; e++) {
                        const [a, b] = [piece[e], piece[e + 1]];
                        const dx = b[0] - a[0], dy = b[1] - a[1];
                        const s = Math.max(0, Math.min(1, ((curvePoint[0] - a[0]) * dx + (curvePoint[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
                        best = Math.min(best, distance(curvePoint, [a[0] + s * dx, a[1] + s * dy]));
                    }
                    worst = Math.max(worst, best);
                }
            }
            return worst;
        };
        const d = [0, 1, 2, 3].map(maxDistance);
        expect(d[3]).toBeLessThan(0.05);
        expect(d[2] / d[3]).toBeGreaterThan(3.5);
        expect(d[2] / d[3]).toBeLessThan(4.5);
    });

    it('elevation: Q_i = (i/4) P_{i-1} + (1-i/4) P_i keeps the curve; the lesson Q = (-4,-2),(-13/4,7/4),(-1/2,3),(9/4,7/4),(3,-2)', () => {
        const P = elevationCubicControlPoints;
        const Q = [0, 1, 2, 3, 4].map(i => [i / 4 * P[Math.max(i - 1, 0)][0] + (1 - i / 4) * P[Math.min(i, 3)][0], i / 4 * P[Math.max(i - 1, 0)][1] + (1 - i / 4) * P[Math.min(i, 3)][1]] as const);
        [[-4, -2], [-13 / 4, 7 / 4], [-1 / 2, 3], [9 / 4, 7 / 4], [3, -2]].forEach((expected, i) => near(Q[i], expected));
        for (let k = 0; k <= 20; k++) near(bezierPoint(Q, k / 20), bezierPoint(P, k / 20), 9);
    });

    it('extrapolation: E(u) = B(6u/5) has the lesson controls, retraces B on [0, 5/6] and ends at B(6/5)', () => {
        const E = bezierSegmentControls(extrapolationCubicControlPoints, 0, 1.2);
        [[-4, -2], [-14 / 5, 4], [104 / 25, 14 / 5], [382 / 125, -484 / 125]].forEach((expected, i) => near(E[i], expected));
        for (let k = 0; k <= 20; k++) near(bezierPoint(E, 5 / 6 * k / 20), bezierPoint(extrapolationCubicControlPoints, k / 20));
        near(bezierPoint(E, 1), [382 / 125, -484 / 125]);
    });

    it('decasteljau-parameter: equal parameter steps give unequal arc lengths on the quartic (t in [0,1/4] versus [1/4,1/2])', () => {
        const arc = (a: number, b: number) => {
            let length = 0, previous = bezierPoint(defaultQuarticControlPoints, a);
            for (let k = 1; k <= 2000; k++) {
                const next = bezierPoint(defaultQuarticControlPoints, a + (b - a) * k / 2000);
                length += distance(previous, next); previous = next;
            }
            return length;
        };
        expect(Math.abs(arc(0, 0.25) - arc(0.25, 0.5))).toBeGreaterThan(1e-3);
    });

    it('registers the batch 03a recipes: nine highlights with checks and three explicit starts', () => {
        const recipes = Object.entries(guidedExampleHighlightRecipes).filter(([id]) => id.startsWith('bezier-curves.'));
        expect(recipes.filter(([, recipe]) => recipe.kind === 'start').map(([id]) => id).sort()).toEqual([
            'bezier-curves.geometric-properties.convex-hull', 'bezier-curves.interpolation.quartic-interpolation', 'bezier-curves.parameter.decasteljau-parameter']);
        const highlights = recipes.filter(([, recipe]) => recipe.kind === 'highlight');
        expect(highlights).toHaveLength(9);
        for (const [, recipe] of highlights) {
            if (recipe.kind === 'highlight') expect((recipe.checks.curves?.length ?? 0) + (recipe.checks.points?.length ?? 0)).toBeGreaterThan(0);
        }
    });
});
