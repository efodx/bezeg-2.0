import React from 'react';
import {act, fireEvent, render, screen, within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {DEFAULT_POINT_SET_MODEL, POINT_SET_PRESET_KEY, PointSetGraph} from './PointSetGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {PointSetModel} from '../../compgeo/pointSetModel';
import {setLanguage} from '../../localization';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

class Observed extends PointSetGraph {
    liveBoard() { return this.board; }
}

/** An overlay added by a later lesson: a text per point, built from the model through the documented hook. */
class LabelledGraph extends PointSetGraph<'labels'> {
    protected override overlayIds() { return [...super.overlayIds(), 'labels' as const]; }
    protected override drawOverlay(id: 'grid' | 'labels', model: PointSetModel): JXG.GeometryElement[] {
        if (id !== 'labels') return super.drawOverlay(id, model);
        return model.points.map(p => this.board.create('text', [p.x, p.y + 0.5, 'overlay']) as JXG.GeometryElement);
    }
    liveBoard() { return this.board; }
}

type Triggerable = {triggerEventHandlers(names: string[], args: unknown[]): void};
/** JSXGraph's event trigger is missing from its type declarations; this narrows to it without a cast. */
const trigger = (target: object, name: string, args: unknown[]): void => {
    if (!('triggerEventHandlers' in target) || typeof target.triggerEventHandlers !== 'function') throw new Error('Not a JSXGraph element.');
    const handlers: Triggerable['triggerEventHandlers'] = target.triggerEventHandlers.bind(target);
    handlers([name], args);
};

type Shown = {elType: string; name?: string; X?: () => number; Y?: () => number; plaintext?: string};
const objects = (graph: {liveBoard(): {objectsList: unknown[]}}, elType: string) =>
    // The board's own axis points are not scene points; scene points are named P1, P2, ...
    (graph.liveBoard().objectsList as Shown[]).filter(o => o.elType === elType && (elType !== 'point' || /^P\d+$/.test(o.name ?? '')));
const pointCoordinates = (graph: Observed) => objects(graph, 'point').map(p => [p.X!(), p.Y!()]);
const mount = (graph: PointSetGraph<string>, strict = false) => {
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
};
const model = (points: Array<[number, number]>, extra: Partial<PointSetModel> = {}): PointSetModel =>
    ({mode: 'points', closed: false, gridStepExponent: 0, points: points.map(([x, y]) => ({x, y})), ...extra});
const load = (graph: PointSetGraph<string>, next: PointSetModel) => act(() => { graph.loadModel(next); });
const container = (graph: Observed) => graph.liveBoard().containerObj as HTMLElement;
/** Starts a controller operation inside `act` so the host commits its renders, then waits for it outside. */
async function settle(start: () => Promise<void>): Promise<void> {
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = start(); });
    await act(async () => { await pending; });
}
const addModeButton = () => screen.getByRole('button', {name: 'Dodajanje z dotikom ali klikom'});

test('the default scene draws one board point per model point at the grid positions', () => {
    const graph = new Observed();
    mount(graph);
    expect(DEFAULT_POINT_SET_MODEL.points.length).toBeGreaterThan(0);
    expect(graph.model.points).toEqual(DEFAULT_POINT_SET_MODEL.points);
    expect(pointCoordinates(graph)).toEqual(DEFAULT_POINT_SET_MODEL.points.map(p => [p.x, p.y]));
});

test('a click on the board adds a point only in Add mode, snapped to the grid', () => {
    const graph = new Observed();
    mount(graph);
    const board = graph.liveBoard();
    vi.spyOn(board, 'getUsrCoordsOfMouse').mockReturnValue([1.4, -2.6]);
    const under = vi.spyOn(board, 'getAllObjectsUnderMouse').mockReturnValue([]);
    const before = graph.model.points.length;
    act(() => { trigger(board, 'down', [{}]); });
    expect(graph.model.points).toHaveLength(before);
    expect(objects(graph, 'point')).toHaveLength(before);

    act(() => { fireEvent.click(addModeButton()); });
    expect(addModeButton().getAttribute('aria-pressed')).toBe('true');
    act(() => { trigger(board, 'down', [{}]); });
    expect(graph.model.points).toHaveLength(before + 1);
    expect(graph.model.points.at(-1)).toEqual({x: 1, y: -3});
    expect(pointCoordinates(graph).at(-1)).toEqual([1, -3]);
    expect(objects(graph, 'point')).toHaveLength(before + 1);

    // a click on an existing point never adds
    under.mockReturnValue([{elType: 'point'}]);
    act(() => { trigger(board, 'down', [{}]); });
    expect(graph.model.points).toHaveLength(before + 1);
});

test('dragging snaps to the grid on every move and keeps model and board equal', () => {
    const graph = new Observed();
    mount(graph);
    const point = objects(graph, 'point')[2] as unknown as JXG.Point;
    expect(graph.model.points[2]).toEqual({x: 2, y: 1});
    act(() => { point.moveTo([3.4, -0.6], 0); trigger(point, 'drag', []); });
    expect(graph.model.points[2]).toEqual({x: 3, y: -1});
    expect([point.X(), point.Y()]).toEqual([3, -1]);
    expect(graph.selectedIndex).toBe(2);
    act(() => { point.moveTo([-4.5, 4.5], 0); trigger(point, 'drag', []); });
    expect(graph.model.points[2]).toEqual({x: -5, y: 5});
    expect([point.X(), point.Y()]).toEqual([-5, 5]);
    expect(objects(graph, 'point')).toHaveLength(DEFAULT_POINT_SET_MODEL.points.length);
});

test('arrow keys move the selected point one grid step; without a selection they do nothing', () => {
    const graph = new Observed();
    mount(graph);
    const box = container(graph);
    act(() => { fireEvent.keyDown(box, {key: 'ArrowRight'}); });
    expect(graph.model.points).toEqual(DEFAULT_POINT_SET_MODEL.points);
    act(() => { graph.select(1); });
    const start = graph.model.points[1];
    act(() => { fireEvent.keyDown(box, {key: 'ArrowRight'}); });
    act(() => { fireEvent.keyDown(box, {key: 'ArrowUp'}); });
    act(() => { fireEvent.keyDown(box, {key: 'ArrowLeft'}); });
    act(() => { fireEvent.keyDown(box, {key: 'ArrowLeft'}); });
    expect(graph.model.points[1]).toEqual({x: start.x - 1, y: start.y + 1});
    expect(pointCoordinates(graph)[1]).toEqual([start.x - 1, start.y + 1]);
});

test('Delete removes the selected point from model and board, and the Remove button does the same', () => {
    const graph = new Observed();
    mount(graph);
    const before = graph.model.points;
    act(() => { graph.select(1); });
    act(() => { fireEvent.keyDown(container(graph), {key: 'Delete'}); });
    expect(graph.model.points).toEqual([before[0], ...before.slice(2)]);
    expect(objects(graph, 'point')).toHaveLength(before.length - 1);
    expect(graph.selectedIndex).toBe(1);
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Odstrani'})); });
    expect(graph.model.points).toHaveLength(before.length - 2);
    expect(objects(graph, 'point')).toHaveLength(before.length - 2);
});

test('Clear removes every point and edge from the board', () => {
    const graph = new Observed();
    mount(graph);
    load(graph, model([[0, 0], [2, 0], [1, 2]], {mode: 'polygon', closed: true}));
    expect(objects(graph, 'segment')).toHaveLength(3);
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Počisti'})); });
    expect(graph.model.points).toEqual([]);
    expect(graph.model.closed).toBe(false);
    expect(objects(graph, 'point')).toHaveLength(0);
    expect(objects(graph, 'segment')).toHaveLength(0);
});

test('numeric Add point appends exactly the typed grid point', () => {
    const graph = new Observed();
    mount(graph);
    const before = graph.model.points.length;
    fireEvent.change(screen.getByLabelText('Nova točka: x'), {target: {value: '7'}});
    fireEvent.change(screen.getByLabelText('Nova točka: y'), {target: {value: '-4'}});
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Dodaj točko'})); });
    expect(graph.model.points).toHaveLength(before + 1);
    expect(graph.model.points.at(-1)).toEqual({x: 7, y: -4});
    expect(pointCoordinates(graph).at(-1)).toEqual([7, -4]);
});

test('the numeric list edits a coordinate and the board follows', () => {
    const graph = new Observed();
    mount(graph);
    fireEvent.change(screen.getByLabelText('Točka 1: x'), {target: {value: '4'}});
    expect(graph.model.points[0].x).toBe(4);
    expect(pointCoordinates(graph)[0][0]).toBe(4);
    // a non-integer is not stored
    fireEvent.change(screen.getByLabelText('Točka 1: y'), {target: {value: '1.5'}});
    expect(graph.model.points[0].y).toBe(DEFAULT_POINT_SET_MODEL.points[0].y);
});

test('a refused or unfinished coordinate draft resets to the stored value on blur', () => {
    const graph = new Observed();
    mount(graph);
    const stored = graph.model.points[0].x;
    const field = screen.getByLabelText('Točka 1: x') as HTMLInputElement;
    for (const typed of ['999999999', '1.5', '']) {
        fireEvent.change(field, {target: {value: typed}});
        fireEvent.blur(field);
        expect(field.value).toBe(String(stored));
        expect(graph.model.points[0].x).toBe(stored);
        expect(pointCoordinates(graph)[0][0]).toBe(stored);
    }
});

test('at the point limit Add shows a visible message and adds nothing', () => {
    const graph = new Observed({pointLimit: 3});
    mount(graph);
    load(graph, model([[0, 0], [1, 1], [2, 0]]));
    expect(screen.getByText('Točk: 3 od največ 3')).toBeInTheDocument();
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Dodaj točko'})); });
    expect(graph.model.points).toHaveLength(3);
    expect(objects(graph, 'point')).toHaveLength(3);
    expect(document.querySelector('[data-pointset-notice]')!.textContent).toContain('Doseženo je največje število točk (3)');
    act(() => { setLanguage('en'); });
    expect(document.querySelector('[data-pointset-notice]')!.textContent).toContain('maximum number of points (3)');
});

test('a bow-tie is reported as not simple in words, a square as simple', () => {
    const graph = new Observed();
    mount(graph);
    load(graph, model([[0, 0], [2, 2], [2, 0], [0, 2]], {mode: 'polygon', closed: true}));
    expect(graph.simplicity()).toEqual({simple: false, edges: [0, 2]});
    const status = () => document.querySelector('[data-pointset-status]')!;
    expect(status().getAttribute('data-pointset-status')).toBe('not-simple');
    expect(status().textContent).toBe('Večkotnik ni enostaven: stranici 1 in 3 se stikata ali sekata.');
    expect(objects(graph, 'segment')).toHaveLength(4);
    load(graph, model([[0, 0], [2, 0], [2, 2], [0, 2]], {mode: 'polygon', closed: true}));
    expect(status().getAttribute('data-pointset-status')).toBe('simple');
    expect(status().textContent).toBe('Večkotnik je enostaven.');
    act(() => { graph.setPolygonClosed(false); });
    expect(objects(graph, 'segment')).toHaveLength(3);
    expect(status().textContent).toBe('Lomljena črta je enostavna.');
    load(graph, model([[0, 0], [1, 1]], {mode: 'points'}));
    // the live region stays mounted (so its text change is announced) and is empty outside polygon mode
    expect(status().getAttribute('role')).toBe('status');
    expect(status().textContent).toBe('');
    expect(document.querySelectorAll('[data-pointset-status]')).toHaveLength(1);
});

test('presets restore the saved model and overlays, and invalid data is refused with a reason', async () => {
    const graph = new Observed();
    mount(graph);
    const saved = model([[1, 1], [2, 2], [3, 1]], {mode: 'polygon', closed: true});
    load(graph, saved);
    act(() => { graph.setOverlay('grid', true); });
    act(() => { graph.saveCurrentPreset('mine'); });
    load(graph, model([[9, 9]]));
    act(() => { graph.setOverlay('grid', false); });
    expect(objects(graph, 'point')).toHaveLength(1);
    await settle(() => graph.selectPreset('mine'));
    expect(graph.model).toEqual(saved);
    expect(pointCoordinates(graph)).toEqual([[1, 1], [2, 2], [3, 1]]);
    expect(objects(graph, 'segment')).toHaveLength(3);
    expect(graph.overlayShown('grid')).toBe(true);
    expect(objects(graph, 'grid').length).toBeGreaterThan(0);

    const refused = graph.presetCollection().check({mode: 'points', points: [{x: 0.25, y: 0}]});
    expect('rejection' in refused && refused.rejection.key).toBe('pointset_invalid_non_integer_coordinate');
    expect(graph.presets()).toBe(POINT_SET_PRESET_KEY);
});

test('Reset returns model, selection, Add mode and overlays to the default scene', async () => {
    const graph = new Observed();
    mount(graph);
    load(graph, model([[5, 5]]));
    act(() => { graph.select(0); graph.setAddMode(true); graph.setOverlay('grid', true); });
    expect(addModeButton().getAttribute('aria-pressed')).toBe('true');
    expect(objects(graph, 'grid').length).toBeGreaterThan(0);
    await settle(() => graph.reset());
    expect(graph.model).toEqual(DEFAULT_POINT_SET_MODEL);
    expect(pointCoordinates(graph)).toEqual(DEFAULT_POINT_SET_MODEL.points.map(p => [p.x, p.y]));
    expect(graph.selectedIndex).toBeUndefined();
    expect(graph.isAddMode).toBe(false);
    expect(graph.overlayShown('grid')).toBe(false);
    expect(objects(graph, 'grid')).toHaveLength(0);
    expect(addModeButton().getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('Nobena točka ni izbrana.')).toBeInTheDocument();
});

test('the grid overlay follows its switch, and a subclass overlay is drawn from the model through the hook', () => {
    const graph = new LabelledGraph();
    mount(graph);
    expect(objects(graph, 'grid')).toHaveLength(0);
    act(() => { fireEvent.click(screen.getByLabelText('Mreža')); });
    expect(objects(graph, 'grid').length).toBeGreaterThan(0);
    act(() => { fireEvent.click(screen.getByLabelText('Mreža')); });
    expect(objects(graph, 'grid')).toHaveLength(0);

    const labels = () => objects(graph, 'text').filter(o => o.plaintext === 'overlay').length;
    expect(labels()).toBe(0);
    act(() => { graph.setOverlay('labels', true); });
    expect(labels()).toBe(DEFAULT_POINT_SET_MODEL.points.length);
    act(() => { graph.loadModel(model([[0, 0], [1, 1]])); });
    expect(labels()).toBe(2);
    act(() => { graph.setOverlay('labels', false); });
    expect(labels()).toBe(0);
    const open: PointSetGraph<string> = graph;
    expect(() => open.setOverlay('nope', true)).toThrow();
});

test('scene changes leave no stale board objects: returning to a scene restores exactly its object count', () => {
    const graph = new Observed();
    mount(graph);
    const list = () => graph.liveBoard().objectsList.length;
    const defaults = DEFAULT_POINT_SET_MODEL;
    const plain = list();
    // overlay on and off, repeatedly
    act(() => { graph.setOverlay('grid', true); });
    const withGrid = list();
    expect(withGrid).toBeGreaterThan(plain);
    for (let i = 0; i < 3; i++) {
        act(() => { graph.setOverlay('grid', false); });
        expect(list()).toBe(plain);
        act(() => { graph.setOverlay('grid', true); });
        expect(list()).toBe(withGrid);
    }
    // a smaller model shrinks the scene (grid kept), the original model restores it
    load(graph, model([[0, 0], [1, 1]]));
    expect(list()).toBeLessThan(withGrid);
    expect(objects(graph, 'point')).toHaveLength(2);
    load(graph, defaults);
    expect(list()).toBe(withGrid);
    act(() => { graph.setOverlay('grid', false); });
    // polygon edges come and go with the closing edge
    load(graph, model([[0, 0], [2, 0], [2, 2]], {mode: 'polygon', closed: true}));
    const closed = list();
    act(() => { graph.setPolygonClosed(false); });
    expect(list()).toBeLessThan(closed);
    act(() => { graph.setPolygonClosed(true); });
    expect(list()).toBe(closed);
    act(() => { graph.clear(); });
    expect(objects(graph, 'point')).toHaveLength(0);
    expect(objects(graph, 'segment')).toHaveLength(0);
    const empty = list();
    expect(empty).toBeLessThan(plain);
    load(graph, defaults);
    expect(list()).toBe(plain);
    expect(empty + 2 * defaults.points.length).toBeLessThanOrEqual(plain);
});

test('unmount removes listeners and attributes and leaves no scene objects; a StrictMode remount draws the scene once', () => {
    const graph = new Observed();
    const view = mount(graph, true);
    const box = container(graph);
    expect(objects(graph, 'point')).toHaveLength(DEFAULT_POINT_SET_MODEL.points.length);
    expect(box.getAttribute('tabindex')).toBe('0');
    const remove = vi.spyOn(box, 'removeEventListener');
    view.unmount();
    expect(remove.mock.calls.filter(([type, listener]) => type === 'keydown' && listener === graph['onKeyDown'])).toHaveLength(1);
    expect(box.hasAttribute('tabindex')).toBe(false);
    expect(box.hasAttribute('aria-label')).toBe(false);
    // a key press after unmount reaches nothing
    expect(() => fireEvent.keyDown(box, {key: 'Delete'})).not.toThrow();
});

test('a language switch updates the controls and the board label and keeps model, selection and board', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.select(2); });
    const before = {model: graph.model, coords: pointCoordinates(graph)};
    expect(container(graph).getAttribute('aria-label')).toContain('Točke na mreži');
    act(() => { setLanguage('en'); });
    expect(container(graph).getAttribute('aria-label')).toContain('Points on a grid');
    expect(screen.getByRole('button', {name: 'Add point'})).toBeInTheDocument();
    expect(screen.getByText('Selected point: 3')).toBeInTheDocument();
    expect(within(document.body).getByLabelText('Point 1: x')).toBeInTheDocument();
    expect(graph.model).toBe(before.model);
    expect(graph.selectedIndex).toBe(2);
    expect(pointCoordinates(graph)).toEqual(before.coords);
});
