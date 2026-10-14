import {describe, expect, it} from "vitest";
import {PointImpl} from "../point/point-impl";
import {boundingBoxOf, chordKnots, convexHull, distance} from "./geometry";
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

    it("computes the convex hull counter-clockwise from the leftmost point", () => {
        const [a, b, c, d, inside, onEdge, duplicate] = [pt(0, 0), pt(4, 0), pt(4, 3), pt(0, 3), pt(2, 1), pt(2, 0), pt(4, 3)];
        const hull = convexHull([c, inside, a, onEdge, d, b, duplicate]);
        expect(hull).toEqual([a, b, c, d]);
        hull.forEach(p => expect([a, b, c, d]).toContain(p));
    });

    it("handles degenerate inputs", () => {
        expect(convexHull([])).toEqual([]);
        const a = pt(1, 1);
        expect(convexHull([a, pt(1, 1)])).toEqual([a]);
        const [p, q, r, s] = [pt(0, 0), pt(1, 1), pt(2, 2), pt(3, 3)];
        expect(convexHull([r, p, s, q])).toEqual([p, s]);
    });

    it("keeps every random point inside the hull", () => {
        let seed = 7;
        const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        for (let run = 0; run < 50; run++) {
            const points = Array.from({length: 3 + Math.floor(random() * 20)}, () => pt(random() * 10, random() * 10));
            const hull = convexHull(points);
            expect(hull.length).toBeGreaterThanOrEqual(3);
            for (const p of points) {
                for (let i = 0; i < hull.length; i++) {
                    const o = hull[i], e = hull[(i + 1) % hull.length];
                    const cross = (e.X() - o.X()) * (p.Y() - o.Y()) - (e.Y() - o.Y()) * (p.X() - o.X());
                    expect(cross).toBeGreaterThanOrEqual(-1e-9);
                }
            }
        }
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
