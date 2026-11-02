import React from 'react';
import {act, cleanup, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {TriangulationGraph} from './TriangulationGraph';
import {DelaunayGraph} from './DelaunayGraph';
import {EarClippingGraph} from './EarClippingGraph';
import {HullTraceGraph} from './HullTraceGraph';
import {PointSetGraph} from './PointSetGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {LessonAction, UnsupportedLessonActionError} from '../../learning/model';
import {setLanguage} from '../../localization';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

type PointSetAction = Extract<LessonAction, {kind: 'point-set'}>;

class Observed extends TriangulationGraph {
    /** The lesson runtime's entry point, exposed for synchronous action sequences. */
    run1(action: LessonAction) { this.applyLessonAction(action); }
}
class ObservedDelaunay extends DelaunayGraph {
    run1(action: LessonAction) { this.applyLessonAction(action); }
}

const setPoints = (points: [number, number][]): PointSetAction => ({kind: 'point-set', operation: 'set-points', mode: 'points', points});
const setTriangulation = (triangles: [number, number, number][]): PointSetAction => ({kind: 'point-set', operation: 'set-triangulation', triangles});
const flipEdge = (edge: [number, number]): PointSetAction => ({kind: 'point-set', operation: 'flip-edge', edge});
const selectEdge = (edge: [number, number] | null): PointSetAction => ({kind: 'point-set', operation: 'select-edge', edge});
const apply = (graph: Observed, ...actions: LessonAction[]) => act(() => { for (const action of actions) graph.run1(action); });

/** A counter-clockwise convex quadrilateral and a dart (point 2 inside the triangle 0, 1, 3). */
const SQUARE: [number, number][] = [[0, 0], [4, 0], [4, 3], [0, 3]];
const DART: [number, number][] = [[0, 0], [4, 0], [1, 1], [0, 4]];

function setup() {
    cleanup();
    const graph = new Observed();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
}
const counts = (graph: Observed) => graph.readout()?.counts;
const sorted = (list: readonly (readonly number[])[]) => list.map(tri => [...tri].sort().join(',')).sort();

test('the three operations are supported by the triangulation and Delaunay graphs', () => {
    for (const graph of [new Observed(), new ObservedDelaunay()]) {
        for (const action of [setTriangulation([]), flipEdge([0, 1]), selectEdge(null)]) expect(graph.supportsLessonAction(action)).toBe(true);
    }
});

test('set-triangulation replaces the list and the readout counts follow', () => {
    const graph = setup();
    apply(graph, setPoints(SQUARE));
    const initial = sorted(graph.triangles);
    const other: [number, number, number][] = initial.includes('0,1,2') ? [[0, 1, 3], [1, 2, 3]] : [[0, 1, 2], [0, 2, 3]];
    apply(graph, setTriangulation(other));
    expect(sorted(graph.triangles)).not.toEqual(initial);
    expect(sorted(graph.triangles)).toEqual(sorted(other));
    expect(counts(graph)).toMatchObject({points: 4, triangles: 2, edges: 5, interiorEdges: 1, hullEdges: 4});
    // A bigger scene: a list replaced by the fan of the other apex changes the triangle set but not the counts.
    apply(graph, setPoints([[0, 0], [4, 0], [4, 3], [0, 3], [2, 1]]), setTriangulation([[0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]]));
    expect(counts(graph)).toMatchObject({points: 5, triangles: 4, edges: 8, interiorEdges: 4, hullEdges: 4});
});

test('an invalid triangle list throws and leaves the scene as it was', () => {
    const graph = setup();
    apply(graph, setPoints(SQUARE));
    const before = graph.state;
    const bad: [number, number, number][][] = [
        [[0, 1, 2], [0, 2, 9]],
        [[0, 2, 1], [0, 3, 2]],
        [[0, 1, 2]],
        [[0, 1, 2], [0, 2, 3], [0, 1, 3]],
        [],
    ];
    for (const list of bad) {
        expect(() => graph.run1(setTriangulation(list))).toThrow('set-triangulation');
        expect(graph.state).toBe(before);
    }
    expect(() => graph.run1({kind: 'point-set', operation: 'set-triangulation', triangles: [[0, 1]]} as unknown as LessonAction)).toThrow('set-triangulation');
});

test('flip-edge on a convex quadrilateral flips: counts unchanged, new diagonal selected', () => {
    const graph = setup();
    apply(graph, setPoints(SQUARE), setTriangulation([[0, 1, 2], [0, 2, 3]]));
    const before = counts(graph);
    apply(graph, flipEdge([0, 2]));
    expect(sorted(graph.triangles)).toEqual(['0,1,3', '1,2,3']);
    expect(counts(graph)).toEqual(before);
    expect(graph.selectedEdge()).toMatchObject({a: 1, b: 3});
    expect(graph.event?.kind).toBe('flipped');
    // Flipping back through the order-free pair.
    apply(graph, flipEdge([3, 1]));
    expect(sorted(graph.triangles)).toEqual(['0,1,2', '0,2,3']);
});

test('flip-edge on a non-convex quadrilateral, a hull edge or a non-edge throws', () => {
    const graph = setup();
    apply(graph, setPoints(DART), setTriangulation([[0, 1, 2], [1, 3, 2], [0, 2, 3]]));
    const before = sorted(graph.triangles);
    expect(() => graph.run1(flipEdge([0, 2]))).toThrow('flip-edge');
    expect(() => graph.run1(flipEdge([0, 1]))).toThrow('flip-edge');
    expect(() => graph.run1(flipEdge([0, 7]))).toThrow('flip-edge');
    expect(sorted(graph.triangles)).toEqual(before);
});

test('select-edge selects without flipping, null clears, a non-edge throws', () => {
    const graph = setup();
    apply(graph, setPoints(SQUARE), setTriangulation([[0, 1, 2], [0, 2, 3]]));
    const before = sorted(graph.triangles);
    apply(graph, selectEdge([2, 0]));
    expect(graph.selectedEdge()).toMatchObject({a: 0, b: 2});
    expect(sorted(graph.triangles)).toEqual(before);
    apply(graph, selectEdge(null));
    expect(graph.selectedEdge()).toBeUndefined();
    expect(() => graph.run1(selectEdge([1, 3]))).toThrow('select-edge');
    expect(() => graph.run1(selectEdge([0, 0]))).toThrow('select-edge');
    expect(graph.selectedEdge()).toBeUndefined();
});

test('set-points, set-triangulation and flip-edge run in one synchronous sequence', () => {
    const graph = setup();
    act(() => {
        graph.run1(setPoints(SQUARE));
        graph.run1(setTriangulation([[0, 1, 3], [1, 2, 3]]));
        graph.run1(flipEdge([1, 3]));
    });
    expect(sorted(graph.triangles)).toEqual(['0,1,2', '0,2,3']);
    expect(graph.selectedEdge()).toMatchObject({a: 0, b: 2});
    expect(counts(graph)).toMatchObject({points: 4, triangles: 2});
});

test('the Delaunay graph accepts select-edge', () => {
    cleanup();
    const graph = new ObservedDelaunay();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    act(() => { graph.run1(setPoints(SQUARE)); graph.run1(setTriangulation([[0, 1, 2], [0, 2, 3]])); });
    act(() => { graph.run1(selectEdge([0, 2])); });
    expect(graph.selectedEdge()).toMatchObject({a: 0, b: 2});
    act(() => { graph.run1(selectEdge(null)); });
    expect(graph.selectedEdge()).toBeUndefined();
});

test('the ear clipping graph, the hull trace and the base point-set graph refuse all three', () => {
    for (const other of [new EarClippingGraph(), new HullTraceGraph(), new PointSetGraph()]) {
        for (const action of [setTriangulation([[0, 1, 2]]), flipEdge([0, 1]), selectEdge([0, 1]), selectEdge(null)]) {
            expect(() => other.applyPointSetAction(action)).toThrow(UnsupportedLessonActionError);
        }
    }
});
