import C1SplineGraph, {c1SplineDefaultPreset} from './C1SplineGraph';
import C2SplineGraph, {c2SplineDefaultPreset} from './C2SplineGraph';
import G1SplineGraph, {g1SplineDefaultPreset} from './G1SplineGraph';

// Literal control points of the route defaults. Lesson L3 and the curvature comb Demonstration rely on these exact scenes.
const STATE = {showingJxgPoints: true, showingControlPolygon: false, showingConvexHull: false};
const C1_POINTS = [[-4, 3], [-4, -3], [-1, -3], [-1, 3], [3, 3], [4, -3]];
const C2_POINTS = [[-2.7, 1.8], [-4.7, 0.35], [-4.3, -3], [1, -2], [0.2, 1.8], [4, 1], [4.5, -2.3]];
const G1_POINTS = [[-2.5, 1], [-4, -1.5], [-2.5, -2.5], [0, -1], [3, 1]];

/** What the real route graph loads as its initial scene. */
const routeDefault = (Cls: any) => Object.create(Cls.prototype).defaultPreset();

describe('spline route default presets', () => {
    it('c1 default is the literal six-point quadratic C1 scene and the route loads it', () => {
        const expected = [["JSXQuadraticC1SplineCurve", {points: C1_POINTS, degree: 2, continuity: 1, state: STATE}]];
        expect(c1SplineDefaultPreset()).toEqual(expected);
        expect(routeDefault(C1SplineGraph)).toEqual(expected);
    });

    it('c2 default is the literal seven-point cubic C2 scene and the route loads it', () => {
        const expected = [["JSXQubicC2SplineCurve", {points: C2_POINTS, degree: 3, continuity: 3, state: STATE}]];
        expect(c2SplineDefaultPreset()).toEqual(expected);
        expect(routeDefault(C2SplineGraph)).toEqual(expected);
    });

    it('g1 default is the literal five-point quadratic G1 scene and the route loads it', () => {
        const expected = [["JSXQuadraticG1SplineCurve", {points: G1_POINTS, state: STATE}]];
        expect(g1SplineDefaultPreset()).toEqual(expected);
        expect(routeDefault(G1SplineGraph)).toEqual(expected);
    });
});
