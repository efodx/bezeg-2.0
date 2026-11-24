import {act} from '@testing-library/react';
import {beforeAll, describe, expect, test, vi} from 'vitest';
import {FunctionTransformationGraph} from './FunctionTransformationGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);

function marksAfter(...writes: [string, unknown][]) {
    const graph = new FunctionTransformationGraph();
    mountGraph(graph);
    for (const [key, value] of writes) act(() => { graph.parameters!.write(key, value, 'lesson'); });
    return graph.getDeclaration()!.marks!;
}

describe('transformations view marks', () => {
    test('the tracked point of the base graph and its image are the must marks', () => {
        // y = a f(b (x - c)) + d with f = x^2, a = 1.5, b = 2, c = -1, d = 0.5 and u = 2: (2, 4) maps to (u / b + c, a f(u) + d) = (0, 6.5)
        const marks = marksAfter(['transform-base', 'square'], ['transform-a', 1.5], ['transform-b', 2], ['transform-c', -1], ['transform-d', 0.5], ['transform-u', 2]);
        expect(marks.must).toEqual([{kind: 'point', x: 2, y: 4}, {kind: 'point', x: 0, y: 6.5}]);
    });

    test('a tracked abscissa outside the base domain gives no marks, and an unchanged model returns the same object', () => {
        const graph = new FunctionTransformationGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('transform-base', 'sqrt', 'lesson'); });
        act(() => { graph.parameters!.write('transform-u', -2, 'lesson'); });
        const first = graph.getDeclaration()!.marks!;
        expect(first.must).toEqual([]);
        expect(graph.getDeclaration()!.marks).toBe(first);
    });
});
