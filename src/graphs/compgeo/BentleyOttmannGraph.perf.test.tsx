import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {BentleyOttmannGraph} from './BentleyOttmannGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {runBentleyOttmann} from './bentleyOttmannRun';
import {type PointSetModel, segmentsOf} from '../../compgeo/pointSetModel';
import {setLanguage} from '../../localization';
import {appendFileSync, writeFileSync} from 'node:fs';

// Measurement behind docs/reviews/feature-streams/geometry/09-perf.md: dragging one endpoint of 12 segments through the
// graph's own drag handler (snap, model edit, trace recompute, board redraw, panel render). The only assertion is a loose
// ceiling so that a pathological regression fails; the numbers are printed.
beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});

class Observed extends BentleyOttmannGraph {
    liveBoard() { return this.board; }
}

/** Twelve segments on the grid, crossing one another in many places and none collinear. */
const TWELVE: PointSetModel = {
    mode: 'segments', closed: false, gridStepExponent: 0,
    points: [
        [0, 0, 11, 7], [0, 9, 11, 2], [1, 11, 8, -2], [3, 12, 4, -3], [-2, 5, 12, 6], [6, 12, 7, -4],
        [-3, 1, 10, 10], [-1, 12, 9, -1], [2, -2, 10, 12], [5, 11, 12, 3], [-4, 8, 12, 0], [0, 6, 12, 9],
    ].flatMap(([ax, ay, bx, by]) => [{x: ax, y: ay}, {x: bx, y: by}]),
};

test('dragging an endpoint with 12 segments: timing of the drag handler', () => {
    setLanguage('sl');
    const graph = new Observed();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    act(() => { graph.loadModel(TWELVE); });
    expect(graph.run().refusal).toBeUndefined();
    const board = graph.liveBoard();
    const handles = (board.objectsList as unknown as Array<{elType: string; X(): number; Y(): number; moveTo(to: number[], t: number): void; triggerEventHandlers(names: string[]): void}>)
        .filter(o => o.elType === 'point' && o.X() === 11 && o.Y() === 7);
    expect(handles).toHaveLength(1);
    const handle = handles[0];
    const times: number[] = [];
    const positions = 40;
    for (let i = 0; i < positions; i++) {
        const target = [11 + ((i % 2) ? 1 : 0) + Math.floor(i / 8) * 0, 7 + (i % 5) - 2 + (i % 2)];
        const started = performance.now();
        act(() => {
            handle.moveTo(target, 0);
            handle.triggerEventHandlers(['drag']);
        });
        times.push(performance.now() - started);
    }
    expect(graph.model.points[1]).not.toEqual({x: 11, y: 7});
    const sorted = [...times].sort((a, b) => a - b);
    const median = sorted[sorted.length >> 1];
    writeFileSync('docs/reviews/feature-streams/geometry/09b-perf-raw.txt', `BO-PERF drag n=${times.length} median=${median.toFixed(2)}ms max=${sorted[sorted.length - 1].toFixed(2)}ms min=${sorted[0].toFixed(2)}ms events=${graph.run().eventCount} crossings=${graph.run().points.length}
all=${times.map(t => t.toFixed(2)).join(' ')}
`);
    // The trace recompute alone (kernel plus run view), same segments.
    const traceTimes: number[] = [];
    for (let i = 0; i < positions; i++) {
        const started = performance.now();
        runBentleyOttmann(segmentsOf(graph.model));
        traceTimes.push(performance.now() - started);
    }
    traceTimes.sort((a, b) => a - b);
    appendFileSync('docs/reviews/feature-streams/geometry/09b-perf-raw.txt', `trace-only median=${traceTimes[traceTimes.length >> 1].toFixed(2)}ms max=${traceTimes[traceTimes.length - 1].toFixed(2)}ms
`);
    expect(median).toBeLessThan(250);
});
