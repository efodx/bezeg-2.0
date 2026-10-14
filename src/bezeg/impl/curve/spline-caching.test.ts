import {describe, expect, it} from "vitest";
import {PointImpl} from "../point/point-impl";
import {BezierSpline} from "./bezier-spline";
import {C1QuadraticBezierSpline} from "./C1QuadraticBezierSpline";
import {C2QubicBezierSpline} from "./C2QubicBezierSpline";
import {G1QuadraticBezierSpline} from "./G1QuadraticBezierSpline";
import {G1SymmetricQuadraticBezierSpline} from "./G1SymmetricQuadraticBezierSpline";
import {GenericBezierSpline} from "./GenericBezierSpline";

const COORDS = [[0, 0], [1, 3], [3, 4], [5, 1], [8, 2], [9, 6], [12, 3], [13, 0]];
const model = (coords = COORDS) => coords.map(([x, y]) => new PointImpl(x, y));

const factories: Record<string, (points: PointImpl[]) => BezierSpline> = {
    c1: points => new C1QuadraticBezierSpline(points),
    c2: points => new C2QubicBezierSpline(points),
    g1: points => new G1QuadraticBezierSpline(points),
    g1Symmetric: points => new G1SymmetricQuadraticBezierSpline(points),
    generic: points => new GenericBezierSpline(points, 3, 1),
};

const knots = (spline: BezierSpline): number[] => (spline as any).getU();
const nonFree = (spline: BezierSpline) => spline.getNonFreePoints().map(p => [p.X(), p.Y()]);

describe("PointImpl.derived", () => {
    it("computes both coordinates from one evaluation per version", () => {
        const input = new PointImpl(2, 3);
        let calls = 0;
        const derived = PointImpl.derived(() => {
            calls++;
            return [input.X() * 2, input.Y() * 2];
        }, [input]);
        expect([derived.X(), derived.Y(), derived.X(), derived.Y()]).toEqual([4, 6, 4, 6]);
        expect(calls).toBe(1);
        input.setCoordinates(5, 7);
        expect([derived.X(), derived.Y()]).toEqual([10, 14]);
        expect(calls).toBe(2);
    });

    it("stays correct without declared dependencies (volatile)", () => {
        const input = new PointImpl(1, 1);
        const derived = PointImpl.derived(() => [input.X() + 1, input.Y() + 1]);
        expect(derived.X()).toBe(2);
        input.setCoordinates(4, 5);
        expect([derived.X(), derived.Y()]).toEqual([5, 6]);
    });
});

describe.each(Object.keys(factories))("%s spline caching", name => {
    const make = (coords = COORDS) => factories[name](model(coords));

    it("reuses the knot vector until something changes", () => {
        const spline = make();
        expect(knots(spline)).toBe(knots(spline));
        const before = knots(spline);
        spline.getPoints()[1].setX(2);
        expect(knots(spline)).not.toBe(before);
    });

    it("matches a freshly built spline after moving points and changing alpha", () => {
        const spline = make();
        nonFree(spline); // warm every cache
        spline.setAlpha(0.5);
        spline.points[2].setX(4.5);
        spline.points[3].setY(-2);
        const moved = COORDS.map(c => [...c]);
        moved[2][0] = 4.5;
        moved[3][1] = -2;
        const fresh = make(moved);
        fresh.setAlpha(0.5);
        expect(knots(spline)).toEqual(knots(fresh));
        nonFree(spline).forEach(([x, y], i) => {
            expect(x).toBeCloseTo(nonFree(fresh)[i][0], 12);
            expect(y).toBeCloseTo(nonFree(fresh)[i][1], 12);
        });
        for (const t of [0, 0.21, 0.5, 0.83, 1]) {
            expect(spline.eval(t).X()).toBeCloseTo(fresh.eval(t).X(), 12);
            expect(spline.eval(t).Y()).toBeCloseTo(fresh.eval(t).Y(), 12);
        }
    });

    it("interpolates its first and last control points", () => {
        const spline = make();
        expect(spline.eval(0).X()).toBeCloseTo(COORDS[0][0], 12);
        expect(spline.eval(0).Y()).toBeCloseTo(COORDS[0][1], 12);
        const last = COORDS[COORDS.length - 1];
        expect(spline.eval(1).X()).toBeCloseTo(last[0], 12);
        expect(spline.eval(1).Y()).toBeCloseTo(last[1], 12);
    });

    it("follows a function-backed control point (volatile)", () => {
        let offset = 0;
        const points = model();
        points[2].setY(() => 4 + offset);
        const spline = factories[name](points);
        const before = spline.eval(0.4).Y();
        offset = 3;
        expect(spline.eval(0.4).Y()).not.toBeCloseTo(before, 6);
    });
});
