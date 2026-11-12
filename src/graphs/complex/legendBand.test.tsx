import React from 'react';
import {render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {setLanguage} from '../../localization';
import {legendLines} from '../legend/legendLines';
import {ComplexPowerGraph, VIEW_BOX as POWER_BOX} from './ComplexPowerGraph';
import {EulerCircleGraph} from './EulerCircleGraph';

beforeAll(installBoardShims);
afterEach(() => setLanguage('sl'));

class PowerGraph extends ComplexPowerGraph { liveBoard() { return this.board; } resetView() { this.showInitialView(); } }
class EulerGraph extends EulerCircleGraph { liveBoard() { return this.board; } resetView() { this.showInitialView(); } }

type Text = {elType: string; plaintext?: string; X(): number; Y(): number; evalVisProp(name: string): unknown};

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

function legendRows(board: JXG.Board): Text[] {
    const [left] = board.getBoundingBox();
    const edge = left + 10 / board.unitX;
    return (board.objectsList as unknown as Text[])
        .filter(o => o.elType === 'text' && o.evalVisProp('visible') && o.evalVisProp('anchory') === 'top' && o.evalVisProp('anchorx') === 'left'
            && Math.abs(o.X() - edge) < 1e-6)
        .sort((a, b) => b.Y() - a.Y());
}

function expectStacked(board: JXG.Board, minRows: number, width: number, dataBottom: number) {
    const rows = legendRows(board);
    expect(rows.length).toBeGreaterThanOrEqual(minRows);
    expect(rows[0].Y()).toBeLessThan(dataBottom);
    for (let i = 0; i + 1 < rows.length; i++) {
        const gapPx = (rows[i].Y() - rows[i + 1].Y()) * board.unitY;
        expect(gapPx, String(rows[i].plaintext)).toBeGreaterThanOrEqual((legendLines(String(rows[i].plaintext), width) === 1 ? 14 : legendLines(String(rows[i].plaintext), width) * 20) - 0.5);
    }
    return rows;
}

function mountWith<G extends PowerGraph | EulerGraph>(graph: G) { render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>); return graph; }
const mountPower = () => mountWith(new PowerGraph()).liveBoard();
const mountEuler = () => mountWith(new EulerGraph()).liveBoard();

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

describe('the legend of the complex power graph sits at the live board edge below the data and stacks by wrapped lines', () => {
    test('on a wide board the rows start at its left edge, not at the user x of the first view', () => {
        withSize(1000, 400, () => {
            const board = mountPower();
            expect(board.getBoundingBox()[0]).toBeLessThan(POWER_BOX[0]);
            expectStacked(board, 4, 1000, -2.6);
        });
    });
    for (const language of ['sl', 'en'] as const) {
        test(`on a 390 px board the rows start at the left edge below the data (${language})`, () => {
            setLanguage(language);
            withSize(390, 480, () => {
                expectStacked(mountPower(), 4, 390, -2.6);
            });
        });
    }
    test('a row that wraps on a 160 px board leaves room for its lines', () => {
        withSize(160, 480, () => {
            const rows = expectStacked(mountPower(), 4, 160, -2.6);
            expect(rows.some(row => legendLines(String(row.plaintext), 160) > 1)).toBe(true);
        });
    });
});

describe('the legend of the Euler circle graph sits at the live board edge below the data and stacks by wrapped lines', () => {
    test('on a wide board the rows start at its left edge', () => {
        withSize(1000, 400, () => {
            const board = mountEuler();
            expect(board.getBoundingBox()[0]).toBeLessThan(-2.2);
            expectStacked(board, 3, 1000, -2.2);
        });
    });
    for (const language of ['sl', 'en'] as const) {
        test(`on a 390 px board the rows do not overlap (${language})`, () => {
            setLanguage(language);
            withSize(390, 480, () => {
                expectStacked(mountEuler(), 3, 390, -2.2);
            });
        });
    }
    test('a row that wraps on a 160 px board leaves room for its lines', () => {
        withSize(160, 480, () => {
            // At 160 px the wrapped rows are taller than the band beneath the circle, so the bottom-anchored stack reaches up to the circle's frame (-1.5), not into it.
            const rows = expectStacked(mountEuler(), 3, 160, -1.5);
            expect(rows.some(row => legendLines(String(row.plaintext), 160) > 1)).toBe(true);
        });
    });
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
                    board.resizeContainer(390, height, false, true);
                    const half = ((y0 - y1) / 2) * scale;
                    board.setBoundingBox([x0, (y0 + y1) / 2 + half, x1, (y0 + y1) / 2 - half], false);
                };
                resizeKeepingCentre(300, 0.8);
                const before = stale();
                settle();
                const afterSettle = board.getBoundingBox();
                const exact = exactBox();
                expect(before.some((value, index) => Math.abs(value - exact[index]) > 1e-3), 'the box shown for the old size is stale').toBe(true);
                afterSettle.forEach((value, index) => expect(value).toBeCloseTo(exact[index], 6));
                // A view the user moved is left alone.
                board.setBoundingBox([exact[0] + 1, exact[1] + 1, exact[2] + 1, exact[3] + 1], true);
                const moved = board.getBoundingBox();
                resizeKeepingCentre(340, 0.9);
                settle();
                const kept = board.getBoundingBox();
                expect(kept[0]).toBeCloseTo(moved[0], 6);
            });
        });
    }
});

describe('a vertical pan or a zoom keeps the legend rows in the band at the bottom edge of the board', () => {
    for (const [name, mount] of [['complex power', mountPower], ['Euler circle', mountEuler]] as const) {
        test(name, () => {
            withSize(600, 480, () => {
                const board = mount();
                const [left, top, right, bottom] = board.getBoundingBox();
                const heightPx = board.canvasHeight;
                const views: Array<[number, number, number, number]> = [
                    [left, top + 4, right, bottom + 4], [left, top - 3, right, bottom - 3],
                    [left / 2, top / 2, right / 2, bottom / 2], [left * 2, top * 2, right * 2, bottom * 2],
                ];
                for (const view of views) {
                    board.setBoundingBox(view, false);
                    board.update();
                    const rows = legendRows(board);
                    expect(rows.length).toBeGreaterThanOrEqual(3);
                    const live = board.getBoundingBox();
                    for (const row of rows) {
                        const above = (row.Y() - live[3]) * board.unitY;
                        expect(above, String(row.plaintext)).toBeGreaterThan(0);
                        expect(above, String(row.plaintext)).toBeLessThan(heightPx * 0.45);
                    }
                    for (let i = 0; i + 1 < rows.length; i++) expect((rows[i].Y() - rows[i + 1].Y()) * board.unitY).toBeGreaterThanOrEqual(13.5);
                }
            });
        });
    }
});
