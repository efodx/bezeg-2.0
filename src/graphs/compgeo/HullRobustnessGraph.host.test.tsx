import React from 'react';
import {act, fireEvent, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {HullRobustnessGraph, HullRobustnessGraphState} from './HullRobustnessGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {PointSetModel} from '../../compgeo/pointSetModel';
import {kettnerSignMap} from '../../compgeo/inexactOrientation';
import {setLanguage, t} from '../../localization';
import {UnsupportedLessonActionError} from '../../learning/model';
import {GraphPalette} from '../styles/GraphPalette';
import {kettnerSvg} from './kettnerBoard';
import {AnimationScheduler} from '../../learning/runtime/animation';
import {HULL_TRACE_STEP_INTERVAL_MS} from './HullTraceGraph';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

class Observed extends HullRobustnessGraph {
    liveBoard() { return this.board; }
    boardAlive() { return this.hasBoard; }
    swap(next: HullRobustnessGraphState) { this.replaceState(next); }
}

type Shown = {elType: string; name?: string; id: string; visProp?: {visible?: boolean}};
/** The board's objects without the axis ticks and their labels, whose number follows the visible box and not the scene. */
const objects = (graph: Observed) => (graph.liveBoard().objectsList as Shown[]).filter(o => !/_ticks_/.test(o.id) && o.elType !== 'ticks');
const named = (graph: Observed, name: string) => objects(graph).filter(o => o.name === name);
const chainPoints = (graph: Observed) => objects(graph).filter(o => o.elType === 'point' && /^P\d+$/.test(o.name ?? ''));
const chainCurves = (graph: Observed) => objects(graph).filter(o => o.elType === 'curve');
const kettnerObjects = (graph: Observed) => objects(graph).filter(o => /^kettner-/.test(o.name ?? ''));

const mount = (graph: Observed) => render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
const part = (name: string) => document.querySelector(`[data-hull-robustness="${name}"]`)?.textContent;
const trace = (name: string) => document.querySelector(`[data-hull-trace="${name}"]`)?.textContent;
const button = (action: string) => document.querySelector(`button[data-action="${action}"]`) as HTMLButtonElement;
const click = (action: string) => act(() => { fireEvent.click(button(action)); });
const choose = (group: string, nth: number, value: string) => act(() => {
    const select = document.querySelectorAll(`[data-hull-robustness="${group}"] select`)[nth] as HTMLSelectElement;
    fireEvent.change(select, {target: {value}});
});
const model = (points: Array<[number, number]>): PointSetModel => ({mode: 'points', closed: false, gridStepExponent: 0, points: points.map(([x, y]) => ({x, y}))});
const load = (graph: Observed, next: PointSetModel) => act(() => { graph.loadModel(next); });
/** Steps a trace to its end and returns the output hull; a missing hull fails the test. */
const finish = (graph: Observed): readonly number[] => {
    for (let i = 0; i < graph.run().length + 1; i++) if (!graph.run().view(graph.step).done) click('next-step');
    const view = graph.run().view(graph.step);
    if (!view.done || !view.hull) throw new Error('the trace did not finish with a hull');
    return view.hull;
};
const setMode = (mode: string) => choose('mode', 0, mode);
/** A board press at the given board coordinates (the pointer-to-board conversion is stubbed, jsdom has no layout). */
const pressBoardAt = (graph: Observed, x: number, y: number) => act(() => {
    const board = graph.liveBoard();
    vi.spyOn(board, 'getUsrCoordsOfMouse').mockReturnValue([x, y]);
    (board as unknown as {triggerEventHandlers(names: string[], args: unknown[]): void}).triggerEventHandlers(['down'], [{}]);
});
const boxWidth = (graph: Observed) => { const [left, , right] = graph.liveBoard().getBoundingBox(); return right - left; };
const ariaLabel = (graph: Observed) => (graph.liveBoard().containerObj as HTMLElement).getAttribute('aria-label');
const cellMap = kettnerSignMap();
const sign = (n: number) => n > 0 ? '+' : n < 0 ? '−' : '0';

describe('chain mode', () => {
    test('the default scene is sample 1 with 9 points, the rule named, and the output pending', () => {
        const graph = new Observed();
        mount(graph);
        expect(graph.robustnessMode).toBe('chain');
        expect(chainPoints(graph)).toHaveLength(9);
        expect(kettnerObjects(graph)).toHaveLength(0);
        expect(part('rule')).toMatch(/≤ 0/);
        expect(part('output-pending')).toBeTruthy();
        expect(document.querySelector('[data-hull-trace="algorithm"]')).toBeNull();
    });

    test('sample 1: (2,0) is dropped under <= and kept under <; (2,5) is on the hull either way', () => {
        const graph = new Observed();
        mount(graph);
        const dropped = finish(graph);
        expect(dropped).not.toContain(7);
        expect(dropped).toContain(4);
        expect(part('output')).not.toMatch(/P8/);
        choose('rules', 0, 'right');
        expect(graph.popRule).toBe('right');
        expect(graph.step).toBe(0);
        expect(part('rule')).toMatch(/< 0/);
        expect(part('rule')).not.toMatch(/≤/);
        const kept = finish(graph);
        expect(kept).toContain(7);
        expect(kept).toContain(4);
        expect(kept.length).toBe(dropped.length + 1);
        expect(part('output')).toMatch(/P8/);
        expect(part('output')).toMatch(/P5/);
    });

    test('three collinear points under < list the middle point twice, and the readout says so', () => {
        const graph = new Observed();
        mount(graph);
        load(graph, model([[0, 0], [1, 1], [2, 2]]));
        choose('rules', 0, 'right');
        expect(finish(graph)).toEqual([0, 1, 2, 1]);
        expect(part('repeated')).toBeTruthy();
        choose('rules', 0, 'non-left');
        expect(finish(graph)).toEqual([0, 2]);
        expect(part('repeated')).toBeUndefined();
    });

    test('a duplicate appears on both chains under < with keep, and once under merge', () => {
        const graph = new Observed();
        mount(graph);
        load(graph, model([[0, 0], [2, 0], [2, 0], [1, 2]]));
        choose('rules', 0, 'right');
        const merged = finish(graph);
        choose('rules', 1, 'keep');
        expect(graph.duplicateRule).toBe('keep');
        expect(graph.step).toBe(0);
        const kept = finish(graph);
        const copies = (hull: readonly number[]) => hull.filter(i => i === 1 || i === 2).length;
        expect(copies(kept)).toBeGreaterThan(copies(merged));
        expect(part('repeated')).toBeTruthy();
        expect(part('rule')).toMatch(/< 0/);
    });

    test('a pop-rule change pauses a running playback, returns to step 0 and redraws the board', () => {
        const graph = new Observed();
        mount(graph);
        click('next-step');
        click('next-step');
        click('next-step');
        expect(graph.step).toBe(3);
        act(() => { graph.play(); });
        expect(graph.isPlaying).toBe(true);
        choose('rules', 0, 'right');
        expect(graph.popRule).toBe('right');
        expect(graph.isPlaying).toBe(false);
        expect(graph.step).toBe(0);
        expect(chainPoints(graph)).toHaveLength(9);
        expect(trace('step')).toBeTruthy();
    });

    test('a duplicates-rule change pauses a running playback and returns to step 0', () => {
        const graph = new Observed();
        mount(graph);
        click('next-step');
        click('next-step');
        act(() => { graph.play(); });
        expect(graph.isPlaying).toBe(true);
        expect(graph.step).toBe(2);
        choose('rules', 1, 'keep');
        expect(graph.duplicateRule).toBe('keep');
        expect(graph.isPlaying).toBe(false);
        expect(graph.step).toBe(0);
    });

    test('Reset returns to step 0 and keeps the chosen rules', () => {
        const graph = new Observed();
        mount(graph);
        choose('rules', 0, 'right');
        click('next-step');
        click('next-step');
        click('reset');
        expect(graph.step).toBe(0);
        expect(graph.popRule).toBe('right');
        expect(part('rule')).toMatch(/< 0/);
    });

    test('this graph runs the monotone chain only: another algorithm is refused', () => {
        const graph = new Observed();
        mount(graph);
        expect(() => graph.setAlgorithm('gift-wrapping')).toThrow(UnsupportedLessonActionError);
        expect(graph.algorithm).toBe('monotone-chain');
    });
});

describe('Kettner mode', () => {
    test('switching to Kettner disposes the chain objects and draws exactly the three map objects; back restores the chain', () => {
        const graph = new Observed();
        mount(graph);
        const chainTotal = objects(graph).length;
        click('next-step');
        click('next-step');
        const steppedTotal = objects(graph).length;
        setMode('kettner');
        expect(graph.robustnessMode).toBe('kettner');
        expect(chainPoints(graph)).toHaveLength(0);
        expect(chainCurves(graph)).toHaveLength(0);
        expect(named(graph, 'kettner-image')).toHaveLength(1);
        expect(named(graph, 'kettner-cell')).toHaveLength(1);
        expect(named(graph, 'kettner-title')).toHaveLength(1);
        expect(kettnerObjects(graph)).toHaveLength(3);
        const kettnerTotal = objects(graph).length;
        expect(kettnerTotal).toBeLessThan(chainTotal);
        setMode('chain');
        expect(kettnerObjects(graph)).toHaveLength(0);
        expect(chainPoints(graph)).toHaveLength(9);
        expect(graph.step).toBe(2);
        expect(objects(graph).length).toBe(steppedTotal);
        setMode('kettner');
        expect(objects(graph).length).toBe(kettnerTotal);
        setMode('chain');
        click('reset');
        expect(objects(graph).length).toBe(chainTotal);
    });

    test('the selected cell defaults to (41, 48) and its readout equals the sign map', () => {
        const graph = new Observed();
        mount(graph);
        setMode('kettner');
        expect(graph.kettnerCell).toEqual({i: 41, j: 48});
        const at = (i: number, j: number) => cellMap.cells[j * 64 + i];
        for (const [i, j] of [[41, 48], [0, 0], [63, 63], [10, 20], [5, 63]] as const) {
            act(() => { graph.selectKettnerCell(i, j); });
            const cell = at(i, j);
            expect(cell.i).toBe(i);
            expect(cell.j).toBe(j);
            expect(part('cell-title')).toContain(`${i}`);
            expect(part('cell-title')).toContain(`${j}`);
            expect(part('cell-exact')).toContain(sign(cell.exact));
            expect(part('cell-naive-sign')).toContain(sign(cell.naive));
            expect(named(graph, 'kettner-cell')).toHaveLength(1);
        }
        act(() => { graph.selectKettnerCell(41, 48); });
        expect(cellMap.cells[48 * 64 + 41].exact).toBe(1);
        expect(cellMap.cells[48 * 64 + 41].naive).toBe(-1);
        expect(part('cell-exact')).toContain('+');
        expect(part('cell-naive-sign')).toContain('−');
        expect(part('cell-naive-value')).toMatch(/5[,.]68/);
    });

    test('the counts 112 and 2052 are shown', () => {
        const graph = new Observed();
        mount(graph);
        setMode('kettner');
        expect(cellMap.wrongSign).toBe(112);
        expect(cellMap.falseZero).toBe(2052);
        expect(part('counts-text')).toContain('112');
        expect(part('counts-text')).toContain('2052');
        expect(part('counts-text')).toContain('4096');
    });

    test('every rendered string for a double result carries the inexact label, in Slovenian and in English', () => {
        const graph = new Observed();
        mount(graph);
        setMode('kettner');
        const naive = () => ['cell-naive-sign', 'cell-naive-value'].map(part);
        for (const text of naive()) expect(text).toMatch(/nenatanč/i);
        expect(part('panel')).toMatch(/nenatanč/i);
        const kinds = new Set<string>();
        for (const cell of cellMap.cells) {
            const kind = cell.naive === cell.exact ? 'agree' : cell.naive === 0 ? 'zero' : 'wrong';
            if (kinds.has(kind)) continue;
            kinds.add(kind);
            act(() => { graph.selectKettnerCell(cell.i, cell.j); });
            for (const text of naive()) expect(text).toMatch(/nenatanč/i);
        }
        expect(kinds.size).toBe(3);
        act(() => { setLanguage('en'); });
        for (const text of naive()) expect(text).toMatch(/inexact/i);
        expect(part('panel')).toMatch(/inexact/i);
        expect(part('cell-naive-value')).not.toMatch(/nenatanč/i);
    });

    test('no point exists or can be added in Kettner mode, not even by a board press in add mode', () => {
        const graph = new Observed();
        mount(graph);
        act(() => { graph.setAddMode(true); });
        expect(graph.isAddMode).toBe(true);
        setMode('kettner');
        expect(graph.isAddMode).toBe(false);
        act(() => { graph.setAddMode(true); });
        expect(graph.isAddMode).toBe(false);
        expect(chainPoints(graph)).toHaveLength(0);
        const before = graph.model.points.length;
        pressBoardAt(graph, 2.5, 2.5);
        expect(graph.model.points).toHaveLength(before);
        expect(chainPoints(graph)).toHaveLength(0);
    });

    test('Play and Next step do nothing in the Kettner view: no timer runs on the hidden chain', () => {
        const graph = new Observed();
        mount(graph);
        click('next-step');
        setMode('kettner');
        expect(graph.step).toBe(1);
        act(() => { graph.play(); });
        expect(graph.isPlaying).toBe(false);
        act(() => { graph.nextStep(); });
        expect(graph.step).toBe(1);
        expect(graph.isPlaying).toBe(false);
        setMode('chain');
        act(() => { graph.nextStep(); });
        expect(graph.step).toBe(2);
        act(() => { graph.play(); });
        expect(graph.isPlaying).toBe(true);
        act(() => { graph.pause(); });
    });

    test('a board press selects the cell under it; a press outside 0..63 is ignored', () => {
        const graph = new Observed();
        mount(graph);
        setMode('kettner');
        pressBoardAt(graph, 10.7, 20.2);
        expect(graph.kettnerCell).toEqual({i: 10, j: 20});
        expect(part('cell-title')).toContain('i = 10');
        pressBoardAt(graph, 63.99, 0.01);
        expect(graph.kettnerCell).toEqual({i: 63, j: 0});
        for (const [x, y] of [[-0.2, 5], [64.1, 5], [5, -0.2], [5, 64.1]] as const) {
            pressBoardAt(graph, x, y);
            expect(graph.kettnerCell).toEqual({i: 63, j: 0});
        }
        setMode('chain');
        pressBoardAt(graph, 5.5, 5.5);
        expect(graph.kettnerCell).toEqual({i: 63, j: 0});
    });

    test('the selected-cell readout is one live status line; the detail lines are not live and no heading is skipped', () => {
        const graph = new Observed();
        mount(graph);
        setMode('kettner');
        const live = document.querySelectorAll('[data-hull-robustness="cell"] [role="status"], [data-hull-robustness="cell"][aria-live], [data-hull-robustness="cell"] [aria-live]');
        expect(live).toHaveLength(1);
        expect(live[0].getAttribute('data-hull-robustness')).toBe('cell-title');
        expect(live[0].textContent).toMatch(/i = 41.*j = 48/);
        expect(live[0].textContent).toContain('+');
        expect(live[0].textContent).toContain('−');
        expect(live[0].textContent).toMatch(/nenatanč/i);
        expect(document.querySelector('[data-hull-robustness="cell"] :is(h1, h2, h3, h4)')).toBeNull();
    });

    test('the selection outline differs from the mismatch frame by colour, not only by width', () => {
        const graph = new Observed();
        mount(graph);
        setMode('kettner');
        const outline = named(graph, 'kettner-cell')[0] as unknown as {borders: Array<{visProp: {strokecolor: string}}>};
        const colour = outline.borders[0].visProp.strokecolor.toLowerCase();
        expect(colour).toBe(GraphPalette.primaryCurve);
        expect(colour).not.toBe(GraphPalette.selectedControlPointOutline);
        expect(kettnerSvg('inexact')).toContain(GraphPalette.selectedControlPointOutline);
        expect(kettnerSvg('inexact')).not.toContain(GraphPalette.primaryCurve);
    });

    test('arrow keys on the board move the selected cell and clamp at the edge', () => {
        const graph = new Observed();
        mount(graph);
        setMode('kettner');
        const container = graph.liveBoard().containerObj as HTMLElement;
        const press = (key: string) => act(() => { fireEvent.keyDown(container, {key}); });
        press('ArrowRight');
        press('ArrowUp');
        expect(graph.kettnerCell).toEqual({i: 42, j: 49});
        press('ArrowLeft');
        press('ArrowDown');
        press('ArrowDown');
        expect(graph.kettnerCell).toEqual({i: 41, j: 47});
        act(() => { graph.selectKettnerCell(63, 0); });
        press('ArrowRight');
        press('ArrowDown');
        expect(graph.kettnerCell).toEqual({i: 63, j: 0});
        expect(part('cell-title')).toContain('63');
    });

    test('the panel toggle swaps the image and keeps one image on the board', () => {
        const graph = new Observed();
        mount(graph);
        setMode('kettner');
        const first = named(graph, 'kettner-image')[0];
        choose('panel', 0, 'exact');
        expect(graph.kettnerPanel).toBe('exact');
        expect(named(graph, 'kettner-image')).toHaveLength(1);
        expect(named(graph, 'kettner-image')[0]).not.toBe(first);
        expect(kettnerObjects(graph)).toHaveLength(3);
        expect(part('cell-naive-sign')).toMatch(/nenatanč/i);
    });
});

describe('scene change, language and lifecycle', () => {
    test('a lesson checkpoint restores the mode, rules and cell, and the board matches', () => {
        const graph = new Observed();
        mount(graph);
        const capabilities = graph.getLessonCapabilities();
        choose('rules', 0, 'right');
        const chain = capabilities.captureState();
        setMode('kettner');
        act(() => { graph.selectKettnerCell(3, 4); });
        const kettner = capabilities.captureState();
        act(() => { capabilities.restoreState(chain); });
        expect(graph.robustnessMode).toBe('chain');
        expect(graph.popRule).toBe('right');
        expect(kettnerObjects(graph)).toHaveLength(0);
        expect(chainPoints(graph)).toHaveLength(9);
        expect(part('rule')).toMatch(/< 0/);
        act(() => { capabilities.restoreState(kettner); });
        expect(graph.robustnessMode).toBe('kettner');
        expect(graph.kettnerCell).toEqual({i: 3, j: 4});
        expect(chainPoints(graph)).toHaveLength(0);
        expect(kettnerObjects(graph)).toHaveLength(3);
        expect(part('cell-title')).toContain('3');
        expect(part('rule')).toBeUndefined();
    });

    test('replacing the model keeps the Kettner view consistent and the chain recomputed after a return', () => {
        const graph = new Observed();
        mount(graph);
        setMode('kettner');
        load(graph, model([[0, 0], [3, 0], [3, 3]]));
        expect(kettnerObjects(graph)).toHaveLength(3);
        expect(chainPoints(graph)).toHaveLength(0);
        setMode('chain');
        expect(chainPoints(graph)).toHaveLength(3);
        expect(kettnerObjects(graph)).toHaveLength(0);
        expect(finish(graph)).toHaveLength(3);
    });

    test('a language switch updates the readout, the title and the board label in both views and keeps the board objects', () => {
        const graph = new Observed();
        mount(graph);
        const slovenian = part('rule');
        expect(ariaLabel(graph)).toBe(t('pointset_board_label'));
        act(() => { setLanguage('en'); });
        expect(part('rule')).not.toBe(slovenian);
        expect(part('rule')).toMatch(/≤ 0/);
        expect(ariaLabel(graph)).toBe(t('pointset_board_label'));
        expect(ariaLabel(graph)).toMatch(/^Points on a grid/);
        setMode('kettner');
        expect(part('cell-naive-sign')).toMatch(/inexact/i);
        expect(kettnerObjects(graph)).toHaveLength(3);
        const title = () => (named(graph, 'kettner-title')[0] as unknown as {plaintext: string}).plaintext;
        expect(title()).toBe('Inexact (double)');
        expect(ariaLabel(graph)).toBe('Orientation sign map, Inexact (double): 64 × 64 cells, i horizontal, j vertical. Selected cell: i = 41, j = 48. The arrow keys select a cell.');
        act(() => { setLanguage('sl'); });
        expect(part('cell-naive-sign')).toMatch(/nenatanč/i);
        expect(kettnerObjects(graph)).toHaveLength(3);
        expect(title()).toBe('Nenatančno (double)');
        expect(ariaLabel(graph)).toBe('Zemljevid predznakov orientacije, Nenatančno (double): 64 × 64 celic, vodoravno i, navpično j. Izbrana celica: i = 41, j = 48. Puščične tipke izberejo celico.');
    });

    test('the board label follows the panel and the selected cell, and the chain label returns with the chain view', () => {
        const graph = new Observed();
        mount(graph);
        setMode('kettner');
        act(() => { graph.selectKettnerCell(7, 9); });
        expect(ariaLabel(graph)).toContain('Nenatančno (double)');
        expect(ariaLabel(graph)).toContain('i = 7, j = 9');
        choose('panel', 0, 'exact');
        expect(ariaLabel(graph)).toContain('Natančno:');
        expect(ariaLabel(graph)).not.toContain('Nenatančno');
        expect(ariaLabel(graph)).toContain('i = 7, j = 9');
        setMode('chain');
        expect(ariaLabel(graph)).toBe(t('pointset_board_label'));
    });

    test('a mode change by a restored checkpoint or a replaced state shows that mode\'s view', () => {
        const graph = new Observed();
        mount(graph);
        const capabilities = graph.getLessonCapabilities();
        const chainWidth = boxWidth(graph);
        const chain = capabilities.captureState();
        setMode('kettner');
        const kettner = capabilities.captureState();
        const kettnerWidth = boxWidth(graph);
        expect(kettnerWidth).toBeGreaterThan(chainWidth * 4);
        act(() => { capabilities.restoreState(chain); });
        expect(graph.robustnessMode).toBe('chain');
        expect(boxWidth(graph)).toBeCloseTo(chainWidth, 3);
        act(() => { capabilities.restoreState(kettner); });
        expect(graph.robustnessMode).toBe('kettner');
        expect(boxWidth(graph)).toBeCloseTo(kettnerWidth, 3);
        act(() => { graph.swap({...graph.getInitialState(), mode: 'chain'}); });
        expect(graph.robustnessMode).toBe('chain');
        expect(boxWidth(graph)).toBeCloseTo(chainWidth, 3);
        act(() => { graph.swap({...graph.getInitialState(), mode: 'kettner'}); });
        expect(boxWidth(graph)).toBeCloseTo(kettnerWidth, 3);
    });

    test('unmount leaves no board and no key listener acting on the graph', () => {
        const graph = new Observed();
        const view = mount(graph);
        setMode('kettner');
        const container = graph.liveBoard().containerObj as HTMLElement;
        view.unmount();
        expect(graph.boardAlive()).toBe(false);
        act(() => { fireEvent.keyDown(container, {key: 'ArrowRight'}); });
        expect(graph.kettnerCell).toEqual({i: 41, j: 48});
    });
});

test('Next step to the end and Play to the end give the same nonempty final chain, hull and status', () => {
    const snapshot = (graph: Observed) => ({
        step: graph.step, status: ['step', 'note'].map(part), points: chainPoints(graph).map(o => o.name),
        curves: chainCurves(graph).length, hull: graph.run().view(graph.step).hull,
    });
    const byNext = new Observed();
    const first = mount(byNext);
    finish(byNext);
    const expected = snapshot(byNext);
    first.unmount();
    expect(expected.step).toBe(byNext.run().length - 1);
    expect(expected.hull?.length).toBeGreaterThan(0);

    let nextHandle = 0;
    let time = 0;
    const callbacks = new Map<number, FrameRequestCallback>();
    const scheduler: AnimationScheduler = {
        request: callback => {const handle = nextHandle++; callbacks.set(handle, callback); return handle;},
        cancel: handle => {callbacks.delete(handle);},
    };
    const frame = (elapsed: number) => {
        const entry = callbacks.entries().next().value as [number, FrameRequestCallback] | undefined;
        if (!entry) return;
        callbacks.delete(entry[0]);
        time += elapsed;
        act(() => { entry[1](time); });
    };
    const byPlay = new Observed({}, scheduler);
    mount(byPlay);
    click('play-pause');
    frame(0);
    for (let i = 0; i < byPlay.run().length + 5; i++) frame(HULL_TRACE_STEP_INTERVAL_MS);
    expect(snapshot(byPlay)).toEqual(expected);
    expect(byPlay.isPlaying).toBe(false);
});
