import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {PointSetGraph} from './PointSetGraph';
import {OrientationGraph} from './OrientationGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {intervalLetter, PointSetModel} from '../../compgeo/pointSetModel';
import {setLanguage} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

/** A graph of the sweep family: it opts in to intervals mode through the documented hook. */
class IntervalGraph extends PointSetGraph {
    protected override allowsIntervals() { return true; }
    liveBoard() { return this.board; }
}
class SegmentOnlyGraph extends PointSetGraph {
    protected override allowsSegments() { return true; }
}

type Live = {liveBoard(): {objectsList: unknown[]}};
type Shown = {elType: string; name?: string; X?: () => number; Y?: () => number; plaintext?: string; point1?: JXG.Point; point2?: JXG.Point};
const shown = (graph: Live) => graph.liveBoard().objectsList as Shown[];
const segmentObjects = (graph: Live) => shown(graph).filter(o => o.elType === 'segment');
const labelObjects = (graph: Live) => shown(graph).filter(o => o.elType === 'text' && /^[a-j]$/.test(o.plaintext ?? ''));
const endpointObjects = (graph: Live) => shown(graph).filter(o => o.elType === 'point' && /^P\d+$/.test(o.name ?? ''));
const pendingObjects = (graph: Live) => shown(graph).filter(o => o.elType === 'point' && o.name === 'pending');
const drawnIntervals = (graph: Live) => segmentObjects(graph).map(s => [[s.point1!.X(), s.point1!.Y()], [s.point2!.X(), s.point2!.Y()]]);
const modelIntervals = (graph: IntervalGraph) =>
    Array.from({length: graph.model.points.length >> 1}, (_, k) => {
        const [a, b] = [graph.model.points[2 * k], graph.model.points[2 * k + 1]];
        return [[a.x, a.y], [b.x, b.y]];
    });
/** The strongest board check: horizontal segments on their rows, letters above them and endpoint points all equal the model. */
function expectBoardMatchesModel(graph: IntervalGraph) {
    expect(graph.model.points.every((p, i) => p.y === (i >> 1) + 1)).toBe(true);
    expect(drawnIntervals(graph)).toEqual(modelIntervals(graph));
    expect(endpointObjects(graph).map(p => [p.X!(), p.Y!()])).toEqual(graph.model.points.map(p => [p.x, p.y]));
    const labels = labelObjects(graph);
    expect(labels.map(l => l.plaintext)).toEqual(modelIntervals(graph).map((_, k) => intervalLetter(k)));
    labels.forEach((label, k) => {
        const [[ax], [bx]] = modelIntervals(graph)[k];
        expect([label.X!(), label.Y!()]).toEqual([(ax + bx) / 2, k + 1]);
    });
}

const mount = (graph: PointSetGraph<string>, strict = false) => {
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
};
/** Intervals as [a, b] pairs of x; the rows are filled in. */
const ivs = (...ab: number[][]): PointSetModel => ({
    mode: 'intervals', closed: false, gridStepExponent: 0,
    points: ab.flatMap(([a, b], k) => [{x: a, y: k + 1}, {x: b, y: k + 1}]),
});
const load = (graph: PointSetGraph<string>, next: PointSetModel) => act(() => { graph.loadModel(next); });
const container = (graph: IntervalGraph) => graph.liveBoard().containerObj as HTMLElement;
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
const click = (graph: IntervalGraph, x: number, y: number) => {
    const board = graph.liveBoard() as unknown as {getUsrCoordsOfMouse(e: unknown): number[]; getAllObjectsUnderMouse(e: unknown): unknown[]};
    vi.spyOn(board, 'getUsrCoordsOfMouse').mockReturnValue([x, y]);
    vi.spyOn(board, 'getAllObjectsUnderMouse').mockReturnValue([]);
    act(() => { trigger(board, 'down', [{}]); });
};

test('an intervals scene draws one horizontal segment on its row, one letter label and two endpoints per interval', () => {
    const graph = new IntervalGraph();
    mount(graph);
    load(graph, ivs([0, 4], [-3, 1], [2, 2]));
    expect(segmentObjects(graph)).toHaveLength(3);
    expect(labelObjects(graph).map(l => l.plaintext)).toEqual(['a', 'b', 'c']);
    expectBoardMatchesModel(graph);
});

test('Add interval (keyboard) appends on the next row and the board and counter follow; the 11th is refused', () => {
    const graph = new IntervalGraph();
    mount(graph);
    load(graph, ivs());
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Dodaj interval'})); });
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Dodaj interval'})); });
    expect(graph.model.points).toEqual([{x: -4, y: 1}, {x: 0, y: 1}, {x: -2, y: 2}, {x: 2, y: 2}]);
    expectBoardMatchesModel(graph);
    expect(screen.getByText('Intervalov: 2 od največ 10')).toBeInTheDocument();
    for (let i = 0; i < 8; i++) act(() => { fireEvent.click(screen.getByRole('button', {name: 'Dodaj interval'})); });
    expect(graph.model.points).toHaveLength(20);
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Dodaj interval'})); });
    expect(graph.model.points).toHaveLength(20);
    expect(screen.getByText(/Doseženo je največje število intervalov \(10\)/)).toBeInTheDocument();
    expectBoardMatchesModel(graph);
});

test('Add mode: two clicks add an interval on the next row from the snapped x values; Escape cancels', () => {
    const graph = new IntervalGraph();
    mount(graph);
    load(graph, ivs([0, 1]));
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Dodajanje z dotikom ali klikom'})); });
    click(graph, 2.4, 7.7);
    expect(graph.pendingEndpoint).toEqual({x: 2, y: 2});
    expect(pendingObjects(graph)).toHaveLength(1);
    // The pending text names only x: the row is not user data.
    expect(screen.getByText(/Prvo krajišče je postavljeno pri x = 2\./)).toBeInTheDocument();
    expect(screen.queryByText(/\(2, 2\)/)).toBeNull();
    click(graph, -1.2, -9);
    expect(graph.model.points).toEqual([{x: 0, y: 1}, {x: 1, y: 1}, {x: 2, y: 2}, {x: -1, y: 2}]);
    expect(pendingObjects(graph)).toHaveLength(0);
    expectBoardMatchesModel(graph);
    click(graph, 5, 5);
    expect(pendingObjects(graph)).toHaveLength(1);
    act(() => { fireEvent.keyDown(container(graph), {key: 'Escape'}); });
    expect(pendingObjects(graph)).toHaveLength(0);
    expect(graph.model.points).toHaveLength(4);
});

test('dragging an endpoint is horizontal only: x snaps, the row stays and the segment and letter follow', () => {
    const graph = new IntervalGraph();
    mount(graph);
    load(graph, ivs([0, 4], [-3, 1]));
    const point = endpointObjects(graph)[3] as unknown as JXG.Point;
    act(() => { point.moveTo([2.4, 9.6], 0); trigger(point, 'drag', []); });
    expect(graph.model.points[3]).toEqual({x: 2, y: 2});
    expect(point.Y()).toBe(2);
    expect(graph.selectedIndex).toBe(3);
    expectBoardMatchesModel(graph);
});

test('arrow keys nudge horizontally; vertical arrows are no-ops with no notice; the coordinate limit refuses', () => {
    const graph = new IntervalGraph({coordinateLimit: 1024});
    mount(graph);
    load(graph, ivs([0, 4], [1023, 0]));
    act(() => { graph.select(1); });
    act(() => { fireEvent.keyDown(container(graph), {key: 'ArrowRight'}); });
    expect(graph.model.points[1]).toEqual({x: 5, y: 1});
    const before = graph.model;
    act(() => { fireEvent.keyDown(container(graph), {key: 'ArrowUp'}); });
    act(() => { fireEvent.keyDown(container(graph), {key: 'ArrowDown'}); });
    expect(graph.model).toBe(before);
    expect(graph.notice).toBeUndefined();
    expectBoardMatchesModel(graph);
    act(() => { graph.select(2); });
    act(() => { fireEvent.keyDown(container(graph), {key: 'ArrowRight'}); });
    expect(graph.model.points[2]).toEqual({x: 1024, y: 2});
    act(() => { fireEvent.keyDown(container(graph), {key: 'ArrowRight'}); });
    expect(graph.model.points[2]).toEqual({x: 1024, y: 2});
    // A key stops silently at the coordinate limit (decision 7): no notice.
    expect(graph.notice).toBeUndefined();
    expectBoardMatchesModel(graph);
});

test('removing interval 0 shifts the later intervals down a row on the board; Delete and the buttons remove the whole interval', () => {
    const graph = new IntervalGraph();
    mount(graph);
    load(graph, ivs([0, 4], [-3, 1], [2, 5]));
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Odstrani interval a'})); });
    expect(graph.model.points).toEqual([{x: -3, y: 1}, {x: 1, y: 1}, {x: 2, y: 2}, {x: 5, y: 2}]);
    expect(labelObjects(graph).map(l => l.plaintext)).toEqual(['a', 'b']);
    expectBoardMatchesModel(graph);
    act(() => { graph.select(3); });
    act(() => { fireEvent.keyDown(container(graph), {key: 'Delete'}); });
    expect(graph.model.points).toEqual([{x: -3, y: 1}, {x: 1, y: 1}]);
    expect(graph.selectedIndex).toBeUndefined();
    expectBoardMatchesModel(graph);
    act(() => { graph.select(0); });
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Odstrani izbrani interval'})); });
    expect(graph.model.points).toHaveLength(0);
    expect(segmentObjects(graph)).toHaveLength(0);
    expect(labelObjects(graph)).toHaveLength(0);
    expect(endpointObjects(graph)).toHaveLength(0);
});

test('numeric lo and hi fields move the endpoint and the board follows; a crossed value keeps the pair sorted in the fields', () => {
    const graph = new IntervalGraph();
    mount(graph);
    load(graph, ivs([0, 4], [-3, 1]));
    act(() => { enterNumber(screen.getByLabelText('Interval b: desno krajišče'), '7'); });
    expect(graph.model.points[3]).toEqual({x: 7, y: 2});
    expectBoardMatchesModel(graph);
    act(() => { enterNumber(screen.getByLabelText('Interval a: levo krajišče'), '6'); });
    expect(graph.model.points[0]).toEqual({x: 6, y: 1});
    expect(screen.getByLabelText('Interval a: levo krajišče')).toHaveValue('4');
    expect(screen.getByLabelText('Interval a: desno krajišče')).toHaveValue('6');
    expectBoardMatchesModel(graph);
});

test('a Preset round trip restores the intervals on the board and Preset checks refuse bad rows', async () => {
    const graph = new IntervalGraph();
    mount(graph);
    const saved = ivs([0, 4], [-3, 1]);
    load(graph, saved);
    act(() => { graph.saveCurrentPreset('mine'); });
    load(graph, ivs([9, 9]));
    expect(drawnIntervals(graph)).toEqual([[[9, 1], [9, 1]]]);
    await settle(() => graph.selectPreset('mine'));
    expect(graph.model).toEqual(saved);
    expectBoardMatchesModel(graph);
    expect(segmentObjects(graph)).toHaveLength(2);

    const check = graph.presetCollection().check({mode: 'intervals', points: [{x: 0, y: 1}]});
    expect('rejection' in check && check.rejection.key).toBe('pointset_invalid_odd_interval_endpoints');
    const rows = graph.presetCollection().check({mode: 'intervals', points: [{x: 0, y: 1}, {x: 1, y: 5}]});
    expect('rejection' in rows && rows.rejection.key).toBe('pointset_invalid_interval_rows');
    expect(graph.presetCollection().check({mode: 'intervals', points: [{x: 0, y: 1}, {x: 1, y: 1}]})).toHaveProperty('data');
});

test('Reset returns an intervals scene to the default scene and clears pending state and Add mode', async () => {
    const graph = new IntervalGraph();
    mount(graph);
    load(graph, ivs([0, 4], [-3, 1]));
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

test('a live language switch re-renders the interval inspector and keeps model, selection and board objects', () => {
    const graph = new IntervalGraph();
    mount(graph);
    load(graph, ivs([0, 4], [-3, 1]));
    act(() => { graph.select(2); });
    const before = {model: graph.model, segments: segmentObjects(graph), labels: labelObjects(graph)};
    expect(screen.getByText('Izbrani interval: b')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Intervali'})).toBeInTheDocument();
    act(() => { setLanguage('en'); });
    expect(screen.getByText('Selected interval: b')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Intervals'})).toBeInTheDocument();
    expect(screen.getByLabelText('Interval a: left endpoint')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Add interval'})).toBeInTheDocument();
    expect(graph.model).toBe(before.model);
    expect(graph.selectedIndex).toBe(2);
    expect(segmentObjects(graph)).toEqual(before.segments);
    expect(labelObjects(graph)).toEqual(before.labels);
    expectBoardMatchesModel(graph);
});

test('switching to intervals puts the points on rows (even prefix) and back to points keeps them', () => {
    const graph = new IntervalGraph();
    mount(graph);
    load(graph, {mode: 'points', closed: false, gridStepExponent: 0, points: [{x: 0, y: 5}, {x: 3, y: 9}, {x: 2, y: 2}]});
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Intervali'})); });
    expect(graph.model.mode).toBe('intervals');
    expect(graph.model.points).toEqual([{x: 0, y: 1}, {x: 3, y: 1}]);
    expectBoardMatchesModel(graph);
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Točke'})); });
    expect(segmentObjects(graph)).toHaveLength(0);
    expect(labelObjects(graph)).toHaveLength(0);
    expect(endpointObjects(graph)).toHaveLength(2);
});

test('unmount leaves no interval objects and no listeners behind; a StrictMode mount draws each interval once', () => {
    const graph = new IntervalGraph();
    const view = mount(graph, true);
    load(graph, ivs([0, 4], [-3, 1]));
    const box = container(graph);
    expect(segmentObjects(graph)).toHaveLength(2);
    expect(labelObjects(graph)).toHaveLength(2);
    act(() => { graph.setAddMode(true); });
    click(graph, 1, 1);
    expect(pendingObjects(graph)).toHaveLength(1);
    const remove = vi.spyOn(box, 'removeEventListener');
    view.unmount();
    expect(remove.mock.calls.filter(([type, listener]) => type === 'keydown' && listener === graph['onKeyDown'])).toHaveLength(1);
    expect(graph['drawn']).toBeUndefined();
    expect(graph['pendingObjects']).toHaveLength(0);
    expect(graph.pendingEndpoint).toBeUndefined();
    expect(() => fireEvent.keyDown(box, {key: 'ArrowRight'})).not.toThrow();
});

test('graphs without the intervals hook refuse the mode, offer no toggle for it and reject such a Preset', () => {
    for (const graph of [new PointSetGraph(), new SegmentOnlyGraph()]) {
        const view = mount(graph);
        expect(graph.setPointSetMode('intervals')).toBe(false);
        expect(graph.model.mode).toBe('points');
        expect(screen.queryByRole('button', {name: 'Intervali'})).toBeNull();
        const check = graph.presetCollection().check({mode: 'intervals', points: [{x: 0, y: 1}, {x: 1, y: 1}]});
        expect('rejection' in check && check.rejection.key).toBe('pointset_invalid_unknown_mode');
        expect(graph.addIntervalAt(0, 1)).toBe(false);
        view.unmount();
    }
    expect(new OrientationGraph().presetCollection().check({mode: 'intervals', points: []})).toHaveProperty('rejection');
});

test('switching to intervals with too many points or an out-of-range x is refused with a notice', () => {
    const graph = new IntervalGraph({coordinateLimit: 1024});
    mount(graph);
    load(graph, {mode: 'points', closed: false, gridStepExponent: 0, points: Array.from({length: 22}, (_, i) => ({x: i, y: 0}))});
    act(() => { expect(graph.setPointSetMode('intervals')).toBe(false); });
    expect(graph.model.mode).toBe('points');
    expect(screen.getByText(/Doseženo je največje število intervalov \(10\)/)).toBeInTheDocument();
    load(graph, {mode: 'points', closed: false, gridStepExponent: 0, points: [{x: 0, y: 0}, {x: 2000, y: 0}]});
    act(() => { expect(graph.setPointSetMode('intervals')).toBe(false); });
    expect(graph.notice).toEqual({kind: 'range'});
});
