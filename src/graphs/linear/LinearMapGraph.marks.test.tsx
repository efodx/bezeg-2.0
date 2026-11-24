import {act} from '@testing-library/react';
import {beforeAll, describe, expect, test, vi} from 'vitest';
import {LinearMapGraph} from './LinearMapGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import type {ViewMark, ViewMarks} from '../base/declare/graphDeclaration';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);

function mount(...writes: [string, unknown][]) {
    const graph = new LinearMapGraph();
    mountGraph(graph);
    for (const [key, value] of writes) act(() => { graph.parameters!.write(key, value, 'lesson'); });
    return graph;
}
const marksOf = (graph: LinearMapGraph): ViewMarks => graph.getDeclaration()!.marks!;
const points = (marks: readonly ViewMark[]) => marks.flatMap(mark => mark.kind === 'point' ? [[mark.x, mark.y]] : []);
const finiteMark = (mark: ViewMark): boolean => {
    switch (mark.kind) {
        case 'point': return Number.isFinite(mark.x) && Number.isFinite(mark.y);
        case 'box': return [mark.left, mark.top, mark.right, mark.bottom].every(Number.isFinite);
        case 'polyline': return mark.points.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
    }
};
const closeTo = (actual: readonly number[], expected: readonly number[]) => expected.forEach((value, i) => expect(actual[i]).toBeCloseTo(value, 9));

describe('linear map view marks', () => {
    test.each(['basis', 'determinant', 'eigen', 'ellipse', 'composition', 'iterate', 'tracedet'] as const)('the %s mode declares finite, non-empty marks', mode => {
        const marks = marksOf(mount(['linear-map-mode', mode]));
        expect(marks.must.length).toBeGreaterThan(0);
        for (const mark of [...marks.must, ...(marks.nice ?? [])]) expect(finiteMark(mark)).toBe(true);
    });

    test('basis: the unit square and its image under [[2, -1], [1, 1]], with the basis vectors', () => {
        const marks = marksOf(mount(['linear-map-mode', 'basis'], ['linear-map-example', 'basis-default']));
        const have = points(marks.must);
        for (const expected of [[1, 0], [0, 1], [1, 1], [2, 1], [-1, 1], [1, 2]]) expect(have).toContainEqual(expected);
    });

    test('eigen: the test vector at 45 degrees and its image', () => {
        const marks = marksOf(mount(['linear-map-mode', 'eigen'], ['linear-map-example', 'eigen-default'], ['linear-map-test-angle', 45]));
        const [v, av] = points(marks.must);
        // [[4, 1], [2, 3]] (1, 1) / sqrt 2 = (5, 5) / sqrt 2
        closeTo(v, [Math.SQRT1_2, Math.SQRT1_2]);
        closeTo(av, [5 * Math.SQRT1_2, 5 * Math.SQRT1_2]);
    });

    test('ellipse: the image curve box is a must mark, with the semi-axis tips, and the conic switch changes the marks', () => {
        const graph = mount(['linear-map-mode', 'ellipse'], ['linear-map-example', 'eigen-default']);
        const image = marksOf(graph);
        expect(image.must.filter(mark => mark.kind === 'box')).toHaveLength(1);
        expect(points(image.must).length).toBe(4); // two image semi-axes and two right singular directions
        act(() => graph.performAction('toggle-conic'));
        expect(marksOf(graph)).not.toBe(image);
    });

    test('composition: the fixture curve, its image under the product and, with a pivot, the pivot and its image', () => {
        const graph = mount(['linear-map-mode', 'composition']);
        const without = points(marksOf(graph).must);
        for (const expected of [[1, 0], [2, 3], [4, 2], [5, -1]]) expect(without).toContainEqual(expected);
        expect(without).toHaveLength(8);
        act(() => graph.performAction('toggle-pivot'));
        expect(points(marksOf(graph).must)).toHaveLength(10);
    });

    test('iterate: the start and the iterate of the step; a quarter turn takes (1, 0) to (0, -1) in three steps', () => {
        const marks = marksOf(mount(['linear-map-mode', 'iterate'], ['linear-map-example', 'quarter-turn'], ['linear-map-step', 3]));
        const [start, current] = points(marks.must);
        closeTo(start, [1, 0]);
        closeTo(current, [0, -1]);
        expect(marks.nice).toHaveLength(1);
    });

    test('tracedet: the point (tau, delta) of the quarter turn is (0, 1)', () => {
        const marks = marksOf(mount(['linear-map-mode', 'tracedet'], ['linear-map-example', 'quarter-turn']));
        expect(points(marks.must)).toEqual([[0, 1]]);
    });
});
