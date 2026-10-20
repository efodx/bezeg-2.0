import {AbstractJXGBezierCurve} from "./AbstractJXGBezierCurve";
import {JXGRationalBezierCurve} from "./JXGRationalBezierCurve";
import {PointImpl} from "../../../bezeg/impl/point/point-impl";
import {GraphPalette} from "../../styles/GraphPalette";

function createCurve(weights: number[], selectedWeight = 0) {
    const points = weights.map((_, i) => new PointImpl(i, i % 2));
    let currentWeights = [...weights];
    const setWeights = vi.fn((next: number[]) => { currentWeights = [...next]; });
    const model = {
        points,
        getPoints: () => points,
        getWeights: () => [...currentWeights],
        getEffectiveWeights: () => [...currentWeights],
        setWeights,
    };
    const jsxPoints = points.map(() => ({setAttribute: vi.fn()}));
    const curve = Object.create(JXGRationalBezierCurve.prototype) as any;
    Object.assign(curve, {
        pointControlledCurve: model,
        weightNumber: selectedWeight,
        showingFarinPoints: false,
        showingWeights: false,
        selected: true,
        jxgPoints: jsxPoints,
    });
    return {curve: curve as JXGRationalBezierCurve, points, weights, setWeights, jsxPoints};
}

test("deleting rational control point i removes weight i and keeps selected weight in range", () => {
    const removePoint = vi.spyOn(AbstractJXGBezierCurve.prototype, "removePoint").mockImplementation(function (this: any, i: number) {
        this.pointControlledCurve.points.splice(i, 1);
        this.jxgPoints.splice(i, 1);
    });

    try {
        const {curve, weights, setWeights, jsxPoints} = createCurve([1, 2, 3, 4], 3);
        const selectedLastPoint = jsxPoints[3];
        const adjacentPoint = jsxPoints[1];
        curve.removePoint(2);
        expect(weights).toEqual([1, 2, 3, 4]);
        expect(setWeights).toHaveBeenLastCalledWith([1, 2, 4]);
        expect(curve.getWeightNumber()).toBe(2);
        expect(selectedLastPoint.setAttribute).toHaveBeenCalledWith({fillColor: GraphPalette.selectedControlPoint, strokeColor: GraphPalette.selectedControlPointOutline});

        curve.removePoint(2);
        expect(setWeights).toHaveBeenLastCalledWith([1, 2]);
        expect(curve.getWeightNumber()).toBe(1);
        expect(adjacentPoint.setAttribute).toHaveBeenCalledWith({fillColor: GraphPalette.selectedControlPoint, strokeColor: GraphPalette.selectedControlPointOutline});
    } finally {
        removePoint.mockRestore();
    }
});

test("rational control point deletion ignores invalid and final-point indices", () => {
    const removePoint = vi.spyOn(AbstractJXGBezierCurve.prototype, "removePoint").mockImplementation(function (this: any, i: number) {
        this.pointControlledCurve.points.splice(i, 1);
        this.jxgPoints.splice(i, 1);
    });

    try {
        const {curve, setWeights, points} = createCurve([5, 6]);
        curve.removePoint(-1);
        curve.removePoint(2);
        expect(setWeights).not.toHaveBeenCalled();
        curve.removePoint(0);
        expect(points).toHaveLength(1);
        expect(setWeights).toHaveBeenLastCalledWith([6]);
        expect(removePoint).toHaveBeenCalledTimes(1);
        curve.removePoint(0);
        expect(points).toHaveLength(1);
        expect(removePoint).toHaveBeenCalledTimes(1);
    } finally {
        removePoint.mockRestore();
    }
});

test("setting effective weights rebuilds Farin sliders around the change", () => {
    const {curve, setWeights} = createCurve([1, 2, 1, 1]);
    const calls: string[] = [];
    const showFarin = vi.spyOn(curve, "showFarinPoints").mockImplementation(function (this: any, show: boolean) {
        calls.push(`farin:${show}`);
        this.showingFarinPoints = show;
    });
    setWeights.mockImplementation(() => { calls.push("weights"); });

    curve.setEffectiveWeights([1, 3, 9, 27]);
    expect(calls).toEqual(["weights"]);
    expect(setWeights).toHaveBeenLastCalledWith([1, 3, 9, 27]);

    calls.length = 0;
    (curve as any).showingFarinPoints = true;
    curve.setEffectiveWeights([1, 2, 4, 8]);
    expect(calls).toEqual(["farin:false", "weights", "farin:true"]);
    expect(curve.isShowingFarinPoints()).toBe(true);
    showFarin.mockRestore();
});
