import React from 'react';
import {Board} from 'jsxgraph';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {PolePolarGraph} from './PolePolarGraph';
import {POLE_POLAR_EXAMPLES} from './polePolarModel';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {setLanguage} from '../../localization';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

class Observed extends PolePolarGraph {
    liveBoard() { return this.board; }
}

type Shown = {elType: string; name?: string; X?: () => number; Y?: () => number; plaintext?: string; visProp?: Record<string, unknown>; visPropCalc?: {visible?: boolean}};
const objects = (graph: Observed) => graph.liveBoard().objectsList as Shown[];
const named = (graph: Observed, elType: string, name: string) => objects(graph).filter(o => o.elType === elType && o.name === name);
const pointP = (graph: Observed) => named(graph, 'point', 'P')[0] as unknown as JXG.Point;
const boardTexts = (graph: Observed) => objects(graph).filter(o => o.elType === 'text').map(o => o.plaintext ?? '');
const container = (graph: Observed) => graph.liveBoard().containerObj as HTMLElement;
const mount = (graph: Observed, strict = false) => {
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
};
const line = (name: string) => document.querySelector(`[data-projective-line="${name}"]`)?.textContent ?? '';
const region = () => document.querySelector('[data-projective-status]')?.getAttribute('data-projective-status');
type Triggerable = {triggerEventHandlers(names: string[], args: unknown[]): void};
const trigger = (target: object, name: string, args: unknown[]): void => {
    if (!('triggerEventHandlers' in target) || typeof target.triggerEventHandlers !== 'function') throw new Error('Not a JSXGraph element.');
    const handlers: Triggerable['triggerEventHandlers'] = target.triggerEventHandlers.bind(target);
    handlers([name], args);
};

test('the default scene draws P at (1, 4.2) and reads the polar, both tangents and both tangency points as text and on the board', () => {
    const graph = new Observed();
    mount(graph);
    expect([pointP(graph).X(), pointP(graph).Y()]).toEqual([1, 4.2]);
    expect(region()).toBe('outside');
    expect(line('polar')).toContain('3x + 35y − 75 = 0');
    expect(line('tangent-1') + line('tangent-2')).toContain('4x + 5y − 25 = 0');
    expect(line('tangency-1') + line('tangency-2')).toContain('(−3, 12/5)');
    expect(line('centre')).toContain('(0, 0)');
    expect(boardTexts(graph).join(' ')).not.toMatch(/NaN|Infinity/);
});

test('every labelled object is on the board: P, polar p, tangents t1 and t2, markers T1 and T2, centre S', () => {
    const graph = new Observed();
    mount(graph);
    expect(named(graph, 'line', 'p')).toHaveLength(1);
    expect(['t₁', 't₂'].map(name => named(graph, 'line', name).length)).toEqual([1, 1]);
    expect(['T₁', 'T₂', 'S', 'P'].map(name => named(graph, 'point', name).length)).toEqual([1, 1, 1, 1]);
    const [t1, t2] = ['T₁', 'T₂'].map(name => named(graph, 'point', name)[0]);
    const touches = [[t1.X!(), t1.Y!()], [t2.X!(), t2.Y!()]].map(([x, y]) => `${x.toFixed(6)},${y.toFixed(6)}`).sort();
    expect(touches).toEqual(['-3.000000,2.400000', '4.000000,1.800000']);
});

test('the regions: on shows one marker and no second tangency line; inside has no tangents', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.loadExample('on'); });
    expect(region()).toBe('on');
    expect(line('tangency-1')).toContain('(4, 9/5)');
    expect(document.querySelector('[data-projective-line="tangency-2"]')).toBeNull();
    expect(document.querySelector('[data-projective-line="tangent-1"]')).toBeNull();
    act(() => { graph.loadExample('inside'); });
    expect(region()).toBe('inside');
    expect(document.querySelector('[data-projective-line="tangency-1"]')).toBeNull();
    expect(line('status')).toContain('znotraj');
});

test('an ideal P is drawn as an arrow, never as a far finite point; the parabola draws no finite centre', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.loadExample('infinity'); });
    expect(line('status')).toContain('točka v neskončnosti');
    expect(line('polar')).toContain('x = 0');
    expect(boardTexts(graph).some(text => text.includes('∞'))).toBe(true);
    for (const object of objects(graph)) {
        if (object.elType !== 'point' || !object.X) continue;
        expect(Math.abs(object.X())).toBeLessThan(40);
        expect(Math.abs(object.Y!())).toBeLessThan(40);
    }
    act(() => { graph.chooseConic('parabola'); });
    expect(line('centre')).toContain('v neskončnosti');
    expect(named(graph, 'point', 'S')[0].visPropCalc?.visible).toBe(false);
    act(() => { graph.chooseConic('circle'); });
    expect(named(graph, 'point', 'S')[0].visPropCalc?.visible).toBe(true);
});

test('dragging snaps to the 1/5 grid and keeps model and board equal', () => {
    const graph = new Observed();
    mount(graph);
    const p = pointP(graph);
    act(() => { p.moveTo([2.31, -1.09], 0); trigger(p, 'drag', []); });
    expect(graph.model.p).toEqual({x: 12, y: -5});
    expect([p.X(), p.Y()]).toEqual([2.4, -1]);
    expect(graph.pSelected).toBe(true);
    expect(graph.model.example).toBe('custom');
});

test('arrow keys step P by 0.2 and Shift by 1; without a selection or with Ctrl they do nothing', () => {
    const graph = new Observed();
    mount(graph);
    const before = graph.model;
    act(() => { fireEvent.keyDown(container(graph), {key: 'ArrowRight'}); });
    expect(graph.model).toBe(before);
    act(() => { graph.select(true); });
    act(() => { fireEvent.keyDown(container(graph), {key: 'ArrowRight'}); });
    expect(graph.model.p).toEqual({x: 6, y: 21});
    act(() => { fireEvent.keyDown(container(graph), {key: 'ArrowUp', shiftKey: true}); });
    expect(graph.model.p).toEqual({x: 6, y: 26});
    act(() => { fireEvent.keyDown(container(graph), {key: 'ArrowDown', ctrlKey: true}); });
    expect(graph.model.p).toEqual({x: 6, y: 26});
    expect([pointP(graph).X(), pointP(graph).Y()]).toEqual([1.2, 5.2]);
});

test('the example, conic and mode buttons and the numeric fields edit the model', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Točka na elipsi'})); });
    expect(graph.model).toEqual(POLE_POLAR_EXAMPLES.on);
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Krožnica'})); });
    expect(graph.model.conic).toBe('circle');
    expect(graph.model.example).toBe('custom');
    act(() => { fireEvent.change(screen.getByLabelText('Točka P: x'), {target: {value: '3'}}); });
    expect(graph.model.p).toEqual({x: 15, y: 9});
    act(() => { fireEvent.change(screen.getByLabelText('Točka P: y'), {target: {value: '0.4'}}); });
    expect(graph.model.p).toEqual({x: 15, y: 2});
});

test('numeric fields accept only multiples of 0.2', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { fireEvent.change(screen.getByLabelText('Točka P: x'), {target: {value: '1.23'}}); });
    expect(graph.model.p).toEqual({x: 5, y: 21});
    act(() => { fireEvent.change(screen.getByLabelText('Točka P: x'), {target: {value: '1.4'}}); });
    expect(graph.model.p).toEqual({x: 7, y: 21});
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'P: v neskončnosti'})); });
    expect(graph.model.ideal).toEqual({dx: 1, dy: 0});
    act(() => { fireEvent.change(screen.getByLabelText('Smer točke P: dy'), {target: {value: '2'}}); });
    expect(graph.model.ideal).toEqual({dx: 1, dy: 2});
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'P: končna točka'})); });
    expect(graph.model.ideal).toBeUndefined();
    expect(graph.model.p).toEqual({x: 7, y: 21});
});

test('a language switch updates the controls, the aria label and the board text and keeps the model', () => {
    const graph = new Observed();
    mount(graph);
    const model = graph.model;
    expect(container(graph).getAttribute('aria-label')).toContain('Pol in polara');
    expect(line('polar')).toContain('Polara p');
    act(() => { setLanguage('en'); });
    expect(container(graph).getAttribute('aria-label')).toContain('Pole and polar');
    expect(line('polar')).toContain('Polar p');
    expect(line('polar')).not.toContain('Polara');
    expect(line('centre')).toContain('Centre of the conic');
    expect(boardTexts(graph).join(' ')).not.toContain('Polar');
    expect(line('status')).toContain('lies outside the conic');
    expect(graph.model).toBe(model);
});

test('unmount removes the listener, the attributes and every scene object; a StrictMode remount draws the scene once', () => {
    const graph = new Observed();
    const view = mount(graph, true);
    const box = container(graph);
    expect(named(graph, 'point', 'P')).toHaveLength(1);
    expect(box.getAttribute('tabindex')).toBe('0');
    const board = graph.liveBoard();
    const mine = [...graph['drawn']!.all];
    const remove = vi.spyOn(box, 'removeEventListener');
    view.unmount();
    expect(remove.mock.calls.filter(([type, listener]) => type === 'keydown' && listener === graph['onKeyDown'])).toHaveLength(1);
    expect(box.hasAttribute('tabindex')).toBe(false);
    expect(box.hasAttribute('aria-label')).toBe(false);
    expect(() => fireEvent.keyDown(box, {key: 'ArrowRight'})).not.toThrow();
    // every object this graph created is gone from the board (the board's own axis helpers are not ours)
    expect(mine.length).toBeGreaterThan(10);
    expect(mine.filter(object => (board.objectsList as unknown[]).includes(object))).toEqual([]);
});

test('an import and Reset replace the model, move P, update the readout and clear the selection', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.select(true); });
    expect(graph.pSelected).toBe(true);
    act(() => { graph.importPresetData({...POLE_POLAR_EXAMPLES.inside}); });
    expect(graph.model.p).toEqual({x: 5, y: 5});
    expect([pointP(graph).X(), pointP(graph).Y()]).toEqual([1, 1]);
    expect(region()).toBe('inside');
    expect(graph.pSelected).toBe(false);
    act(() => { graph.select(true); graph.importPresetData(graph.defaultPreset()); });
    expect(graph.model).toEqual(POLE_POLAR_EXAMPLES.default);
    expect(region()).toBe('outside');
    expect(line('polar')).toContain('3x + 35y');
    expect(graph.pSelected).toBe(false);
});

test('the live region holds the status and the polar only; an arrow step announces just the position of P', () => {
    const graph = new Observed();
    mount(graph);
    const live = document.querySelector('[data-projective-status]')!;
    expect(live.getAttribute('role')).toBe('status');
    expect(live.querySelector('[data-projective-line="status"]')).not.toBeNull();
    expect(live.querySelector('[data-projective-line="polar"]')).not.toBeNull();
    expect(live.querySelector('[data-projective-line="tangent-1"]')).toBeNull();
    expect(live.querySelector('[data-projective-line="tangency-1"]')).toBeNull();
    expect(live.querySelector('[data-projective-line="centre"]')).toBeNull();
    const nudge = () => document.querySelector('[data-projective-nudge]')!.textContent;
    expect(nudge()).toBe('');
    act(() => { graph.select(true); });
    act(() => { fireEvent.keyDown(container(graph), {key: 'ArrowRight'}); });
    expect(nudge()).toBe('Točka P = (6/5, 21/5)');
});

test('selecting P from the inspector moves the focus to the board so the arrow keys work', () => {
    const graph = new Observed();
    mount(graph);
    const button = screen.getByRole('button', {name: 'Izberi točko P'});
    button.focus();
    act(() => { fireEvent.click(button); });
    expect(document.activeElement).toBe(container(graph));
});

const visibleLines = (graph: Observed, name: string) => named(graph, 'line', name).map(o => o.visPropCalc?.visible);

test('P at the centre: the polar is the line at infinity, reported as such and not drawn', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.loadModel({example: 'custom', conic: 'ellipse', p: {x: 0, y: 0}}); });
    expect(line('polar')).toBe('Polara p je premica v neskončnosti.');
    expect(visibleLines(graph, 'p')).toEqual([false]);
});

test('the parabola ideal axis point: tangent is the line at infinity, nothing drawn, no ideal tangency marker', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.loadModel({example: 'custom', conic: 'parabola', p: {x: 0, y: 0}, ideal: {dx: 0, dy: 1}}); });
    expect(region()).toBe('on');
    expect(line('status')).toContain('premica v neskončnosti');
    expect(line('polar')).toContain('premica v neskončnosti');
    expect(visibleLines(graph, 'p')).toEqual([false]);
    expect(['T₁', 'T₂'].flatMap(name => named(graph, 'point', name).map(o => o.visPropCalc?.visible))).toEqual([false, false]);
});

test('the hyperbola polyline is broken by NaN between its branches; the ellipse is one unbroken piece', () => {
    const graph = new Observed();
    mount(graph);
    const data = () => (objects(graph).find(o => o.elType === 'curve') as unknown as {dataX: number[]}).dataX;
    expect(data().length).toBeGreaterThan(0);
    expect(data().some(Number.isNaN)).toBe(false);
    act(() => { graph.chooseConic('hyperbola'); });
    expect(data().some(Number.isNaN)).toBe(true);
});

/** The board's objects at the moment the scene starts (its first curve), so everything the scene adds, helpers included, is measured. */
const countBeforeScene = (): {count: () => number; objects: () => unknown[]} => {
    const state = {count: -1, objects: [] as unknown[]};
    const create = Board.prototype.create;
    vi.spyOn(Board.prototype, 'create').mockImplementation(function (this: JXG.Board, ...args: Parameters<typeof create>) {
        const kind: string = args[0];
        if (kind === 'curve' && state.count < 0) { state.count = this.objectsList.length; state.objects = [...this.objectsList]; }
        return create.apply(this, args);
    });
    return {count: () => state.count, objects: () => state.objects};
};

test('the scene leaves no anonymous helper on the board: a Preset replacement keeps the object count and unmount leaves only what the board had before the scene', () => {
    const before = countBeforeScene();
    const graph = new Observed();
    const view = mount(graph);
    const board = graph.liveBoard();
    const drawn = board.objectsList.length;
    // the board's own sketch curves are created after the scene starts and are not the scene's
    const leftovers = (b: JXG.Board) => (b.objectsList as Shown[]).filter(object => object.elType !== 'sketchcurve' && !before.objects().includes(object));
    expect(before.count()).toBeGreaterThan(0);
    expect(drawn).toBeGreaterThan(before.count());
    act(() => { graph.importPresetData({...POLE_POLAR_EXAMPLES.inside}); });
    act(() => { graph.importPresetData(graph.defaultPreset()); });
    expect(board.objectsList.length).toBe(drawn);
    view.unmount();
    expect(leftovers(board)).toEqual([]);
    vi.restoreAllMocks();
});
