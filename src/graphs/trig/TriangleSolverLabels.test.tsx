import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {setLanguage} from '../../localization';
import type {PxBox} from '../legend/boardLabelPlacement';
import {tickStrips} from '../legend/pointNamePlacement';
import {TriangleSolverGraph} from './TriangleSolverGraph';

// A lesson board at 1440 px is about 960 x 620.
beforeAll(() => {
    installBoardShims();
    for (const [name, size] of [['clientWidth', 960], ['clientHeight', 620], ['offsetWidth', 960], ['offsetHeight', 620]] as const) Object.defineProperty(HTMLElement.prototype, name, {configurable: true, get: () => size});
});
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => setLanguage('sl'));

class Probe extends TriangleSolverGraph {
    liveBoard() { return this.board; }
}
type Shown = {elType: string; plaintext?: string; evalVisProp(name: string): unknown; X?: () => number; Y?: () => number};
type V = readonly [number, number];

/** The cosine-rule lesson's right-angle scene (side BC on the y axis) and two other constellations. */
const SCENES: Record<string, {A: V; B: V; C: V}> = {
    right: {A: [4, 0], B: [0, 3], C: [0, 0]},
    default: {A: [0, 0], B: [7, 0], C: [2, 4]},
    integers: {A: [0, 0], B: [6, 2], C: [1, 4]},
};

const overlaps = (a: PxBox, b: PxBox) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

describe('TriangleSolverGraph side names', () => {
    for (const [scene, v] of Object.entries(SCENES)) {
        it(`${scene}: a side name is drawn, on no tick label and on no other name`, () => {
            const graph = new Probe();
            render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
            act(() => {
                const {apply} = graph.getLessonCapabilities();
                apply({kind: 'triangle', operation: 'set-mode', mode: 'sides'});
                for (const k of ['A', 'B', 'C'] as const) apply({kind: 'triangle', operation: 'set-vertex', vertex: k, x: v[k][0], y: v[k][1]});
            });
            act(() => { graph.liveBoard().update(); });
            const board = graph.liveBoard();
            const [left, top] = board.getBoundingBox();
            const names = (board.objectsList as unknown as Shown[]).filter(o => o.elType === 'text' && /^\$\$[abc]\$\$$/.test(String(o.plaintext)) && o.evalVisProp('visible'))
                .map(o => ({name: String(o.plaintext).replace(/[^abc]/g, ''), x: (o.X!() - left) * board.unitX, y: (top - o.Y!()) * board.unitY}));
            expect(names.map(n => n.name).sort()).toEqual(['a', 'b', 'c']);
            const ticks = tickStrips(board);
            expect(ticks.length).toBeGreaterThan(4);
            const boxes = names.map(n => ({name: n.name, box: {x0: n.x - 6, y0: n.y - 9, x1: n.x + 6, y1: n.y + 9} as PxBox}));
            for (const {name, box} of boxes) ticks.forEach((t, i) => expect.soft(overlaps(box, t), `"${name}" lies on tick label ${i}`).toBe(false));
            boxes.forEach((p, i) => boxes.slice(i + 1).forEach(q => expect.soft(overlaps(p.box, q.box), `"${p.name}" lies on "${q.name}"`).toBe(false)));
        });
    }
});
