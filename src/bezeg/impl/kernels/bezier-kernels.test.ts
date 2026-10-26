import {describe, expect, it} from "vitest";
import {
    deCasteljauInPlace,
    deCasteljauScheme,
    elevate,
    elevateRational,
    extrapolate,
    extrapolateRational,
    subdivide,
    subdivideRational,
    toHomogeneous,
    WeightedNet,
} from "./bezier-kernels";
import fixture from "./pre-refactor-curves.json";
import {PointImpl} from "../point/point-impl";
import {Point} from "../../api/point/point";
import {PolynomialBezierCurve} from "../curve/polynomial-bezier-curve";
import {RationalBezierCurve} from "../curve/rational-bezier-curve";

/** Deterministic pseudo-random net with `count` rows of `dimension` coordinates. */
function net(count: number, dimension: number, seed: number): number[][] {
    let state = seed;
    const next = () => {
        state = (state * 1103515245 + 12345) % 2147483648;
        return state / 2147483648 * 8 - 4;
    };
    return Array.from({length: count}, () => Array.from({length: dimension}, next));
}

const binomial = (n: number, k: number): number => k === 0 ? 1 : binomial(n, k - 1) * (n - k + 1) / k;

/** Reference evaluation as an explicit Bernstein sum. */
function bernstein(rows: number[][], t: number): number[] {
    const n = rows.length - 1;
    return rows[0].map((_, d) => rows.reduce((sum, row, i) => sum + binomial(n, i) * t ** i * (1 - t) ** (n - i) * row[d], 0));
}

/** Reference rational evaluation: Bernstein sum of homogeneous rows, then projection. */
function rationalBernstein(net: WeightedNet, t: number): number[] {
    const h = bernstein(toHomogeneous(net), t);
    return h.slice(0, -1).map(c => c / h[h.length - 1]);
}

function point(rows: number[][], t: number, weights?: number[]): number[] {
    const copy = rows.map(row => [...row]);
    deCasteljauInPlace(t, copy, weights && [...weights]);
    return copy[0];
}

function expectClose(actual: number[], expected: number[]) {
    expect(actual).toHaveLength(expected.length);
    actual.forEach((c, d) => expect(c).toBeCloseTo(expected[d], 10));
}

const dimensions = [1, 2, 3, 4];
const samples = [0, 0.15, 0.5, 0.8, 1];

describe.each(dimensions)("polynomial kernels in %iD", dimension => {
    const rows = net(5, dimension, 17 + dimension);

    it("de Casteljau equals the Bernstein sum", () => {
        for (const t of [...samples, -0.5, 1.4]) {
            expectClose(point(rows, t), bernstein(rows, t));
        }
    });

    it("the scheme starts with the net, ends with the point, and leaves its input unchanged", () => {
        const input = rows.map(row => [...row]);
        const scheme = deCasteljauScheme(0.3, input);
        expect(input).toEqual(rows);
        expect(scheme).toHaveLength(rows.length);
        expect(scheme[0]).toEqual(rows);
        expect(scheme[rows.length - 1][0]).toEqual(point(rows, 0.3));
    });

    it("subdivision halves re-evaluate to the original", () => {
        for (const t of [0.3, 0.75]) {
            const [left, right] = subdivide(t, rows);
            for (const s of samples) {
                expectClose(point(left, s), point(rows, t * s));
                expectClose(point(right, s), point(rows, t + (1 - t) * s));
            }
        }
    });

    it("extrapolation reproduces the original on its interval", () => {
        for (const t of [-0.4, 0.6, 1.5]) {
            const extended = extrapolate(t, rows);
            for (const s of samples) {
                expectClose(point(extended, s), point(rows, t * s));
            }
        }
    });

    it("elevation preserves samples", () => {
        const elevated = elevate(rows);
        expect(elevated).toHaveLength(rows.length + 1);
        for (const t of samples) {
            expectClose(point(elevated, t), point(rows, t));
        }
    });
});

describe.each(dimensions)("rational kernels in %iD", dimension => {
    const rational: WeightedNet = {rows: net(4, dimension, 5 + dimension), weights: [1, 2.5, 0.4, 1.7]};
    const evaluate = ({rows, weights}: WeightedNet, t: number) => point(rows, t, weights);

    it("the weighted recurrence equals projected homogeneous evaluation", () => {
        for (const t of samples) {
            expectClose(evaluate(rational, t), rationalBernstein(rational, t));
        }
    });

    it("subdivision halves re-evaluate to the original", () => {
        const [left, right] = subdivideRational(0.35, rational);
        for (const s of samples) {
            expectClose(evaluate(left, s), rationalBernstein(rational, 0.35 * s));
            expectClose(evaluate(right, s), rationalBernstein(rational, 0.35 + 0.65 * s));
        }
    });

    it("extrapolation reproduces the original on its interval", () => {
        const extended = extrapolateRational(1.3, rational);
        for (const s of samples) {
            expectClose(evaluate(extended, s), rationalBernstein(rational, 1.3 * s));
        }
    });

    it("elevation preserves samples", () => {
        const elevated = elevateRational(rational);
        expect(elevated.rows).toHaveLength(5);
        expect(elevated.weights).toHaveLength(5);
        for (const t of samples) {
            expectClose(evaluate(elevated, t), rationalBernstein(rational, t));
        }
    });
});

type Recorded = {points: number[][]; weights?: number[]};
type CurveRecord = {eval: number[][]; scheme: number[][][][]; subdivide: Recorded[][]; extrapolate: Recorded[]; elevate: Recorded};
type NetRecord = {rows: number[][]; weights: number[]; polynomial: CurveRecord; rational: CurveRecord};

const {ts, extrapolationTs} = fixture;
const nets = Object.entries(fixture.nets as Record<string, NetRecord>);
const xy = (points: Point[]) => points.map(p => [p.X(), p.Y()]);

// pre-refactor-curves.json holds the curve classes' outputs recorded before they delegated to these
// kernels (commit a5bb2d0). Equality is exact: the refactor must not change a single bit in 2D.
describe.each(nets)("2D results equal the pre-refactor curve outputs: %s", (_, {rows, weights, polynomial, rational}) => {
    const strip = ({rows, weights}: WeightedNet) => ({points: rows, weights});

    it("polynomial kernels", () => {
        expect(ts.map(t => point(rows, t))).toEqual(polynomial.eval);
        expect(ts.map(t => deCasteljauScheme(t, rows))).toEqual(polynomial.scheme);
        expect(ts.map(t => subdivide(t, rows).map(points => ({points})))).toEqual(polynomial.subdivide);
        expect(extrapolationTs.map(t => ({points: extrapolate(t, rows)}))).toEqual(polynomial.extrapolate);
        expect({points: elevate(rows)}).toEqual(polynomial.elevate);
    });

    it("rational kernels", () => {
        const source = {rows, weights};
        expect(ts.map(t => point(rows, t, weights))).toEqual(rational.eval);
        expect(ts.map(t => deCasteljauScheme(t, rows, weights))).toEqual(rational.scheme);
        expect(ts.map(t => subdivideRational(t, source).map(strip))).toEqual(rational.subdivide);
        expect(extrapolationTs.map(t => strip(extrapolateRational(t, source)))).toEqual(rational.extrapolate);
        expect(strip(elevateRational(source))).toEqual(rational.elevate);
    });

    it("delegating curve classes", () => {
        const points = () => rows.map(([x, y]) => new PointImpl(x, y));
        const record = (curve: PolynomialBezierCurve, withWeights: boolean): CurveRecord => {
            const out = (c: PolynomialBezierCurve): Recorded => ({
                points: xy(c.getPoints()),
                weights: withWeights ? (c as RationalBezierCurve).getEffectiveWeights() : undefined,
            });
            return {
                eval: ts.map(t => [curve.eval(t).X(), curve.eval(t).Y()]),
                scheme: ts.map(t => curve.decasteljauScheme(t).map(xy)),
                subdivide: ts.map(t => curve.subdivide(t).map(out)),
                extrapolate: extrapolationTs.map(t => out(curve.extrapolate(t))),
                elevate: out(curve.elevate()),
            };
        };
        expect(record(new PolynomialBezierCurve(points()), false)).toEqual(polynomial);
        expect(record(new RationalBezierCurve(points(), [...weights]), true)).toEqual(rational);
    });

    it("kernels leave their inputs unchanged", () => {
        const input = rows.map(row => [...row]);
        const inputWeights = [...weights];
        subdivide(0.4, input);
        extrapolate(1.3, input);
        elevate(input);
        subdivideRational(0.4, {rows: input, weights: inputWeights});
        extrapolateRational(1.3, {rows: input, weights: inputWeights});
        elevateRational({rows: input, weights: inputWeights});
        expect(input).toEqual(rows);
        expect(inputWeights).toEqual(weights);
    });

    it("rational subdivision and extrapolation use stored weights; elevation uses the reactive ones", () => {
        const curve = new RationalBezierCurve(rows.map(([x, y]) => new PointImpl(x, y)), [...weights]);
        curve.setReactiveWeights(weights.map(w => () => 2 * w + 1));
        const reactive = {rows, weights: weights.map(w => 2 * w + 1)};
        const stored = {rows, weights};
        const out = (c: RationalBezierCurve) => ({rows: xy(c.getPoints()), weights: c.getEffectiveWeights()});
        expect(curve.subdivide(0.4).map(out)).toEqual(subdivideRational(0.4, stored));
        expect(out(curve.extrapolate(1.3))).toEqual(extrapolateRational(1.3, stored));
        expect(out(curve.elevate())).toEqual(elevateRational(reactive));
    });

    it("elevation keeps the original endpoint objects", () => {
        const points = rows.map(([x, y]) => new PointImpl(x, y));
        for (const curve of [new PolynomialBezierCurve(points), new RationalBezierCurve(points, [...weights])]) {
            const elevated = curve.elevate().getPoints();
            expect(elevated[0]).toBe(points[0]);
            expect(elevated[elevated.length - 1]).toBe(points[points.length - 1]);
        }
    });
});
