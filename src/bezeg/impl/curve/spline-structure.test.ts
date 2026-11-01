import {describe, expect, it, vi} from "vitest";
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

    describe("completed degree and continuity changes", () => {
        const SEVEN = [[0, 0], [1, 2], [2, 3], [3, 1], [4, 0], [5, 2], [6, 3]];
        const seven = (degree = 3, continuity = 1) => new GenericBezierSpline(model(SEVEN), degree, continuity);
        const shape = (spline: GenericBezierSpline) => ({
            pieces: spline.getUnderlyingCurves().map(curve => curve.getPoints().map(p => [p.X(), p.Y()])),
            all: spline.getPoints().map(p => [p.X(), p.Y()]),
            nonFree: spline.getNonFreePoints().map(p => [p.X(), p.Y()]),
            knots: (spline as unknown as { getU(): number[] }).getU(),
            samples: [0.1, 0.9, 1.7, 2.5, 4.2].map(t => { const p = spline.eval(t); return [p.X(), p.Y()]; }),
        });
        const validPairs = Array.from({length: 6}, (_, i) => i + 1).flatMap(d => Array.from({length: d}, (_, c) => [d, c] as const));

        it.each(validPairs)("changing to degree %i, continuity %i equals a spline built there", (degree, continuity) => {
            const changed = seven();
            changed.change({degree, continuity});
            expect(changed.getDegree()).toBe(degree);
            expect(changed.getContinuity()).toBe(continuity);
            expect(shape(changed)).toEqual(shape(seven(degree, continuity)));
        });

        it("reaches targets that are invalid in the intermediate state without an intermediate regeneration", () => {
            const spline = seven(2, 1);
            const generate = vi.spyOn(spline, "generateBezierCurves");
            // Raising continuity first would hit continuity >= degree; lowering degree first would too.
            spline.change({degree: 5, continuity: 4});
            expect(generate).toHaveBeenCalledTimes(1);
            spline.change({degree: 2, continuity: 1});
            expect(generate).toHaveBeenCalledTimes(2);
            expect(shape(spline)).toEqual(shape(seven(2, 1)));
        });

        it("keeps a missing field at its current value", () => {
            const spline = seven(3, 1);
            spline.change({degree: 5});
            expect([spline.getDegree(), spline.getContinuity()]).toEqual([5, 1]);
            spline.change({continuity: 4});
            expect([spline.getDegree(), spline.getContinuity()]).toEqual([5, 4]);
        });

        it("regenerates spans, knots and derived points that were read before the change", () => {
            const spline = seven(3, 1);
            const before = shape(spline);
            const derived = spline.getNonFreePoints();
            derived.forEach(p => p.X());
            spline.change({degree: 2, continuity: 1});
            const after = shape(spline);
            expect(after.pieces).toHaveLength(after.knots.length - 1);
            expect(after.knots).not.toEqual(before.knots);
            expect(after).toEqual(shape(seven(2, 1)));
            expect(spline.getNonFreePoints()).not.toBe(derived);
        });

        it("bumps the version so cached values are not reused", () => {
            const spline = seven();
            const before = spline.version();
            spline.change({degree: 4, continuity: 2});
            expect(spline.version()).not.toBe(before);
        });

        it("does nothing when the target is the current state", () => {
            const spline = seven();
            const pieces = spline.getUnderlyingCurves();
            const version = spline.version();
            const generate = vi.spyOn(spline, "generateBezierCurves");
            expect(spline.change({})).toBe(false);
            expect(spline.change({degree: 3, continuity: 1})).toBe(false);
            expect(generate).not.toHaveBeenCalled();
            expect(spline.getUnderlyingCurves()).toBe(pieces);
            expect(spline.version()).toBe(version);
        });

        it.each([
            ["continuity equal to the degree", {continuity: 3}],
            ["continuity above the degree", {degree: 3, continuity: 5}],
            ["negative continuity", {continuity: -1}],
            ["fractional continuity", {continuity: 0.5}],
            ["degree equal to the continuity", {degree: 1}],
            ["degree equal to the free-point count", {degree: 7}],
            ["degree above the free points", {degree: 8}],
            ["degree far above the free points with a valid continuity", {degree: 11, continuity: 2}],
            ["zero degree", {degree: 0, continuity: 0}],
            ["fractional degree", {degree: 4.5}],
            ["non-finite degree", {degree: Infinity}],
            ["NaN continuity", {continuity: NaN}],
            ["a string degree", {degree: "4" as unknown as number}],
        ])("rejects %s and changes nothing", (_name, target) => {
            const spline = seven();
            const pieces = spline.getUnderlyingCurves();
            const version = spline.version();
            expect(() => spline.change(target)).toThrow(RangeError);
            expect([spline.getDegree(), spline.getContinuity()]).toEqual([3, 1]);
            expect(spline.getUnderlyingCurves()).toBe(pieces);
            expect(spline.version()).toBe(version);
        });

        it("accepts degrees up to one below the free-point count and the ranges report the reachable values", () => {
            const spline = seven(3, 1);
            expect(spline.getMaxDegree()).toBe(6);
            expect(spline.degreeRange()).toEqual({min: 2, max: 6});
            expect(spline.continuityRange()).toEqual({min: 0, max: 2});
            spline.change({degree: 6});
            expect(() => spline.change({degree: 7})).toThrow(RangeError);
            expect(() => spline.change({degree: 8})).toThrow(RangeError);
        });

        it("draws a first span whose polynomial degree equals the degree it is labelled with, up to the limit", () => {
            for (let degree = 1; degree <= 6; degree++) {
                const spline = seven();
                spline.change({degree, continuity: 0});
                expect(spline.getUnderlyingCurves()[0].getPoints()).toHaveLength(degree + 1);
            }
            // One past the limit would draw the same degree-6 Bezier piece under the label 7.
            expect(() => seven().change({degree: 7, continuity: 0})).toThrow(RangeError);
        });

        it("grows the limit with the free points", () => {
            const spline = seven(3, 1);
            spline.addPoint(new PointImpl(7, 1));
            expect(spline.getMaxDegree()).toBe(7);
            spline.change({degree: 7});
            expect(spline.getDegree()).toBe(7);
        });

        it("restores a stored degree above the limit, which may then only be lowered", () => {
            const stored = seven(3, 1);
            expect(stored.restore(9, 2)).toBe(true);
            expect([stored.getDegree(), stored.getContinuity()]).toEqual([9, 2]);
            expect(shape(stored)).toEqual(shape(seven(9, 2)));
            expect(stored.degreeRange().max).toBe(9);
            expect(() => stored.change({degree: 10})).toThrow(RangeError);
            stored.change({continuity: 5});
            stored.change({degree: 8});
            expect([stored.getDegree(), stored.getContinuity()]).toEqual([8, 5]);
        });

        it("restore rejects pairs that no spline can have", () => {
            const spline = seven();
            expect(() => spline.restore(2, 2)).toThrow(RangeError);
            expect(() => spline.restore(0, 0)).toThrow(RangeError);
            expect(() => spline.restore(3, -1)).toThrow(RangeError);
            expect([spline.getDegree(), spline.getContinuity()]).toEqual([3, 1]);
        });

        it("undoes the recorded target when regeneration fails", () => {
            const spline = seven();
            const pieces = spline.getUnderlyingCurves();
            const version = spline.version();
            vi.spyOn(spline, "generateBezierCurves").mockImplementation(() => { throw new Error("boom"); });
            expect(() => spline.change({degree: 4, continuity: 2})).toThrow("boom");
            expect([spline.getDegree(), spline.getContinuity()]).toEqual([3, 1]);
            expect(spline.getUnderlyingCurves()).toBe(pieces);
            // The version is only bumped for a completed change, so a failed one leaves cached values valid.
            expect(spline.version()).toBe(version);
        });
    });
});
