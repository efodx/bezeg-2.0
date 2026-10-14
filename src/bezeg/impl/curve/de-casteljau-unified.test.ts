import {describe, expect, it} from "vitest";
import {PointImpl} from "../point/point-impl";
import {PolynomialBezierCurve} from "./polynomial-bezier-curve";
import {RationalBezierCurve} from "./rational-bezier-curve";

const pts = () => [[0, 0], [1, 2], [3, 3], [4, 0]].map(([x, y]) => new PointImpl(x, y));

describe("unified de Casteljau recurrence", () => {
    it("rational with equal weights equals the polynomial curve, point and scheme", () => {
        const poly = new PolynomialBezierCurve(pts());
        const rational = new RationalBezierCurve(pts(), [2, 2, 2, 2]);
        for (const t of [0, 0.25, 0.6, 1]) {
            expect(rational.eval(t).X()).toBeCloseTo(poly.eval(t).X(), 12);
            expect(rational.eval(t).Y()).toBeCloseTo(poly.eval(t).Y(), 12);
            const a = rational.decasteljauScheme(t);
            const b = poly.decasteljauScheme(t);
            expect(a).toHaveLength(4);
            a.forEach((row, r) => row.forEach((p, i) => {
                expect(p.X()).toBeCloseTo(b[r][i].X(), 12);
                expect(p.Y()).toBeCloseTo(b[r][i].Y(), 12);
            }));
        }
    });

    it("matches the closed-form rational quadratic (circle arc)", () => {
        const w = Math.SQRT1_2;
        const arc = new RationalBezierCurve([new PointImpl(1, 0), new PointImpl(1, 1), new PointImpl(0, 1)], [1, w, 1]);
        for (const t of [0.1, 0.5, 0.9]) {
            const p = arc.eval(t);
            expect(Math.hypot(p.X(), p.Y())).toBeCloseTo(1, 12);
        }
    });

    it("records a scheme of n rows with the original rows first and the point last", () => {
        const curve = new PolynomialBezierCurve(pts());
        const scheme = curve.decasteljau(0.5, pts().map(p => [p.X(), p.Y()]));
        expect(scheme).toHaveLength(4);
        expect(scheme[0].map(r => r.slice(0, 2))).toEqual([[0, 0], [1, 2], [3, 3], [4, 0]]);
        expect(scheme[3][0]).toEqual([curve.eval(0.5).X(), curve.eval(0.5).Y()]);
    });

    it("subdivides a rational curve into pieces that reproduce it", () => {
        const curve = new RationalBezierCurve(pts(), [1, 3, 0.5, 2]);
        const [left, right] = curve.subdivide(0.4);
        for (const s of [0.2, 0.7]) {
            expect(left.eval(s).X()).toBeCloseTo(curve.eval(0.4 * s).X(), 10);
            expect(left.eval(s).Y()).toBeCloseTo(curve.eval(0.4 * s).Y(), 10);
            expect(right.eval(s).X()).toBeCloseTo(curve.eval(0.4 + 0.6 * s).X(), 10);
            expect(right.eval(s).Y()).toBeCloseTo(curve.eval(0.4 + 0.6 * s).Y(), 10);
        }
    });
});
