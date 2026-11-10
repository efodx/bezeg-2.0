/**
 * Step 7, slice 3 (P3): a persisted entry that omits `data`, `graphState` or `boardState` starts that part from the graph's
 * defaults, never from the preceding scene. Contextual Reset is unchanged: it still follows the chosen example.
 */
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {BSplineNurbsGraph} from '../../curves/bspline/BSplineNurbsGraph';
import {BSplineInsertionGraph} from '../../curves/bspline/BSplineInsertionGraph';
import {BSplineExtractionGraph} from '../../curves/bspline/BSplineExtractionGraph';
import {LinearFunctionGraph} from '../../functions/LinearFunctionGraph';
import {appStorage} from '../../../storage/appStorage';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../realGraphTestHarness';
import type {Preset} from './Presets';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());

class Nurbs extends BSplineNurbsGraph {
    liveBoard() { return this.board; }
    resetCurve() { this.resetToOrigin(); }
}
class Linear extends LinearFunctionGraph {
    liveBoard() { return this.board; }
}

// The shipped circle, written out independently of the model module.
const CIRCLE = {
    degree: 2, knots: [0, 0, 0, 0.25, 0.25, 0.5, 0.5, 0.75, 0.75, 1, 1, 1],
    points: [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0]],
    weights: [1, Math.SQRT1_2, 1, Math.SQRT1_2, 1, Math.SQRT1_2, 1, Math.SQRT1_2, 1],
};
const T_DEFAULT = 1 / 16;
const near = (actual: readonly number[], expected: readonly number[]) => {
    expect(actual).toHaveLength(expected.length);
    actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index], 6));
};
const curveOf = (graph: Nurbs) => {
    const {degree, knots, points, weights} = graph.state;
    return {degree, knots, points, weights};
};
const viewOf = (graph: Nurbs | Linear) => graph.liveBoard().getBoundingBox();
/** The view a fresh page shows (the initial view fitted to the canvas), or after setting `box` directly on a fresh board. */
function referenceView(make: () => Nurbs | Linear, box?: [number, number, number, number]) {
    const graph = make();
    const view = mountGraph(graph).view;
    if (box) graph.liveBoard().setBoundingBox(box, true);
    const result = viewOf(graph);
    view.unmount();
    return result;
}
const initialView = () => referenceView(() => new Nurbs());

/** A scene far from every default: unit-weight example, a moved parameter, a moved point, a panned view. */
function disturb(graph: Nurbs, example: 'circle' | 'unit', t: number, box: [number, number, number, number]) {
    graph.selectExample(example);
    graph.editPoint(1, [3, 3]);
    graph.setT(t);
    graph.liveBoard().setBoundingBox(box, true);
}

describe('partial Presets start omitted parts from graph defaults (NURBS)', () => {
    const EXTENSION = {note: 'ignored extension', nested: {a: 1}} as unknown as Partial<Preset>;
    const scenes: [string, (graph: Nurbs) => void][] = [
        ['unit example, t 0.9, panned', graph => disturb(graph, 'unit', 0.9, [-9, 9, 5, -1])],
        ['circle example moved, t 0.3, zoomed', graph => disturb(graph, 'circle', 0.3, [-0.5, 0.5, 0.5, -0.5])],
    ];

    for (const [name, prepare] of scenes) {
        test(`everything omitted: fixed circle, initial state and view after ${name}`, () => {
            const graph = new Nurbs();
            const view = mountGraph(graph).view;
            prepare(graph);
            graph.importPreset({id: 'partial', ...EXTENSION});
            const curve = curveOf(graph);
            expect(curve.degree).toBe(CIRCLE.degree);
            expect(curve.knots).toEqual(CIRCLE.knots);
            expect(curve.points).toEqual(CIRCLE.points);
            near(curve.weights, CIRCLE.weights);
            expect(graph.state.example).toBe('circle');
            expect(graph.state.t).toBe(T_DEFAULT);
            expect(graph.state.showCircle).toBe(true);
            near(viewOf(graph), initialView());
            view.unmount();
        });

        test(`only data given: its curve, but initial state and view after ${name}`, () => {
            const graph = new Nurbs();
            const view = mountGraph(graph).view;
            prepare(graph);
            const data = {degree: 1, knots: [0, 0, 1, 1], points: [[0, 0], [1, 1]]};
            graph.importPreset({id: 'partial', data});
            expect(graph.state.degree).toBe(1);
            expect(graph.state.points).toEqual([[0, 0], [1, 1]]);
            expect(graph.state.example).toBe('custom');
            // The default parameter 1/16 inside the new domain [0, 1]; the preceding t is gone.
            expect(graph.state.t).toBe(T_DEFAULT);
            near(viewOf(graph), initialView());
            view.unmount();
        });

        test(`only graphState given: default circle and view, stored t kept, after ${name}`, () => {
            const graph = new Nurbs();
            const view = mountGraph(graph).view;
            prepare(graph);
            graph.importPreset({id: 'partial', graphState: {initialized: true, t: 0.5, showCircle: false} as Preset['graphState']});
            expect(curveOf(graph).points).toEqual(CIRCLE.points);
            expect(graph.state.t).toBe(0.5);
            expect(graph.state.showCircle).toBe(false);
            near(viewOf(graph), initialView());
            view.unmount();
        });

        test(`only boardState given: its view, default circle and initial state after ${name}`, () => {
            const graph = new Nurbs();
            const view = mountGraph(graph).view;
            prepare(graph);
            graph.importPreset({id: 'partial', boardState: {boundingBox: [-3, 3, 3, -3]}});
            near(viewOf(graph), referenceView(() => new Nurbs(), [-3, 3, 3, -3]));
            expect(curveOf(graph).points).toEqual(CIRCLE.points);
            expect(graph.state.t).toBe(T_DEFAULT);
            expect(graph.state.showCircle).toBe(true);
            view.unmount();
        });
    }

    test('the same partial Preset gives identical data, state and view after two different scenes', () => {
        const results = scenes.map(([, prepare]) => {
            const graph = new Nurbs();
            const view = mountGraph(graph).view;
            prepare(graph);
            graph.importPreset({id: 'partial', data: {degree: 2, knots: [0, 0, 0, 1, 1, 1], points: [[0, 0], [1, 2], [2, 0]]}});
            const {initialized, ...state} = graph.state;
            const observed = JSON.parse(JSON.stringify({state, initialized, view: viewOf(graph)}));
            view.unmount();
            return observed;
        });
        expect(results[0]).toEqual(results[1]);
        expect(results[0].state.t).toBe(T_DEFAULT);
    });

    test('a present but partial graphState gives identical state after two different live states', () => {
        const results = scenes.map(([, prepare], index) => {
            const graph = new Nurbs();
            const view = mountGraph(graph).view;
            prepare(graph);
            graph.setShowCircle(index === 0 ? false : true);
            // Only `t` is stored: the other fields are the graph's defaults, whatever was live.
            graph.importPreset({id: 'partial', graphState: {initialized: true, t: 0.5} as Preset['graphState']});
            const {initialized, ...state} = graph.state;
            const observed = JSON.parse(JSON.stringify({state, initialized, view: viewOf(graph)}));
            view.unmount();
            return observed;
        });
        expect(results[0]).toEqual(results[1]);
        expect(results[0].state.t).toBe(0.5);
        expect(results[0].state.showCircle).toBe(true);
        expect(results[0].state.example).toBe('circle');
    });

    test('Reset still follows the chosen example, while a data-less Preset ignores it', () => {
        const graph = new Nurbs();
        const view = mountGraph(graph).view;
        graph.selectExample('unit');
        expect(graph.defaultPreset().weights).toEqual(Array(9).fill(1));
        graph.editPoint(2, [5, 5]);
        graph.resetCurve();
        expect(graph.state.weights).toEqual(Array(9).fill(1));
        expect(graph.state.points).toEqual(CIRCLE.points);
        graph.importPreset({id: 'partial'});
        near(graph.state.weights, CIRCLE.weights);
        view.unmount();
    });
});

describe('partial Presets outside NURBS (linear function)', () => {
    test('an omitted part comes from the fresh scene, not the preceding scene', () => {
        const fresh = new Linear();
        const freshView = mountGraph(fresh).view;
        const expectedData = JSON.parse(JSON.stringify(fresh.exportPresetData()));
        const expectedView = viewOf(fresh);
        const graph = new Linear();
        const view = mountGraph(graph).view;
        graph.importPreset({id: 'full', data: {x1: 5, y1: 6, x2: 7, y2: 8}, boardState: {boundingBox: [-9, 9, 9, -9]}});
        expect(JSON.parse(JSON.stringify(graph.exportPresetData()))).not.toEqual(expectedData);
        graph.importPreset({id: 'partial'});
        expect(JSON.parse(JSON.stringify(graph.exportPresetData()))).toEqual(expectedData);
        near(viewOf(graph), expectedView);
        view.unmount();
        freshView.unmount();
    });

    test('data given alone keeps no view from the preceding scene', () => {
        const fresh = new Linear();
        const freshView = mountGraph(fresh).view;
        const expectedView = viewOf(fresh);
        const graph = new Linear();
        const view = mountGraph(graph).view;
        graph.liveBoard().setBoundingBox([-9, 9, 9, -9], true);
        graph.importPreset({id: 'data-only', data: {x1: 1, y1: 2, x2: 3, y2: 4}});
        expect(graph.exportPresetData()).toMatchObject({x1: 1, y1: 2, x2: 3, y2: 4});
        near(viewOf(graph), expectedView);
        view.unmount();
        freshView.unmount();
    });
});

describe('host Reset with no Preset selected follows the chosen example', () => {
    const CUBIC = {degree: 3, knots: [0, 0, 0, 0, 1, 2, 2, 3, 3, 3, 3], points: [[0, 0], [1, 2], [2, 3], [3, 1], [4, 1], [5, 3], [6, 0]]};

    test('NURBS: Reset returns to the chosen non-first example, not the fixed circle', async () => {
        const graph = new Nurbs();
        const view = mountGraph(graph).view;
        graph.selectExample('unit');
        graph.editPoint(2, [5, 5]);
        await graph.reset();
        expect(graph.state.example).toBe('unit');
        expect(graph.state.weights).toEqual(Array(9).fill(1));
        expect(graph.state.points).toEqual(CIRCLE.points);
        view.unmount();
    });

    test('Insertion: Reset returns to the chosen cubic, not the fixed quadratic', async () => {
        const graph = new BSplineInsertionGraph();
        const view = mountGraph(graph).view;
        graph.selectExample('cubic');
        await graph.reset();
        expect(graph.state.example).toBe('cubic');
        expect(graph.state.degree).toBe(CUBIC.degree);
        expect(graph.state.knots).toEqual(CUBIC.knots);
        expect(graph.state.points).toEqual(CUBIC.points);
        view.unmount();
    });

    test('Extraction: Reset returns to the chosen cubic, not the fixed quadratic', async () => {
        const graph = new BSplineExtractionGraph();
        const view = mountGraph(graph).view;
        graph.selectExample('cubic');
        await graph.reset();
        expect(graph.state.degree).toBe(CUBIC.degree);
        expect(graph.state.knots).toEqual(CUBIC.knots);
        expect(graph.state.points).toEqual(CUBIC.points);
        view.unmount();
    });
});
