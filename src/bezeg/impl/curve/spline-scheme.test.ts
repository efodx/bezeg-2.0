import {describe, expect, it} from "vitest";
import {PointImpl} from "../point/point-impl";
import {Point} from "../../api/point/point";
import {BezierSpline} from "./bezier-spline";
import {PolynomialBezierCurve} from "./polynomial-bezier-curve";
import {SplineScheme, spanEndpoints} from "./spline-scheme";
import {C1QuadraticBezierSpline} from "./C1QuadraticBezierSpline";
import {G1SymmetricQuadraticBezierSpline} from "./G1SymmetricQuadraticBezierSpline";
import {GenericBezierSpline} from "./GenericBezierSpline";

const pt = (x: number, y: number) => new PointImpl(x, y);

/** The simplest possible scheme: a polyline of straight spans through the free points, one parameter per span. */
const polylineScheme: SplineScheme = {
    listsComputedPoints: false,
    initialParameters: pointCount => new Array<number>(Math.max(0, pointCount - 1)).fill(7),
    build(context) {
        const curves: PolynomialBezierCurve[] = [];
        for (let i = 0; i < context.points.length - 1; i++) {
            curves.push(new PolynomialBezierCurve([context.points[i], context.points[i + 1]]));
        }
        return {curves, computedPoints: []};
    },
    knotSpans: (_points, curves) => spanEndpoints(curves),
};

class Polyline extends BezierSpline {
    constructor(points: Point[]) {
        super(points, polylineScheme);
    }
}

describe("BezierSpline with a custom scheme", () => {
    it("evaluates the scheme's spans across knots, including past both ends", () => {
        const spline = new Polyline([pt(0, 0), pt(4, 0), pt(4, 4)]);
        // alpha = 0: uniform knots 0, 0.5, 1
        expect([0, 0.25, 0.5, 0.75, 1].map(t => [spline.eval(t).X(), spline.eval(t).Y()]))
            .toEqual([[0, 0], [2, 0], [4, 0], [4, 2], [4, 4]]);
        expect(spline.eval(1.5).Y()).toBeCloseTo(4, 12);
        expect(spline.eval(-0.5).X()).toBeCloseTo(-4, 12); // extrapolates the first span like before
    });

    it("uses chord-length knots when alpha changes", () => {
        const spline = new Polyline([pt(0, 0), pt(1, 0), pt(1, 3)]);
        spline.setAlpha(1);
        // spans of length 1 and 3 -> the break is at u = 1/4
        expect(spline.eval(0.25).X()).toBeCloseTo(1, 12);
        expect(spline.eval(0.25).Y()).toBeCloseTo(0, 12);
        expect(spline.eval(0.625).Y()).toBeCloseTo(1.5, 12);
    });

    it("resets the scheme's initial parameters on every regeneration", () => {
        const points = [pt(0, 0), pt(1, 0), pt(2, 1)];
        const spline = new Polyline(points);
        expect(spline.getBs()).toEqual([7, 7]);
        spline.setB(0, 1);
        expect(spline.getB(0)).toBe(1);
        spline.addPoint(pt(3, 1));
        expect(spline.getBs()).toEqual([7, 7, 7]);
        expect(spline.getUnderlyingCurves()).toHaveLength(3);
        spline.removePoint(points[0]);
        expect(spline.getUnderlyingCurves()).toHaveLength(2);
        expect(spline.getNumOfBs()).toBe(2);
    });

    it("lists only free points unless the scheme says otherwise", () => {
        expect(new Polyline([pt(0, 0), pt(1, 1)]).getPoints()).toHaveLength(2);
        const generic = new GenericBezierSpline([0, 1, 2, 3, 4, 5, 6].map(i => pt(i, i % 2)), 3, 1);
        // computed points are part of generic's control polygon
        expect(generic.getPoints().length).toBeGreaterThan(7);
        expect(generic.getPoints()).toEqual(generic.getAllCurvePoints());
    });
});

describe("scheme-backed spline classes", () => {
    it("C1 and G1-symmetric add or drop points consistently", () => {
        for (const make of [(p: Point[]) => new C1QuadraticBezierSpline(p), (p: Point[]) => new G1SymmetricQuadraticBezierSpline(p)]) {
            const points = [pt(0, 0), pt(1, 2), pt(3, 3), pt(5, 1), pt(6, 4)];
            const n = points.length; // addPoint appends to this same array
            const spline = make(points);
            expect(spline.getUnderlyingCurves()).toHaveLength(n - 2);
            spline.addPoint(pt(8, 0));
            expect(spline.getUnderlyingCurves()).toHaveLength(n - 1);
            expect(spline.getNonFreePoints()).toHaveLength(n - 2);
            spline.removePoint(points[3]);
            expect(spline.getUnderlyingCurves()).toHaveLength(n - 2);
            expect(spline.getPoints()).toHaveLength(n);
        }
    });

    it("G1-symmetric keeps a join parameter per join, default one half", () => {
        const spline = new G1SymmetricQuadraticBezierSpline([pt(0, 0), pt(1, 2), pt(3, 3), pt(5, 1), pt(6, 4)]);
        expect(spline.getBs()).toEqual([0.5, 0.5]);
        const join = spline.getNonFreePoints()[0];
        expect([join.X(), join.Y()]).toEqual([2, 2.5]);
        spline.setB(0, 0.25);
        expect([join.X(), join.Y()]).toEqual([1.5, 2.25]);
    });
});
