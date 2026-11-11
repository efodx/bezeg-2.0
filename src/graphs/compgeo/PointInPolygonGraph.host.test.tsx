import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {enterNumber} from '../../inputs/testEntry';
import {MemoryRouter} from 'react-router-dom';
import {NOTCHED_MODEL, NOTCHED_QUERY, PENTAGRAM_MODEL, PointInPolygonGraph} from './PointInPolygonGraph';
import {pointInPolygonPresetCollection} from './pointInPolygonPresetCollection';
import {GraphHost} from '../base/GraphHost';
import {selectedPointKeyBehaviour} from '../base/selectedPointKeyBehaviour';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {GRID_COORD_LIMIT, GridPoint} from '../../compgeo/grid';
import {setLanguage} from '../../localization';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

class Observed extends PointInPolygonGraph {
    liveBoard() { return this.board; }
}

type Shown = {elType: string; name?: string; plaintext?: string; X?: () => number; Y?: () => number; visProp?: Record<string, unknown>; rendNode?: Element};
type Triggerable = {triggerEventHandlers(names: string[], args: unknown[]): void};
/** JSXGraph's event trigger is missing from its type declarations; this narrows to it without a cast. */
const trigger = (target: object, name: string): void => {
    if (!('triggerEventHandlers' in target) || typeof target.triggerEventHandlers !== 'function') throw new Error('Not a JSXGraph element.');
    const handlers: Triggerable['triggerEventHandlers'] = target.triggerEventHandlers.bind(target);
    handlers([name], []);
};
const all = (graph: Observed) => graph.liveBoard().objectsList as Shown[];
const named = (graph: Observed, prefix: string) => all(graph).filter(o => (o.name ?? '').startsWith(prefix));
const queryObject = (graph: Observed): Shown => {
    const found = all(graph).filter(o => o.name === 'q' && o.elType === 'point');
    expect(found).toHaveLength(1);
    return found[0];
};
const mount = (graph: Observed, strict = false) => {
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
};
const readout = () => {
    const element = document.querySelector('[data-pip-readout]');
    if (!element) throw new Error('no readout');
    return element as HTMLElement;
};
const text = () => readout().textContent ?? '';
const live = () => readout().querySelector('[data-pip-live]')!.textContent;
const place = (graph: Observed, q: GridPoint) => act(() => { expect(graph.setQuery(q)).toBe(true); });
const box = (graph: Observed) => graph.liveBoard().containerObj as HTMLElement;
const key = (graph: Observed, name: string) => act(() => { fireEvent.keyDown(box(graph), {key: name}); });
const texts = (graph: Observed, prefix: string) => named(graph, prefix).map(o => o.plaintext ?? '');
const counts = () => [readout().dataset.pipCrossings, readout().dataset.pipWinding];

test('the default is the notched pentagon with q = (3,1): inside, one crossing, winding 1, in one live line', () => {
    const graph = new Observed();
    mount(graph);
    expect(graph.model).toEqual(NOTCHED_MODEL);
    expect(graph.query).toEqual(NOTCHED_QUERY);
    expect(readout().querySelectorAll('[role="status"]')).toHaveLength(0);
    expect(live()).toBe('Točka q je znotraj večkotnika.');
    expect(readout().dataset.pipLocation).toBe('inside');
    expect(counts()).toEqual(['1', '1']);
    expect(text()).toContain('Število presečišč poltraka z robom: 1');
    expect(text()).toContain('Sodo-liho pravilo: znotraj (liho število presečišč)');
    expect(text()).toContain('Ovojno število: 1');
    expect(text()).toContain('Neničelno pravilo: znotraj (ovojno število ni 0)');
    expect(text()).not.toContain('seka samega sebe');
    const q = queryObject(graph);
    expect([q.X!(), q.Y!()]).toEqual([3, 1]);
});

test('the other two pentagon queries: (1,3) inside with winding 1, (3,3) in the notch outside with two crossings', () => {
    const graph = new Observed();
    mount(graph);
    place(graph, {x: 1, y: 3});
    expect(live()).toBe('Točka q je znotraj večkotnika.');
    // Task 16's kernel: the ray from (1,3) meets three edges (x = 6 and 9/2 and 3/2 on y = 3), winding +1 -1 +1 = 1.
    expect(counts()).toEqual(['3', '1']);
    expect(named(graph, 'ray-crossing')).toHaveLength(3);
    place(graph, {x: 3, y: 3});
    expect(live()).toBe('Točka q je zunaj večkotnika.');
    expect(counts()).toEqual(['2', '0']);
    expect(text()).toContain('Sodo-liho pravilo: zunaj (sodo število presečišč)');
    expect(named(graph, 'ray-crossing')).toHaveLength(2);
});

test('the pentagram: centre has winding 2 and the rules differ (self-intersecting label); a tip has winding 1', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.loadFigure('pentagram'); });
    expect(graph.model).toEqual(PENTAGRAM_MODEL);
    expect(graph.query).toEqual({x: 0, y: 0});
    expect(live()).toBe('Točka q je znotraj ali zunaj, odvisno od pravila.');
    expect(readout().dataset.pipLocation).toBe('rules-differ');
    expect(counts()).toEqual(['2', '2']);
    expect(text()).toContain('Sodo-liho pravilo: zunaj');
    expect(text()).toContain('Neničelno pravilo: znotraj');
    expect(text()).toContain('Večkotnik seka samega sebe');
    place(graph, {x: 0, y: 9});
    expect(live()).toBe('Točka q je znotraj večkotnika.');
    expect(counts()).toEqual(['1', '1']);
    expect(text()).toContain('Večkotnik seka samega sebe');
    act(() => { graph.loadFigure('notched'); });
    expect(graph.query).toEqual(NOTCHED_QUERY);
    expect(text()).not.toContain('seka samega sebe');
});

test('dragging q onto an edge says "on the boundary" with no count; the board point snaps to the grid', () => {
    const graph = new Observed();
    mount(graph);
    const q = queryObject(graph);
    const moveTo = (x: number, y: number) => act(() => {
        if (!('moveTo' in q) || typeof q.moveTo !== 'function') throw new Error('Not a JSXGraph point.');
        q.moveTo([x, y], 0);
        trigger(q, 'drag');
    });
    moveTo(2.6, 0.2);
    expect(graph.query).toEqual({x: 3, y: 0});
    expect([q.X!(), q.Y!()]).toEqual([3, 0]);
    expect(live()).toBe('Točka q je na robu večkotnika.');
    expect(readout().dataset.pipLocation).toBe('boundary');
    expect(counts()).toEqual(['', '']);
    expect(text()).toContain('Na robu število presečišč in ovojno število nista določena.');
    expect(text()).not.toContain('Število presečišč poltraka');
    expect(text()).not.toContain('Ovojno število:');
    expect(named(graph, 'ray-')).toHaveLength(0);
    moveTo(3, 2);
    expect(live()).toBe('Točka q je na robu večkotnika.');
    moveTo(3, 1);
    expect(live()).toBe('Točka q je znotraj večkotnika.');
    expect(named(graph, 'ray-crossing')).toHaveLength(1);
});

test('a query on the horizontal through the notch vertex (3,2) shows the kernel verdict: (1,2) counts both edges at the vertex', () => {
    const graph = new Observed();
    mount(graph);
    place(graph, {x: 1, y: 2});
    expect(live()).toBe('Točka q je znotraj večkotnika.');
    expect(counts()).toEqual(['3', '1']);
    expect(texts(graph, 'ray-number').sort()).toEqual(['1', '2', '3']);
    expect(named(graph, 'ray-touch')).toHaveLength(0);
    place(graph, {x: 4, y: 2});
    expect(counts()).toEqual(['1', '1']);
});

test('vertex touches that do not count are diamonds, counted crossings circles: shape, not only colour', () => {
    const graph = new Observed();
    mount(graph);
    place(graph, {x: -1, y: 0});
    expect(live()).toBe('Točka q je zunaj večkotnika.');
    expect(named(graph, 'ray-crossing').map(o => o.visProp?.face)).toEqual(['o', 'o']);
    const touches = named(graph, 'ray-touch');
    expect(touches.map(o => [o.X!(), o.Y!(), o.visProp?.face])).toEqual([[0, 0, '<>'], [6, 0, '<>']]);
    expect(texts(graph, 'ray-number')).toEqual(['1', '2']);
});

test('the winding overlay labels each counted edge +1 or −1 and is removed when hidden', () => {
    const graph = new Observed();
    mount(graph);
    expect(named(graph, 'winding-')).toHaveLength(0);
    act(() => { graph.setOverlay('winding', true); });
    expect(texts(graph, 'winding-label')).toEqual(['+1']);
    expect(named(graph, 'winding-edge')).toHaveLength(1);
    place(graph, {x: 3, y: 3});
    expect(texts(graph, 'winding-label').sort()).toEqual(['+1', '−1']);
    act(() => { graph.setOverlay('winding', false); });
    expect(named(graph, 'winding-')).toHaveLength(0);
});

test('overlay objects are exact: removed when hidden, restored identically, kept for q, and freed on unmount', () => {
    const graph = new Observed();
    const view = mount(graph, true);
    const board = graph.liveBoard();
    const list = () => all(graph).length;
    act(() => { graph.setOverlay('winding', true); });
    const full = list();
    expect(all(graph).filter(o => o.name === 'q')).toHaveLength(1);
    expect([named(graph, 'ray-line').length, named(graph, 'ray-crossing').length, named(graph, 'ray-number').length]).toEqual([1, 1, 1]);
    expect([named(graph, 'winding-edge').length, named(graph, 'winding-label').length]).toEqual([1, 1]);
    act(() => { graph.setOverlay('ray', false); });
    const noRay = list();
    expect(named(graph, 'ray-')).toHaveLength(0);
    expect(noRay).toBeLessThan(full);
    act(() => { graph.setOverlay('winding', false); });
    const bare = list();
    expect(bare).toBeLessThan(noRay);
    for (let i = 0; i < 3; i++) {
        act(() => { graph.setOverlay('ray', true); graph.setOverlay('winding', true); });
        expect(list()).toBe(full);
        act(() => { graph.setOverlay('ray', false); graph.setOverlay('winding', false); });
        expect(list()).toBe(bare);
    }
    // Moving q rebuilds the overlays without leaking: the same counts at a place with the same shape of answer.
    act(() => { graph.setOverlay('ray', true); graph.setOverlay('winding', true); });
    place(graph, {x: 2, y: 1});
    expect(list()).toBe(full);
    place(graph, {x: 3, y: 1});
    expect(list()).toBe(full);
    expect(named(graph, 'ray-').length + named(graph, 'winding-').length).toBe(5);
    expect(Object.keys(board.objects).length).toBeGreaterThan(5);
    const removed = vi.spyOn(box(graph), 'removeEventListener');
    view.unmount();
    expect(removed.mock.calls.filter(([type, listener]) => type === 'keydown' && listener === graph['onQueryKey'])).toHaveLength(1);
    expect(removed.mock.calls.filter(([type, listener]) => type === 'keydown' && listener === graph['onKeyDown'])).toHaveLength(1);
    // JSXGraph's freeBoard empties board.objects (objectsList keeps stale references): the overlay objects, q and everything else are gone.
    expect(Object.keys(board.objects)).toHaveLength(0);
    expect((board.objectsList as Shown[]).filter(o => o.name === 'q')).toHaveLength(0);
});

selectedPointKeyBehaviour('point in polygon, q', () => {
    const graph = new Observed();
    mount(graph);
    return {
        graph,
        board: () => box(graph),
        select: () => screen.getByRole('button', {name: 'Izberi: q'}).click(),
        position: () => [graph.query.x, graph.query.y],
        snapshot: () => [graph.model, graph.query],
    };
}, {
    step: [1, 1],
    extra: ({graph}, press) => {
        expect(screen.getByRole('button', {name: 'Izberi: q'}).getAttribute('aria-pressed')).toBe('true');
        press('ArrowRight');
        press('ArrowUp');
        expect(graph.query).toEqual({x: 4, y: 2});
        expect(graph.model).toEqual(NOTCHED_MODEL);
        expect([queryObject(graph).X!(), queryObject(graph).Y!()]).toEqual([4, 2]);
        expect(live()).toBe('Točka q je znotraj večkotnika.');
        act(() => { graph.select(1); });
        press('ArrowLeft');
        expect(graph.query).toEqual({x: 4, y: 2});
        expect(graph.model.points[1]).toEqual({x: 5, y: 0});
        expect(graph.isQueryActive).toBe(false);
        act(() => { graph.select(undefined); });
        press('ArrowLeft');
        expect(graph.query).toEqual({x: 4, y: 2});
        act(() => { graph.selectQuery(true); });
        key(graph, 'Escape');
        press('ArrowLeft');
        expect(graph.query).toEqual({x: 4, y: 2});
    },
});

test('pressing q selects it and clears the vertex selection; q stops silently beyond the coordinate limit', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.select(2); });
    act(() => { trigger(queryObject(graph), 'down'); });
    expect(graph.selectedIndex).toBeUndefined();
    expect(graph.isQueryActive).toBe(true);
    // Beyond the coordinate limit the move stops without a notice (decision 7); a typed value is explained by its field.
    act(() => { expect(graph.setQuery({x: GRID_COORD_LIMIT + 1, y: 0})).toBe(false); });
    expect(graph.query).toEqual({x: 3, y: 1});
    expect(graph.notice).toBeUndefined();
    expect(document.querySelector('[data-pointset-notice]')!.textContent).toBe('');
    expect(document.querySelector('[data-refusal-notice]')!.textContent).toBe('');
    place(graph, {x: GRID_COORD_LIMIT, y: 0});
    expect(graph.query).toEqual({x: GRID_COORD_LIMIT, y: 0});
});

test('adding and removing vertices does not move q; the numeric fields move it', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { expect(graph.addPointAt({x: 7, y: 5})).toBe(true); });
    expect(graph.model.points).toHaveLength(6);
    expect(graph.query).toEqual(NOTCHED_QUERY);
    act(() => { graph.select(5); graph.removeSelected(); });
    expect(graph.model.points).toHaveLength(5);
    expect(graph.query).toEqual(NOTCHED_QUERY);
    expect(queryObject(graph).X!()).toBe(3);
    act(() => { enterNumber(screen.getByRole('spinbutton', {name: 'q, x'}), '1'); });
    act(() => { enterNumber(screen.getByRole('spinbutton', {name: 'q, y'}), '3'); });
    expect(graph.query).toEqual({x: 1, y: 3});
    // The shared single-point list: only q's select button, no add or remove.
    const group = screen.getByRole('group', {name: 'Poizvedbena točka q'});
    expect([...group.querySelectorAll('button')].map(b => b.getAttribute('aria-label'))).toEqual(['Izberi: q']);
});

test('values off: the same readout element holds one neutral sentence with empty data, the board overlays stay; on restores', () => {
    const graph = new Observed();
    mount(graph);
    const element = readout();
    act(() => { graph.setOverlay('values', false); });
    expect(readout()).toBe(element);
    expect(text()).toBe('Rezultat je skrit; prikaz se vklopi v stikalu prekrivanj.');
    expect(['pipReadout', 'pipLocation', 'pipCrossings', 'pipWinding'].map(k => readout().dataset[k])).toEqual(['', '', '', '']);
    expect(named(graph, 'ray-crossing')).toHaveLength(1);
    place(graph, {x: 3, y: 3});
    expect(text()).not.toContain('zunaj');
    act(() => { graph.setOverlay('values', true); });
    expect(readout()).toBe(element);
    expect(live()).toBe('Točka q je zunaj večkotnika.');
    expect(readout().dataset.pipCrossings).toBe('2');
});

test('the readout and the q label follow a language switch and a scene change', async () => {
    const graph = new Observed();
    mount(graph);
    const label = () => queryObject(graph).rendNode?.getAttribute('aria-label');
    expect(label()).toBe('Poizvedbena točka q');
    act(() => { setLanguage('en'); });
    expect(live()).toBe('Point q is inside the polygon.');
    expect(text()).toContain('Crossings of the ray with the boundary: 1');
    expect(text()).toContain('Even–odd rule: inside (odd number of crossings)');
    expect(label()).toBe('Query point q');
    act(() => { graph.loadFigure('pentagram'); });
    expect(live()).toBe('Point q is inside or outside, depending on the rule.');
    expect(text()).toContain('Winding number: 2');
    expect(text()).toContain('The polygon intersects itself');
    place(graph, {x: 9, y: 9});
    expect(live()).toBe('Point q is outside the polygon.');
    let reset: Promise<void> = Promise.resolve();
    act(() => { reset = graph.reset(); });
    await act(async () => { await reset; });
    expect(graph.model).toEqual(NOTCHED_MODEL);
    expect(graph.query).toEqual(NOTCHED_QUERY);
    expect(live()).toBe('Point q is inside the polygon.');
    expect([queryObject(graph).X!(), queryObject(graph).Y!()]).toEqual([3, 1]);
    expect(named(graph, 'ray-crossing')).toHaveLength(1);
    act(() => { setLanguage('sl'); });
    expect(live()).toBe('Točka q je znotraj večkotnika.');
    expect(label()).toBe('Poizvedbena točka q');
});

test('an open polygon and too few vertices say why there is no verdict, in both languages, with no ray', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.setPolygonClosed(false); });
    expect(readout().dataset.pipReadout).toBe('message');
    expect(live()).toBe('Večkotnik ni sklenjen, zato točke ni mogoče umestiti.');
    expect(named(graph, 'ray-')).toHaveLength(0);
    act(() => { setLanguage('en'); });
    expect(live()).toBe('The polygon is not closed, so the point cannot be located.');
    act(() => { graph.loadModel({...NOTCHED_MODEL, points: NOTCHED_MODEL.points.slice(0, 2)}); });
    expect(live()).toBe('At least 3 vertices are needed to locate the point; missing: 1.');
    expect(graph.query).toEqual(NOTCHED_QUERY);
});

test('the Preset carries the polygon as data and q in graphState; a fractional or out-of-range q is rejected', () => {
    const graph = new Observed();
    mount(graph);
    place(graph, {x: 1, y: 3});
    const preset = graph.exportPreset();
    expect(preset.graphState).toMatchObject({query: {x: 1, y: 3}});
    expect(preset.graphState).toBeDefined();
    expect(preset.graphState && 'model' in preset.graphState).toBe(false);
    expect(pointInPolygonPresetCollection.checkGraphState?.(preset.graphState)).toBeUndefined();
    expect(pointInPolygonPresetCollection.checkGraphState?.({query: {x: 0.5, y: 0}})).toBeDefined();
    expect(pointInPolygonPresetCollection.checkGraphState?.({query: {x: GRID_COORD_LIMIT + 1, y: 0}})).toBeDefined();
    expect(pointInPolygonPresetCollection.checkGraphState?.({query: {x: 1, y: 3}, overlays: {ray: true, values: false}})).toBeUndefined();
    expect(pointInPolygonPresetCollection.checkGraphState?.({overlays: {fan: true}})).toBeDefined();
});
