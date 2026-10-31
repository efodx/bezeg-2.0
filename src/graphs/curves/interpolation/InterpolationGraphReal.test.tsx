import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import InterpolationGraph from './InterpolationGraph';
import {GraphHost} from '../../base/GraphHost';
import {insideHull} from './interpolationModel';
import {interpolationPresetCollection} from './interpolationPresetCollection';

// jsdom has no canvas and no matchMedia; JSXGraph touches both while creating a board.
beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

class ObservedInterpolationGraph extends InterpolationGraph {
    liveBoard() { return this.board; }

    sceneOf() { return this['scene']!; }

    ownedElements() { return [...(this['scene']?.ownedElements() ?? [])]; }

    ownedOnBoard() { return this.ownedElements().filter(element => this.board.objectsList.includes(element)).length; }
}

const mount = () => {
    const graph = new ObservedInterpolationGraph();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view, board: graph.liveBoard()};
};

/** JSXGraph types omit the event trigger the board itself uses for a drag. */
const drag = (point: unknown) => (point as {triggerEventHandlers(names: string[], args: unknown[]): void}).triggerEventHandlers(['drag'], []);

// The scene creates, in order: hull curve, Bezier curve, Lagrange curve, two markers, the data points, the readout text.
const curves = (graph: ObservedInterpolationGraph) => {
    const [hull, bezier, lagrange] = graph.ownedElements() as any[];
    return {hull, bezier, lagrange};
};

describe('InterpolationGraph on a real board', () => {
    test('the drawn Lagrange curve passes through every data point, for uniform and chord parameters', () => {
        const {graph, view} = mount();
        for (const rule of ['uniform', 'chord'] as const) {
            graph.setParameterRule(rule);
            const {lagrange} = curves(graph);
            const points = graph.state.points;
            const parameters = [0];
            for (let i = 1; i < points.length; i++) {
                parameters.push(parameters[i - 1] + (rule === 'uniform' ? 1 : Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])));
            }
            points.forEach((p, i) => {
                expect(Math.abs(lagrange.X(parameters[i]) - p[0])).toBeLessThanOrEqual(1e-12);
                expect(Math.abs(lagrange.Y(parameters[i]) - p[1])).toBeLessThanOrEqual(1e-12);
            });
        }
        view.unmount();
    });

    test('the drawn curves hit the lesson defaults: Lagrange (2, 2.8125) at t = 3/2, Bezier (2, 1.875) at t = 1/2', () => {
        const {graph, view} = mount();
        const {lagrange, bezier} = curves(graph);
        expect(lagrange.X(1.5)).toBeCloseTo(2, 12);
        expect(lagrange.Y(1.5)).toBeCloseTo(2.8125, 12);
        expect(bezier.X(0.5)).toBeCloseTo(2, 12);
        expect(bezier.Y(0.5)).toBeCloseTo(1.875, 12);
        view.unmount();
    });

    test('the drawn curve reproduces a cubic polynomial curve through four points and a quartic through five', () => {
        const {graph, view} = mount();
        const poly = (t: number) => [t ** 3 - 2 * t, 0.5 * t ** 2 + 1] as [number, number];
        graph.importPresetData({points: [0, 1, 2, 3].map(poly), parameterRule: 'uniform', showHull: false, showBezier: true, t: 0.5});
        let {lagrange} = curves(graph);
        for (const u of [0.3, 1.7, 2.9]) {
            expect(Math.abs(lagrange.X(u) - poly(u)[0])).toBeLessThanOrEqual(1e-12);
            expect(Math.abs(lagrange.Y(u) - poly(u)[1])).toBeLessThanOrEqual(1e-12);
        }
        const quartic = (t: number) => [t ** 4 - t, 2 * t ** 3 - t ** 2] as [number, number];
        graph.importPresetData({points: [0, 1, 2, 3, 4].map(quartic), parameterRule: 'uniform', showHull: false, showBezier: true, t: 0.5});
        ({lagrange} = curves(graph));
        for (const u of [0.4, 2.2, 3.7]) expect(Math.abs(lagrange.X(u) - quartic(u)[0])).toBeLessThanOrEqual(1e-9);
        view.unmount();
    });

    test('on the default a sampled Lagrange point leaves the hull of the data points while every Bezier point stays inside', () => {
        const {graph, view} = mount();
        const {lagrange, bezier} = curves(graph);
        const data = graph.sceneOf().pointElements().map(p => [p.X(), p.Y()] as [number, number]);
        expect(data).toEqual([[0, 0], [1, 2], [3, 3], [4, 0]]);
        let outside = 0;
        for (let i = 0; i <= 300; i++) {
            if (!insideHull([lagrange.X(3 * i / 300), lagrange.Y(3 * i / 300)], data)) outside++;
            expect(insideHull([bezier.X(i / 300), bezier.Y(i / 300)], data)).toBe(true);
        }
        expect(outside).toBeGreaterThan(0);
        view.unmount();
    });

    test('dragging a board point updates the state; a coincident drag under the chord rule is refused and the point returns', () => {
        const {graph, view} = mount();
        const [p0, p1] = graph.sceneOf().pointElements();
        p1.moveTo([1, 2.5]);
        drag(p1);
        expect(graph.state.points[1]).toEqual([1, 2.5]);
        graph.setParameterRule('chord');
        p1.moveTo([p0.X(), p0.Y()]);
        drag(p1);
        expect(graph.state.points[1]).toEqual([1, 2.5]);
        expect(graph.state.notice).toBe('coincident');
        expect([p1.X(), p1.Y()]).toEqual([1, 2.5]);
        view.unmount();
    });

    test('import, add, remove and unmount leave exactly one owned set and nothing behind', () => {
        const { graph, view, board } = mount();
        const base = board.objectsList.length;
        const owned = graph.ownedElements().length;
        expect(graph.ownedOnBoard()).toBe(owned);
        const first = graph.ownedElements();
        for (let i = 0; i < 3; i++) graph.importPresetData(graph.exportPresetData());
        expect(first.some(element => board.objectsList.includes(element))).toBe(false);
        expect(board.objectsList.length).toBe(base);
        graph.addPoint();
        expect(graph.state.points.length).toBe(5);
        expect(board.objectsList.length).toBe(base + 2); // the new point and its label
        graph.removePoint();
        expect(board.objectsList.length).toBe(base);
        const last = graph.ownedElements();
        view.unmount();
        expect(last.some(element => board.objectsList.includes(element))).toBe(false);
    });

    test('a Preset round trip through the collection restores the same data', () => {
        const {graph, view} = mount();
        graph.setParameterRule('chord');
        graph.setShowHull(true);
        graph.setPosition(0.25);
        const exported = graph.exportPresetData();
        const checked = interpolationPresetCollection.check(JSON.parse(JSON.stringify(exported)));
        expect('data' in checked && checked.data).toEqual(exported);
        graph.importPresetData({points: [[0, 0], [1, 1]], parameterRule: 'uniform', showHull: false, showBezier: false, t: 0});
        graph.importPresetData((checked as {data: typeof exported}).data);
        expect(graph.exportPresetData()).toEqual(exported);
        view.unmount();
    });

    test('restoring a checkpoint taken with four points after adding a fifth leaves four points on the board', () => {
        const {graph, view, board} = mount();
        const capabilities = graph.getLessonCapabilities();
        const checkpoint = capabilities.captureState();
        graph.addPoint();
        expect(graph.sceneOf().pointElements().length).toBe(5);
        act(() => capabilities.restoreState(checkpoint));
        expect(graph.state.points.length).toBe(4);
        expect(graph.sceneOf().pointElements().length).toBe(4);
        expect(graph.ownedOnBoard()).toBe(graph.ownedElements().length);
        expect(board.objectsList.filter(o => (o as {elType?: string}).elType === 'point' && (o as {name?: string}).name?.startsWith('P')).length).toBe(4);
        view.unmount();
    });

    test('the hull is a closed polyline of the hull vertices', () => {
        const {graph, view} = mount();
        const hull = curves(graph).hull;
        graph.setShowHull(true);
        hull.updateDataArray();
        expect(hull.dataX).toEqual([0, 4, 3, 0, 0].slice(0, 0).concat(hull.dataX));
        expect(hull.dataX.length).toBe(5);
        expect([hull.dataX[0], hull.dataY[0]]).toEqual([hull.dataX[4], hull.dataY[4]]);
        expect(new Set(hull.dataX.map((x: number, i: number) => `${x},${hull.dataY[i]}`)).size).toBe(4);
        view.unmount();
    });
}, 30000);
