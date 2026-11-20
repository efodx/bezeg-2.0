import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {setLanguage} from '../../localization';
import type {PxBox} from '../legend/boardLabelPlacement';
import {distanceToBox, nameBox} from '../legend/pointNamePlacement';
import {MonotoneTriangulationGraph} from './MonotoneTriangulationGraph';
import {MONOTONE_EXAMPLE_1, MONOTONE_TRIANGULATION_TRACE_STEPS as STEPS} from '../../learning/content/compgeoGuidedLessons';

// A lesson board at 1440 px is about 960 x 620; the shared shim's 600 x 400 is more crowded than any shown frame.
beforeAll(() => {
    installBoardShims();
    for (const [name, size] of [['clientWidth', 960], ['clientHeight', 620], ['offsetWidth', 960], ['offsetHeight', 620]] as const) Object.defineProperty(HTMLElement.prototype, name, {configurable: true, get: () => size});
});
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => setLanguage('sl'));

class Probe extends MonotoneTriangulationGraph {
    liveBoard() { return this.board; }
}
type Shown = {elType: string; name: string; plaintext?: string; label?: JXG.Text; evalVisProp(name: string): unknown; X?: () => number; Y?: () => number};
type Poly = readonly (readonly [number, number])[];

/** The lesson's polygon at its predict, test and diagonal steps, and a second polygon (a sawtooth) at the same steps. */
const SCENES: Record<string, Poly> = {
    lesson: MONOTONE_EXAMPLE_1,
    sawtooth: [[0, 0], [2, 3], [3, 1], [5, 4], [6, 0], [3, -1]],
};
const STEP_LIST = [STEPS.predict, STEPS.test, STEPS.diagonal, STEPS.pieceDone] as const;

const overlaps = (a: PxBox, b: PxBox) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

function mountScene(points: Poly, step: number) {
    const graph = new Probe();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    act(() => {
        const {apply} = graph.getLessonCapabilities();
        apply({kind: 'point-set', operation: 'set-points', mode: 'polygon', closed: true, points});
        apply({kind: 'point-set', operation: 'set-trace-step', step});
    });
    act(() => { graph.liveBoard().update(); });
    return graph;
}

function drawn(graph: Probe) {
    const board = graph.liveBoard();
    const [left, top] = board.getBoundingBox();
    const toPx = (x: number, y: number) => [(x - left) * board.unitX, (top - y) * board.unitY] as const;
    const shown = (board.objectsList as unknown as Shown[]).filter(o => Boolean(o.evalVisProp('visible')));
    const box = (text: string, font: number, x: number, y: number) => {
        const [cx, cy] = toPx(x, y);
        const {w, h} = nameBox(text, font);
        return {x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2} as PxBox;
    };
    const markers = shown.filter(o => o.elType === 'point' && o.X && o.name !== 'pending').map(o => ({at: toPx(o.X!(), o.Y!()), r: Number(o.evalVisProp('size')) + 1}));
    const labels = [
        ...shown.filter(o => o.elType === 'point' && /^P\d+$/.test(o.name) && o.label).map(o => ({name: o.name, vertex: Number(o.name.slice(1)) - 1, box: box(o.name, 15, o.label!.X(), o.label!.Y())})),
        ...shown.filter(o => o.elType === 'text' && o.name === 'monotonetri-chain-label').map(o => ({name: String(o.plaintext), vertex: Number(/^v(\d+)/.exec(String(o.plaintext))?.[1]) - 1, box: box(String(o.plaintext), 14, o.X!(), o.Y!())})),
    ];
    const vertexAt = shown.filter(o => o.elType === 'point' && /^P\d+$/.test(o.name)).map(o => ({vertex: Number(o.name.slice(1)) - 1, at: toPx(o.X!(), o.Y!())}));
    return {board, labels, markers, vertexAt};
}

describe('MonotoneTriangulationGraph chain labels and vertex names', () => {
    for (const [scene, polygon] of Object.entries(SCENES)) for (const step of STEP_LIST) {
        it(`${scene} at step ${step}: names are drawn, apart, off every marker and beside their own vertex`, () => {
            const {board, labels, markers, vertexAt} = drawn(mountScene(polygon, step));
            // The six vertex names and the chain labels of the vertices of the piece (at least three).
            expect(labels.filter(l => /^P\d+$/.test(l.name)).length).toBe(polygon.length);
            expect(labels.filter(l => !/^P\d+$/.test(l.name)).length).toBeGreaterThanOrEqual(3);
            for (const {name, box} of labels) {
                expect.soft(box.x1 - box.x0, `"${name}" has no box`).toBeGreaterThan(4);
                expect.soft(box.x0 >= 0 && box.y0 >= 0 && box.x1 <= board.canvasWidth && box.y1 <= board.canvasHeight, `"${name}" leaves the board`).toBe(true);
            }
            labels.forEach((a, i) => labels.slice(i + 1).forEach(b => expect.soft(overlaps(a.box, b.box), `"${a.name}" lies on "${b.name}"`).toBe(false)));
            // A name covers no marker, its own included (the first letter of a chain label was hidden under it).
            for (const {name, box} of labels) for (const m of markers) {
                const [mx, my] = m.at;
                expect.soft(mx + m.r > box.x0 && mx - m.r < box.x1 && my + m.r > box.y0 && my - m.r < box.y1, `"${name}" covers a marker at ${Math.round(mx)},${Math.round(my)}`).toBe(false);
            }
            // A name stays within 16 px of the largest marker at its own vertex.
            for (const {name, vertex, box} of labels) {
                const own = vertexAt.find(v => v.vertex === vertex)!;
                const r = Math.max(...markers.filter(m => Math.hypot(m.at[0] - own.at[0], m.at[1] - own.at[1]) < 1).map(m => m.r));
                expect.soft(distanceToBox(box, own.at[0], own.at[1]) - r, `"${name}" is far from its vertex`).toBeLessThanOrEqual(16);
            }
        });
    }
});
