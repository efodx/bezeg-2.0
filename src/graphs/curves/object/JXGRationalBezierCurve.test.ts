import {AbstractJXGBezierCurve} from "./AbstractJXGBezierCurve";
import {JXGRationalBezierCurve} from "./JXGRationalBezierCurve";
import {PointImpl} from "../../../bezeg/impl/point/point-impl";
import {GraphPalette} from "../../styles/GraphPalette";

function createCurve(weights: number[], selectedWeight = 0) {
    const points = weights.map((_, i) => new PointImpl(i, i % 2));
    let currentWeights = [...weights];
    const setWeights = jest.fn((next: number[]) => { currentWeights = [...next]; });
    const model = {
        points,
        getPoints: () => points,
        getWeights: () => [...currentWeights],
        getEffectiveWeights: () => [...currentWeights],
        setWeights,
    };
    const jsxPoints = points.map(() => ({setAttribute: jest.fn()}));
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
    const removePoint = jest.spyOn(AbstractJXGBezierCurve.prototype, "removePoint").mockImplementation(function (this: any, i: number) {
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
    const removePoint = jest.spyOn(AbstractJXGBezierCurve.prototype, "removePoint").mockImplementation(function (this: any, i: number) {
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
