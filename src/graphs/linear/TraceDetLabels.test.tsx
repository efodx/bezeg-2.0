import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {setLanguage, t} from '../../localization';
import type {PxBox} from '../legend/boardLabelPlacement';
import {nameBox, tickStrips} from '../legend/pointNamePlacement';
import {LinearMapGraph} from './LinearMapGraph';

// A lesson board at 1440 px is about 880 x 600.
beforeAll(() => {
    installBoardShims();
    for (const [name, size] of [['clientWidth', 880], ['clientHeight', 600], ['offsetWidth', 880], ['offsetHeight', 600]] as const) Object.defineProperty(HTMLElement.prototype, name, {configurable: true, value: size});
});
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => setLanguage('sl'));

class Probe extends LinearMapGraph {
    liveBoard() { return this.board; }
    act(action: object) { this.applyLinearMapAction(action as never); }
    handle() { return this.traceDetHandle!; }
    fontPx() { return this.displaySettings.fontSize; }
}

type Evented = JXG.Point & {triggerEventHandlers(names: string[], args: unknown[]): void};
type Shown = {elType: string; plaintext?: string; X: () => number; Y: () => number; evalVisProp(name: string): unknown};

const overlaps = (a: PxBox, b: PxBox) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

function mount() {
    const graph = new Probe();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    act(() => { graph.act({kind: 'linear-map', operation: 'set-mode', mode: 'tracedet'}); });
    return graph;
}

function drag(graph: Probe, x: number, y: number) {
    act(() => { graph.handle().setPosition(JXG.COORDS_BY_USER, [x, y]); (graph.handle() as Evented).triggerEventHandlers(['drag'], []); });
}

/** The box of the triangle's name (as anchored), of the handle's label (above and right of the handle, `pointLabel`'s offsets) and the handle marker. */
function measure(graph: Probe) {
    const board = graph.liveBoard();
    const [left, top] = board.getBoundingBox();
    const toPx = (x: number, y: number) => [(x - left) * board.unitX, (top - y) * board.unitY] as const;
    const fontPx = graph.fontPx();
    const text = (board.objectsList as unknown as Shown[]).find(o => o.elType === 'text' && o.plaintext === t('linear_map_area_triangle'))!;
    expect(text, 'the triangle name exists').toBeDefined();
    const {w, h} = nameBox(t('linear_map_area_triangle'), fontPx);
    const [cx, cy] = toPx(text.X(), text.Y());
    const vertical = String(text.evalVisProp('anchory'));
    const y0 = vertical === 'bottom' ? cy - h : vertical === 'top' ? cy : cy - h / 2;
    const name: PxBox = {x0: cx - w / 2, y0, x1: cx + w / 2, y1: y0 + h};
    const [hx, hy] = toPx(graph.handle().X(), graph.handle().Y());
    const label = nameBox('(τ, δ)', fontPx);
    const bottom = hy - 0.55 * fontPx * 1.1;
    const handleLabel: PxBox = {x0: hx + 6.6 * 1.1, y0: bottom - label.h, x1: hx + 6.6 * 1.1 + label.w, y1: bottom};
    const r = Number(graph.handle().evalVisProp('size')) + 1;
    const marker: PxBox = {x0: hx - r, y0: hy - r, x1: hx + r, y1: hy + r};
    return {board, name, handleLabel, marker, ticks: tickStrips(board)};
}

function expectClear(graph: Probe, where: string) {
    const {board, name, handleLabel, marker, ticks} = measure(graph);
    expect.soft(name.x0 >= 0 && name.y0 >= 0 && name.x1 <= board.canvasWidth && name.y1 <= board.canvasHeight, `${where}: the name leaves the board`).toBe(true);
    expect.soft(overlaps(name, handleLabel), `${where}: the name lies on the handle's label`).toBe(false);
    expect.soft(overlaps(name, marker), `${where}: the name covers the handle`).toBe(false);
    ticks.forEach((tick, i) => expect.soft(overlaps(name, tick), `${where}: the name covers the tick ${i}`).toBe(false));
}

describe('the trace-determinant plane: the triangle name', () => {
    it('clears the handle, its label and the axis numbers in the lesson frame and in a second constellation', () => {
        const graph = mount();
        expectClear(graph, 'opening frame');
        drag(graph, -3, 2);
        expectClear(graph, 'outside the triangle');
    });

    it('never meets the handle label while the handle is dragged through the triangle', () => {
        const graph = mount();
        const path: Array<[number, number]> = [];
        for (let i = 0; i <= 12; i++) path.push([-2 + (4 * i) / 12, 1 - Math.abs(-2 + (4 * i) / 12) * 0.5 - 0.05 * (i % 3)]);
        path.push([0, 0.9], [1.5, 0.95], [-1.5, 0.95], [0.5, 1.4]);
        for (const [x, y] of path) {
            drag(graph, x, y);
            expectClear(graph, `handle at (${x.toFixed(2)}, ${y.toFixed(2)})`);
        }
    });
});
