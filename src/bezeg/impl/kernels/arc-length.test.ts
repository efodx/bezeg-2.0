import {describe, expect, it} from "vitest";
import {PointImpl} from "../point/point-impl";
import {PhBezierCurve} from "../curve/ph-bezier-curve";
import {polynomialBezierSource} from "../curve/curvature";
import {
    arcLengthAt,
    arcLengthBetween,
    arcLengthTableOfBezier,
    chordLengths,
    equalArcParameters,
    equalParameterSteps,
    findCusps,
    GAUSS_LEGENDRE_ORDER,
    gaussLegendre,
    inscribedPolylineLength,
    lengthBracket,
    parameterAtArcLength,
} from "./arc-length";

const phCurve = () => new PhBezierCurve([new PointImpl(-4.2, -2)], [[-3.5, -1.7], [-2.6, 1.7]].map(([x, y]) => new PointImpl(x, y)));
const phPoints = () => phCurve().getPoints().map(p => [p.X(), p.Y()]);
const Q = [[0, 0], [1, 3], [3, 3], [4, 0]];
// r' = 3[(1-t)^2 (1,2) + 2t(1-t)(-1,-1) + t^2 (1,0)] vanishes at t = 1/2
const CUSP = [[0, 0], [1, 2], [0, 1], [1, 1]];
const close = (a: number[], b: number[], digits: number) => {
    expect(a).toHaveLength(b.length);
    a.forEach((v, i) => expect(v).toBeCloseTo(b[i], digits));
};

describe("Gauss-Legendre rule", () => {
    it("default order is 24 and weights sum to 2", () => {
        expect(GAUSS_LEGENDRE_ORDER).toBe(24);
        const {nodes, weights} = gaussLegendre();
        expect(nodes).toHaveLength(24);
        expect(weights.reduce((a, b) => a + b, 0)).toBeCloseTo(2, 14);
    });
    it("matches the known 2- and 3-point rules and integrates degree 2n-1 exactly", () => {
        const g2 = gaussLegendre(2);
        expect(g2.nodes[1]).toBeCloseTo(1 / Math.sqrt(3), 14);
        expect(g2.weights[0]).toBeCloseTo(1, 14);
        const g3 = gaussLegendre(3);
        expect(g3.nodes[2]).toBeCloseTo(Math.sqrt(0.6), 14);
        expect(g3.weights[0]).toBeCloseTo(5 / 9, 14);
        expect(g3.weights[1]).toBeCloseTo(8 / 9, 14);
        const g = gaussLegendre(5);
        const int = (p: number) => g.nodes.reduce((a, x, i) => a + g.weights[i] * x ** p, 0);
        expect(int(8)).toBeCloseTo(2 / 9, 14);
        expect(int(9)).toBeCloseTo(0, 14);
    });
});

describe("straight line", () => {
    it("length is the distance", () => {
        const table = arcLengthTableOfBezier([[0, 0], [1.5, 2], [3, 4]]);
        expect(table.length).toBeCloseTo(5, 12);
        expect(arcLengthBetween(polynomialBezierSource([[0, 0], [3, 4]]), 0, 1)).toBeCloseTo(5, 13);
    });
});

describe("PH cubic (exact s(t) oracle, spec D3 default)", () => {
    const curve = phCurve();
    const pts = phPoints();
    const table = arcLengthTableOfBezier(pts);
    const source = polynomialBezierSource(pts);

    it("control points round to the spec values", () => {
        close(pts.flat(), [-4.2, -2, -1.08, 1.9667, 2.9167, 1.4567, 4.2067, -1.49], 4);
    });
    it("L = exact s(1) = 31/3 to 1e-9, s(0.3) = 3.84963", () => {
        expect(Math.abs(table.length - curve.arcLength())).toBeLessThan(1e-9);
        expect(table.length).toBeCloseTo(31 / 3, 9);
        expect(arcLengthAt(table, 0.3)).toBeCloseTo(3.84963, 5);
        expect(Math.abs(arcLengthAt(table, 0.3) - curve.s(0.3))).toBeLessThan(1e-9);
        expect(table.status).toEqual({kind: 'regular'});
    });
    it("agrees with exact s at many parameters", () => {
        for (let i = 0; i <= 20; i++) {
            expect(Math.abs(arcLengthAt(table, i / 20) - curve.s(i / 20))).toBeLessThan(1e-9);
        }
    });
    it("eight equal arcs: parameters, piece lengths L/8, chords", () => {
        const eq = equalArcParameters(table, 8);
        close(eq.parameters, [0, 0.0899, 0.1901, 0.3023, 0.4279, 0.5662, 0.7130, 0.8604, 1], 4);
        for (let i = 0; i < 8; i++) {
            expect(Math.abs(arcLengthBetween(source, eq.parameters[i], eq.parameters[i + 1], {subintervals: 8}) - 31 / 24))
                .toBeLessThan(1e-9);
        }
        expect(31 / 24).toBeCloseTo(1.291667, 6);
        const arcChords = chordLengths(source, eq.parameters);
        expect(arcChords[0]).toBeCloseTo(1.2908, 4);
        expect(arcChords[7]).toBeCloseTo(1.2864, 4);
        expect(Math.max(...arcChords) / Math.min(...arcChords)).toBeCloseTo(1.004, 3);
        for (const c of arcChords) {
            expect(c).toBeLessThan(31 / 24);
        }
    });
    it("eight equal-t chords 1.7585 .. 1.0865, ratio 1.62 (1.1568 is the last chord)", () => {
        const chords = chordLengths(source, equalParameterSteps(8));
        expect(Math.max(...chords)).toBeCloseTo(1.7585, 4);
        expect(Math.min(...chords)).toBeCloseTo(1.0865, 4);
        expect(Math.max(...chords) / Math.min(...chords)).toBeCloseTo(1.62, 2);
    });
    it("equal-arc parameters agree with the repo tk chain", () => {
        const eq = equalArcParameters(table, 8);
        const deltas = 31 / 24;
        let t = 0;
        for (let k = 1; k <= 8; k++) {
            t = curve.tk(t, deltas, k);
            expect(Math.abs(t - eq.parameters[k])).toBeLessThan(1e-9);
        }
    });
});

describe("non-PH cubic Q", () => {
    const table = arcLengthTableOfBezier(Q);
    const source = polynomialBezierSource(Q);
    it("L = 6.390976, two halves agree, one panel agrees with the table", () => {
        expect(table.length).toBeCloseTo(6.390976, 6);
        const halves = arcLengthBetween(source, 0, 0.5) + arcLengthBetween(source, 0.5, 1);
        expect(Math.abs(halves - arcLengthBetween(source, 0, 1))).toBeLessThan(1e-11);
        expect(Math.abs(halves - table.length)).toBeLessThan(1e-11);
    });
    it("bracket 4 <= L <= 8.32456", () => {
        const b = lengthBracket(Q);
        expect(b.chord).toBe(4);
        expect(b.polygon).toBeCloseTo(8.32456, 5);
        expect(table.length).toBeGreaterThanOrEqual(b.chord);
        expect(table.length).toBeLessThanOrEqual(b.polygon);
    });
    it("inscribed polyline errors for N = 4..64 (equal-t chords) shrink by about 4", () => {
        const expected = [0.100244, 0.025086, 0.006267, 0.001566, 0.000392];
        const errs = [4, 8, 16, 32, 64].map(n => table.length - inscribedPolylineLength(source, n));
        close(errs, expected, 6);
        for (let i = 0; i + 1 < errs.length; i++) {
            expect(errs[i] / errs[i + 1]).toBeGreaterThan(3.9);
            expect(errs[i] / errs[i + 1]).toBeLessThan(4.1);
        }
    });
    it("equal-t chord ratio 1.857 at N = 8", () => {
        const chords = chordLengths(source, equalParameterSteps(8));
        expect(Math.max(...chords) / Math.min(...chords)).toBeCloseTo(1.857, 3);
    });
    it("equal-arc parameters for N = 8, symmetric", () => {
        const eq = equalArcParameters(table, 8);
        close(eq.parameters, [0, 0.0906, 0.1983, 0.3324, 0.5, 0.6676, 0.8017, 0.9094, 1], 4);
        eq.parameters.forEach((t, i) => expect(t + eq.parameters[8 - i]).toBeCloseTo(1, 9));
    });
    it("piece lengths equal L/N to 1e-9 for several N, including N = 1", () => {
        for (const n of [1, 3, 8, 50]) {
            const eq = equalArcParameters(table, n);
            for (let i = 0; i < n; i++) {
                const piece = arcLengthBetween(source, eq.parameters[i], eq.parameters[i + 1], {subintervals: 8});
                expect(Math.abs(piece - table.length / n)).toBeLessThan(1e-9);
            }
        }
    });
    it("inverse is monotone, ends map to 0 and 1, and inverts s", () => {
        expect(parameterAtArcLength(table, 0)).toBe(0);
        expect(parameterAtArcLength(table, table.length)).toBe(1);
        let prev = -1;
        for (let i = 0; i <= 40; i++) {
            const t = parameterAtArcLength(table, table.length * i / 40);
            expect(t).toBeGreaterThanOrEqual(prev);
            prev = t;
        }
        expect(arcLengthAt(table, parameterAtArcLength(table, 2.5))).toBeCloseTo(2.5, 10);
    });
});

describe("cusp", () => {
    const table = arcLengthTableOfBezier(CUSP);
    it("is reported at t = 1/2 and nothing is NaN", () => {
        expect(table.status.kind).toBe('cusp');
        if (table.status.kind === 'cusp') {
            expect(table.status.parameters).toHaveLength(1);
            expect(table.status.parameters[0]).toBeCloseTo(0.5, 6);
        }
        expect(Number.isFinite(table.length)).toBe(true);
        const eq = equalArcParameters(table, 10);
        expect(eq.status.kind).toBe('cusp');
        eq.parameters.forEach(t => expect(Number.isFinite(t)).toBe(true));
        for (let i = 1; i < eq.parameters.length; i++) {
            expect(eq.parameters[i]).toBeGreaterThanOrEqual(eq.parameters[i - 1]);
        }
    });
    it("the inverse still works through the speed zero: pieces have length L/N", () => {
        const eq = equalArcParameters(table, 10);
        for (let i = 0; i < 10; i++) {
            // Table-based s(t): panels split at t = 1/2, where the speed has its kink.
            expect(Math.abs(arcLengthAt(table, eq.parameters[i + 1]) - arcLengthAt(table, eq.parameters[i]) - table.length / 10))
                .toBeLessThan(1e-9);
        }
    });
    it("a regular curve reports no cusp", () => {
        expect(findCusps(polynomialBezierSource(Q))).toEqual([]);
    });
});

describe("invalid input", () => {
    const table = arcLengthTableOfBezier(Q);
    it("throws RangeError", () => {
        expect(() => gaussLegendre(0)).toThrow(RangeError);
        expect(() => gaussLegendre(2.5)).toThrow(RangeError);
        expect(() => arcLengthBetween(polynomialBezierSource(Q), 0.6, 0.4)).toThrow(RangeError);
        expect(() => arcLengthBetween(polynomialBezierSource(Q), 0, 1, {subintervals: 0})).toThrow(RangeError);
        expect(() => arcLengthBetween(polynomialBezierSource(Q), NaN, 1)).toThrow(RangeError);
        expect(() => arcLengthTableOfBezier(Q, {subintervals: -1})).toThrow(RangeError);
        expect(() => arcLengthAt(table, 1.5)).toThrow(RangeError);
        expect(() => parameterAtArcLength(table, -1)).toThrow(RangeError);
        expect(() => parameterAtArcLength(table, table.length + 1)).toThrow(RangeError);
        expect(() => parameterAtArcLength(table, NaN)).toThrow(RangeError);
        expect(() => equalArcParameters(table, 0)).toThrow(RangeError);
        expect(() => equalParameterSteps(1.5)).toThrow(RangeError);
        expect(() => chordLengths(polynomialBezierSource(Q), [0.5])).toThrow(RangeError);
        expect(() => lengthBracket([[0, 0]])).toThrow(RangeError);
    });
});
