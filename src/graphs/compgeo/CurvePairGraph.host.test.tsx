import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {CURVE_PAIR_CROSSING, CURVE_PAIR_PRESET_KEY, CurvePairGraph} from './CurvePairGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {pieceHull} from '../../compgeo/curvePairSubdivision';
import {PointSetModel} from '../../compgeo/pointSetModel';
import {setLanguage, t} from '../../localization';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

class Observed extends CurvePairGraph {
    liveBoard() { return this.board; }
    disposeScene() { this.disposeFigureScene(); }
}

interface Shown {
    elType: string; name?: string; dataX?: number[]; dataY?: number[]; visProp: Record<string, unknown>;
    vertices?: Array<{X(): number; Y(): number}>;
    X?(): number; Y?(): number; moveTo?(to: number[], t: number): void; triggerEventHandlers?(names: string[], args: unknown[]): void;
}
const objects = (graph: Observed) => graph.liveBoard().objectsList as unknown as Shown[];
const named = (graph: Observed, pattern: RegExp) => objects(graph).filter(o => pattern.test(o.name ?? ''));
const pointObjects = (graph: Observed) => objects(graph).filter(o => o.elType === 'point' && /^[AB]_\d$/.test(o.name ?? ''));
const mainCurves = (graph: Observed) => named(graph, /^curve[AB]$/);
/** Overlay curves are the board's curves that are not the two main curves. */
const overlayCurves = (graph: Observed) => objects(graph).filter(o => o.elType === 'curve' && !/^curve[AB]$/.test(o.name ?? ''));
const polygons = (graph: Observed) => objects(graph).filter(o => o.elType === 'polygon');
const ownedCount = (graph: Observed) => pointObjects(graph).length + mainCurves(graph).length + overlayCurves(graph).length + polygons(graph).length;

const mount = (graph: Observed, strict = false) => {
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
};
const model = (points: Array<[number, number]>, gridStepExponent = 0, mode: PointSetModel['mode'] = 'points'): PointSetModel =>
    ({mode, closed: false, gridStepExponent, points: points.map(([x, y]) => ({x, y}))});
const cubicPair = (gridStepExponent: number) => model(
    [[0, 0], [1, 6], [5, 6], [6, 0], [0, 4], [2, -2], [4, 9], [6, 4]], gridStepExponent);
const load = (graph: Observed, next: PointSetModel) => act(() => { graph.loadModel(next); });
const buttonLabels = () => [...document.querySelectorAll('button')].map(b => b.textContent);
/** The hull as drawn: the corners of the polygon (JSXGraph repeats the first one at the end) in board units. */
const polygonCorners = (polygon: Shown) => polygon.vertices!.slice(0, -1).map(v => [v.X(), v.Y()]);
const expectedHull = (net: PointSetModel['points'], degree: number, step: number) =>
    pieceHull(net, 0, degree).map(i => [net[i].x * step, net[i].y * step]);
const drag = (graph: Observed, name: string, to: [number, number]) => {
    const point = named(graph, new RegExp(`^${name}$`))[0];
    act(() => { point.moveTo!(to, 0); point.triggerEventHandlers!(['drag'], []); });
};
const maxOf = (values: number[] | undefined) => Math.max(...(values ?? []));

test('the default scene is the crossing pair; its points are named A_0.. and B_0.. and the nets are A then B', () => {
    const graph = new Observed();
    mount(graph);
    expect(graph.model).toEqual(CURVE_PAIR_CROSSING);
    expect(pointObjects(graph).map(p => p.name)).toEqual(['A_0', 'A_1', 'A_2', 'B_0', 'B_1', 'B_2']);
    expect(pointObjects(graph).map(p => [p.X!(), p.Y!()])).toEqual(CURVE_PAIR_CROSSING.points.map(p => [p.x, p.y]));
    load(graph, cubicPair(0));
    expect(pointObjects(graph).map(p => p.name)).toEqual(['A_0', 'A_1', 'A_2', 'A_3', 'B_0', 'B_1', 'B_2', 'B_3']);
});

test('both curves are drawn from the model with real data; A is solid and B is dashed', () => {
    const graph = new Observed();
    mount(graph);
    const curves = mainCurves(graph);
    expect(curves.map(c => c.name)).toEqual(['curveA', 'curveB']);
    for (const [curve, ends] of [[curves[0], [[0, 0], [4, 0]]], [curves[1], [[0, 3], [4, 3]]]] as const) {
        expect(curve.dataX?.length ?? 0).toBe(97);
        expect(curve.dataY?.length).toBe(curve.dataX?.length);
        const last = curve.dataX!.length - 1;
        expect([curve.dataX![0], curve.dataY![0]]).toEqual(ends[0]);
        expect([curve.dataX![last], curve.dataY![last]]).toEqual(ends[1]);
    }
    // A rises to y = 2 at the middle (exact Bezier value), B dips to y = 1
    expect(maxOf(curves[0].dataY)).toBeCloseTo(2, 3);
    expect(Math.min(...curves[1].dataY!)).toBeCloseTo(1, 3);
    expect(curves[0].visProp.dash).toBe(0);
    expect(curves[1].visProp.dash).not.toBe(0);
});

test('a drag redraws the curve from the new model; the curve data follows the point, also in half grid steps', () => {
    for (const [exponent, board, grid] of [[0, [3, 5], {x: 3, y: 5}], [-1, [1.5, 2.5], {x: 3, y: 5}]] as const) {
        const graph = new Observed();
        const view = mount(graph);
        load(graph, {...CURVE_PAIR_CROSSING, gridStepExponent: exponent});
        const before = [...mainCurves(graph)[0].dataY!];
        const scale = 2 ** exponent;
        expect(maxOf(before)).toBeCloseTo(2 * scale, 3);
        drag(graph, 'A_1', [board[0], board[1]]);
        expect(graph.model.points[1]).toEqual(grid);
        const after = mainCurves(graph)[0].dataY;
        expect(after?.length).toBe(97);
        expect(maxOf(after)).toBeCloseTo(2.5 * scale, 3);
        expect(mainCurves(graph)).toHaveLength(2);
        view.unmount();
    }
});

test('the overlays draw one control polygon and one hull per curve, and hiding or switching removes them with exact counts', () => {
    const graph = new Observed();
    const view = mount(graph);
    expect([mainCurves(graph).length, overlayCurves(graph).length, polygons(graph).length]).toEqual([2, 2, 2]);
    act(() => { graph.setOverlay('hull', false); });
    expect([mainCurves(graph).length, overlayCurves(graph).length, polygons(graph).length]).toEqual([2, 2, 0]);
    act(() => { graph.setOverlay('control', false); });
    expect([mainCurves(graph).length, overlayCurves(graph).length, polygons(graph).length]).toEqual([2, 0, 0]);
    act(() => { graph.setOverlay('hull', true); graph.setOverlay('control', true); });
    expect([mainCurves(graph).length, overlayCurves(graph).length, polygons(graph).length]).toEqual([2, 2, 2]);
    // repeated model changes rebuild, never accumulate
    for (let i = 0; i < 3; i++) load(graph, i % 2 ? CURVE_PAIR_CROSSING : cubicPair(0));
    expect(ownedCount(graph)).toBe(8 + 2 + 2 + 2);
    load(graph, CURVE_PAIR_CROSSING);
    expect(ownedCount(graph)).toBe(6 + 2 + 2 + 2);
    // the scene disposal of a figure capture or replacement removes every owned object from the board
    act(() => { graph.disposeScene(); });
    expect(ownedCount(graph)).toBe(0);
    expect(objects(graph).filter(o => o.elType === 'curve' || o.elType === 'polygon').length).toBe(0);
    view.unmount();
});

test.each([0, -1])('the drawn hull vertices are the exact hull of each net in board units (grid step exponent %i)', exponent => {
    const graph = new Observed();
    mount(graph);
    const step = 2 ** exponent;
    for (const next of [{...CURVE_PAIR_CROSSING, gridStepExponent: exponent}, cubicPair(exponent)]) {
        load(graph, next);
        const half = next.points.length / 2;
        const degree = half - 1;
        const drawn = polygons(graph).map(polygonCorners);
        expect(drawn).toHaveLength(2);
        expect(drawn[0]).toEqual(expectedHull(next.points.slice(0, half), degree, step));
        expect(drawn[1]).toEqual(expectedHull(next.points.slice(half), degree, step));
        // the control polygon is the net itself, in board units
        const control = overlayCurves(graph).map(c => (c.dataX ?? []).map((x, i) => [x, c.dataY![i]]));
        expect(control[0]).toEqual(next.points.slice(0, half).map(p => [p.x * step, p.y * step]));
        expect(control[1]).toEqual(next.points.slice(half).map(p => [p.x * step, p.y * step]));
    }
});

test('a collinear net draws its hull as a segment, not a polygon', () => {
    const graph = new Observed();
    mount(graph);
    load(graph, model([[0, 0], [1, 1], [2, 2], [0, 3], [2, -1], [4, 3]]));
    expect(polygons(graph)).toHaveLength(1);
    // control A, control B, hull segment A
    expect(overlayCurves(graph)).toHaveLength(3);
    const segment = overlayCurves(graph).find(c => c.dataX?.length === 2 && c.dataX[0] === 0 && c.dataX[1] === 2);
    expect(segment?.dataY).toEqual([0, 2]);
});

test('the point count is fixed: add, remove, clear and Add mode are refused with the base notice and change nothing', () => {
    const graph = new Observed();
    mount(graph);
    const before = graph.model;
    act(() => { graph.select(1); });
    expect(graph.addPointAt({x: 1, y: 1})).toBe(false);
    expect(graph.addPointAtBoard(2, 2)).toBe(false);
    expect(graph.removeSelected()).toBe(false);
    expect(graph.clear()).toBe(false);
    act(() => { graph.setAddMode(true); });
    expect(graph.isAddMode).toBe(false);
    expect(graph.model).toBe(before);
    expect(graph.selectedIndex).toBe(1);
    expect(graph.notice).toEqual({kind: 'fixed'});
    expect(pointObjects(graph)).toHaveLength(6);
    expect(document.querySelector('[data-pointset-notice]')?.textContent).toBe(t('pointset_count_fixed'));
    // moving a point is still an edit
    expect(graph.movePointTo(1, {x: 2, y: 3})).toBe(true);
    expect(graph.model.points[1]).toEqual({x: 2, y: 3});
});

test('the inspector offers no add, remove, clear, Add mode, count or mode choice, but lists the points and the overlays', () => {
    const graph = new Observed();
    mount(graph);
    const labels = buttonLabels();
    for (const key of ['pointset_add_mode', 'pointset_remove', 'pointset_clear', 'pointset_add_point', 'pointset_mode_polygon', 'pointset_mode_points'] as const) {
        expect(labels).not.toContain(t(key));
    }
    expect(document.querySelector('.pointset-add')).toBeNull();
    expect(document.querySelector('[data-pointset-count]')).toBeNull();
    expect(document.querySelectorAll('.pointset-row')).toHaveLength(6);
    expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(3);
});

test.each([
    ['7 points', model([[0, 0], [1, 1], [2, 0], [0, 3], [1, 2], [2, 3], [3, 3]])],
    ['10 points', model(Array.from({length: 10}, (_, i) => [i, i % 3] as [number, number]))],
    ['4 points (degree 1)', model([[0, 0], [1, 1], [0, 3], [1, 2]])],
    ['12 points', model(Array.from({length: 12}, (_, i) => [i, i % 3] as [number, number]))],
    ['polygon mode', {...CURVE_PAIR_CROSSING, mode: 'polygon'} as PointSetModel],
])('loadModel rejects %s and keeps the model', (_name, bad) => {
    const graph = new Observed();
    mount(graph);
    const before = graph.model;
    expect(() => graph.loadModel(bad)).toThrow(RangeError);
    expect(graph.model).toBe(before);
    expect(graph.setPointSetMode('polygon')).toBe(false);
    expect(graph.model.mode).toBe('points');
});

test('the Preset collection accepts 6 and 8 points and rejects other counts, polygon mode and coordinates beyond 2^10', () => {
    const collection = new Observed().presetCollection();
    expect(collection.key).toBe(CURVE_PAIR_PRESET_KEY);
    expect('data' in collection.check(CURVE_PAIR_CROSSING)).toBe(true);
    expect('data' in collection.check(cubicPair(0))).toBe(true);
    const rejectionKey = (data: unknown) => {
        const checked = collection.check(data);
        return 'rejection' in checked ? checked.rejection.key : undefined;
    };
    expect(rejectionKey(model(Array.from({length: 7}, (_, i) => [i, 0] as [number, number])))).toBe('curvepair_invalid_point_count');
    expect(rejectionKey(model(Array.from({length: 8}, (_, i) => [i, 0] as [number, number]).slice(0, 7)))).toBe('curvepair_invalid_point_count');
    expect(rejectionKey({...CURVE_PAIR_CROSSING, mode: 'polygon'})).toBe('curvepair_invalid_point_count');
    expect(rejectionKey(model(Array.from({length: 10}, (_, i) => [i, 0] as [number, number])))).toBe('pointset_invalid_too_many_points');
    expect(rejectionKey({...CURVE_PAIR_CROSSING, points: [{x: 1025, y: 0}, ...CURVE_PAIR_CROSSING.points.slice(1)]})).toBe('pointset_invalid_coordinate_out_of_range');
    expect(rejectionKey({...CURVE_PAIR_CROSSING, points: [{x: 1024, y: -1024}, ...CURVE_PAIR_CROSSING.points.slice(1)]})).toBeUndefined();
    expect(collection.checkGraphState?.({initialized: true, overlays: {control: true, hull: false}})).toBeUndefined();
    expect(collection.checkGraphState?.({overlays: {pieces: true}})?.key).toBe('pointset_invalid_overlays');
});

test('a lesson set-points action with 7 points is rejected, one with 8 points loads', () => {
    const graph = new Observed();
    mount(graph);
    const action = (n: number) => ({kind: 'point-set', operation: 'set-points', mode: 'points', closed: false,
        points: Array.from({length: n}, (_, i) => [i, i % 4])} as never);
    expect(() => graph.applyPointSetAction(action(7))).toThrow();
    expect(graph.model.points).toHaveLength(6);
    act(() => { graph.applyPointSetAction(action(8)); });
    expect(graph.model.points).toHaveLength(8);
});

test('the first view fits the crossing pair with at least half a unit of margin and equal units', () => {
    const graph = new Observed();
    mount(graph);
    const board = graph.liveBoard();
    const [left, top, right, bottom] = board.getBoundingBox();
    for (const {x, y} of CURVE_PAIR_CROSSING.points) {
        expect(x - left).toBeGreaterThanOrEqual(0.5);
        expect(right - x).toBeGreaterThanOrEqual(0.5);
        expect(top - y).toBeGreaterThanOrEqual(0.5);
        expect(y - bottom).toBeGreaterThanOrEqual(0.5);
    }
    expect(board.unitX).toBeCloseTo(board.unitY, 6);
});

test('a scene replacement through a Preset leaves no stale objects', async () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.saveCurrentPreset('mine'); });
    load(graph, cubicPair(0));
    expect(ownedCount(graph)).toBe(8 + 2 + 2 + 2);
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = graph.selectPreset('mine'); });
    await act(async () => { await pending; });
    expect(graph.model.points).toHaveLength(6);
    expect(ownedCount(graph)).toBe(6 + 2 + 2 + 2);
});

test('a StrictMode mount draws the scene once, and a second graph after unmount draws its own full scene', () => {
    const first = new Observed();
    const view = mount(first, true);
    expect(ownedCount(first)).toBe(6 + 2 + 2 + 2);
    view.unmount();
    const second = new Observed();
    mount(second);
    expect(ownedCount(second)).toBe(6 + 2 + 2 + 2);
});
