import React from 'react';
import {act, cleanup, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {NOTCHED_MODEL, PENTAGRAM_MODEL, PointInPolygonGraph} from './PointInPolygonGraph';
import {DelaunayGraph} from './DelaunayGraph';
import {HullTraceGraph} from './HullTraceGraph';
import {PointSetGraph} from './PointSetGraph';
import {VoronoiGraph} from './VoronoiGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {LessonAction, UnsupportedLessonActionError} from '../../learning/model';
import {sceneActions} from '../../learning/runtime/lessonCatalog';
import {POINT_SET_OVERLAY_NAMES} from '../../compgeo/pointSetModel';
import {setLanguage} from '../../localization';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

type PointSetAction = Extract<LessonAction, {kind: 'point-set'}>;
type Shown = {elType: string; name?: string; X?: () => number; Y?: () => number};

class Observed extends PointInPolygonGraph {
    /** The lesson runtime's entry point, exposed for synchronous action sequences. */
    run1(action: LessonAction) { this.applyLessonAction(action); }
    objects() { return this.board.objectsList as Shown[]; }
}

const polygon = (name: 'notched' | 'pentagram'): PointSetAction => ({kind: 'point-set', operation: 'set-polygon', polygon: name});
const queryPoint = (point: readonly [number, number] | null): PointSetAction => ({kind: 'point-set', operation: 'set-query-point', point});
const overlay = (name: (typeof POINT_SET_OVERLAY_NAMES)[number], visible: boolean): PointSetAction => ({kind: 'point-set', operation: 'set-overlay', overlay: name, visible});
const apply = (graph: Observed, ...actions: LessonAction[]) => act(() => { for (const a of actions) graph.run1(a); });
const live = () => document.querySelector('[data-pip-readout] [data-pip-live]')!.textContent;
const readout = () => document.querySelector('[data-pip-readout]') as HTMLElement;
const named = (graph: Observed, prefix: string) => graph.objects().filter(o => (o.name ?? '').startsWith(prefix));
const qOnBoard = (graph: Observed) => {
    const found = graph.objects().filter(o => o.name === 'q' && o.elType === 'point');
    expect(found).toHaveLength(1);
    return [found[0].X!(), found[0].Y!()];
};
const malformed = (fields: object) => ({kind: 'point-set', ...fields}) as unknown as PointSetAction;
function setup() {
    cleanup();
    const graph = new Observed();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
}

test('one synchronous sequence: pentagram, then a query point, then values off, reads each earlier action', () => {
    const graph = setup();
    expect(live()).toBe('Točka q je znotraj večkotnika.');
    apply(graph, polygon('pentagram'), queryPoint([0, 9]), overlay('values', false));
    expect(graph.model).toEqual(PENTAGRAM_MODEL);
    expect(graph.query).toEqual({x: 0, y: 9});
    expect(graph.state).toMatchObject({query: {x: 0, y: 9}});
    expect(qOnBoard(graph)).toEqual([0, 9]);
    expect(graph.overlayShown('values')).toBe(false);
    expect(live()).toBe('Rezultat je skrit; prikaz se vklopi v stikalu prekrivanj.');
    expect(readout().dataset.pipCrossings).toBe('');
    expect(named(graph, 'ray-line')).toHaveLength(1);
    apply(graph, overlay('values', true));
    expect(live()).toBe('Točka q je znotraj večkotnika.');
    apply(graph, queryPoint([20, 20]));
    expect(live()).toBe('Točka q je zunaj večkotnika.');
    apply(graph, overlay('ray', false), overlay('winding', true));
    expect(named(graph, 'ray-line')).toHaveLength(0);
    expect(graph.overlayShown('ray')).toBe(false);
    expect(graph.overlayShown('winding')).toBe(true);
    apply(graph, queryPoint([0, 0]));
    expect(live()).toBe('Točka q je znotraj ali zunaj, odvisno od pravila.');
    expect(named(graph, 'winding-label').length).toBeGreaterThan(0);
    apply(graph, overlay('winding', false));
    expect(named(graph, 'winding-')).toHaveLength(0);
});

test('set-polygon loads the figure with its own query point; the notched example comes back', () => {
    const graph = setup();
    apply(graph, queryPoint([5, 2]));
    expect(graph.query).toEqual({x: 5, y: 2});
    apply(graph, polygon('pentagram'));
    expect([graph.model, graph.query]).toEqual([PENTAGRAM_MODEL, {x: 0, y: 0}]);
    expect(qOnBoard(graph)).toEqual([0, 0]);
    apply(graph, queryPoint([2, 2]), polygon('notched'));
    expect([graph.model, graph.query]).toEqual([NOTCHED_MODEL, {x: 3, y: 1}]);
    expect(qOnBoard(graph)).toEqual([3, 1]);
});

test("null returns the query point to the current figure's default", () => {
    const graph = setup();
    apply(graph, queryPoint([1, 3]), queryPoint(null));
    expect(graph.query).toEqual({x: 3, y: 1});
    expect(qOnBoard(graph)).toEqual([3, 1]);
    apply(graph, polygon('pentagram'), queryPoint([0, 9]), queryPoint(null));
    expect(graph.query).toEqual({x: 0, y: 0});
    expect(qOnBoard(graph)).toEqual([0, 0]);
    apply(graph, polygon('notched'), queryPoint([0, 1]), queryPoint(null));
    expect(graph.query).toEqual({x: 3, y: 1});
});

test('an off-grid, out-of-range or malformed query point is a lesson-content error that changes nothing and is never snapped', () => {
    const graph = setup();
    apply(graph, queryPoint([1, 3]));
    const before = JSON.stringify(graph.state);
    const bad: unknown[] = [[0.5, 1], [1, 2.25], [Number.NaN, 1], [Infinity, 1], [2 ** 25 + 1, 0], [0, -(2 ** 25) - 1], [1], [1, 2, 3], '1,2', undefined, ['1', 2], {x: 1, y: 2}];
    for (const point of bad) {
        expect(() => graph.applyPointSetAction(malformed({operation: 'set-query-point', point}))).toThrow(/set-query-point/);
    }
    expect(JSON.stringify(graph.state)).toBe(before);
    expect(graph.query).toEqual({x: 1, y: 3});
    expect(qOnBoard(graph)).toEqual([1, 3]);
    // The limit itself and negative zero are accepted.
    apply(graph, queryPoint([2 ** 25, -0]));
    expect(graph.query).toEqual({x: 2 ** 25, y: 0});
});

test('an unknown polygon name is a lesson-content error', () => {
    const graph = setup();
    expect(() => graph.applyPointSetAction(malformed({operation: 'set-polygon', polygon: 'square'}))).toThrow(/set-polygon/);
    expect(graph.model).toEqual(NOTCHED_MODEL);
});

test('other point-set graphs refuse set-polygon, and set-query-point unless they are Voronoi or this graph', () => {
    for (const other of [new PointSetGraph(), new HullTraceGraph(), new DelaunayGraph()]) {
        expect(() => other.applyPointSetAction(polygon('pentagram'))).toThrow(UnsupportedLessonActionError);
        expect(() => other.applyPointSetAction(queryPoint([1, 1]))).toThrow(UnsupportedLessonActionError);
    }
    expect(() => new VoronoiGraph().applyPointSetAction(polygon('notched'))).toThrow(UnsupportedLessonActionError);
});

test('the ray and winding overlays are owned by this graph only', () => {
    for (const name of ['ray', 'winding'] as const) {
        expect(POINT_SET_OVERLAY_NAMES).toContain(name);
        for (const other of [new PointSetGraph(), new HullTraceGraph(), new DelaunayGraph(), new VoronoiGraph()]) {
            expect(() => other.applyPointSetAction(overlay(name, true))).toThrow(UnsupportedLessonActionError);
        }
        expect(() => new PointInPolygonGraph().applyPointSetAction(overlay(name, false))).not.toThrow();
    }
});

test('the catalog checks only the shape of set-polygon and set-query-point', () => {
    const run = (action: PointSetAction) => sceneActions({id: 'pip', basedOn: 'demonstration-default', actions: [action], expectedState: {sl: 's', en: 'e'}});
    expect(() => run(polygon('pentagram'))).not.toThrow();
    expect(() => run(malformed({operation: 'set-polygon', polygon: 'hexagon'}))).toThrow('set-polygon');
    expect(() => run(malformed({operation: 'set-polygon'}))).toThrow('set-polygon');
    expect(() => run(queryPoint([0.5, 1]))).not.toThrow();
    expect(() => run(queryPoint(null))).not.toThrow();
    expect(() => run(malformed({operation: 'set-query-point', point: [Infinity, 1]}))).toThrow('set-query-point');
});
