import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {PointSetGraph} from './PointSetGraph';
import {OrientationGraph} from './OrientationGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {PointSetModel} from '../../compgeo/pointSetModel';
import {setLanguage} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

/** A graph of the sweep family: it opts in to segments mode through the documented hook. */
class SegmentGraph extends PointSetGraph {
    protected override allowsSegments() { return true; }
    /** A host with its own Preset key, as the real sweep graphs have: the shared point-set key allows neither mode, so a stored read would refuse it. */
    override presetCollection() { return {...super.presetCollection(), key: 'test-segments-host'}; }
    liveBoard() { return this.board; }
}

class PlainGraph extends PointSetGraph {
    liveBoard() { return this.board; }
}

type Live = {liveBoard(): {objectsList: unknown[]}};
type Shown = {elType: string; name?: string; X?: () => number; Y?: () => number; plaintext?: string; point1?: JXG.Point; point2?: JXG.Point};
const shown = (graph: Live) => graph.liveBoard().objectsList as Shown[];
const segmentObjects = (graph: Live) => shown(graph).filter(o => o.elType === 'segment');
const labelObjects = (graph: Live) => shown(graph).filter(o => o.elType === 'text' && /^s\d+$/.test(o.plaintext ?? ''));
const endpointObjects = (graph: Live) => shown(graph).filter(o => o.elType === 'point' && /^P\d+$/.test(o.name ?? ''));
const pendingObjects = (graph: Live) => shown(graph).filter(o => o.elType === 'point' && o.name === 'pending');
const endpoints = (graph: Live) => endpointObjects(graph).map(p => [p.X!(), p.Y!()]);
/** The two endpoints of every drawn segment, read from the board's segment objects (not from the model). */
const drawnSegments = (graph: Live) => segmentObjects(graph).map(s => [[s.point1!.X(), s.point1!.Y()], [s.point2!.X(), s.point2!.Y()]]);
const modelSegments = (graph: SegmentGraph) =>
    Array.from({length: graph.model.points.length >> 1}, (_, k) => {
        const [a, b] = [graph.model.points[2 * k], graph.model.points[2 * k + 1]];
        return [[a.x, a.y], [b.x, b.y]];
    });
/** The strongest board check: segments, midpoint labels and endpoint points all equal what the model says. */
function expectBoardMatchesModel(graph: SegmentGraph) {
    expect(drawnSegments(graph)).toEqual(modelSegments(graph));
    expect(endpoints(graph)).toEqual(graph.model.points.map(p => [p.x, p.y]));
    const labels = labelObjects(graph);
    expect(labels.map(l => l.plaintext)).toEqual(modelSegments(graph).map((_, k) => `s${k + 1}`));
    labels.forEach((label, k) => {
        const [[ax, ay], [bx, by]] = modelSegments(graph)[k];
        expect([label.X!(), label.Y!()]).toEqual([(ax + bx) / 2, (ay + by) / 2]);
    });
}

const mount = (graph: PointSetGraph<string>, strict = false) => {
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
};
const segs = (...xy: number[][]): PointSetModel =>
    ({mode: 'segments', closed: false, gridStepExponent: 0, points: xy.map(([x, y]) => ({x, y}))});
const load = (graph: PointSetGraph<string>, next: PointSetModel) => act(() => { graph.loadModel(next); });
const container = (graph: SegmentGraph) => graph.liveBoard().containerObj as HTMLElement;
async function settle(start: () => Promise<void>): Promise<void> {
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = start(); });
    await act(async () => { await pending; });
}
type Triggerable = {triggerEventHandlers(names: string[], args: unknown[]): void};
const trigger = (target: object, name: string, args: unknown[]): void => {
    if (!('triggerEventHandlers' in target) || typeof target.triggerEventHandlers !== 'function') throw new Error('Not a JSXGraph element.');
    const handlers: Triggerable['triggerEventHandlers'] = target.triggerEventHandlers.bind(target);
    handlers([name], args);
};
const addModeButton = () => screen.getByRole('button', {name: 'Dodajanje z dotikom ali klikom'});
const click = (graph: SegmentGraph, x: number, y: number) => {
    const board = graph.liveBoard() as unknown as {getUsrCoordsOfMouse(e: unknown): number[]; getAllObjectsUnderMouse(e: unknown): unknown[]};
    vi.spyOn(board, 'getUsrCoordsOfMouse').mockReturnValue([x, y]);
    vi.spyOn(board, 'getAllObjectsUnderMouse').mockReturnValue([]);
    act(() => { trigger(board, 'down', [{}]); });
};

test('a segments-mode scene draws one segment, one s<k> label at its midpoint and two endpoints per model segment', () => {
    const graph = new SegmentGraph();
    mount(graph);
    load(graph, segs([0, 0], [4, 2], [-3, 1], [1, -5]));
    expect(segmentObjects(graph)).toHaveLength(2);
    expectBoardMatchesModel(graph);
});

test('Add mode: the first click places a pending endpoint, the second adds the segment; Escape cancels', () => {
    const graph = new SegmentGraph();
    mount(graph);
    load(graph, segs([0, 0], [1, 1]));
    act(() => { fireEvent.click(addModeButton()); });
    click(graph, 2.4, -2.6);
    expect(graph.pendingEndpoint).toEqual({x: 2, y: -3});
    expect(graph.model.points).toHaveLength(2);
    expect(pendingObjects(graph)).toHaveLength(1);
    expect(document.querySelector('[data-pointset-pending]')!.textContent).toMatch(/Prvo krajišče je postavljeno v \(2, -3\)/);
    click(graph, -1.2, 3.4);
    expect(graph.pendingEndpoint).toBeUndefined();
    expect(graph.model.points).toEqual([{x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: -3}, {x: -1, y: 3}]);
    expect(pendingObjects(graph)).toHaveLength(0);
    expectBoardMatchesModel(graph);

    click(graph, 5, 5);
    expect(pendingObjects(graph)).toHaveLength(1);
    act(() => { fireEvent.keyDown(container(graph), {key: 'Escape'}); });
    expect(graph.pendingEndpoint).toBeUndefined();
    expect(pendingObjects(graph)).toHaveLength(0);
    expect(graph.model.points).toHaveLength(4);
    // turning Add mode off also drops a pending endpoint, and the pending point is never stored
    click(graph, 5, 5);
    expect(JSON.stringify(graph.exportPreset())).not.toContain('pending');
    act(() => { fireEvent.click(addModeButton()); });
    expect(graph.pendingEndpoint).toBeUndefined();
    expect(pendingObjects(graph)).toHaveLength(0);
});

test('Add segment adds a default short segment for keyboard users and the board matches', () => {
    const graph = new SegmentGraph();
    mount(graph);
    load(graph, segs());
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Dodaj daljico'})); });
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Dodaj daljico'})); });
    expect(graph.model.points).toEqual([{x: -1, y: -2}, {x: 1, y: -2}, {x: -1, y: -1}, {x: 1, y: -1}]);
    expectBoardMatchesModel(graph);
    expect(screen.getByText('Daljic: 2 od največ 12')).toBeInTheDocument();
});

test('dragging an endpoint snaps it and the segment and its label follow', () => {
    const graph = new SegmentGraph();
    mount(graph);
    load(graph, segs([0, 0], [4, 2], [-3, 1], [1, -5]));
    const point = endpointObjects(graph)[3] as unknown as JXG.Point;
    act(() => { point.moveTo([2.4, -3.6], 0); trigger(point, 'drag', []); });
    expect(graph.model.points[3]).toEqual({x: 2, y: -4});
    expect(graph.selectedIndex).toBe(3);
    expectBoardMatchesModel(graph);
    // the selected endpoint's whole segment is highlighted, the other one is not
    const [first, second] = segmentObjects(graph) as unknown as Array<{visProp: Record<string, unknown>}>;
    const colour = (s: {visProp: Record<string, unknown>}) => typeof s.visProp.strokecolor === 'function' ? (s.visProp.strokecolor as () => string)() : s.visProp.strokecolor;
    expect(colour(second)).not.toBe(colour(first));
    act(() => { graph.select(0); });
    expect(colour(first)).not.toBe(colour(second));
});

test('Delete and the remove buttons remove the whole segment, with its label and both endpoints', () => {
    const graph = new SegmentGraph();
    mount(graph);
    load(graph, segs([0, 0], [4, 2], [-3, 1], [1, -5], [2, 2], [3, 3]));
    act(() => { graph.select(3); });
    act(() => { fireEvent.keyDown(container(graph), {key: 'Delete'}); });
    expect(graph.model.points).toEqual([{x: 0, y: 0}, {x: 4, y: 2}, {x: 2, y: 2}, {x: 3, y: 3}]);
    expect(graph.selectedIndex).toBeUndefined();
    expectBoardMatchesModel(graph);
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Odstrani daljico s1'})); });
    expect(graph.model.points).toEqual([{x: 2, y: 2}, {x: 3, y: 3}]);
    expect(segmentObjects(graph)).toHaveLength(1);
    expect(labelObjects(graph)).toHaveLength(1);
    expectBoardMatchesModel(graph);
    // With nothing selected the remove button names a segment, not a point (Wave 2 smoke).
    expect(screen.getByRole('button', {name: 'Odstrani izbrano daljico'})).toHaveAccessibleDescription(expect.stringContaining('Nobena daljica ni izbrana.'));
    expect(document.querySelector('[data-pointset-selection]')?.textContent).toBe('Nobena daljica ni izbrana.');
    act(() => { graph.select(0); });
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Odstrani izbrano daljico'})); });
    expect(graph.model.points).toHaveLength(0);
    expect(segmentObjects(graph)).toHaveLength(0);
    expect(labelObjects(graph)).toHaveLength(0);
    expect(endpointObjects(graph)).toHaveLength(0);
});

test('numeric endpoint fields grouped per segment move the endpoint and the board follows', () => {
    const graph = new SegmentGraph();
    mount(graph);
    load(graph, segs([0, 0], [4, 2], [-3, 1], [1, -5]));
    const field = screen.getByLabelText('Daljica s2, krajišče 2: y');
    act(() => { enterNumber(field, '7'); });
    expect(graph.model.points[3]).toEqual({x: 1, y: 7});
    expectBoardMatchesModel(graph);
});

test('wiring: Add segment is a shared unavailable button at the limit, its press shows the reason alone; an out-of-limit endpoint is refused, never clipped', () => {
    const graph = new SegmentGraph({coordinateLimit: 1024});
    mount(graph);
    load(graph, segs(...Array.from({length: 24}, (_, i) => [i, i % 2])));
    const add = screen.getByRole('button', {name: 'Dodaj daljico'});
    expect(add.getAttribute('aria-disabled')).toBe('true');
    expect(add.getAttribute('title')).toMatch(/Doseženo je največje število daljic \(12\)/);
    act(() => { fireEvent.click(add); });
    expect(graph.model.points).toHaveLength(24);
    expect(document.querySelector('[data-refusal-notice]')!.textContent).toMatch(/Doseženo je največje število daljic \(12\)/);
    expectBoardMatchesModel(graph);
    load(graph, segs());
    act(() => { expect(graph.addSegmentAt({x: 0, y: 0}, {x: 1025, y: 0})).toBe(false); });
    expect(graph.model.points).toHaveLength(0);
    expect(screen.getByText(/koordinate smejo biti največ 1024/)).toBeInTheDocument();
});

test('a Preset round trip restores the segments on the board and Reset returns to the default scene', async () => {
    const graph = new SegmentGraph();
    mount(graph);
    const saved = segs([0, 0], [4, 2], [-3, 1], [1, -5]);
    load(graph, saved);
    act(() => { graph.saveCurrentPreset('mine'); });
    load(graph, segs([9, 9], [8, 8]));
    expect(drawnSegments(graph)).toEqual([[[9, 9], [8, 8]]]);
    await settle(() => graph.selectPreset('mine'));
    expect(graph.model).toEqual(saved);
    expectBoardMatchesModel(graph);
    expect(segmentObjects(graph)).toHaveLength(2);

    const check = graph.presetCollection().check({mode: 'segments', points: [{x: 0, y: 0}]});
    expect('rejection' in check && check.rejection.key).toBe('pointset_invalid_odd_segment_endpoints');
    expect(graph.presetCollection().check({mode: 'segments', points: [{x: 0, y: 0}, {x: 1, y: 1}]})).toHaveProperty('data');

})

test('Reset returns a segments scene to the default scene and clears pending state and Add mode', async () => {
    const graph = new SegmentGraph();
    mount(graph);
    load(graph, segs([0, 0], [4, 2], [-3, 1], [1, -5]));
    act(() => { graph.select(1); graph.setAddMode(true); });
    click(graph, 3, 3);
    expect(pendingObjects(graph)).toHaveLength(1);
    await settle(() => graph.reset());
    expect(graph.model.mode).toBe('points');
    expect(segmentObjects(graph)).toHaveLength(0);
    expect(labelObjects(graph)).toHaveLength(0);
    expect(pendingObjects(graph)).toHaveLength(0);
    expect(endpointObjects(graph)).toHaveLength(graph.model.points.length);
    expect(graph.pendingEndpoint).toBeUndefined();
});

test('a pending endpoint does not survive a Preset replacement', async () => {
    const graph = new SegmentGraph();
    mount(graph);
    load(graph, segs([0, 0], [4, 2]));
    act(() => { graph.saveCurrentPreset('mine'); });
    act(() => { graph.setAddMode(true); });
    click(graph, 3, 3);
    expect(graph.pendingEndpoint).toEqual({x: 3, y: 3});
    await settle(() => graph.selectPreset('mine'));
    expect(graph.pendingEndpoint).toBeUndefined();
    expect(pendingObjects(graph)).toHaveLength(0);
});

test('a live language switch re-renders the segment inspector and keeps model, selection and board objects', () => {
    const graph = new SegmentGraph();
    mount(graph);
    load(graph, segs([0, 0], [4, 2], [-3, 1], [1, -5]));
    act(() => { graph.select(2); });
    const before = {model: graph.model, segments: segmentObjects(graph), labels: labelObjects(graph)};
    expect(screen.getByText('Izbrana daljica: s2')).toBeInTheDocument();
    expect(screen.getByRole('option', {name: 'Daljice'})).toBeInTheDocument();
    act(() => { setLanguage('en'); });
    expect(screen.getByText('Selected segment: s2')).toBeInTheDocument();
    expect(screen.getByRole('option', {name: 'Segments'})).toBeInTheDocument();
    expect(screen.getByLabelText('Segment s1, endpoint 2: x')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Add segment'})).toBeInTheDocument();
    expect(graph.model).toBe(before.model);
    expect(graph.selectedIndex).toBe(2);
    expect(segmentObjects(graph)).toEqual(before.segments);
    expect(labelObjects(graph)).toEqual(before.labels);
    expect(labelObjects(graph).map(l => l.plaintext)).toEqual(['s1', 's2']);
    expectBoardMatchesModel(graph);
});

test('switching modes keeps an even prefix going to segments and the board follows in both directions', () => {
    const graph = new SegmentGraph();
    mount(graph);
    load(graph, {mode: 'points', closed: false, gridStepExponent: 0, points: [{x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 2}]});
    act(() => { fireEvent.change(screen.getByRole('combobox', {name: 'Prikaz'}), {target: {value: 'segments'}}); });
    expect(graph.model.mode).toBe('segments');
    expect(graph.model.points).toEqual([{x: 0, y: 0}, {x: 1, y: 1}]);
    expectBoardMatchesModel(graph);
    act(() => { fireEvent.change(screen.getByRole('combobox', {name: 'Prikaz'}), {target: {value: 'points'}}); });
    expect(segmentObjects(graph)).toHaveLength(0);
    expect(labelObjects(graph)).toHaveLength(0);
    expect(endpointObjects(graph)).toHaveLength(2);
});

test('unmount leaves no segment objects and no listeners behind; a StrictMode mount draws each segment once', () => {
    const graph = new SegmentGraph();
    const view = mount(graph, true);
    load(graph, segs([0, 0], [4, 2], [-3, 1], [1, -5]));
    const box = container(graph);
    expect(segmentObjects(graph)).toHaveLength(2);
    expect(labelObjects(graph)).toHaveLength(2);
    act(() => { graph.setAddMode(true); });
    click(graph, 1, 1);
    expect(pendingObjects(graph)).toHaveLength(1);
    const remove = vi.spyOn(box, 'removeEventListener');
    view.unmount();
    expect(remove.mock.calls.filter(([type, listener]) => type === 'keydown' && listener === graph['onKeyDown'])).toHaveLength(1);
    // The board itself is freed by the session; the graph keeps no reference to any object it drew, and no pending state.
    expect(graph['drawn']).toBeUndefined();
    expect(graph['pendingObjects']).toHaveLength(0);
    expect(graph.pendingEndpoint).toBeUndefined();
    expect(() => fireEvent.keyDown(box, {key: 'Escape'})).not.toThrow();
});

test('a graph without the segments hook refuses the mode, offers no toggle for it and rejects such a Preset', () => {
    const graph = new PlainGraph();
    mount(graph);
    expect(graph.setPointSetMode('segments')).toBe(false);
    expect(graph.model.mode).toBe('points');
    expect(screen.queryByRole('option', {name: 'Daljice'})).toBeNull();
    const check = graph.presetCollection().check({mode: 'segments', points: [{x: 0, y: 0}, {x: 1, y: 1}]});
    expect('rejection' in check && check.rejection.key).toBe('pointset_invalid_unknown_mode');
    const orientation = new OrientationGraph();
    expect(orientation.presetCollection().check({mode: 'segments', points: []})).toHaveProperty('rejection');
    expect(graph.addSegmentAt({x: 0, y: 0}, {x: 1, y: 1})).toBe(false);
});

test('switching to segments mode with more points than the segment limit allows is refused with the segment-limit notice', () => {
    const graph = new SegmentGraph();
    mount(graph);
    const points = Array.from({length: 26}, (_, i) => ({x: i, y: 0}));
    load(graph, {mode: 'points', closed: false, gridStepExponent: 0, points});
    act(() => { expect(graph.setPointSetMode('segments')).toBe(false); });
    expect(graph.model.mode).toBe('points');
    expect(graph.notice).toEqual({kind: 'segment-limit'});
    expect(screen.getByText(/Doseženo je največje število daljic \(12\)/)).toBeInTheDocument();
});

test('removing a segment row keeps focus on a remove button, then on Add segment when none is left', () => {
    const graph = new SegmentGraph();
    mount(graph);
    load(graph, segs([0, 0], [4, 2], [-3, 1], [1, -5]));
    const press = (name: string) => act(() => { const b = screen.getByRole('button', {name}); b.focus(); fireEvent.click(b); });
    press('Odstrani daljico s2');
    expect(document.activeElement).toBe(screen.getByRole('button', {name: 'Odstrani daljico s1'}));
    press('Odstrani daljico s1');
    expect(document.activeElement).toBe(screen.getByRole('button', {name: 'Dodaj daljico'}));
});
