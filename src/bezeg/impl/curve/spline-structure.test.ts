import {describe, expect, it} from "vitest";
import {PointImpl} from "../point/point-impl";
import {G1QuadraticBezierSpline} from "./G1QuadraticBezierSpline";
import {GenericBezierSpline} from "./GenericBezierSpline";

const COORDS = [[0, 0], [1, 3], [3, 4], [5, 1], [8, 2], [9, 6]];
const model = (coords = COORDS) => coords.map(([x, y]) => new PointImpl(x, y));

describe("G1QuadraticBezierSpline structure", () => {
    it("builds one quadratic span per free point after the first, joined G1 with ratio b", () => {
        const spline = new G1QuadraticBezierSpline(model());
        const curves = spline.getUnderlyingCurves();
        expect(curves).toHaveLength(COORDS.length - 2);
        curves.forEach(curve => expect(curve.getPoints()).toHaveLength(3));
        expect(spline.getNumOfBs()).toBe(COORDS.length - 3);
        expect(spline.getNonFreePoints()).toHaveLength(COORDS.length - 3);

        // Spans are C0, and each join continues the previous control leg: start = (previousControl + control) / 2 for b = 1.
        for (let i = 1; i < curves.length; i++) {
            const [prevStart, prevControl, prevEnd] = curves[i - 1].getPoints();
            const [start, control] = curves[i].getPoints();
            expect([start.X(), start.Y()]).toEqual([prevEnd.X(), prevEnd.Y()]);
            expect(start.X()).toBeCloseTo((prevControl.X() + control.X()) / 2, 12);
            expect(start.Y()).toBeCloseTo((prevControl.Y() + control.Y()) / 2, 12);
            expect(prevStart).toBeDefined();
        }
    });

    it("scales the continuing leg with b and follows free point moves", () => {
        const points = model();
        const spline = new G1QuadraticBezierSpline(points);
        spline.setB(0, 2);
        const [prevControl] = [spline.getUnderlyingCurves()[0].getPoints()[1]];
        const [start, control] = spline.getUnderlyingCurves()[1].getPoints();
        expect(control.X()).toBeCloseTo(start.X() + 2 * (start.X() - prevControl.X()), 12);
        expect(control.Y()).toBeCloseTo(start.Y() + 2 * (start.Y() - prevControl.Y()), 12);
        points[2].setCoordinates(3.5, 5);
        expect(control.X()).toBeCloseTo(3.5 + 2 * (3.5 - prevControl.X()), 12);
        expect(control.Y()).toBeCloseTo(5 + 2 * (5 - prevControl.Y()), 12);
    });
});

describe("GenericBezierSpline", () => {
    it("is built once with the requested degree and continuity", () => {
        const spline = new GenericBezierSpline(model(), 3, 1);
        expect(spline.getDegree()).toBe(3);
        expect(spline.getContinuity()).toBe(1);
        spline.getUnderlyingCurves().forEach(curve => expect(curve.getPoints()).toHaveLength(4));
    });

    it("rejects continuity that is not smaller than the degree instead of looping forever", () => {
        expect(() => new GenericBezierSpline(model(), 3, 3)).toThrow(RangeError);
        expect(() => new GenericBezierSpline(model(), 2, 5)).toThrow(RangeError);
    });

    it("regenerates for a new degree and continuity once the caller asks", () => {
        const spline = new GenericBezierSpline(model([[0, 0], [1, 2], [2, 3], [3, 1], [4, 0], [5, 2], [6, 3]]), 3, 1);
        spline.setDegree(2);
        spline.setContinuity(1);
        spline.generateBezierCurves();
        spline.getUnderlyingCurves().forEach(curve => expect(curve.getPoints()).toHaveLength(3));
    });
});
