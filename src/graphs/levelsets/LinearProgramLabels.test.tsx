import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {setLanguage} from '../../localization';
import {DEFAULT_LP_STATE} from '../../optimization/lpModel';
import {runAs} from '../base/writes/writeSource';
import LinearProgramGraph from './LinearProgramGraph';
import type {PxBox} from '../legend/boardLabelPlacement';

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
    it('the legend is the card, not board text: all eight rows are declared and the plot (vertices, handle) is framed on the whole board', () => {
        const graph = mountProbe();
        expect(graph.getDeclaration()?.legend?.map(entry => entry.id)).toEqual(expect.arrayContaining(['region', 'rows', 'vertex', 'optimum', 'objective', 'sweep', 'direction', 'walk']));
        const board = graph.liveBoard();
        const [left, top] = board.getBoundingBox();
        const toPx = (x: number, y: number) => [(x - left) * board.unitX, (top - y) * board.unitY];
        const plotted = [...graph.solution().result.vertices.map(v => [v.x.toNumber(), v.y.toNumber()]), [DEFAULT_LP_STATE.objective.p, DEFAULT_LP_STATE.objective.q]];
        for (const [x, y] of plotted) {
            const [px, py] = toPx(x, y);
            expect(py, `point (${x}, ${y}) is on the board`).toBeGreaterThan(0);
            expect(px).toBeGreaterThan(0);
        }
    });

    it('every vertex text and the handle caption clear the markers, the axes and each other', () => {
        const graph = mountProbe();
        const boxes = graph.labelBoxes();
        const board = graph.liveBoard();
        const [left, top] = board.getBoundingBox();
        const toPx = (x: number, y: number) => [(x - left) * board.unitX, (top - y) * board.unitY];
        const [axisX, axisY] = toPx(0, 0);
        const markers = [...graph.solution().result.vertices.map(v => toPx(v.x.toNumber(), v.y.toNumber())), toPx(DEFAULT_LP_STATE.objective.p, DEFAULT_LP_STATE.objective.q)];
        const ids = ['handle', 'v0', 'v1', 'v2', 'v3'];
        for (const id of ids) {
            const box = boxes[id];
            expect(box, `${id} has a box`).toBeDefined();
            for (const [mx, my] of markers) {
                expect(mx + 7 > box.x0 && mx - 7 < box.x1 && my + 7 > box.y0 && my - 7 < box.y1, `${id} touches a marker`).toBe(false);
            }
            expect(box.x0 <= axisX && box.x1 >= axisX, `${id} lies across the y axis`).toBe(false);
            expect(box.y0 <= axisY && box.y1 >= axisY, `${id} lies across the x axis`).toBe(false);
        }
        for (const a of ids) for (const b of ids) if (a < b) expect(overlaps(boxes[a], boxes[b]), `${a} and ${b} overlap`).toBe(false);
    });

    it('at the catalog board size a vertex text is drawn from the box edge nearest its vertex, so a narrower font closes up to the vertex', () => {
        const graph = mountProbe();
        const board = graph.liveBoard();
        act(() => runAs('learner', () => {
            board.resizeContainer(360, 220, true, true);
            board.setBoundingBox([-5.4, 9.5, 12.4, -2.3], false);
            board.fullUpdate();
        }));
        const boxes = graph.labelBoxes();
        const [left, top] = board.getBoundingBox();
        const texts = (Object.values(board.objects) as Array<{elType: string}>).filter(o => o.elType === 'text') as unknown as Array<{plaintext: string; visPropCalc: {visible: boolean}; X(): number; visProp: Record<string, unknown>; evalVisProp(name: string): unknown}>;
        let left_of = 0, right_of = 0;
        graph.solution().result.vertices.forEach((v, i) => {
            const box = boxes[`v${i}`];
            expect(box, `v${i} has a box`).toBeDefined();
            const ax = (v.x.toNumber() - left) * board.unitX;
            const text = texts.find(o => o.visPropCalc.visible && o.plaintext === `(${v.x.toNumber()}; ${v.y.toNumber()})`);
            expect(text, `text of v${i}`).toBeDefined();
            const drawnX = (text!.X() - left) * board.unitX;
            if (box.x1 <= ax) {
                left_of++;
                expect(text!.evalVisProp('anchorx')).toBe('right');
                expect(drawnX).toBeCloseTo(box.x1, 3);
            } else if (box.x0 >= ax) {
                right_of++;
                expect(text!.evalVisProp('anchorx')).toBe('left');
                expect(drawnX).toBeCloseTo(box.x0, 3);
            }
        });
        expect(left_of, 'a vertex label lies left of its vertex').toBeGreaterThan(0);
        expect(right_of, 'a vertex label lies right of its vertex').toBeGreaterThan(0);
        void top;
    });

    it('a constraint name sits inside the board on its line, not past the window', () => {
        const graph = mountProbe();
        act(() => runAs('learner', () => { graph.importPresetData([['LinearProgram', DEFAULT_LP_STATE]]); }));
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
