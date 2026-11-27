import React from 'react';
import {render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {runAs} from '../base/writes/writeSource';
import {setLanguage} from '../../localization';
import {ComplexPowerGraph} from './ComplexPowerGraph';
import {EulerCircleGraph} from './EulerCircleGraph';

beforeAll(installBoardShims);
afterEach(() => setLanguage('sl'));

class PowerGraph extends ComplexPowerGraph { liveBoard() { return this.board; } resetView() { this.showInitialView(); } }
class EulerGraph extends EulerCircleGraph { liveBoard() { return this.board; } resetView() { runAs('learner', () => this.showInitialView()); } }

/** Boards of the given size from their creation on (the shims give every element 600 x 400 px). */
function withSize(width: number, height: number, run: () => void) {
    const names = [['clientWidth', width, 600], ['offsetWidth', width, 600], ['clientHeight', height, 400], ['offsetHeight', height, 400]] as const;
    for (const [name, size] of names) Object.defineProperty(HTMLElement.prototype, name, {configurable: true, get: () => size});
    HTMLElement.prototype.getBoundingClientRect = () => ({x: 0, y: 0, left: 0, top: 0, right: width, bottom: height, width, height, toJSON: () => ({})}) as DOMRect;
    try { run(); } finally {
        for (const [name, , size] of names) Object.defineProperty(HTMLElement.prototype, name, {configurable: true, get: () => size});
        HTMLElement.prototype.getBoundingClientRect = () => ({x: 0, y: 0, left: 0, top: 0, right: 600, bottom: 400, width: 600, height: 400, toJSON: () => ({})}) as DOMRect;
    }
}

function mountWith<G extends PowerGraph | EulerGraph>(graph: G) { render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>); return graph; }

describe('the first view of a 390 px board is the view Reset shows', () => {
    for (const [name, make] of [['complex power', () => new PowerGraph()], ['Euler circle', () => new EulerGraph()]] as const) {
        test(name, () => {
            withSize(390, 480, () => {
                const graph = mountWith(make());
                const loaded = graph.liveBoard().getBoundingBox();
                graph.resetView();
                const reset = graph.liveBoard().getBoundingBox();
                loaded.forEach((value, index) => expect(value).toBeCloseTo(reset[index], 6));
            });
        });
    }
});

describe('the opening view follows the board size while it is unmoved', () => {
    class FakeObserver {
        static all: FakeObserver[] = [];
        constructor(public callback: (entries: unknown[]) => void) { FakeObserver.all.push(this); }
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

    for (const [name, make] of [['complex power', () => new PowerGraph()], ['Euler circle', () => new EulerGraph()]] as const) {
        test(`${name}: a size change shows the exact window again, a moved view stays`, () => {
            vi.useFakeTimers();
            FakeObserver.all = [];
            vi.stubGlobal('ResizeObserver', FakeObserver);
            withSize(390, 480, () => {
                const graph = mountWith(make());
                const board = graph.liveBoard();
                const stale = () => board.getBoundingBox();
                const settle = () => { for (const observer of FakeObserver.all) { try { observer.callback([]); } catch { /* the board's own observers read entries */ } } vi.advanceTimersByTime(200); };
                const exactBox = () => { graph.resetView(); return board.getBoundingBox(); };
                // The layout finishes after the first frame: the board is lower now and the box shown for the old size is stale.
                const resizeKeepingCentre = (height: number, scale: number) => {
                    const [x0, y0, x1, y1] = board.getBoundingBox();
                    runAs('learner', () => board.resizeContainer(390, height, false, true));
                    const half = ((y0 - y1) / 2) * scale;
                    runAs('learner', () => board.setBoundingBox([x0, (y0 + y1) / 2 + half, x1, (y0 + y1) / 2 - half], false));
                };
                resizeKeepingCentre(300, 0.8);
                const before = stale();
                settle();
                const afterSettle = board.getBoundingBox();
                const exact = exactBox();
                expect(before.some((value, index) => Math.abs(value - exact[index]) > 1e-3), 'the box shown for the old size is stale').toBe(true);
                afterSettle.forEach((value, index) => expect(value).toBeCloseTo(exact[index], 6));
                // A view the user moved is left alone.
                runAs('learner', () => board.setBoundingBox([exact[0] + 1, exact[1] + 1, exact[2] + 1, exact[3] + 1], true));
                const moved = board.getBoundingBox();
                resizeKeepingCentre(340, 0.9);
                settle();
                const kept = board.getBoundingBox();
                expect(kept[0]).toBeCloseTo(moved[0], 6);
            });
        });
    }
});
