import {describe, expect, it} from "vitest";
import {PointImpl} from "../point/point-impl";
import {boundingBoxOf, chordKnots, distance} from "./geometry";
import {C1QuadraticBezierSpline} from "./C1QuadraticBezierSpline";

const pt = (x: number, y: number) => new PointImpl(x, y);

describe("geometry helpers", () => {
    it("measures distance and bounding box", () => {
        expect(distance(pt(0, 0), pt(3, 4))).toBe(5);
        expect(boundingBoxOf([pt(1, 5), pt(-2, 3), pt(4, -1)])).toEqual([-2, 4, -1, 5]);
    });

    it("builds normalised knots for uniform, centripetal and chordal alpha", () => {
        const spans = [[pt(0, 0), pt(3, 4)], [pt(3, 4), pt(3, 4 + 20)]] as const;
        expect(chordKnots(spans, 0)).toEqual([0, 0.5, 1]);
        expect(chordKnots(spans, 1)).toEqual([0, 5 / 25, 1]);
        const centripetal = chordKnots(spans, 0.5);
        expect(centripetal[1]).toBeCloseTo(Math.sqrt(5) / (Math.sqrt(5) + Math.sqrt(20)), 12);
    });

    it("falls back to uniform knots when every span has zero length", () => {
        const p = pt(1, 1);
        expect(chordKnots([[p, p], [p, p]], 1)).toEqual([0, 0.5, 1]);
    });

    it("evaluates a spline whose points all coincide without NaN", () => {
        const p = () => pt(2, 2);
        const spline = new C1QuadraticBezierSpline([p(), p(), p(), p(), p()]);
        spline.setAlpha(1);
        for (const t of [0, 0.3, 1, 1.5]) {
            const r = spline.eval(t);
            expect(r.X()).toBeCloseTo(2, 12);
            expect(r.Y()).toBeCloseTo(2, 12);
        }
    });
});
