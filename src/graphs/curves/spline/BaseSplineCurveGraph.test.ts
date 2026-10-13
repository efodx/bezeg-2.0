import CnSplineGraph from './CnSplineGraph';
import C1SplineGraph from './C1SplineGraph';
import C2SplineGraph from './C2SplineGraph';
import {BaseSplineCurveGraph} from './BaseSplineCurveGraph';
import {JXGGenericSplineCurve} from '../object/JXGGenericSplineCurve';
import {GenericBezierSpline} from '../../../bezeg/impl/curve/GenericBezierSpline';
import {PointImpl} from '../../../bezeg/impl/point/point-impl';
import type {Mock} from 'vitest';

const CN = [[-3, 2], [-4, 0.5], [-3.5, -1], [-1.5, -2], [0.5, 0], [2.5, 1.5], [4, -2]];

function fakeBoard() {
    return {
        objectsList: [] as any[],
        update: vi.fn(),
        suspendUpdate: vi.fn(),
        unsuspendUpdate: vi.fn(),
    };
}

/** The real wrapper methods over a real spline model, without a JSXGraph board. */
function genericCurve(degree = 2, continuity = 1, board: any = fakeBoard()) {
    const curve = Object.create(JXGGenericSplineCurve.prototype) as any;
    curve.board = board;
    curve.labelAll = true;
    curve.hideFixed = false;
    curve.pointControlledCurve = new GenericBezierSpline(CN.map(([x, y]) => new PointImpl(x, y)), degree, continuity);
    curve.refreshNonFreeJsxGraphPoints = vi.fn();
    curve.labelJxgPoints = vi.fn();
    curve.setAttributes = vi.fn();
    return curve as JXGGenericSplineCurve & {setAttributes: Mock; labelJxgPoints: Mock};
}

function makeGraph(Cls: any, curve: any) {
    const graph = Object.create(Cls.prototype) as any;
    graph.board = curve.board;
    graph.jxgCurves = [curve];
    graph.graphJXGPoints = [];
    graph.workspaceRevision = 0;
    graph.graphSession = {isReady: true, isAlive: true};
    graph.store.replaceState({initialized: true});
    graph.setState = vi.fn();
    graph.requestRender = vi.fn();
    graph.boardUpdate = vi.fn();
    graph.unsuspendBoardUpdate = vi.fn();
    return graph;
}

const apply = (graph: any, action: any) => graph.applyLessonAction(action);
const dc = (graph: any) => {
    const spline = graph.getFirstJxgCurve().getCurve();
    return [spline.getDegree(), spline.getContinuity()];
};

describe('spline-continuity', () => {
    test.each([[0], [1]])('accepts %p at degree 2', value => {
        const graph = makeGraph(CnSplineGraph, genericCurve(2, 1));
        apply(graph, {kind: 'spline-continuity', value});
        expect(dc(graph)).toEqual([2, value]);
    });

    test('raising the degree widens the continuity bound synchronously', () => {
        const graph = makeGraph(CnSplineGraph, genericCurve(2, 1));
        expect(() => apply(graph, {kind: 'spline-continuity', value: 3})).toThrow(/0 to 1/);
        apply(graph, {kind: 'spline-degree', value: 4});
        apply(graph, {kind: 'spline-continuity', value: 3});
        expect(dc(graph)).toEqual([4, 3]);
    });

    test.each([-1, 2, 0.5, NaN, Infinity, '1'])('rejects %p without mutation', value => {
        const graph = makeGraph(CnSplineGraph, genericCurve(2, 1));
        expect(() => apply(graph, {kind: 'spline-continuity', value})).toThrow(/continuity/);
        expect(dc(graph)).toEqual([2, 1]);
        expect(graph.requestRender).not.toHaveBeenCalled();
    });

    test('requests a render so the counters show the actual values', () => {
        const graph = makeGraph(CnSplineGraph, genericCurve(2, 1));
        apply(graph, {kind: 'spline-continuity', value: 0});
        expect(graph.requestRender).toHaveBeenCalledTimes(1);
    });
});

describe('spline-degree', () => {
    test('accepts continuity+1 up to the number of curve points (the counter bound)', () => {
        const graph = makeGraph(CnSplineGraph, genericCurve(3, 1));
        apply(graph, {kind: 'spline-degree', value: 2});
        expect(dc(graph)).toEqual([2, 1]);
        apply(graph, {kind: 'spline-degree', value: 7});
        expect(dc(graph)).toEqual([7, 1]);
    });

    test.each([1, 0, 10, 2.5, NaN, -Infinity, '3'])('rejects %p at continuity 1 without mutation', value => {
        const graph = makeGraph(CnSplineGraph, genericCurve(3, 1));
        // The bound is the CountSetter's: all curve points, derived ones included (9 at degree 3).
        expect(graph.getFirstJxgCurve().getCurve().getPoints().length).toBe(9);
        expect(() => apply(graph, {kind: 'spline-degree', value})).toThrow(/degree/);
        expect(dc(graph)).toEqual([3, 1]);
        expect(graph.requestRender).not.toHaveBeenCalled();
    });

    test('the degree floor follows the current continuity', () => {
        const graph = makeGraph(CnSplineGraph, genericCurve(4, 3));
        expect(() => apply(graph, {kind: 'spline-degree', value: 3})).toThrow(/from 4 to 13/);
        apply(graph, {kind: 'spline-continuity', value: 1});
        apply(graph, {kind: 'spline-degree', value: 2});
        expect(dc(graph)).toEqual([2, 1]);
    });

    test('one tick: continuity then degree uses the already-changed curve', () => {
        const graph = makeGraph(CnSplineGraph, genericCurve(2, 1));
        apply(graph, {kind: 'spline-degree', value: 5});
        apply(graph, {kind: 'spline-continuity', value: 4});
        apply(graph, {kind: 'spline-continuity', value: 0});
        apply(graph, {kind: 'spline-degree', value: 1});
        expect(dc(graph)).toEqual([1, 0]);
    });
});

describe('label and hide-fixed actions', () => {
    test.each([[CnSplineGraph], [C1SplineGraph], [C2SplineGraph]])('%p handles both switches', Cls => {
        const curve = genericCurve();
        const graph = makeGraph(Cls, curve);
        apply(graph, {kind: 'spline-label-points', visible: false});
        expect(curve.getLabelAll()).toBe(false);
        expect(curve.labelJxgPoints).toHaveBeenCalled();
        apply(graph, {kind: 'spline-hide-fixed', hidden: true});
        expect(curve.getHideFixed()).toBe(true);
        apply(graph, {kind: 'spline-hide-fixed', hidden: false});
        apply(graph, {kind: 'spline-label-points', visible: true});
        expect(curve.getLabelAll()).toBe(true);
        expect(curve.getHideFixed()).toBe(false);
        expect(graph.requestRender).toHaveBeenCalledTimes(4);
    });

    test.each([['spline-label-points', 'visible'], ['spline-hide-fixed', 'hidden']])('%s rejects a non-boolean without mutation', (kind, key) => {
        const curve = genericCurve();
        const graph = makeGraph(CnSplineGraph, curve);
        expect(() => apply(graph, {kind, [key]: 'yes'})).toThrow(/on or off/);
        expect(curve.getLabelAll()).toBe(true);
        expect(curve.getHideFixed()).toBe(false);
        expect(graph.requestRender).not.toHaveBeenCalled();
    });

    test('the switches are controlled by the curve, so they reflect restored state and lesson actions', () => {
        const curve = genericCurve();
        const graph = makeGraph(CnSplineGraph, curve);
        const checked = () => (graph.getGraphCommands() as any[]).filter(el => el?.props?.checked !== undefined).map(el => el.props.checked);
        expect(checked()).toEqual([true, false]);
        apply(graph, {kind: 'spline-hide-fixed', hidden: true});
        apply(graph, {kind: 'spline-label-points', visible: false});
        expect(checked()).toEqual([false, true]);
        // A restored curve with other flags shows them without any remounting.
        curve.labelAll = true;
        curve.hideFixed = false;
        expect(checked()).toEqual([true, false]);
    });
});

describe('importPresetData', () => {
    test('reapplies allowShowPoints to the new first curve after the import replaces it', () => {
        const replacement = genericCurve();
        const old = genericCurve();
        const graph = makeGraph(CnSplineGraph, old);
        const base = BaseSplineCurveGraph.prototype as any;
        const parent = Object.getPrototypeOf(base);
        const spy = vi.spyOn(parent, 'importPresetData').mockImplementation(function (this: any) {
            this.jxgCurves = [replacement];
        });
        try {
            graph.importPresetData([]);
        } finally {
            spy.mockRestore();
        }
        expect(replacement.setAttributes).toHaveBeenCalledWith({allowShowPoints: true});
        expect(old.setAttributes).not.toHaveBeenCalled();
    });
});

describe('preset data', () => {
    test('degree and continuity are exported by the Cn DTO and restored by it', () => {
        const curve = genericCurve(4, 3);
        curve.exportState = () => ({}) as any;
        const dto = JXGGenericSplineCurve.toDto(curve as any);
        expect(dto).toMatchObject({degree: 4, continuity: 3});
        expect(dto.points).toEqual(CN);
        expect(dto.points.length).toBe(7);
    });
});
