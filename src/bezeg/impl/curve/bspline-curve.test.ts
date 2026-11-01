import {describe, expect, test} from "vitest";
import {PointImpl} from "../point/point-impl";
import {BSplineCurve, InvalidBSplineWeightsError, InvalidKnotVectorError} from "./bspline-curve";

const KNOTS = [0, 0, 0, 1, 2, 2, 2];
const make = (weights?: number[]) =>
    new BSplineCurve([[0, 0], [1, 2], [3, 2], [4, 0]].map(([x, y]) => new PointImpl(x, y)), 2, KNOTS, weights);
const xy = (p: {X(): number, Y(): number}) => [p.X(), p.Y()];

describe("BSplineCurve golden numbers (lesson L2)", () => {
    test("t = 0.5 gives (1, 1.5) with level-1 points (0.5, 1) and (1.5, 2)", () => {
        const curve = make();
        const [x, y] = xy(curve.eval(0.5));
        expect(x).toBeCloseTo(1, 12);
        expect(y).toBeCloseTo(1.5, 12);
        const triangle = curve.deBoorTriangle(0.5);
        expect(triangle.levels[1].map(entry => entry.point)).toEqual([[0.5, 1], [1.5, 2]]);
        expect(triangle.levels[2][0].point[0]).toBeCloseTo(1, 12);
        expect(triangle.levels[2][0].point[1]).toBeCloseTo(1.5, 12);
        expect(curve.activeSpan(0.5)).toBe(2);
        expect(curve.activeIndices(0.5)).toEqual([0, 1, 2]);
    });

    test("t = 1.5 gives (3, 1.5) and t = 1 gives (2, 2) on span 3", () => {
        const curve = make();
        const [x, y] = xy(curve.eval(1.5));
        expect(x).toBeCloseTo(3, 12);
        expect(y).toBeCloseTo(1.5, 12);
        const [x1, y1] = xy(curve.eval(1));
        expect(x1).toBeCloseTo(2, 12);
        expect(y1).toBeCloseTo(2, 12);
        expect(curve.activeIndices(1.5)).toEqual([1, 2, 3]);
    });

    test("moving P0 leaves samples for t > 1 unchanged (local support)", () => {
        const curve = make();
        const ts = [1.01, 1.25, 1.5, 1.99, 2];
        const before = ts.map(t => xy(curve.eval(t)));
        curve.getPoints()[0].setX(-5);
        curve.getPoints()[0].setY(7);
        ts.forEach((t, i) => xy(curve.eval(t)).forEach((v, d) => expect(Math.abs(v - before[i][d])).toBeLessThan(1e-12)));
        expect(xy(curve.eval(0.5))).not.toEqual([1, 1.5]);
    });

    test("rounding-sized overshoot of the domain is taken as the end, a real one is refused", () => {
        const curve = make();
        expect(xy(curve.eval(2 + 1e-12))).toEqual(xy(curve.eval(2)));
        expect(xy(curve.eval(-1e-12))).toEqual(xy(curve.eval(0)));
        expect(() => curve.eval(2.001)).toThrow(RangeError);
    });

    test("clamped ends interpolate the end points", () => {
        const curve = make();
        expect(xy(curve.eval(0))).toEqual([0, 0]);
        const [x, y] = xy(curve.eval(2));
        expect(x).toBeCloseTo(4, 12);
        expect(y).toBeCloseTo(0, 12);
    });
});

describe("BSplineCurve domain, display mapping and basis", () => {
    test("raw domain [u_k, u_{n+1}] and the [0, 1] display mapping", () => {
        const curve = new BSplineCurve([[0, 0], [1, 1], [2, 0], [3, 1]].map(([x, y]) => new PointImpl(x, y)), 2, [-1, 0, 1, 3, 5, 6, 7]);
        expect(curve.getDomain()).toEqual([1, 5]);
        expect(curve.toDisplayParameter(3)).toBe(0.5);
        expect(curve.fromDisplayParameter(0.25)).toBe(2);
        expect(curve.getDisplayKnots()).toEqual([-0.5, -0.25, 0, 0.5, 1, 1.25, 1.5]);
    });

    test("basis functions partition unity and are zero outside the active indices", () => {
        const curve = make();
        const basis = curve.basis(1.5);
        expect(basis.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
        expect(basis[0]).toBe(0);
        expect(curve.derivativeSource()?.at(0.5)).toBeDefined();
    });
});

describe("BSplineCurve weights", () => {
    test("unit weights equal the polynomial curve and a heavy weight pulls the curve toward its point", () => {
        const plain = make();
        const unit = make([1, 1, 1, 1]);
        [0.3, 1, 1.7].forEach(t => xy(unit.eval(t)).forEach((v, d) => expect(v).toBeCloseTo(xy(plain.eval(t))[d], 12)));
        const heavy = make([1, 1, 5, 1]);
        const target = [3, 2];
        const dist = (c: BSplineCurve) => Math.hypot(c.eval(1.5).X() - target[0], c.eval(1.5).Y() - target[1]);
        expect(dist(heavy)).toBeLessThan(dist(plain));
        expect(heavy.derivativeSource()).toBeUndefined();
        const triangle = heavy.deBoorTriangle(1.5);
        expect(triangle.levels[0][0].point).toHaveLength(3);
    });
});

describe("BSplineCurve refuses invalid descriptions with the kernel code", () => {
    const points = () => [[0, 0], [1, 2], [3, 2], [4, 0]].map(([x, y]) => new PointImpl(x, y));
    const reason = (knots: number[]) => {
        try {
            new BSplineCurve(points(), 2, knots);
        } catch (error) {
            expect(error).toBeInstanceOf(InvalidKnotVectorError);
            return (error as InvalidKnotVectorError).reason;
        }
        return "accepted";
    };

    test("construction names each rejection", () => {
        expect(reason([0, 0, 0, 1, 2, 2])).toBe("wrong_length");
        expect(reason([0, 0, 0, 2, 1, 2, 2])).toBe("decreasing");
        expect(reason([0, 0, 0, 0, 0, 2, 2])).toBe("multiplicity_too_high");
        expect(reason([0, 0, 1, 1, 1, 1, 1])).toBe("multiplicity_too_high");
        expect(reason([0, 0, 1, 1, 1, 2, 2])).toBe("empty_domain");
        expect(reason([0, 0, 0, 1, NaN, 2, 2])).toBe("not_finite");
    });

    test("setKnots refuses and leaves the curve unchanged", () => {
        const curve = make();
        const before = curve.eval(0.5);
        expect(() => curve.setKnots([0, 0, 0, 2, 1, 2, 2])).toThrow(InvalidKnotVectorError);
        expect(curve.getKnots()).toEqual(KNOTS);
        expect(xy(curve.eval(0.5))).toEqual(xy(before));
        curve.setKnots([0, 0, 0, 0.5, 2, 2, 2]);
        expect(curve.getKnots()[3]).toBe(0.5);
        expect(xy(curve.eval(0.5))).not.toEqual(xy(before));
    });

    test("weights are positive, finite and one per point", () => {
        const weightReason = (weights: number[]) => {
            try {
                make(weights);
            } catch (error) {
                expect(error).toBeInstanceOf(InvalidBSplineWeightsError);
                return (error as InvalidBSplineWeightsError).reason;
            }
            return "accepted";
        };
        expect(weightReason([1, 1, 0, 1])).toBe("nonpositive");
        expect(weightReason([1, 1, Infinity, 1])).toBe("not_finite");
        expect(weightReason([1, 1, 1])).toBe("wrong_count");
    });

    test("point count changes only through setSpline", () => {
        const curve = make();
        expect(() => curve.addPoint(new PointImpl(5, 5))).toThrow(InvalidKnotVectorError);
        expect(() => curve.setPoints(points().slice(0, 3))).toThrow(InvalidKnotVectorError);
        curve.setSpline(points().slice(0, 3), 2, [0, 0, 0, 1, 1, 1]);
        expect(curve.getPoints()).toHaveLength(3);
        expect(() => curve.setSpline(points(), 2, [0, 0, 0, 1, 1, 1])).toThrow(InvalidKnotVectorError);
        expect(curve.getPoints()).toHaveLength(3);
    });
});
