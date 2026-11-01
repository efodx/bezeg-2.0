import {describe, expect, it} from 'vitest';
import {guidedExampleHighlightRecipes} from './guidedExampleHighlights';
import {
    bezierPoint, phQuinticControlPoints, phQuinticOffsetPoint, phQuinticPoint, phQuinticVelocity, rationalBezierPoint,
    rationalControlPoints, rationalWeightsSecondTwo, weightedWarp, affineLessonControlPoints, bernsteinValue, bezierSegmentControls,
    decasteljauRows, defaultQuarticControlPoints, elevationCubicControlPoints, extrapolationCubicControlPoints, rotateAboutMean,
    subdivisionCubicControlPoints, symmetricCubicControlPoints, rationalDecasteljauRows, rationalElevatedControls, rationalSegmentControls,
    stackedBernsteinRegionSamples, c1QuadraticPieces, c1SplineFreePoints, c2CubicPieces, c2SplineFreePoints, cnSplineFreePoints,
    extrapolatedQuadraticPieces, g1QuadraticPieces, g1SplineFreePoints, g1SymmetricPieces, g1SymmetricSplineFreePoints, pieceDerivative, splinePoint,
    alphaC2SplineJoints, alphaC2SplinePieces, alphaC2SplinePoint, alphaC2SplineSamples, phArcLength, phControlPointsOf, phPointOf, phSpeedOf,
    splineKnotIntervals, splineKnots, splineParameterizationPoints, uniformArcLengthParameters, uniformParameterizationFixture,
    phCubicFixture, phQuinticFixture, phOffsetPointOf, phOffsetSelfIntersections, phVelocityOf, polylineSelfIntersections,
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

    it('rational de Casteljau: quadratic (1,2,1) at 1/2 projects the rows (-4/3,1),(4/3,1) and ends at (0,1), the point of the rational curve', () => {
        const P: [number, number][] = [[-4, -3], [0, 3], [4, -3]];
        const rows = rationalDecasteljauRows(P, [1, 2, 1], 0.5);
        near(rows[0][0], [-4 / 3, 1]); near(rows[0][1], [4 / 3, 1]); near(rows[1][0], [0, 1]);
        near(rationalBezierPoint(P, [1, 2, 1], 0.5), [0, 1]);
        near(rationalDecasteljauRows(P, [1, 1, 1], 0.5)[1][0], [0, 0]); // equal weights give the ordinary scheme
    });

    it('rational extrapolation: weights 1, 11/5, 13/25, 143/125 and E(u) = R(6u/5) with the lesson points', () => {
        const P: [number, number][] = [[-4, -3], [-3, 3], [3, 3], [4, -1]], W = [1, 2, 1, 1];
        const E = rationalSegmentControls(P, W, 0, 1.2);
        [1, 11 / 5, 13 / 25, 143 / 125].forEach((w, i) => expect(E.weights[i]).toBeCloseTo(w, 12));
        [[-4, -3], [-32 / 11, 39 / 11], [176 / 13, 33 / 13], [436 / 143, -3]].forEach((expected, i) => near(E.points[i], expected as [number, number]));
        for (let k = 0; k <= 20; k++) near(rationalBezierPoint(E.points, E.weights, k / 20), rationalBezierPoint(P, W, 1.2 * k / 20));
    });

    it('rational elevation: weights 1, 7/4, 3/2, 1, 1, Q_1 = (-22/7, 15/7), and the same curve', () => {
        const E = rationalElevatedControls(rationalControlPoints, rationalWeightsSecondTwo);
        [1, 7 / 4, 3 / 2, 1, 1].forEach((w, i) => expect(E.weights[i]).toBeCloseTo(w, 12));
        near(E.points[1], [-22 / 7, 15 / 7]);
        for (let k = 0; k <= 20; k++) near(rationalBezierPoint(E.points, E.weights, k / 20), rationalBezierPoint(rationalControlPoints, rationalWeightsSecondTwo, k / 20));
    });

    it('rational subdivision: the parts have weights (1,3/2,3/2,11/8) and (11/8,5/4,1,1), share R(1/2) and trace the curve', () => {
        const L = rationalSegmentControls(rationalControlPoints, rationalWeightsSecondTwo, 0, 0.5);
        const R = rationalSegmentControls(rationalControlPoints, rationalWeightsSecondTwo, 0.5, 1);
        [1, 3 / 2, 3 / 2, 11 / 8].forEach((w, i) => expect(L.weights[i]).toBeCloseTo(w, 12));
        [11 / 8, 5 / 4, 1, 1].forEach((w, i) => expect(R.weights[i]).toBeCloseTo(w, 12));
        near(L.points[3], [-9 / 11, 21 / 11]); near(R.points[0], [-9 / 11, 21 / 11]);
        near(L.points[1], [-10 / 3, 1]); near(L.points[2], [-13 / 6, 2]); near(R.points[1], [4 / 5, 9 / 5]); near(R.points[2], [7 / 2, 0]);
        for (let k = 0; k <= 20; k++) {
            near(rationalBezierPoint(L.points, L.weights, k / 20), rationalBezierPoint(rationalControlPoints, rationalWeightsSecondTwo, k / 40));
            near(rationalBezierPoint(R.points, R.weights, k / 20), rationalBezierPoint(rationalControlPoints, rationalWeightsSecondTwo, 0.5 + k / 40));
        }
    });

    it('stacked Bernstein regions: four outlines at degree 3 and the top edge is height 1 (partition of unity)', () => {
        expect(stackedBernsteinRegionSamples(4, 0)).toEqual([[0, 1], [1, 0], [0, 1]]);
        expect(stackedBernsteinRegionSamples(4, 1)).toEqual([[0, 1], [1, 0], [0, 1]]);
        expect(stackedBernsteinRegionSamples(4, 2)).toEqual([[0, 1], [1, 0], [0, 1]]);
        expect(stackedBernsteinRegionSamples(4, 3)).toEqual([[1, 0], [0, 1], [1, 0]]);
        for (const t of [0, 0.25, 0.5, 0.9]) expect([0, 1, 2, 3].reduce((sum, i) => sum + bernsteinValue(3, i, t), 0)).toBeCloseTo(1, 12);
    });

    it('registers the batch 03b-A recipes: six new highlights and three explicit starts', () => {
        const ids = Object.keys(guidedExampleHighlightRecipes).filter(id => id.startsWith('foundations.') || id.startsWith('rational-curves.'));
        const starts = ids.filter(id => guidedExampleHighlightRecipes[id].kind === 'start').sort();
        expect(starts).toEqual(['foundations.complex-plane.complex-multiplication', 'foundations.worked-weight.bernstein.degree-comparison', 'rational-curves.worked-conic.circle']);
        expect(ids.filter(id => guidedExampleHighlightRecipes[id].kind === 'highlight')).toHaveLength(7); // six new plus rational-weight from batch 02
    });
    // Splines (batch 03b-B): literal values below are worked out by hand from the lesson prose, not by the helpers.
    const parallelPositive = (a: readonly number[], b: readonly number[]) => {
        expect(a[0] * b[1] - a[1] * b[0]).toBeCloseTo(0, 9); // parallel
        expect(a[0] * b[0] + a[1] * b[1]).toBeGreaterThan(0); // same direction, positive factor
    };

    it('splinePoint: uniform knots, piece k on [k/m, (k+1)/m], t = 1 is the last end', () => {
        const pieces = [[[0, 0], [1, 0]], [[1, 0], [1, 2]], [[1, 2], [3, 2]]] as const;
        near(splinePoint(pieces, 0), [0, 0]); near(splinePoint(pieces, 1 / 3), [1, 0]); near(splinePoint(pieces, 0.5), [1, 1]);
        near(splinePoint(pieces, 2 / 3), [1, 2]); near(splinePoint(pieces, 1), [3, 2]);
    });

    it('C1 pieces: joint (0,2), and the derivative vectors at the joint are equal, (8,0)', () => {
        const [left, right] = c1QuadraticPieces(c1SplineFreePoints);
        expect(left).toEqual([[-4, -2], [-2, 2], [0, 2]]); expect(right).toEqual([[0, 2], [2, 2], [3, -1]]);
        near(pieceDerivative(left, 1, 0.5, true), [8, 0]); near(pieceDerivative(right, 1, 0.5, false), [8, 0]);
        near(splinePoint([left, right], 0.5), [0, 2]);
    });

    it('Cn pieces: q1 = 2 p2 - p1 = (2,-4), the joint is the midpoint of p1 and q1 and the first derivatives agree, (8,-4)', () => {
        const [left, right] = extrapolatedQuadraticPieces(cnSplineFreePoints);
        expect(right[1]).toEqual([2, -4]); expect(left[2]).toEqual([0, -3]);
        near(pieceDerivative(left, 1, 0.5, true), [8, -4]); near(pieceDerivative(right, 1, 0.5, false), [8, -4]);
    });

    it('C2 pieces: joints (-5/2,-1) and (5/2,0), inner points on the thirds of p2p3, first and second derivatives agree', () => {
        const pieces = c2CubicPieces(c2SplineFreePoints);
        near(pieces[0][2], [-4, 0]); near(pieces[0][3], [-2.5, -1]); near(pieces[1][1], [-1, -2]); near(pieces[1][2], [1, -1]);
        near(pieces[1][3], [2.5, 0]); near(pieces[2][1], [4, 1]);
        for (const [a, b] of [[0, 1], [1, 2]]) {
            near(pieceDerivative(pieces[a], 1, 1 / 3, true), pieceDerivative(pieces[b], 1, 1 / 3, false));
            near(pieceDerivative(pieces[a], 2, 1 / 3, true), pieceDerivative(pieces[b], 2, 1 / 3, false));
        }
        near(splinePoint(pieces, 0.5), [0, -1.25]);
    });

    it('G1 pieces at b = 1: derived point (2,-2), tangents parallel with a positive factor; at b = 1/4 the right derivative is 1/4 of the left', () => {
        const [left, right] = g1QuadraticPieces(g1SplineFreePoints, 1);
        near(right[1], [2, -2]);
        near(pieceDerivative(left, 1, 0.5, true), [8, -8]); near(pieceDerivative(right, 1, 0.5, false), [8, -8]);
        const [, small] = g1QuadraticPieces(g1SplineFreePoints, 0.25);
        near(small[1], [0.5, -0.5]); near(pieceDerivative(small, 1, 0.5, false), [2, -2]);
        parallelPositive(pieceDerivative(left, 1, 0.5, true), pieceDerivative(small, 1, 0.5, false));
    });

    it('symmetric G1 pieces at beta = 1/4: joint (-1,3/2), derivatives (4,-2) and (12,-6), parallel with a positive factor 3', () => {
        const [left, right] = g1SymmetricPieces(g1SymmetricSplineFreePoints, 0.25);
        near(left[2], [-1, 1.5]); near(right[0], [-1, 1.5]);
        near(pieceDerivative(left, 1, 0.5, true), [4, -2]); near(pieceDerivative(right, 1, 0.5, false), [12, -6]);
        parallelPositive(pieceDerivative(left, 1, 0.5, true), pieceDerivative(right, 1, 0.5, false));
    });

    it('pieceDerivative: second derivative of the parabola piece (0,0),(1/2,0),(1,1) over span 1 is (0,2)', () => {
        near(pieceDerivative([[0, 0], [0.5, 0], [1, 1]], 2, 1, false), [0, 2]);
        near(pieceDerivative([[0, 0], [0.5, 0], [1, 1]], 1, 1, true), [1, 2]);
    });

    it('registers the batch 03b-B recipes: five highlights and the worked-join start', () => {
        const ids = Object.keys(guidedExampleHighlightRecipes).filter(id => id.startsWith('splines.'));
        expect(ids.filter(id => guidedExampleHighlightRecipes[id].kind === 'start')).toEqual(['splines.worked-join.spline-c1.parabola-derivatives']);
        expect(ids.filter(id => guidedExampleHighlightRecipes[id].kind === 'highlight')).toHaveLength(5);
    });
});

describe('PH parametrization and spline parameterization expectations (task 04a)', () => {
    const uniformCurve = uniformParameterizationFixture;
    /** Composite Simpson rule on the speed |w|^2, independent of the Gauss rule under test. */
    const simpsonLength = (fixture: typeof uniformCurve, a: number, b: number, n = 2000) => {
        const h = (b - a) / n;
        let sum = phSpeedOf(fixture, a) + phSpeedOf(fixture, b);
        for (let i = 1; i < n; i++) sum += (i % 2 ? 4 : 2) * phSpeedOf(fixture, a + i * h);
        return sum * h / 3;
    };

    it('Gauss arc length equals an independent Simpson integral of the speed, on whole and partial intervals', () => {
        for (const [a, b] of [[0, 1], [0, 0.3], [0.4, 0.9]]) expect(phArcLength(uniformCurve, a, b)).toBeCloseTo(simpsonLength(uniformCurve, a, b), 9);
        expect(phArcLength(uniformCurve, 0, 1)).toBeGreaterThan(16);
    });

    it('phPointOf integrates the velocity: the end point is the last control point, and the lesson quintic matches the known control points', () => {
        const controls = phControlPointsOf(uniformCurve);
        expect(controls).toHaveLength(6);
        near(phPointOf(uniformCurve, 1), controls[5]);
        near(phPointOf(uniformCurve, 0), uniformCurve.start);
        const lessonQuintic = phControlPointsOf({start: [-2, -1], generators: [[2, 0], [2, 1], [1, 1]]});
        lessonQuintic.forEach((point, i) => near(point, phQuinticControlPoints[i]));
        for (const t of [0.2, 0.5, 0.8]) near(phPointOf({start: [-2, -1], generators: [[2, 0], [2, 1], [1, 1]]}, t), phQuinticPoint(t));
    });

    it('uniform parameterization: ten samples split the arc into eleven equal arcs of L/11 = 1.52, unlike t = i/11', () => {
        const total = phArcLength(uniformCurve, 0, 1);
        const ts = uniformArcLengthParameters(uniformCurve, 10);
        expect(ts).toHaveLength(10);
        const knots = [0, ...ts, 1];
        const gaps = knots.slice(1).map((t, i) => phArcLength(uniformCurve, knots[i], t));
        expect(gaps).toHaveLength(11);
        for (const gap of gaps) expect(gap).toBeCloseTo(total / 11, 8);
        expect(total / 11).toBeCloseTo(1.52, 2);
        const weighted = Array.from({length: 11}, (_, i) => phArcLength(uniformCurve, i / 11, (i + 1) / 11));
        expect(Math.max(...weighted) / Math.min(...weighted)).toBeGreaterThan(1.5); // the start scene's parameter spacing is not equal-arc
        const three = uniformArcLengthParameters(uniformCurve, 3);
        expect(three[0]).toBeCloseTo(0.149, 3); expect(three[1]).toBeCloseTo(0.5, 6); expect(three[2]).toBeCloseTo(0.851, 3);
    });

    const chordOf = (a: number, b: number) => Math.hypot(splineParameterizationPoints[a][0] - splineParameterizationPoints[b][0], splineParameterizationPoints[a][1] - splineParameterizationPoints[b][1]);
    const literalChords = [chordOf(0, 2), chordOf(2, 3), chordOf(3, 4), chordOf(4, 5), chordOf(5, 7)];

    it('spline knots: interval k is |chord_k|^alpha, normalised to total 1', () => {
        for (const alpha of [0, 0.5, 1]) {
            const intervals = splineKnotIntervals(splineParameterizationPoints, alpha);
            expect(intervals).toHaveLength(5);
            intervals.forEach((value, k) => expect(value).toBeCloseTo(literalChords[k] ** alpha, 12));
            const knots = splineKnots(splineParameterizationPoints, alpha);
            expect(knots[0]).toBe(0); expect(knots.at(-1)).toBeCloseTo(1, 12);
            const total = literalChords.reduce((s, c) => s + c ** alpha, 0);
            knots.slice(1).forEach((u, k) => expect(u - knots[k]).toBeCloseTo(literalChords[k] ** alpha / total, 12));
        }
        const uniform = splineKnots(splineParameterizationPoints, 0);
        uniform.forEach((u, k) => expect(u).toBeCloseTo(k / 5, 12));
    });

    it('spline joints: the lesson numbers J3 = (-3.325, 0.385) at alpha = 1 and (-2.133, 0) at alpha = 0; the joint moves by about 1.25', () => {
        const chordal = alphaC2SplineJoints(splineParameterizationPoints, 1)[2], uniform = alphaC2SplineJoints(splineParameterizationPoints, 0)[2];
        near(chordal, [-3.325, 0.385], 3);
        near(uniform, [-2.133, 0], 3);
        expect(Math.hypot(chordal[0] - uniform[0], chordal[1] - uniform[1])).toBeCloseTo(1.25, 1);
    });

    it('spline pieces are C2 at every joint for the chord knots, and interpolate the end points', () => {
        for (const alpha of [0, 0.5, 1]) {
            const pieces = alphaC2SplinePieces(splineParameterizationPoints, alpha), knots = splineKnots(splineParameterizationPoints, alpha);
            expect(pieces).toHaveLength(5);
            near(pieces[0][0], splineParameterizationPoints[0]); near(pieces[4][3], splineParameterizationPoints[7]);
            for (let k = 0; k + 1 < pieces.length; k++) {
                const left = knots[k + 1] - knots[k], right = knots[k + 2] - knots[k + 1];
                near(pieces[k][3], pieces[k + 1][0]);
                near(pieceDerivative(pieces[k], 1, left, true), pieceDerivative(pieces[k + 1], 1, right, false), 8);
                near(pieceDerivative(pieces[k], 2, left, true), pieceDerivative(pieces[k + 1], 2, right, false), 8);
            }
        }
    });

    it('spline samples at t = i/11: the lesson distribution 2,2,2,2,2 at alpha = 0 and 1,1,1,4,3 at alpha = 1', () => {
        const perPiece = (alpha: number) => {
            const knots = splineKnots(splineParameterizationPoints, alpha);
            return knots.slice(1).map((end, k) => Array.from({length: 10}, (_, i) => (i + 1) / 11).filter(t => t >= knots[k] && t < end).length);
        };
        expect(perPiece(0)).toEqual([2, 2, 2, 2, 2]);
        expect(perPiece(1)).toEqual([1, 1, 1, 4, 3]);
        const samples = alphaC2SplineSamples(splineParameterizationPoints, 1, 10);
        expect(samples).toHaveLength(10);
        for (const alpha of [0, 1]) {
            const pieces = alphaC2SplinePieces(splineParameterizationPoints, alpha), knots = splineKnots(splineParameterizationPoints, alpha);
            alphaC2SplineSamples(splineParameterizationPoints, alpha, 10).forEach((sample, i) => {
                const t = (i + 1) / 11, k = knots.findIndex((u, index) => index < 5 && t >= u && t < knots[index + 1]);
                near(sample, bezierPoint(pieces[k], (t - knots[k]) / (knots[k + 1] - knots[k])));
            });
        }
        near(alphaC2SplinePoint(splineParameterizationPoints, 1, 0), splineParameterizationPoints[0]);
    });

    it('registers the two parametrization recipes with frames and empty steps', () => {
        const uniform = guidedExampleHighlightRecipes['parametrization.uniform-timing.uniform-parameterization'];
        const spline = guidedExampleHighlightRecipes['parametrization.weighted-knot.spline-parameterization'];
        for (const [recipe, frame] of [[uniform, 'up-uniform-twenty-observation'], [spline, 'sp-chordal-observation']] as const) {
            expect(recipe.kind).toBe('highlight');
            if (recipe.kind === 'highlight') { expect(recipe.frame).toBe(frame); expect(recipe.steps).toEqual([]); expect(recipe.expectChange).toBe(true); }
        }
    });
});

describe('PH offset and singularity expectations (task 04a-3)', () => {
    const fixtures = [['cubic', phCubicFixture], ['quintic', phQuinticFixture]] as const;
    const ts = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1];

    it('offset point: |O - r| = |d| and (O - r).r-prime = 0 at samples, on the right for d > 0 and the left for d < 0', () => {
        for (const [, fixture] of fixtures) for (const d of [1, 0.2, -2.5]) for (const t of ts) {
            const [rx, ry] = phPointOf(fixture, t), [ox, oy] = phOffsetPointOf(fixture, d, t), [vx, vy] = phVelocityOf(fixture, t);
            expect(Math.hypot(ox - rx, oy - ry)).toBeCloseTo(Math.abs(d), 10);
            expect((ox - rx) * vx + (oy - ry) * vy).toBeCloseTo(0, 9);
            expect(Math.sign(vx * (oy - ry) - vy * (ox - rx))).toBe(-Math.sign(d));
        }
    });

    it('cubic at d = 1: r-prime(1) = (3, 4), unit normal (4, -3)/5, offset start (-2, -2) and end r(1) + (4/5, -3/5)', () => {
        const [vx, vy] = phVelocityOf(phCubicFixture, 1);
        expect(vx).toBeCloseTo(3, 12); expect(vy).toBeCloseTo(4, 12);
        const [rx, ry] = phPointOf(phCubicFixture, 1), [ox, oy] = phOffsetPointOf(phCubicFixture, 1, 1);
        expect(ox - rx).toBeCloseTo(0.8, 12); expect(oy - ry).toBeCloseTo(-0.6, 12);
        const [sx, sy] = phOffsetPointOf(phCubicFixture, 1, 0);
        expect(sx).toBeCloseTo(-2, 12); expect(sy).toBeCloseTo(-2, 12);
    });

    it('cubic hodograph: r-prime(t) = ((1-t) w0 + t w1)^2 matches finite differences of the control-point Bézier curve', () => {
        const controls = phControlPointsOf(phCubicFixture), h = 1e-5;
        for (const t of [0.1, 0.3, 0.5, 0.8]) {
            const a = bezierPoint(controls, t - h), b = bezierPoint(controls, t + h);
            const [vx, vy] = phVelocityOf(phCubicFixture, t);
            expect((b[0] - a[0]) / (2 * h)).toBeCloseTo(vx, 5);
            expect((b[1] - a[1]) / (2 * h)).toBeCloseTo(vy, 5);
            const mix = (1 - t) * 2 + t * 2, mixIm = t; // (1-t)(2,0) + t(2,1) = (2, t)
            expect(vx).toBeCloseTo(mix * mix - mixIm * mixIm, 12);
            expect(vy).toBeCloseTo(2 * mix * mixIm, 12);
        }
    });

    it('polyline self-intersections: a figure eight crosses once, a convex polyline and an empty one never', () => {
        expect(polylineSelfIntersections([[0, 0], [2, 2], [2, 0], [0, 2]])).toHaveLength(1);
        expect(polylineSelfIntersections([[0, 0], [2, 2], [2, 0], [0, 2]])[0].point).toEqual([1, 1]);
        expect(polylineSelfIntersections([[0, 0], [1, 0], [1, 1], [0, 1]])).toHaveLength(0);
        expect(polylineSelfIntersections([])).toHaveLength(0);
    });

    it('quintic offset at d = -2.5 crosses itself near t = 0.13 and 0.72 at about (-2.09, 1.49); d = +0.5 and +2.5 do not', () => {
        const crossings = phOffsetSelfIntersections(phQuinticFixture, -2.5);
        expect(crossings.length).toBeGreaterThan(0);
        const {i, j, point} = crossings[0];
        expect(i / 2000).toBeCloseTo(0.128, 2); expect(j / 2000).toBeCloseTo(0.718, 2);
        expect(point[0]).toBeCloseTo(-2.09, 1); expect(point[1]).toBeCloseTo(1.49, 1);
        expect(phOffsetSelfIntersections(phQuinticFixture, 0.5)).toHaveLength(0);
        expect(phOffsetSelfIntersections(phQuinticFixture, 2.5)).toHaveLength(0);
    });

    it('cubic offset has no self-intersection at the default d = 0.2', () => {
        expect(phOffsetSelfIntersections(phCubicFixture, 0.2)).toHaveLength(0);
    });

    it('registers the six PH cards with the offset steps, curve counts and the d = -2.5 slider value', () => {
        const get = (id: string) => { const r = guidedExampleHighlightRecipes[id]; if (r.kind !== 'highlight') throw new Error(id); return r; };
        expect(get('ph-curves.arc-length-problem.ph-cubic-speed')).toMatchObject({frame: 'ph-offsets-observation', steps: []});
        expect(get('ph-curves.complex-hodograph.ph-cubic-generator')).toMatchObject({frame: 'instruction', steps: [], expectChange: false});
        for (const id of ['ph-curves.arc-length-problem.ph-quintic-comparison', 'ph-curves.worked-length.ph-cubic-offset-length',
            'ph-curves.investigate-ph.ph-cubic-singularity', 'ph-curves.investigate-ph.ph-quintic-singularity']) {
            const r = get(id);
            expect(r.frame).toBe('observe'); expect(r.checks.curveCount).toBe(2);
            expect(r.steps.slice(0, 3)).toEqual([{kind: 'explore'}, {kind: 'select-tab', tab: 'display'}, {kind: 'set-control', control: 'checkbox', label: 'Odmiki krivulje', value: true}]);
        }
        expect(get('ph-curves.investigate-ph.ph-quintic-singularity').steps.at(-1)).toEqual({kind: 'set-control', control: 'slider', label: 'Razdalja odmika d', value: -2.5});
        expect(get('ph-curves.worked-length.ph-cubic-offset-length').steps.at(-1)).toMatchObject({value: 1});
    });
});

import {
    areaBetween, areaLessonF, areaLessonG, centralDifference, chordSum, continuityValues, graphArcLength, integrate, leftRiemannSum, lineThrough,
    lowestMargin, secantSlope, trigExtremes, trigValue,
} from './guidedExampleHighlightExpectations';

describe('functions and calculus highlight expectations (batch 04b)', () => {
    const recipe = (id: string) => { const r = guidedExampleHighlightRecipes[id]; if (r.kind !== 'highlight') throw new Error(id); return r; };

    it('integrate: x^2 on [0, 2] is 8/3 and sin on [0, pi] is 2', () => {
        expect(integrate(x => x * x, 0, 2)).toBeCloseTo(8 / 3, 12);
        expect(integrate(Math.sin, 0, Math.PI)).toBeCloseTo(2, 12);
    });

    it('arc length: ten chords of sin on [0, pi] sum to 3,8153, below the arc 3,8202, to 1e-4; the chord sum grows with n', () => {
        const chords = chordSum(Math.sin, 0, Math.PI, 10), arc = graphArcLength(Math.cos, 0, Math.PI);
        expect(chords).toBeCloseTo(3.8153, 4);
        expect(arc).toBeCloseTo(3.8202, 4);
        expect(chords).toBeLessThan(arc);
        expect(chordSum(Math.sin, 0, Math.PI, 100)).toBeGreaterThan(chords);
        expect(chordSum(Math.sin, 0, Math.PI, 1)).toBeCloseTo(Math.PI, 12); // one chord: the segment from (0, 0) to (pi, 0)
    });

    it('area between: f = (x - 2)^2 and g = 3 - (x - 2)^2 enclose 14/3 on [1, 3] with g not below f; the integrals of g and f are 16/3 and 2/3', () => {
        expect(areaBetween(areaLessonG, areaLessonF, 1, 3)).toBeCloseTo(14 / 3, 10);
        expect(integrate(areaLessonG, 1, 3)).toBeCloseTo(16 / 3, 10);
        expect(integrate(areaLessonF, 1, 3)).toBeCloseTo(2 / 3, 10);
        expect(lowestMargin(areaLessonG, areaLessonF, 1, 3)).toBeGreaterThanOrEqual(0);
        expect(lowestMargin(areaLessonF, areaLessonG, 1, 3)).toBeLessThan(0); // the order matters: f is below g
    });

    it('continuity at a = 1: the value is 1, the left limit 1, the right limit 2 and the jump 1', () => {
        const v = continuityValues(1);
        expect(v.value).toBeCloseTo(1, 12);
        expect(v.fromLeft).toBeCloseTo(1, 6);
        expect(v.fromRight).toBeCloseTo(2, 6);
        expect(v.jump).toBeCloseTo(1, 6);
        expect(continuityValues(1.5).jump).toBeCloseTo(0, 6); // a = 3/2 closes the gap
    });

    it('derivative: the secant of x^2 through x = 1 and 2 has slope 3 (h not 0), the tangent at 1 has slope 2', () => {
        expect(secantSlope(x => x * x, 1, 1)).toBeCloseTo(3, 12);
        expect(secantSlope(x => x * x, 1, -0.5)).toBeCloseTo(1.5, 12);
        expect(() => secantSlope(x => x * x, 1, 0)).toThrow();
        expect(centralDifference(x => x * x, 1)).toBeCloseTo(2, 8);
        expect(centralDifference(Math.sin, 0.5)).toBeCloseTo(Math.cos(0.5), 8);
    });

    it('exponential base two: 1, 2, 4, 8 at x = 0..3 and the doubling rule', () => {
        expect([0, 1, 2, 3].map(x => 2 ** x)).toEqual([1, 2, 4, 8]);
        const {points, curves} = recipe('functions-and-calculus.function-rules.exponential-function').checks;
        expect(points).toEqual([[0, 1], [1, 2]]);
        expect(curves?.[0][2]).toEqual([1, 2]);
    });

    it('linear: the line through (0, 1) and (2, 5) is y = 2x + 1', () => {
        const {slope, intercept} = lineThrough([0, 1], [2, 5]);
        expect(slope).toBe(2);
        expect(intercept).toBe(1);
        expect(slope * 2 + intercept).toBe(5);
        expect(lineThrough([1, 3], [3, 7])).toEqual({slope: 2, intercept: 1}); // the intercept is not read off a point on the y axis
        expect(() => lineThrough([1, 0], [1, 3])).toThrow();
    });

    it('trigonometric: 2 sin(2x + pi/2) + 1 has maximum 3 at x = 0, minimum -1 and period pi', () => {
        const p = {A: 2, omega: 2, phi: Math.PI / 2, B: 1};
        const e = trigExtremes(p);
        expect(e.max).toBeCloseTo(3, 9);
        expect(e.min).toBeCloseTo(-1, 9);
        expect(e.xOfMax).toBeCloseTo(0, 9);
        for (const x of [0, 0.3, 1.1, 2.5]) expect(trigValue(p, x + Math.PI)).toBeCloseTo(trigValue(p, x), 12);
        expect(trigValue(p, 0.3 + Math.PI / 2)).not.toBeCloseTo(trigValue(p, 0.3), 3); // pi/2 is not a period
    });

    it('accumulation: A(2) = 1 - cos 2 for sin from 0 and A\' = sin by finite differences', () => {
        const A = (x: number) => integrate(Math.sin, 0, x);
        expect(A(2)).toBeCloseTo(1 - Math.cos(2), 12);
        expect(A(2)).toBeCloseTo(1.4161, 4);
        for (const x of [0.5, 1, 2]) expect(centralDifference(A, x, 1e-4)).toBeCloseTo(Math.sin(x), 6);
        const pointYs = recipe('functions-and-calculus.integrals.accumulation').checks.points?.map(p => p[1]);
        expect(pointYs?.some(y => Math.abs(y - A(2)) < 1e-9)).toBe(true);
    });

    it('definite integral: four left rectangles under x^2 on [0, 2] sum to 1,75 and the exact area is 8/3', () => {
        expect(leftRiemannSum(x => x * x, 0, 2, 4)).toBeCloseTo(1.75, 12);
        expect(integrate(x => x * x, 0, 2)).toBeCloseTo(8 / 3, 12);
        expect(leftRiemannSum(x => x * x, 0, 2, 4)).toBeLessThan(integrate(x => x * x, 0, 2));
    });

    it('registers the nine recipes with nonempty checks; the four default-scene cards expect no change, the derivative uses the tangent switch', () => {
        const ids = Object.keys(guidedExampleHighlightRecipes).filter(id => id.startsWith('functions-and-calculus.'));
        expect(ids).toHaveLength(9);
        for (const id of ids) {
            const r = recipe(id);
            expect(Object.keys(r.checks).length).toBeGreaterThan(0);
        }
        for (const id of ['continuity.continuity', 'function-rules.exponential-function', 'function-rules.linear-function', 'integrals.definite-integral']) {
            const r = recipe(`functions-and-calculus.${id}`);
            expect(r).toMatchObject({steps: [], expectChange: false});
        }
        expect(recipe('functions-and-calculus.derivatives.derivative').steps.map(s => s.kind)).toEqual(['explore', 'select-tab', 'set-control']);
    });
});
