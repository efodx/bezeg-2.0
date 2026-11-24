import {act} from '@testing-library/react';
import {beforeAll, describe, expect, test, vi} from 'vitest';
import {PhasePortraitGraph} from './PhasePortraitGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);

function mount(...writes: [string, unknown][]) {
    const graph = new PhasePortraitGraph();
    mountGraph(graph);
    for (const [key, value] of writes) act(() => { graph.parameters!.write(key, value, 'lesson'); });
    return graph;
}

describe('phase portrait view marks', () => {
    test('the equilibrium and the seed are the must marks; orbit samples stay inside the intent view', () => {
        const graph = mount();
        const marks = graph.getDeclaration()!.marks!;
        // default state: the origin of the linear system and the seed (20, 0) / SEED_SCALE = (1, 0)
        expect(marks.must).toEqual([{kind: 'point', x: 0, y: 0}, {kind: 'point', x: 1, y: 0}]);
        const {xMin, xMax, yMin, yMax} = graph.derived().view;
        expect(marks.nice!.length).toBeGreaterThan(0);
        for (const mark of marks.nice!) {
            if (mark.kind !== 'polyline') throw new Error('Orbit marks are polylines.');
            for (const [x, y] of mark.points) {
                expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
                expect(x >= xMin && x <= xMax && y >= yMin && y <= yMax).toBe(true);
            }
        }
        expect(graph.getDeclaration()!.marks).toBe(marks);
    });

    test('the upright pendulum has its equilibrium at (pi, 0)', () => {
        const marks = mount(['phase-system', 'pendulum'], ['phase-equilibrium', '1']).getDeclaration()!.marks!;
        expect(marks.must[0]).toEqual({kind: 'point', x: Math.PI, y: 0});
    });
});
