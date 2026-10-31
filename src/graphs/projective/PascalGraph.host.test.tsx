import React from 'react';
import {Board} from 'jsxgraph';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {PascalGraph} from './PascalGraph';
import {directionIndex, handlePoint, PASCAL_DEFAULT_INDICES, PASCAL_EXAMPLES, PASCAL_ORDERS, PascalModel, reachableIndices} from './pascalModel';
import {nearestIndex} from './pascalEdit';
import {toAffine} from '../../projective/homogeneous';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {setLanguage} from '../../localization';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

class Observed extends PascalGraph {
    liveBoard() { return this.board; }
    ownObjects(): readonly unknown[] { return this['drawn']?.all ?? []; }
}

type Shown = {elType: string; name?: string; X?: () => number; Y?: () => number; plaintext?: string; visPropCalc?: {visible?: boolean}};
const objects = (graph: Observed) => graph.liveBoard().objectsList as Shown[];
const named = (graph: Observed, elType: string, name: string) => objects(graph).filter(o => o.elType === elType && o.name === name);
const pointOf = (graph: Observed, name: string) => named(graph, 'point', name)[0] as unknown as JXG.Point;
const visible = (graph: Observed, elType: string, name: string) => named(graph, elType, name).map(o => o.visPropCalc?.visible);
const boardTexts = (graph: Observed) => objects(graph).filter(o => o.elType === 'text').map(o => o.plaintext ?? '');
const container = (graph: Observed) => graph.liveBoard().containerObj as HTMLElement;
const mount = (graph: Observed, strict = false) => {
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
};
const line = (name: string) => document.querySelector(`[data-projective-line="${name}"]`)?.textContent ?? '';
const kind = () => document.querySelector('[data-projective-status]')?.getAttribute('data-projective-status');
const custom = (patch: Partial<PascalModel>): PascalModel => ({...PASCAL_EXAMPLES.default, example: 'custom', ...patch});
type Triggerable = {triggerEventHandlers(names: string[], args: unknown[]): void};
const trigger = (target: object, name: string, args: unknown[]): void => {
    if (!('triggerEventHandlers' in target) || typeof target.triggerEventHandlers !== 'function') throw new Error('Not a JSXGraph element.');
    const handlers: Triggerable['triggerEventHandlers'] = target.triggerEventHandlers.bind(target);
    handlers([name], args);
};
const xy = (p: JXG.Point) => [p.X(), p.Y()];

test('the default scene draws six points, six sides, three Pascal points and the Pascal line, and reads them as text', () => {
    const graph = new Observed();
    mount(graph);
    expect(['A', 'B', 'C', 'D', 'E', 'F'].map(name => named(graph, 'point', name).length)).toEqual([1, 1, 1, 1, 1, 1]);
    expect(xy(pointOf(graph, 'B'))).toEqual([3, 2.4]);
    expect(['s₁', 's₂', 's₃', 's₄', 's₅', 's₆', 'p'].map(name => named(graph, 'line', name).length)).toEqual([1, 1, 1, 1, 1, 1, 1]);
    expect(['P₁', 'P₂', 'P₃'].map(name => named(graph, 'point', name).length)).toEqual([1, 1, 1]);
    expect(kind()).toBe('collinear');
    expect(line('status')).toContain('natančno kolinearna (natančen račun na natančnih točkah)');
    expect(line('determinant')).toBe('Determinanta treh presečišč: 0');
    expect(line('point-1')).toContain('(−15, 24)');
    expect(line('point-2')).toContain('(12, 3/5)');
    expect(line('point-3')).toContain('(15/2, 9/2)');
    expect(line('line')).toContain('Pascalova premica p:');
    expect(line('status')).toBe('Presečišča so natančno kolinearna (natančen račun na natančnih točkah).');
    expect(boardTexts(graph).join(' ')).not.toMatch(/NaN|Infinity/);
});

test('Pascal points differ by marker shape and label, not colour alone; the off-view P1 is listed in text and not drawn', () => {
    const graph = new Observed();
    mount(graph);
    const faces = ['P₁', 'P₂', 'P₃'].map(name => (named(graph, 'point', name)[0] as unknown as {visProp: {face: string}}).visProp.face);
    expect(new Set(faces).size).toBe(3);
    expect(['P₁', 'P₂', 'P₃'].map(name => visible(graph, 'point', name)[0])).toEqual([false, true, true]);
    expect(line('point-1')).toContain('izven prikazanega območja');
    expect(visible(graph, 'line', 'p')).toEqual([true]);
});

test('the Pappus example is a line pair with labelled points A1 to B3 and an exact Pascal line', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.loadExample('pappus'); });
    expect(['A₁', 'A₂', 'A₃', 'B₁', 'B₂', 'B₃'].map(name => named(graph, 'point', name).length)).toEqual([1, 1, 1, 1, 1, 1]);
    expect(['A', 'B', 'C'].map(name => named(graph, 'point', name).length)).toEqual([0, 0, 0]);
    expect(xy(pointOf(graph, 'B₃'))).toEqual([6, 3]);
    expect(line('point-1') + line('point-2') + line('point-3')).toContain('(8/5, 6/5)');
    expect(line('hexagon')).toBe('Šestkotnik: A₁ B₂ A₃ B₁ A₂ B₃');
    expect(line('determinant')).toBe('Determinanta treh presečišč: 0');
    expect(visible(graph, 'point', 'P₁')).toEqual([true]);
});

test('an ideal Pascal point is drawn as a labelled arrow, never as a far finite point', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.loadExample('infinity'); });
    expect(line('point-1')).toContain('v neskončnosti, smer (1, 1)');
    expect(visible(graph, 'point', 'P₁')).toEqual([false]);
    expect(visible(graph, 'point', 'P₂')).toEqual([true]);
    expect(boardTexts(graph).some(text => text.includes('P₁ = ∞'))).toBe(true);
    const arrows = objects(graph).filter(o => o.elType === 'segment' && o.visPropCalc?.visible);
    expect(arrows).toHaveLength(1);
    for (const object of objects(graph)) {
        if (object.elType !== 'point' || !object.X) continue;
        expect(Math.abs(object.X())).toBeLessThan(40);
        expect(Math.abs(object.Y!())).toBeLessThan(40);
    }
});

test('a Pascal line at infinity is stated in text and no finite line is drawn', () => {
    const graph = new Observed();
    mount(graph);
    const at = directionIndex;
    act(() => {
        graph.loadModel(custom({
            conic: 'linePair', order: PASCAL_ORDERS.natural,
            indices: [at(0, 1), at(-1, 3), at(-2, 3), at(4, 3), at(1, 1), at(2, 3)],
        }));
    });
    expect(line('line')).toBe('Pascalova premica p je premica v neskončnosti, zato je ne narišemo.');
    expect(visible(graph, 'line', 'p')).toEqual([false]);
    expect(visible(graph, 'point', 'P₁')).toEqual([false]);
    expect(objects(graph).filter(o => o.elType === 'segment' && o.visPropCalc?.visible)).toHaveLength(3);
});

test('acceptance 4: a coincident neighbour states the undefined side in the inspector, without NaN', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.loadModel(custom({indices: PASCAL_EXAMPLES.default.indices.map((v, i) => i === 1 ? PASCAL_EXAMPLES.default.indices[0] : v)})); });
    expect(kind()).toBe('undefined-side');
    expect(line('status')).toBe('Točki A in B se ujemata, zato stranica s₁ ni določena in presečišč ni.');
    expect(boardTexts(graph).join(' ')).not.toMatch(/NaN|Infinity/);
    expect(document.querySelector('[data-projective-line="point-1"]')).toBeNull();
    expect(visible(graph, 'line', 's₁')).toEqual([false]);
    expect(visible(graph, 'line', 'p')).toEqual([false]);
    expect(['P₁', 'P₂', 'P₃'].map(name => visible(graph, 'point', name)[0])).toEqual([false, false, false]);
    for (const object of objects(graph)) {
        if (object.elType === 'point' && object.X) {
            expect(Number.isFinite(object.X())).toBe(true);
            expect(Number.isFinite(object.Y!())).toBe(true);
        }
    }
});

test('dragging a handle snaps to a table direction and changes only that index', () => {
    const graph = new Observed();
    mount(graph);
    const e = pointOf(graph, 'E');
    const current = PASCAL_EXAMPLES.default.indices[4];
    const target = reachableIndices('ellipse', 4).find(i => i !== current && handlePoint('ellipse', 4, i) !== undefined);
    if (target === undefined) throw new Error('No other reachable index for E.');
    const home = toAffine(handlePoint('ellipse', 4, target)!);
    if (home.kind !== 'finite') throw new Error('Expected a finite handle position.');
    // a pointer slightly off the exact position still snaps to the nearest table direction
    act(() => { e.moveTo([home.view.x + 0.01, home.view.y - 0.01], 0); trigger(e, 'drag', []); });
    expect(nearestIndex(PASCAL_EXAMPLES.default, 4, home.view)).toBe(target);
    expect(graph.model.indices).toEqual(PASCAL_EXAMPLES.default.indices.map((v, i) => i === 4 ? target : v));
    expect(xy(e)).toEqual([home.view.x, home.view.y]);
    expect(graph.selectedHandle).toBe(4);
    expect(graph.model.example).toBe('custom');
    // moving to the same direction again changes nothing
    const before = graph.model;
    act(() => { e.moveTo([home.view.x - 0.01, home.view.y + 0.01], 0); trigger(e, 'drag', []); });
    expect(graph.model).toBe(before);
    expect(xy(e)).toEqual([home.view.x, home.view.y]);
});

test('arrow keys step the selected point one position, Shift five; without a selection or with Ctrl they do nothing', () => {
    const graph = new Observed();
    mount(graph);
    const before = graph.model;
    act(() => { fireEvent.keyDown(container(graph), {key: 'ArrowRight'}); });
    expect(graph.model).toBe(before);
    act(() => { graph.select(2); });
    act(() => { fireEvent.keyDown(container(graph), {key: 'ArrowRight'}); });
    const once = graph.model.indices[2];
    expect(once).not.toBe(before.indices[2]);
    act(() => { fireEvent.keyDown(container(graph), {key: 'ArrowLeft'}); });
    expect(graph.model.indices[2]).toBe(before.indices[2]);
    act(() => { fireEvent.keyDown(container(graph), {key: 'ArrowUp', shiftKey: true}); });
    const five = graph.model.indices[2];
    expect(five).not.toBe(once);
    act(() => { fireEvent.keyDown(container(graph), {key: 'ArrowDown', ctrlKey: true}); });
    expect(graph.model.indices[2]).toBe(five);
    expect(graph.model.indices.filter((v, i) => v !== before.indices[i])).toHaveLength(1);
    const c = pointOf(graph, 'C');
    expect(c.X()).toBeCloseTo(Number(eval0(graph, 2).x), 9);
});

const eval0 = (graph: Observed, handle: number) => {
    const h = graph.scene().handles[handle];
    return {x: Number(h[0]) / Number(h[2]), y: Number(h[1]) / Number(h[2])};
};

test('the example, conic and order buttons and the step buttons edit the model', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.select(3); });
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Pappusov izrek (par premic)'})); });
    expect(graph.model).toEqual(PASCAL_EXAMPLES.pappus);
    expect(graph.selectedHandle).toBeUndefined();
    expect(screen.getByRole('button', {name: 'Pappusov izrek (par premic)'}).getAttribute('aria-pressed')).toBe('true');
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Običajni (1 2 3 4 5 6)'})); });
    expect(graph.model.order).toEqual(PASCAL_ORDERS.natural);
    expect(graph.model.example).toBe('custom');
    expect(screen.getByRole('button', {name: 'Običajni (1 2 3 4 5 6)'}).getAttribute('aria-pressed')).toBe('true');
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Zvezda (1 3 5 2 4 6)'})); });
    expect(graph.model.order).toEqual(PASCAL_ORDERS.star);
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Hiperbola'})); });
    expect(graph.model.conic).toBe('hyperbola');
    expect(graph.model.indices).toEqual(PASCAL_DEFAULT_INDICES.hyperbola);
    const before = graph.model.indices[0];
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Točka A: naslednji položaj'})); });
    expect(graph.model.indices[0]).not.toBe(before);
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Točka A: prejšnji položaj'})); });
    expect(graph.model.indices[0]).toBe(before);
});

test('switching the conic leaves no stale objects and renames the points', () => {
    const graph = new Observed();
    mount(graph);
    const first = [...objects(graph)];
    const count = first.length;
    const firstOwn = new Set<unknown>(graph.ownObjects());
    // Everything on the board that the graph did not draw (axes, ticks, board helpers) must be the same objects after every switch.
    // (labels belong to their element and are recreated with it; the total count below covers them)
    const foreign = () => objects(graph).filter(o => o.elType !== 'label' && !graph.ownObjects().includes(o));
    const foreignBefore = foreign();
    const ownAlive = () => graph.ownObjects().every(o => (objects(graph) as unknown[]).includes(o));
    expect(ownAlive()).toBe(true);
    act(() => { graph.chooseConic('linePair'); });
    expect(objects(graph)).toHaveLength(count);
    expect(ownAlive()).toBe(true);
    expect(foreign().length === foreignBefore.length && foreign().every(o => foreignBefore.includes(o))).toBe(true);
    expect(graph.ownObjects().some(o => firstOwn.has(o))).toBe(false);
    // the lines' anonymous defining points are part of the drawn scene, so none of them is left behind
    expect(objects(graph).filter(o => o.elType === 'point')).toHaveLength(first.filter(o => o.elType === 'point').length);
    expect(named(graph, 'point', 'A')).toHaveLength(0);
    expect(named(graph, 'point', 'A₁')).toHaveLength(1);
    expect(named(graph, 'point', 'P₁')).toHaveLength(1);
    expect(named(graph, 'line', 'p')).toHaveLength(1);
    // nothing the ellipse scene drew survives
    const alive = new Set<unknown>(objects(graph));
    const stale = first.filter(o => firstOwn.has(o) && alive.has(o));
    expect(stale).toEqual([]);
    act(() => { graph.chooseConic('ellipse'); });
    expect(objects(graph)).toHaveLength(count);
    expect(ownAlive()).toBe(true);
    expect(foreign().length === foreignBefore.length && foreign().every(o => foreignBefore.includes(o))).toBe(true);
    expect(named(graph, 'point', 'A')).toHaveLength(1);
    expect(named(graph, 'point', 'A₁')).toHaveLength(0);
    const data = () => (objects(graph).find(o => o.elType === 'curve') as unknown as {dataX: number[]}).dataX;
    expect(data().some(Number.isNaN)).toBe(false);
    act(() => { graph.chooseConic('hyperbola'); });
    expect(data().some(Number.isNaN)).toBe(true);
});

test('a language switch updates the controls, the aria label and the board text and keeps the model', () => {
    const graph = new Observed();
    mount(graph);
    const model = graph.model;
    expect(container(graph).getAttribute('aria-label')).toContain('Pascalov in Pappusov izrek');
    expect(line('determinant')).toContain('Determinanta treh presečišč');
    act(() => { setLanguage('en'); });
    expect(container(graph).getAttribute('aria-label')).toContain("Pascal's and Pappus's theorem");
    expect(line('determinant')).toContain('Determinant of the three intersections');
    expect(line('determinant')).not.toContain('Determinanta');
    expect(boardTexts(graph).join(' ')).not.toContain('Determinant');
    expect(line('status')).toContain('exactly collinear (exact arithmetic on exact points)');
    expect(graph.model).toBe(model);
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
    view.unmount();
    expect(remove.mock.calls.filter(([type, listener]) => type === 'keydown' && listener === graph['onKeyDown'])).toHaveLength(1);
    expect(box.hasAttribute('tabindex')).toBe(false);
    expect(box.hasAttribute('aria-label')).toBe(false);
    expect(() => fireEvent.keyDown(box, {key: 'ArrowRight'})).not.toThrow();
    // every object this graph created is gone from the board (the board's own axis helpers are not ours)
    expect(mine.length).toBeGreaterThan(30);
    expect(mine.filter(object => (board.objectsList as unknown[]).includes(object))).toEqual([]);
});

test('an import and Reset replace the model, move the points, update the readout and clear the selection', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.select(3); });
    expect(graph.selectedHandle).toBe(3);
    act(() => { graph.importPresetData({...PASCAL_EXAMPLES.pappus}); });
    expect(graph.model.conic).toBe('linePair');
    expect(xy(pointOf(graph, 'B₂'))).toEqual([4, 3]);
    expect(line('point-1')).toContain('(8/5, 6/5)');
    expect(graph.selectedHandle).toBeUndefined();
    expect(document.querySelector('[data-projective-selection]')?.textContent).toBe('Nobena točka ni izbrana.');
    act(() => { graph.select(1); graph.importPresetData(graph.defaultPreset()); });
    expect(graph.model).toEqual(PASCAL_EXAMPLES.default);
    expect(named(graph, 'point', 'A')).toHaveLength(1);
    expect(line('point-3')).toContain('(15/2, 9/2)');
    expect(graph.selectedHandle).toBeUndefined();
});

test('the live region holds the state sentence only; an arrow step announces just the position of the point', () => {
    const graph = new Observed();
    mount(graph);
    const live = document.querySelector('[data-projective-status]')!;
    expect(live.getAttribute('role')).toBe('status');
    expect(live.querySelector('[data-projective-line="status"]')).not.toBeNull();
    expect(live.querySelector('[data-projective-line="determinant"]')).toBeNull();
    expect(live.querySelector('[data-projective-line="point-1"]')).toBeNull();
    expect(live.querySelector('[data-projective-line="line"]')).toBeNull();
    const nudge = () => document.querySelector('[data-projective-nudge]')!.textContent;
    expect(nudge()).toBe('');
    act(() => { graph.select(0); });
    act(() => { fireEvent.keyDown(container(graph), {key: 'ArrowRight'}); });
    expect(nudge()).toMatch(/^Točka A = \(/);
});

test('selecting a point from the inspector moves the focus to the board so the arrow keys work', () => {
    const graph = new Observed();
    mount(graph);
    const button = screen.getByRole('button', {name: 'Izberi točko C'});
    button.focus();
    act(() => { fireEvent.click(button); });
    expect(document.activeElement).toBe(container(graph));
    expect(graph.selectedHandle).toBe(2);
    expect(document.querySelector('[data-projective-selection]')?.textContent).toBe('Izbrana točka: C');
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
    act(() => { graph.loadExample('infinity'); });
    act(() => { graph.importPresetData(graph.defaultPreset()); });
    expect(board.objectsList.length).toBe(drawn);
    view.unmount();
    expect(leftovers(board)).toEqual([]);
    vi.restoreAllMocks();
});
