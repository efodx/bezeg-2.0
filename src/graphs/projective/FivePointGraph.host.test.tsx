import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {FivePointGraph} from './FivePointGraph';
import {FIVE_POINT_EXAMPLES} from './fivePointModel';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {setLanguage} from '../../localization';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

class Observed extends FivePointGraph {
    liveBoard() { return this.board; }
}

type Shown = {elType: string; name?: string; X?: () => number; Y?: () => number; plaintext?: string; visPropCalc?: {visible?: boolean}};
const objects = (graph: Observed) => graph.liveBoard().objectsList as Shown[];
const named = (graph: Observed, elType: string, name: string) => objects(graph).filter(o => o.elType === elType && o.name === name);
const pointOf = (graph: Observed, name: string) => named(graph, 'point', name)[0] as unknown as JXG.Point;
const boardTexts = (graph: Observed) => objects(graph).filter(o => o.elType === 'text').map(o => o.plaintext ?? '');
const container = (graph: Observed) => graph.liveBoard().containerObj as HTMLElement;
const mount = (graph: Observed, strict = false) => {
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
};
const line = (name: string) => document.querySelector(`[data-projective-line="${name}"]`)?.textContent ?? '';
const status = () => document.querySelector('[data-projective-status]');
const trigger = (target: object, name: string, args: unknown[]): void => {
    if (!('triggerEventHandlers' in target) || typeof target.triggerEventHandlers !== 'function') throw new Error('Not a JSXGraph element.');
    const handlers: (names: string[], args: unknown[]) => void = target.triggerEventHandlers.bind(target);
    handlers([name], args);
};

test('the default scene draws A to E, P1, F1, F2, S and reads the weight and the deviation as text', () => {
    const graph = new Observed();
    mount(graph);
    expect(['A', 'B', 'C', 'D', 'E'].map(name => named(graph, 'point', name).length)).toEqual([1, 1, 1, 1, 1]);
    expect([pointOf(graph, 'A').X(), pointOf(graph, 'A').Y()]).toEqual([5, 0]);
    expect([pointOf(graph, 'D').X(), pointOf(graph, 'D').Y()]).toEqual([4, 1.8]);
    expect(['P₁', 'F₁', 'F₂', 'S'].map(name => named(graph, 'point', name).length)).toEqual([1, 1, 1, 1]);
    const p1 = pointOf(graph, 'P₁');
    expect([p1.X(), p1.Y()]).toEqual([5, 3]);
    expect(status()?.getAttribute('data-projective-status')).toBe('ok');
    expect(status()?.getAttribute('data-projective-stale')).toBe('false');
    expect(line('weight')).toContain('1/2');
    expect(line('deviation')).toContain('vzorc');
    expect(boardTexts(graph).join(' ')).toContain('w² = 1/2');
    expect(boardTexts(graph).join(' ')).not.toMatch(/NaN|Infinity/);
});

test('dragging snaps to the 1/5 grid, keeps model and board equal and selects the point', () => {
    const graph = new Observed();
    mount(graph);
    const e = pointOf(graph, 'E');
    act(() => { e.moveTo([-2.31, 1.09], 0); trigger(e, 'drag', []); });
    expect(graph.model.points[4]).toEqual({x: -36, y: 15});
    expect([e.X(), e.Y()]).toEqual([-2.4, 1]);
    expect(graph.selectedIndex).toBe(4);
    expect(graph.model.example).toBe('custom');
});

test('arrow keys step the selected point by 0.2 and Shift by 1; without a selection or with Ctrl they do nothing', () => {
    const graph = new Observed();
    mount(graph);
    const before = graph.model;
    act(() => { fireEvent.keyDown(container(graph), {key: 'ArrowRight'}); });
    expect(graph.model).toBe(before);
    act(() => { graph.select(0); });
    act(() => { fireEvent.keyDown(container(graph), {key: 'ArrowRight'}); });
    expect(graph.model.points[0]).toEqual({x: 78, y: 0});
    act(() => { fireEvent.keyDown(container(graph), {key: 'ArrowUp', shiftKey: true}); });
    expect(graph.model.points[0]).toEqual({x: 78, y: 15});
    act(() => { fireEvent.keyDown(container(graph), {key: 'ArrowDown', ctrlKey: true}); });
    expect(graph.model.points[0]).toEqual({x: 78, y: 15});
    expect([pointOf(graph, 'A').X(), pointOf(graph, 'A').Y()]).toEqual([5.2, 1]);
});

test('the example buttons, selectors and numeric fields edit the model', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Hiperbola'})); });
    expect(graph.model).toEqual(FIVE_POINT_EXAMPLES.hyperbola);
    expect(line('weight-kind')).toContain('w > 1');
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Parabola'})); });
    expect(line('weight')).toContain('w = 1');
    act(() => { fireEvent.change(screen.getByLabelText('Točka C: x'), {target: {value: '1.2'}}); });
    expect(graph.model.points[2]).toEqual({x: 18, y: 30});
    expect(graph.model.example).toBe('custom');
    act(() => { fireEvent.change(screen.getByLabelText('Tretja točka (določa utež)'), {target: {value: '3'}}); });
    expect(graph.model.t).toBe(3);
    act(() => { fireEvent.change(screen.getByLabelText('Drugo krajišče loka'), {target: {value: '3'}}); });
    expect([graph.model.a, graph.model.b]).toEqual([0, 3]);
    expect(graph.model.t).not.toBe(3);
});

test('degenerate positions state the problem and the repair; the last unique conic stays drawn as stale, and returns to fresh', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.moveTo(4, 0, 0); });
    expect(status()?.getAttribute('data-projective-status')).toBe('line-pair');
    expect(status()?.getAttribute('data-projective-stale')).toBe('true');
    expect(line('status')).toContain('A, C, E');
    expect(line('status')).toContain('par premic');
    expect(graph.shown()?.stale).toBe(true);
    expect(line('weight')).toBe('');
    expect(named(graph, 'point', 'P₁')[0].visPropCalc?.visible).toBe(false);
    act(() => { graph.moveTo(4, -3, 2.4); });
    expect(status()?.getAttribute('data-projective-status')).toBe('ok');
    expect(status()?.getAttribute('data-projective-stale')).toBe('false');
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Štiri točke na premici'})); });
    expect(status()?.getAttribute('data-projective-status')).toBe('pencil-collinear');
    expect(line('status')).toContain('šop');
    // the record of the last unique conic was cleared by loading an example, so nothing stale is drawn
    expect(graph.shown()).toBeUndefined();
});

type Curve = Shown & {evalVisProp(name: string): unknown; dataX?: number[]; dataY?: number[]};
const curves = (graph: Observed) => objects(graph).filter(o => o.elType === 'curve') as Curve[];
const shownCurves = (graph: Observed, dash: number) => curves(graph).filter(c => c.evalVisProp('visible') === true && c.evalVisProp('dash') === dash && (c.dataX?.length ?? 0) > 0);

test('the extrapolation toggle draws a dashed continuation with points, and nothing when off', () => {
    const graph = new Observed();
    mount(graph);
    expect(graph.extrapolating).toBe(false);
    expect(shownCurves(graph, 2)).toHaveLength(0);
    act(() => { fireEvent.click(screen.getByLabelText(/Nadaljuj lok/)); });
    expect(graph.extrapolating).toBe(true);
    const dashed = shownCurves(graph, 2);
    expect(dashed).toHaveLength(1);
    expect(dashed[0].dataX!.filter(Number.isFinite).length).toBeGreaterThan(20);
    act(() => { fireEvent.click(screen.getByLabelText(/Nadaljuj lok/)); });
    expect(shownCurves(graph, 2)).toHaveLength(0);
});

test('a language switch updates the controls, the aria label, the readout and the board text and keeps the model', () => {
    const graph = new Observed();
    mount(graph);
    const model = graph.model;
    expect(container(graph).getAttribute('aria-label')).toContain('Stožnica skozi pet točk');
    expect(line('weight')).toContain('Utež');
    expect(boardTexts(graph).join(' ')).toMatch(/w ≈ 0,707/);
    act(() => { setLanguage('en'); });
    expect(container(graph).getAttribute('aria-label')).toContain('Conic through five points');
    expect(line('weight')).toContain('Weight');
    expect(line('weight')).not.toContain('Utež');
    expect(boardTexts(graph).join(' ')).toMatch(/w ≈ 0\.707/);
    expect(boardTexts(graph).join(' ')).not.toMatch(/0,707/);
    expect(screen.getByRole('button', {name: 'Hyperbola'})).toBeTruthy();
    expect(boardTexts(graph).join(' ')).not.toMatch(/NaN|Infinity/);
    expect(graph.model).toBe(model);
});

test('an import after a degenerate drag clears the stale conic (state and drawing), the selection and extrapolation', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.moveTo(4, 0, 0); });
    expect(graph.shown()?.stale).toBe(true);
    expect(shownCurves(graph, 3)).toHaveLength(1);
    act(() => { graph.select(2); graph.setExtrapolation(true); });
    act(() => { graph.importPresetData({...FIVE_POINT_EXAMPLES.hyperbola}); });
    expect(graph.model).toEqual(FIVE_POINT_EXAMPLES.hyperbola);
    expect([pointOf(graph, 'B').X(), pointOf(graph, 'B').Y()]).toEqual([5, 16 / 3]);
    expect(graph.selectedIndex).toBeUndefined();
    expect(graph.extrapolating).toBe(false);
    expect(graph.shown()?.stale).toBe(false);
    expect(status()?.getAttribute('data-projective-stale')).toBe('false');
    expect(shownCurves(graph, 3)).toHaveLength(0);
    expect(shownCurves(graph, 2)).toHaveLength(0);
    expect(line('weight-kind')).toContain('w > 1');
    const graphState: object = graph.exportPreset().graphState ?? {};
    expect('model' in graphState).toBe(false);
    expect('lastUnique' in graphState).toBe(false);
});

test('the app-level Reset restores the default after a drag and extrapolation; there is no second Reset button', async () => {
    const graph = new Observed();
    mount(graph);
    expect(screen.queryByRole('button', {name: /Ponastavi/})).toBeNull();
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Parabola'})); });
    act(() => { fireEvent.click(screen.getByLabelText(/Nadaljuj lok/)); });
    const e = pointOf(graph, 'E');
    act(() => { e.moveTo([-2.31, 1.09], 0); trigger(e, 'drag', []); });
    expect(graph.model.example).toBe('custom');
    expect(graph.extrapolating).toBe(true);
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = graph.reset(); });
    await act(async () => { await pending; });
    expect(graph.model).toEqual(FIVE_POINT_EXAMPLES.ellipse);
    expect(graph.model.example).toBe('ellipse');
    expect(graph.extrapolating).toBe(false);
    expect(shownCurves(graph, 2)).toHaveLength(0);
    expect([pointOf(graph, 'E').X(), pointOf(graph, 'E').Y()]).toEqual([-3, 2.4]);
    expect([pointOf(graph, 'P₁').X(), pointOf(graph, 'P₁').Y()]).toEqual([5, 3]);
});

test('selecting a point from the inspector keeps the focus on the inspector button', () => {
    const graph = new Observed();
    mount(graph);
    const button = screen.getByRole('button', {name: 'Izberi točko B'});
    act(() => { button.focus(); });
    expect(document.activeElement).toBe(button);
    act(() => { fireEvent.click(button); });
    expect(graph.selectedIndex).toBeDefined();
    expect(document.activeElement).toBe(button);
    expect(document.activeElement).not.toBe(container(graph));
});

test('unmount removes the listener, the attributes and every scene object; a StrictMode remount draws the scene once', () => {
    const graph = new Observed();
    const view = mount(graph, true);
    const box = container(graph);
    expect(named(graph, 'point', 'A')).toHaveLength(1);
    expect(box.getAttribute('tabindex')).toBe('0');
    const board = graph.liveBoard();
    const mine = [...graph['drawn']!.all];
    const remove = vi.spyOn(box, 'removeEventListener');
    const removed: unknown[] = [];
    const removeObject = board.removeObject.bind(board);
    vi.spyOn(board, 'removeObject').mockImplementation((...args: Parameters<typeof board.removeObject>) => { removed.push(...[args[0]].flat()); return removeObject(...args); });
    view.unmount();
    expect(remove.mock.calls.filter(([type, listener]) => type === 'keydown' && listener === graph['onKeyDown'])).toHaveLength(1);
    expect(box.hasAttribute('tabindex')).toBe(false);
    expect(box.hasAttribute('aria-label')).toBe(false);
    expect(() => fireEvent.keyDown(box, {key: 'ArrowRight'})).not.toThrow();
    expect(mine.length).toBeGreaterThan(10);
    // this graph's own removeDrawn took its objects off the board (not just the board teardown)
    expect(mine.filter(object => !removed.includes(object))).toEqual([]);
    expect(mine.filter(object => (board.objectsList as unknown[]).includes(object))).toEqual([]);
});
