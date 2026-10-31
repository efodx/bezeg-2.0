import React from 'react';
import {act, render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import HermiteGraph from './HermiteGraph';
import {GraphHost} from '../../base/GraphHost';
import {DEFAULT_HERMITE_PRESET, HermitePresetData} from './hermiteModel';
import {hermitePresetCollection} from './hermitePresetCollection';
import {hermiteToBezier} from '../../../analysis/hermite';
import {setLanguage} from '../../../localization';
import type {Preset} from '../../base/presets/Presets';

// jsdom has no canvas and no matchMedia; JSXGraph touches both while creating a board.
beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

class ObservedHermiteGraph extends HermiteGraph {
    liveBoard() { return this.board; }

    sceneOf() { return this['scene']!; }

    lessonDefault() { this.prepareLessonDefaultScene(); }

    lessonFixture(data: HermitePresetData) { this['prepareLessonFixtureScene'](data, undefined); }

    figure(preset: Preset) { this.disposeFigureScene(); this.importFigurePresetData(preset); this.initialize(); }

    ownedElements() { return [...(this['scene']?.ownedElements() ?? [])]; }

    ownedOnBoard() { return this.ownedElements().filter(element => this.board.objectsList.includes(element)).length; }
}

const mount = () => {
    const graph = new ObservedHermiteGraph();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view, board: graph.liveBoard()};
};

/** JSXGraph types omit the event trigger the board itself uses for a drag. */
const drag = (point: unknown) => (point as {triggerEventHandlers(names: string[], args: unknown[]): void}).triggerEventHandlers(['drag'], []);

type Pair = readonly [number, number];
type Curve = {X: (t: number) => number; Y: (t: number) => number; updateDataArray: () => void; dataX: number[]; dataY: number[]};

/** The scene creates, in order: n - 1 control polygons, the curve, 2 (n - 1) Bezier control points, then data points, tips and arrows. */
const parts = (graph: ObservedHermiteGraph) => {
    const n = graph.state.points.length;
    const owned = graph.ownedElements() as any[];
    return {
        polygons: owned.slice(0, n - 1) as Curve[],
        curve: owned[n - 1] as Curve,
        controls: owned.slice(n, n + 2 * (n - 1)) as any[],
        tips: graph.sceneOf().tipElements() as any[],
        arrows: owned.filter(e => e.elType === 'arrow') as any[],
        text: owned[owned.length - 1] as any,
    };
};

const at = (curve: Curve, t: number): Pair => [curve.X(t), curve.Y(t)];
/** Derivative by three-point one-sided differences with step e (exact up to O(e^2) on one cubic segment). */
const slope = (curve: Curve, t: number, side: 'right' | 'left'): Pair => {
    const e = 1e-5;
    const f = (s: number) => at(curve, t + s);
    return [0, 1].map(k => side === 'right' ? (-3 * f(0)[k] + 4 * f(e)[k] - f(2 * e)[k]) / (2 * e)
        : (3 * f(0)[k] - 4 * f(-e)[k] + f(-2 * e)[k]) / (2 * e)) as unknown as Pair;
};

const hermiteData = (overrides: Partial<HermitePresetData> = {}): HermitePresetData => ({
    ...DEFAULT_HERMITE_PRESET, mode: 'hermite', tangents: [[2, 0], [0, 2], [1, -1], [-1, -2]], showBezier: true, ...overrides,
});

describe('HermiteGraph on a real board', () => {
    test.each(['uniform', 'chord'] as const)('Hermite mode (%s): the drawn curve has the value and the global derivative m_i at every point', rule => {
        const {graph, view} = mount();
        const data = hermiteData({parameterRule: rule});
        graph.importPresetData(data);
        const {curve} = parts(graph);
        const t = [0];
        for (let i = 1; i < 4; i++) {
            t.push(t[i - 1] + (rule === 'uniform' ? 1 : Math.hypot(data.points[i][0] - data.points[i - 1][0], data.points[i][1] - data.points[i - 1][1])));
        }
        expect(data.tangents.length).toBe(4);
        data.points.forEach((p, i) => {
            const value = at(curve, t[i]);
            expect(Math.abs(value[0] - p[0])).toBeLessThanOrEqual(1e-9);
            expect(Math.abs(value[1] - p[1])).toBeLessThanOrEqual(1e-9);
            // One-sided inside each segment: a central difference across the join is only O(e) (C1, not C2).
            const sides = [...(i < 3 ? ['right' as const] : []), ...(i > 0 ? ['left' as const] : [])];
            sides.forEach(side => {
                const derivative = slope(curve, t[i], side);
                expect(Math.abs(derivative[0] - data.tangents[i][0])).toBeLessThanOrEqual(1e-9);
                expect(Math.abs(derivative[1] - data.tangents[i][1])).toBeLessThanOrEqual(1e-9);
            });
        });
        view.unmount();
    });

    test('the Bezier overlay shows hermiteToBezier of each segment, as points and as a polygon, and the cubic through them is the drawn segment', () => {
        const {graph, view, board} = mount();
        for (const rule of ['uniform', 'chord'] as const) {
            const data = hermiteData({parameterRule: rule});
            graph.importPresetData(data);
            board.update();
            const {curve, polygons, controls} = parts(graph);
            const chain = graph.sceneOf().chain()!;
            expect(controls.length).toBe(6);
            expect(polygons.length).toBe(3);
            chain.segments.forEach((segment, i) => {
                const q = hermiteToBezier(segment);
                // The global derivative is the tangent the overlay is built from: Q1 = P_i + h_i m_i / 3.
                const h = chain.parameters[i + 1] - chain.parameters[i];
                expect(q[1][0]).toBeCloseTo(data.points[i][0] + h * data.tangents[i][0] / 3, 12);
                expect(q[2][1]).toBeCloseTo(data.points[i + 1][1] - h * data.tangents[i + 1][1] / 3, 12);
                expect([controls[2 * i].X(), controls[2 * i].Y()]).toEqual([q[1][0], q[1][1]]);
                expect([controls[2 * i + 1].X(), controls[2 * i + 1].Y()]).toEqual([q[2][0], q[2][1]]);
                polygons[i].updateDataArray();
                expect(polygons[i].dataX).toEqual(q.map(c => c[0]));
                expect(polygons[i].dataY).toEqual(q.map(c => c[1]));
                for (const u of [0, 0.13, 0.5, 0.77, 1]) {
                    const b = [0, 1].map(k => (1 - u) ** 3 * q[0][k] + 3 * u * (1 - u) ** 2 * q[1][k] + 3 * u * u * (1 - u) * q[2][k] + u ** 3 * q[3][k]);
                    const drawn = at(curve, chain.parameters[i] + h * u);
                    expect(Math.abs(drawn[0] - b[0])).toBeLessThanOrEqual(1e-12);
                    expect(Math.abs(drawn[1] - b[1])).toBeLessThanOrEqual(1e-12);
                }
            });
        }
        view.unmount();
    });

    test('the default scene: tangent arrows (1.5, 1.5) and (1.5, -1) at the inner points, curve (2, 2.8125) at the middle midpoint', () => {
        const {graph, view} = mount();
        const {curve, tips, arrows} = parts(graph);
        expect(graph.state.mode).toBe('catmull-rom');
        expect(tips.length).toBe(4);
        expect(arrows.length).toBe(4);
        const points = graph.sceneOf().pointElements();
        expect([tips[1].X() - points[1].X(), tips[1].Y() - points[1].Y()]).toEqual([1.5, 1.5]);
        expect([tips[2].X() - points[2].X(), tips[2].Y() - points[2].Y()]).toEqual([1.5, -1]);
        expect(arrows[1].point1).toBe(points[1]);
        expect(arrows[1].point2).toBe(tips[1]);
        expect(Math.abs(curve.X(1.5) - 2)).toBeLessThanOrEqual(1e-12);
        expect(Math.abs(curve.Y(1.5) - 2.8125)).toBeLessThanOrEqual(1e-12);
        view.unmount();
    });

    test('locality: moving point 2 of a seven-point Catmull-Rom chain changes segments 0..3 only; segments 4 and 5 are untouched', () => {
        const {graph, view} = mount();
        const points = [[0, 0], [1, 2], [2, 0.5], [3.5, 3], [4, 0], [5.5, 2], [7, 0]] as [number, number][];
        graph.importPresetData({...DEFAULT_HERMITE_PRESET, points, tangents: points.map(() => [0, 0] as const)});
        const {curve} = parts(graph);
        const sample = () => Array.from({length: 6}, (_, s) => Array.from({length: 21}, (_, k) => at(curve, s + k / 20)));
        const before = sample();
        graph.movePoint(2, 2.3, -0.7);
        expect(graph.state.points[2]).toEqual([2.3, -0.7]);
        const after = sample();
        const changed = before.map((segment, s) => segment.some((p, k) => p[0] !== after[s][k][0] || p[1] !== after[s][k][1]));
        expect(changed).toEqual([true, true, true, true, false, false]);
        view.unmount();
    });

    test('a coincident drag is refused: the state keeps the data, the point snaps back and the notice shows', () => {
        const {graph, view} = mount();
        const [p0, p1] = graph.sceneOf().pointElements();
        p1.moveTo([p0.X(), p0.Y()]);
        act(() => drag(p1));
        expect(graph.state.points[1]).toEqual([1, 2]);
        expect(graph.state.notice).toBe('coincident');
        expect([p1.X(), p1.Y()]).toEqual([1, 2]);
        expect(screen.getByRole('alert')).toBeInTheDocument();
        p1.moveTo([1, 2.5]);
        act(() => drag(p1));
        expect(graph.state.points[1]).toEqual([1, 2.5]);
        expect(graph.state.notice).toBe('');
        expect(screen.queryByRole('alert')).toBeNull();
        view.unmount();
    });

    test('a typed edit onto a neighbour is refused with the message and nothing changes; a rule switch that merges the parameters is refused', () => {
        const {graph, view} = mount();
        const before = graph.state;
        const message = graph.editPoint(1, [0, 0]);
        expect(message).toContain('Interpolacijski točki 1 in 2');
        expect(graph.state).toBe(before);
        expect(typeof graph.editPoint(1, [1, 5000])).toBe('string');
        expect(graph.state).toBe(before);
        // Chord parameters 0, 1000, 1000 + 1e-300 round to a repeat; uniform parameters do not.
        graph.importPresetData({...DEFAULT_HERMITE_PRESET, points: [[0, 0], [1000, 0], [1000, 1e-300]], tangents: [[0, 0], [0, 0], [0, 0]]});
        graph.setParameterRule('chord');
        expect(graph.state.parameterRule).toBe('uniform');
        expect(graph.state.notice).toBe('coincident');
        view.unmount();
    });

    test('import refuses coincident points under both rules and out-of-cap data, leaving the state and the scene alone', () => {
        const {graph, view} = mount();
        const before = graph.state;
        const owned = graph.ownedElements();
        const equal: HermitePresetData = {...DEFAULT_HERMITE_PRESET, points: [[0, 0], [0, 0], [3, 3], [4, 0]]};
        expect(() => graph.importPresetData(equal)).toThrow();
        expect(() => graph.importPresetData({...equal, parameterRule: 'chord'})).toThrow();
        expect(() => graph.importPresetData({...DEFAULT_HERMITE_PRESET, points: [[0, 0], [1000, 0], [1000, 1e-300]], tangents: [[0, 0], [0, 0], [0, 0]], parameterRule: 'chord'})).toThrow();
        expect(() => graph.importPresetData({...DEFAULT_HERMITE_PRESET, tangents: [[0, 0]]})).toThrow();
        expect(() => graph.importPresetData({...DEFAULT_HERMITE_PRESET, tangents: [[1, 2], [1.5, 1.5], [1.5, -1], [1, 5000]]})).toThrow();
        expect(() => graph.importPresetData({...DEFAULT_HERMITE_PRESET, tension: 2.5})).toThrow();
        expect(graph.state).toBe(before);
        expect(graph.ownedElements()).toEqual(owned);
        view.unmount();
    });

    test('switching to Hermite mode copies the tension-scaled Catmull-Rom tangents and the curve does not jump; back leaves them stored', () => {
        const {graph, view} = mount();
        act(() => graph.setTension(0.5));
        const {curve} = parts(graph);
        const samples = Array.from({length: 31}, (_, k) => at(curve, k / 10));
        act(() => graph.setMode('hermite'));
        expect(graph.state.tangents).toEqual([[0.5, 1], [0.75, 0.75], [0.75, -0.5], [0.5, -1.5]]);
        samples.forEach((p, k) => {
            expect(Math.abs(curve.X(k / 10) - p[0])).toBeLessThanOrEqual(1e-12);
            expect(Math.abs(curve.Y(k / 10) - p[1])).toBeLessThanOrEqual(1e-12);
        });
        act(() => { graph.moveTangent(1, 4, 2); });
        act(() => graph.setMode('catmull-rom'));
        expect(graph.state.tangents[1]).toEqual([3, 0]);
        // Catmull-Rom mode ignores the stored tangents: the arrow is the derived one again.
        expect([parts(graph).tips[1].X(), parts(graph).tips[1].Y()]).toEqual([1.75, 2.75]);
        view.unmount();
    });

    test('a tangent handle drags only in Hermite mode (tip - P becomes m_i); dragging a point keeps its tangent and the arrow follows', () => {
        const {graph, view} = mount();
        const [tip0, tip1] = parts(graph).tips;
        tip1.moveTo([4, 4]);
        act(() => drag(tip1));
        expect(graph.state.tangents[1]).toEqual([1.5, 1.5]);
        expect([tip1.X(), tip1.Y()]).toEqual([2.5, 3.5]);
        expect(tip1.visProp.fixed).toBe(true);
        act(() => graph.setMode('hermite'));
        expect(tip1.visProp.fixed).toBe(false);
        tip1.moveTo([4, 4]);
        act(() => drag(tip1));
        expect(graph.state.tangents[1]).toEqual([3, 2]);
        expect(graph.state.tangents[0]).toEqual([1, 2]);
        expect([tip0.X(), tip0.Y()]).toEqual([1, 2]);
        const p1 = graph.sceneOf().pointElements()[1];
        p1.moveTo([1.5, 2]);
        act(() => drag(p1));
        expect(graph.state.tangents[1]).toEqual([3, 2]);
        expect([tip1.X(), tip1.Y()]).toEqual([4.5, 4]);
        view.unmount();
    });

    test('the tension slider is enabled for Catmull-Rom, disabled in Hermite mode where setTension is ignored; tangent fields appear only there', () => {
        const {graph, view} = mount();
        const slider = () => screen.getAllByRole('slider').find(s => (s as HTMLInputElement).max === '2') as HTMLInputElement;
        expect(slider().disabled).toBe(false);
        expect(screen.queryByText('Komponente tangent')).toBeNull();
        expect(screen.getByText(/enostranski/)).toBeInTheDocument();
        act(() => graph.setTension(0.3));
        expect(graph.state.tension).toBe(0.3);
        act(() => graph.setMode('hermite'));
        expect(slider().disabled).toBe(true);
        act(() => graph.setTension(1.2));
        expect(graph.state.tension).toBe(0.3);
        expect(screen.getByText('Komponente tangent')).toBeInTheDocument();
        expect(screen.queryByText(/enostranski/)).toBeNull();
        expect(screen.getByRole('spinbutton', {name: 'Tangenta 2, m_x'})).toBeInTheDocument();
        view.unmount();
    });

    test('a typed tangent changes the arrow and the curve; an out-of-range one is refused', () => {
        const {graph, view} = mount();
        act(() => graph.setMode('hermite'));
        act(() => { expect(graph.editTangent(1, [0, 4])).toBeUndefined(); });
        expect(graph.state.tangents[1]).toEqual([0, 4]);
        expect([parts(graph).tips[1].X(), parts(graph).tips[1].Y()]).toEqual([1, 6]);
        act(() => { expect(typeof graph.editTangent(1, [4001, 0])).toBe('string'); });
        expect(graph.state.tangents[1]).toEqual([0, 4]);
        view.unmount();
    });

    test('add appends a point one unit right with its Catmull-Rom tangent; remove drops the last point and tangent', () => {
        const {graph, view, board} = mount();
        const base = board.objectsList.length;
        graph.addPoint();
        expect(graph.state.points[4]).toEqual([5, 0]);
        expect(graph.state.tangents[4]).toEqual([1, 0]);
        expect(graph.state.tangents.length).toBe(5);
        expect(graph.sceneOf().tipElements().length).toBe(5);
        graph.removePoint();
        expect(graph.state.tangents.length).toBe(4);
        expect(board.objectsList.length).toBe(base);
        view.unmount();
    });

    test('the board status text follows a live language switch', () => {
        const {graph, view} = mount();
        const text = parts(graph).text;
        expect(text.plaintext).toBe('Catmull-Romov zlepek, napetost 1');
        act(() => setLanguage('en'));
        expect(text.plaintext).toBe('Catmull-Rom spline, tension 1');
        act(() => graph.setMode('hermite'));
        expect(text.plaintext).toBe('Hermite curve with chosen tangents');
        act(() => setLanguage('sl'));
        expect(text.plaintext).toBe('Hermiteova krivulja z izbranimi tangentami');
        view.unmount();
    });

    test('a Preset round trip through the collection restores the same data', () => {
        const {graph, view} = mount();
        const input = hermiteData({parameterRule: 'chord', tension: 0.4, showTangents: false});
        graph.importPresetData(input);
        const exported = graph.exportPresetData();
        expect(exported).toEqual(input);
        const checked = hermitePresetCollection.check(JSON.parse(JSON.stringify(exported)));
        expect('data' in checked && checked.data).toEqual(exported);
        graph.importPresetData(DEFAULT_HERMITE_PRESET);
        graph.importPresetData((checked as {data: HermitePresetData}).data);
        expect(graph.exportPresetData()).toEqual(exported);
        view.unmount();
    });

    test('importPreset applies a saved view before the data and fits a Preset without one to its points', () => {
        const {graph, view, board} = mount();
        const fit = vi.spyOn(board, 'setBoundingBox');
        const far = hermiteData({points: [[100, 100], [101, 102], [103, 103], [104, 100]], mode: 'catmull-rom'});
        graph.importPreset({name: 'x', data: far} as unknown as Preset);
        const [left, top, right, bottom] = fit.mock.calls[fit.mock.calls.length - 1][0];
        expect(left).toBeLessThan(100);
        expect(right).toBeGreaterThan(104);
        expect(bottom).toBeLessThan(100);
        expect(top).toBeGreaterThan(103);
        fit.mockClear();
        graph.importPreset({name: 'y', data: DEFAULT_HERMITE_PRESET, boardState: {boundingBox: [-50, 60, 70, -40]}} as unknown as Preset);
        expect(fit).toHaveBeenCalledTimes(1);
        expect(fit.mock.calls[0][0]).toEqual([-50, 60, 70, -40]);
        view.unmount();
    });

    test('lesson fixture and default scenes keep the imported data and rebuild the scene without orphans', () => {
        const { graph, view, board } = mount();
        const fixture = hermiteData({points: [[0, 0], [1, 2], [2, 1], [3, 3], [4, 0], [5, 2]], tangents: Array.from({length: 6}, () => [1, 0] as const)});
        act(() => graph.lessonFixture(fixture));
        expect(graph.exportPresetData()).toEqual(fixture);
        expect(graph.state.initialized).toBe(true);
        expect(graph.sceneOf().pointElements().length).toBe(6);
        expect(graph.sceneOf().tipElements().length).toBe(6);
        expect(graph.ownedOnBoard()).toBe(graph.ownedElements().length);
        expect(board.objectsList.filter((o: any) => o.elType === 'arrow').length).toBe(6);
        act(() => graph.lessonDefault());
        expect(graph.exportPresetData()).toEqual(DEFAULT_HERMITE_PRESET);
        expect(graph.sceneOf().pointElements().length).toBe(4);
        expect(board.objectsList.filter((o: any) => o.elType === 'arrow').length).toBe(4);
        view.unmount();
    });

    test('restoring a checkpoint taken with four points after adding a fifth leaves four points, four tips and the old tangents', () => {
        const {graph, view} = mount();
        act(() => graph.setMode('hermite'));
        const capabilities = graph.getLessonCapabilities();
        const checkpoint = capabilities.captureState();
        act(() => { graph.addPoint(); graph.moveTangent(0, 5, 5); });
        expect(graph.sceneOf().pointElements().length).toBe(5);
        act(() => capabilities.restoreState(checkpoint));
        expect(graph.state.points.length).toBe(4);
        expect(graph.state.mode).toBe('hermite');
        expect(graph.state.tangents[0]).toEqual([1, 2]);
        expect(graph.sceneOf().pointElements().length).toBe(4);
        expect(graph.sceneOf().tipElements().length).toBe(4);
        expect(graph.ownedOnBoard()).toBe(graph.ownedElements().length);
        view.unmount();
    });

    test('a figure batch scene replacement disposes the old scene and builds one for the Preset data', () => {
        const {graph, view, board} = mount();
        const old = graph.ownedElements();
        const data = hermiteData();
        graph.figure({name: 'f', data} as unknown as Preset);
        expect(old.some(element => board.objectsList.includes(element))).toBe(false);
        expect(graph.state.mode).toBe('hermite');
        expect(graph.ownedOnBoard()).toBe(graph.ownedElements().length);
        expect(graph.sceneOf().pointElements().length).toBe(4);
        view.unmount();
    });

    test('reset returns to the default scene', async () => {
        const {graph, view} = mount();
        act(() => graph.importPresetData(hermiteData({points: [[0, 0], [2, 5], [7, -1]], tangents: [[1, 1], [1, 1], [1, 1]]})));
        // `await act(async () => graph.reset())` never settles under jsdom, so poll for the reloaded scene.
        act(() => { void graph.reset(); });
        await waitFor(() => expect(graph.state.points.length).toBe(4));
        expect(graph.exportPresetData()).toEqual(DEFAULT_HERMITE_PRESET);
        expect(graph.sceneOf().tipElements().length).toBe(4);
        view.unmount();
    });

    test('unmount leaves no owned element behind', () => {
        const {graph, view, board} = mount();
        const owned = graph.ownedElements();
        view.unmount();
        expect(owned.some(element => board.objectsList.includes(element))).toBe(false);
    });
}, 30000);
