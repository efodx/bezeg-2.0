import {beforeAll, describe, expect, test, vi} from 'vitest';
import DecasteljauGraph from './DecasteljauGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);

describe('De Casteljau view marks', () => {
    test('the control points are the must marks and the curve samples run from the first to the last of them', () => {
        const graph = new DecasteljauGraph();
        mountGraph(graph);
        const control = graph.getFirstCurve()!.getPoints().map(point => [point.X(), point.Y()]);
        const marks = graph.getDeclaration()!.marks!;
        expect(control.length).toBeGreaterThan(2);
        expect(marks.must).toEqual(control.map(([x, y]) => ({kind: 'point', x, y})));
        const [curve] = marks.nice!;
        if (curve.kind !== 'polyline') throw new Error('The nice mark is a polyline.');
        // a Bezier curve starts at its first and ends at its last control point
        expect(curve.points[0]).toEqual(control[0]);
        const last = curve.points[curve.points.length - 1];
        expect(last[0]).toBeCloseTo(control[control.length - 1][0], 9);
        expect(last[1]).toBeCloseTo(control[control.length - 1][1], 9);
        expect(curve.points.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y))).toBe(true);
        expect(graph.getDeclaration()!.marks).toBe(marks);
    });
});
