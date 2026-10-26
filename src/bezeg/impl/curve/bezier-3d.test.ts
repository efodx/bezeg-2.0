import {describe, expect, test} from "vitest";
import {Point} from "../../api/point/point";
import {FixedPoint} from "../point/fixed-point";
import {PointImpl} from "../point/point-impl";
import {blendPoints, boundingBoxOf, chordKnots, convexHull, distance} from "./geometry";
import {PhBezierCurve} from "./ph-bezier-curve";
import {phControlPoints, phOffsetRational, phSigmas} from "./ph-math";
import {PolynomialBezierCurve} from "./polynomial-bezier-curve";
import {RationalBezierCurve} from "./rational-bezier-curve";
import {GenericBezierSpline} from "./GenericBezierSpline";
import {C1QuadraticBezierSpline} from "./C1QuadraticBezierSpline";
import {C2CubicBezierSpline} from "./C2CubicBezierSpline";
import {G1QuadraticBezierSpline} from "./G1QuadraticBezierSpline";
import {G1SymmetricQuadraticBezierSpline} from "./G1SymmetricQuadraticBezierSpline";
import {ClassMapper} from "../../../graphs/curves/object/ClassMapper";
import {JXGBezierCurve} from "../../../graphs/curves/object/JXGBezierCurve";
import {JXGRationalBezierCurve} from "../../../graphs/curves/object/JXGRationalBezierCurve";
import {JXGPHBezierCurve} from "../../../graphs/curves/object/JXGPHBezierCurve";
import {JXGGenericSplineCurve} from "../../../graphs/curves/object/JXGGenericSplineCurve";
import {JXGQuadraticC1SplineCurve} from "../../../graphs/curves/object/JXGQuadraticC1SplineCurve";
import {JXGQubicC2SplineCurve} from "../../../graphs/curves/object/JXGQubicC2SplineCurve";
import {JXGQuadraticG1SplineCurve} from "../../../graphs/curves/object/JXGQuadraticG1SplineCurve";
import {JXGSymmetricQuadraticG1SplineCurve} from "../../../graphs/curves/object/JXGSymmetricQuadraticG1SplineCurve";
import {ModelPointBinding} from "../../../graphs/curves/object/ModelPointBinding";

const coordinates = [[-2, 1, 3], [0, 4, -1], [5, -2, 2], [3, 1, 7]] as const;
const controls = (): PointImpl[] => coordinates.map(([x, y, z]) => new PointImpl(x, y, undefined, z));

/** Independent Bernstein sum in 3 coordinates, including optional rational weights. */
function bernstein(points: Point[], t: number, weights = points.map(() => 1)): number[] {
    const n = points.length - 1;
    const result = [0, 0, 0];
    let denominator = 0;
    for (let i = 0, choose = 1; i <= n; i++) {
        if (i > 0) choose *= (n - i + 1) / i;
        const factor = choose * (1 - t) ** (n - i) * t ** i * weights[i];
        result[0] += factor * points[i].X();
        result[1] += factor * points[i].Y();
        result[2] += factor * (points[i].Z?.() ?? 0);
        denominator += factor;
    }
    return result.map(value => value / denominator);
}

function expectPoint(point: Point, expected: number[]) {
    [point.X(), point.Y(), point.Z?.() ?? 0].forEach((value, i) => {
        expect(value).toBeCloseTo(expected[i], 10);
    });
}

describe("3D Bézier control points", () => {
    test.each([false, true])("evaluation, scheme, subdivision, extrapolation and elevation preserve z (rational=%s)", rational => {
        const points = controls();
        const weights = [1, 2, 0.75, 1.5];
        const curve = rational ? new RationalBezierCurve(points, weights) : new PolynomialBezierCurve(points);
        const evaluate = (t: number) => bernstein(points, t, rational ? weights : undefined);
        for (const t of [-0.15, 0, 0.23, 0.7, 1, 1.2]) {
            expectPoint(curve.eval(t), evaluate(t));
            const end = curve.decasteljauScheme(t).at(-1)![0];
            expectPoint(end, evaluate(t));
        }
        const elevated = curve.elevate();
        const [left, right] = curve.subdivide(0.37);
        const extended = curve.extrapolate(1.25);
        for (const t of [0, 0.17, 0.5, 0.83, 1]) {
            expectPoint(elevated.eval(t), evaluate(t));
            expectPoint(left.eval(t), evaluate(0.37 * t));
            expectPoint(right.eval(t), evaluate(0.37 + 0.63 * t));
            expectPoint(extended.eval(t), evaluate(1.25 * t));
        }
    });

    test("z edits invalidate evaluation caches and function-backed z follows dependencies", () => {
        const points = controls();
        const curve = new PolynomialBezierCurve(points);
        const before = curve.eval(0.4);
        const oldStamp = points[1].version();
        points[1].setZ(12);
        expect(points[1].version()).not.toBe(oldStamp);
        const after = curve.eval(0.4);
        expect(after).not.toBe(before);
        expect(after.Z?.() ?? 0).not.toBe(before.Z?.() ?? 0);

        let reads = 0;
        const source = new PointImpl(0, 0, undefined, 2);
        const dependent = new PointImpl(0, 0, [source], () => { reads++; return source.Z() * 3; });
        expect(dependent.Z()).toBe(6);
        expect(dependent.Z()).toBe(6);
        expect(reads).toBe(1);
        source.setZ(4);
        expect(dependent.Z()).toBe(12);
        expect(reads).toBe(2);
        const fixed = new FixedPoint(() => [1, 2, source.Z() + 1], [source]);
        expect(fixed.Z()).toBe(5);
        source.setZ(6);
        expect(fixed.Z()).toBe(7);
        expect(new PointImpl(1, 2).Z()).toBe(0);
    });

    test("mixed zero/nonzero control heights use uniform rows; the scratch path refreshes height", () => {
        class ObservedCurve extends PolynomialBezierCurve {
            dimensions: number[] = [];
            row?: number[];
            protected override runDeCasteljau(t: number, rows: number[][], weights?: number[], scheme?: number[][][]): void {
                this.dimensions = rows.map(row => row.length);
                this.row = rows[0];
                super.runDeCasteljau(t, rows, weights, scheme);
            }
        }
        const points = [[0, 0, 0], [1, 2, 3], [2, -1, 0], [3, 2, 4], [4, 0, 0]]
            .map(([x, y, z]) => new PointImpl(x, y, undefined, z));
        const curve = new ObservedCurve(points);
        expectPoint(curve.eval(0.43), bernstein(points, 0.43));
        const scratchRow = curve.row;
        expect(curve.dimensions).toEqual([3, 3, 3, 3, 3]);
        points[1].setZ(0);
        points[3].setZ(0);
        expectPoint(curve.eval(0.43), bernstein(points, 0.43));
        expect(curve.dimensions).toEqual([2, 2, 2, 2, 2]);
        expect(curve.row).toBe(scratchRow);
        points[2].setZ(-2);
        expectPoint(curve.eval(0.43), bernstein(points, 0.43));
        expect(curve.dimensions).toEqual([3, 3, 3, 3, 3]);
        expect(curve.row).toBe(scratchRow);

        let reads = 0;
        const functionBacked = [...coordinates, [4, 0, 0] as const]
            .map(([x, y]) => new PointImpl(x, y, undefined, () => { reads++; return 1; }));
        new PolynomialBezierCurve(functionBacked).eval(0.3);
        expect(reads).toBe(functionBacked.length);
    });

    test("a 3D linear blend retains z and PH number kernels reject 3D vectors", () => {
        const blend = blendPoints(new PointImpl(0, 0, undefined, 2), new PointImpl(4, 2, undefined, 6), () => [0.25, 0.75]);
        expect([blend.X(), blend.Y(), blend.Z()]).toEqual([3, 1.5, 5]);
        const spatialVec = [1, 2, 3] as unknown as readonly [number, number];
        expect(() => phControlPoints(spatialVec, [[1, 0]])).toThrow(/planar vectors/);
        expect(() => phSigmas([spatialVec])).toThrow(/planar vectors/);
        expect(() => phOffsetRational([spatialVec], [1], 0)).toThrow(/planar vectors/);
    });

    test("XY affine transforms preserve z on spatial control points", () => {
        const curve = new PolynomialBezierCurve([new PointImpl(0, 0, undefined, 2), new PointImpl(4, 2, undefined, 6)]);
        curve.scale(2, 3);
        expect(curve.getPoints().map(point => point.Z?.())).toEqual([2, 6]);
        curve.moveFor(1, -1);
        curve.rotate(Math.PI / 2);
        curve.flip(true, false);
        expect(curve.getPoints().map(point => point.Z?.())).toEqual([2, 6]);
    });

    test("planar geometry checks also reject points made spatial after construction", () => {
        const point = new PointImpl(0, 0);
        point.setZ(1);
        expect(() => distance(point, new PointImpl(1, 1))).toThrow(/planar points/);
        expect(() => boundingBoxOf([point])).toThrow(/planar points/);
        expect(() => convexHull([point])).toThrow(/planar points/);
        expect(() => chordKnots([[point, new PointImpl(1, 1)]], 1)).toThrow(/planar points/);
    });
});

describe("planar-only guards", () => {
    const spatial = () => new PointImpl(0, 0, undefined, 1);

    test.each([
        ["distance", () => distance(spatial(), new PointImpl(1, 1))],
        ["boundingBoxOf", () => boundingBoxOf([spatial()])],
        ["convexHull", () => convexHull([spatial()])],
        ["chordKnots", () => chordKnots([[spatial(), new PointImpl(1, 1)]], 1)],
    ])("%s rejects nonzero z", (_name, call) => expect(call).toThrow(/planar points/));

    test("PH curves and spline schemes reject nonzero z, including a later edit", () => {
        expect(() => new PhBezierCurve([spatial()], [new PointImpl(1, 0)])).toThrow(/planar points/);
        const start = new PointImpl(0, 0);
        const ph = new PhBezierCurve([start], [new PointImpl(1, 0)]);
        start.setZ(1);
        expect(() => ph.eval(0.5)).toThrow(/planar points/);

        const splinePoint = new PointImpl(0, 0);
        const spline = new GenericBezierSpline([splinePoint, new PointImpl(1, 1), new PointImpl(2, 0), new PointImpl(3, 1)], 2, 1);
        splinePoint.setZ(2);
        expect(() => spline.eval(0.5)).toThrow(/planar points/);
    });

    test.each([
        ["C1 quadratic shared join scheme", (points: PointImpl[]) => new C1QuadraticBezierSpline(points)],
        ["G1 quadratic shared join scheme", (points: PointImpl[]) => new G1QuadraticBezierSpline(points)],
        ["symmetric G1 quadratic shared join scheme", (points: PointImpl[]) => new G1SymmetricQuadraticBezierSpline(points)],
        ["C2 cubic scheme", (points: PointImpl[]) => new C2CubicBezierSpline(points)],
        ["generic spline scheme", (points: PointImpl[]) => new GenericBezierSpline(points, 2, 1)],
    ])("%s rejects spatial points at scheme build", (_name, create) => {
        expect(() => create([new PointImpl(0, 0, undefined, 1), new PointImpl(1, 2), new PointImpl(2, 0), new PointImpl(3, 1)]))
            .toThrow(/planar points/);
    });

    test.each([
        JXGBezierCurve, JXGRationalBezierCurve, JXGPHBezierCurve, JXGGenericSplineCurve,
        JXGQuadraticC1SplineCurve, JXGQubicC2SplineCurve, JXGQuadraticG1SplineCurve,
        JXGSymmetricQuadraticG1SplineCurve,
    ])("%s direct DTO conversion rejects spatial points before board access", Adapter => {
        const adapter = {pointControlledCurve: {getPoints: () => [spatial()]}};
        expect(() => Adapter.toDto(adapter as never)).toThrow(/planar points/);
        expect(() => Adapter.fromDto({points: [[0, 0, 1]], state: {}} as never, {} as JXG.Board))
            .toThrow(/planar points/);
    });

    test("curve DTO conversion and point bindings reject spatial points", () => {
        const point = spatial();
        const adapter = {pointControlledCurve: {getPoints: () => [point]}};
        expect(() => ClassMapper.getToDto(JXGBezierCurve)(adapter)).toThrow(/planar points/);
        expect(() => JXGBezierCurve.toDto(adapter as unknown as JXGBezierCurve)).toThrow(/planar points/);
        expect(() => ClassMapper.getFromDto("JSXBezierCurve")({points: [[0, 0, 3]]}, {} as JXG.Board))
            .toThrow(/planar points/);
        expect(() => JXGBezierCurve.fromDto({points: [[0, 0, 3]], state: {} as never}, {} as JXG.Board))
            .toThrow(/planar points/);
        expect(() => new JXGBezierCurve([[0, 0, 3]], {} as JXG.Board)).toThrow(/planar points/);

        const boardPoint = {
            on: vi.fn(), off: vi.fn(), X: () => 0, Y: () => 0,
            setPositionDirectly: vi.fn(),
        } as unknown as JXG.Point;
        expect(() => new ModelPointBinding(point, boardPoint)).toThrow(/planar points/);
        const planarPoint = new PointImpl(0, 0);
        const binding = new ModelPointBinding(planarPoint, boardPoint);
        expect(() => planarPoint.setZ(1)).toThrow(/planar points/);
        binding.dispose();
    });
});
