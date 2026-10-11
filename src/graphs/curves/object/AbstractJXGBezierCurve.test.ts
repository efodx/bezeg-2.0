import {AbstractJXGBezierCurve} from './AbstractJXGBezierCurve';

test('disposes De Casteljau auxiliary objects with their owning curve', () => {
    const decasteljauPoint = {} as JXG.Point;
    const decasteljauSegment = {} as JXG.Segment;
    const removeObject = jest.fn();
    const curve = Object.create(AbstractJXGBezierCurve.prototype) as any;

    Object.assign(curve, {
        board: {renderer: {}, off: jest.fn(), removeObject},
        decasteljauPoints: [decasteljauPoint],
        decasteljauSegments: [decasteljauSegment],
        elevationPoints: [],
        elevationSegments: [],
        subdivisionPoint: undefined,
        extrapolationPoint: undefined,
        convexHull: undefined,
        evaluationPoint: undefined,
        controlPolygonSegments: [],
        boundBoxSegments: [],
        boundBoxPoints: [],
        jxgCurve: undefined,
        jxgPoints: [],
        editablePointBindings: new Map(),
        editablePointsByJxgPoint: new Map(),
    });

    curve.dispose();

    expect(removeObject).toHaveBeenCalledWith(expect.arrayContaining([decasteljauPoint, decasteljauSegment]));
    expect(curve.decasteljauPoints).toEqual([]);
    expect(curve.decasteljauSegments).toEqual([]);
});
