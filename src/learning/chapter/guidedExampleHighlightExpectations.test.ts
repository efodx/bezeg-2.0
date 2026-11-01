import {describe, expect, it} from 'vitest';
import {guidedExampleHighlightRecipes} from './guidedExampleHighlights';
import {
    bezierPoint, phQuinticControlPoints, phQuinticOffsetPoint, phQuinticPoint, phQuinticVelocity, rationalBezierPoint,
    rationalControlPoints, rationalWeightsSecondTwo, weightedWarp,
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
