import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {setLanguage} from '../../localization';
import {DEFAULT_LP_STATE} from '../../optimization/lpModel';
import LinearProgramGraph from './LinearProgramGraph';
import type {PxBox} from './lpLabelLayout';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

class Probe extends LinearProgramGraph {
    liveBoard() { return this.board; }
}

function mountProbe() {
    const graph = new Probe();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
}

const overlaps = (a: PxBox, b: PxBox) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

describe('LinearProgramGraph board text placement', () => {
    it('the legend is a short stack that holds every style word, and the plot (vertices, handle) lies below it', () => {
        const graph = mountProbe();
        const legend = graph.legendBox();
        expect(legend).toBeDefined();
        const rows = graph.boardLegend();
        expect(rows.length).toBeLessThanOrEqual(5);
        const words = rows.map(row => row.text).join(' ');
        for (const word of ['območje', 'pogoj', 'oglišče', 'optimum', 'cilj', 'sprehod', 'ročico']) expect(words).toContain(word);
        // The panel list keeps the eight rows in full.
        expect(graph.legend().map(row => row.id)).toEqual(expect.arrayContaining(['region', 'rows', 'vertex', 'optimum', 'objective', 'sweep', 'direction', 'walk']));
        const board = graph.liveBoard();
        const [left, top] = board.getBoundingBox();
        const toPx = (x: number, y: number) => [(x - left) * board.unitX, (top - y) * board.unitY];
        const plotted = [...graph.solution().result.vertices.map(v => [v.x.toNumber(), v.y.toNumber()]), [DEFAULT_LP_STATE.objective.p, DEFAULT_LP_STATE.objective.q]];
        for (const [x, y] of plotted) {
            const [px, py] = toPx(x, y);
            expect(py, `point (${x}, ${y}) lies under the legend`).toBeGreaterThan(legend!.y1);
            expect(px).toBeGreaterThan(0);
        }
    });

    it('every vertex text and the handle caption clear the markers, the axes, the legend and each other', () => {
        const graph = mountProbe();
        const boxes = graph.labelBoxes();
        const legend = graph.legendBox()!;
        const board = graph.liveBoard();
        const [left, top] = board.getBoundingBox();
        const toPx = (x: number, y: number) => [(x - left) * board.unitX, (top - y) * board.unitY];
        const [axisX, axisY] = toPx(0, 0);
        const markers = [...graph.solution().result.vertices.map(v => toPx(v.x.toNumber(), v.y.toNumber())), toPx(DEFAULT_LP_STATE.objective.p, DEFAULT_LP_STATE.objective.q)];
        const ids = ['handle', 'v0', 'v1', 'v2', 'v3'];
        for (const id of ids) {
            const box = boxes[id];
            expect(box, `${id} has a box`).toBeDefined();
            expect(overlaps(box, legend), `${id} lies on the legend`).toBe(false);
            for (const [mx, my] of markers) {
                expect(mx + 7 > box.x0 && mx - 7 < box.x1 && my + 7 > box.y0 && my - 7 < box.y1, `${id} touches a marker`).toBe(false);
            }
            expect(box.x0 <= axisX && box.x1 >= axisX, `${id} lies across the y axis`).toBe(false);
            expect(box.y0 <= axisY && box.y1 >= axisY, `${id} lies across the x axis`).toBe(false);
        }
        for (const a of ids) for (const b of ids) if (a < b) expect(overlaps(boxes[a], boxes[b]), `${a} and ${b} overlap`).toBe(false);
    });

    it('a constraint name sits inside the board on its line, not past the window', () => {
        const graph = mountProbe();
        act(() => { graph.importPresetData([['LinearProgram', DEFAULT_LP_STATE]]); });
        const boxes = graph.labelBoxes();
        const board = graph.liveBoard();
        for (const id of ['row0', 'row1']) {
            const box = boxes[id];
            if (!box) continue;
            expect(box.x0).toBeGreaterThanOrEqual(0);
            expect(box.x1).toBeLessThanOrEqual(board.canvasWidth);
            expect(box.y1).toBeLessThanOrEqual(board.canvasHeight);
        }
    });
});
