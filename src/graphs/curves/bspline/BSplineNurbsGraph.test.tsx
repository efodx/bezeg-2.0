import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeAll, describe, expect, test, vi} from 'vitest';
import JXG from 'jsxgraph';
import BSplineNurbsGraph, {errorText} from './BSplineNurbsGraph';
import {GraphHost} from '../../base/GraphHost';
import {LocalizedError, renderMessage, setLanguage} from '../../../localization';
import {BSplinePresetData, bsplinePresetCollection} from './bsplinePresetCollection';
import {angleDegrees, maxRadialError, nurbsExample, nurbsPointAt} from './bsplineNurbsModel';
import {BSplineNurbsScene} from './BSplineNurbsScene';

const liveSubscriptions = vi.hoisted(() => ({count: 0}));
vi.mock('../../../localization', async importOriginal => {
    const original = await importOriginal<typeof import('../../../localization')>();
    return {
        ...original,
        onLanguageChange: (listener: () => void) => {
            liveSubscriptions.count++;
            const unsubscribe = original.onLanguageChange(listener);
            let released = false;
            return () => { if (!released) { released = true; liveSubscriptions.count--; } unsubscribe(); };
        },
    };
});

// jsdom has no canvas and no matchMedia; JSXGraph touches both while creating a board.
beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

afterEach(() => setLanguage('sl'));

class ObservedGraph extends BSplineNurbsGraph {
    liveBoard() { return this.board; }
    sceneOf() { return this['scene']!; }
    /** The curve sampled from the model object the scene draws (its weights included). */
    sample(count = 400): [number, number][] {
        const model = this.sceneOf().curve.getCurve();
        const [a, b] = model.getDomain();
        return Array.from({length: count + 1}, (_, i) => {
            const p = model.eval(a + (b - a) * i / count);
            return [p.X(), p.Y()] as [number, number];
        });
    }
}

const mount = () => {
    const graph = new ObservedGraph();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view, board: graph.liveBoard()};
};

const S = Math.SQRT1_2;
const radialOf = (samples: [number, number][]) => Math.max(...samples.map(p => Math.abs(Math.hypot(p[0], p[1]) - 1)));

describe('L5 acceptance 1: the radial error', () => {
    test('below 1e-12 for the defaults (state and drawn model curve), above 1e-2 for unit weights', () => {
        const {graph, view} = mount();
        expect(graph.state.weights).toEqual([1, S, 1, S, 1, S, 1, S, 1]);
        expect(graph.radialError()).toBeLessThan(1e-12);
        expect(radialOf(graph.sample(1000))).toBeLessThan(1e-12);
        act(() => graph.selectExample('unit'));
        expect(graph.radialError()).toBeGreaterThan(1e-2);
        expect(radialOf(graph.sample(1000))).toBeGreaterThan(1e-2);
        view.unmount();
    });

    test('the readout is the maximum over 1001 uniform samples of the domain, both ends included (BS-C-6 audit)', () => {
        const {graph, view} = mount();
        act(() => graph.setWeight(1, 0.37));
        const data = {...nurbsExample('circle'), weights: [1, 0.37, 1, S, 1, S, 1, S, 1]};
        const maxOver = (count: number) => {
            let max = 0;
            for (let i = 0; i < count; i++) {
                const [x, y] = nurbsPointAt(data, i / (count - 1));
                max = Math.max(max, Math.abs(Math.hypot(x, y) - 1));
            }
            return max;
        };
        expect(graph.state.weights[1]).toBe(0.37);
        expect(graph.radialError()).toBeCloseTo(maxOver(1001), 14);
        // Non-vacuous: a coarser sampling gives a visibly different maximum for this state.
        expect(Math.abs(maxOver(101) - maxOver(1001))).toBeGreaterThan(1e-6);
        view.unmount();
    });

    test('the inspector shows the readout, and it follows the example', () => {
        const {graph, view} = mount();
        const readout = () => document.querySelector('[data-nurbs-readout="radial-error"]')!.textContent!;
        expect(readout()).toMatch(/(e-1[6-9]|: 0)$/);
        act(() => graph.selectExample('unit'));
        expect(readout()).toMatch(/e-0?[12]$/);
        view.unmount();
    });
});

describe('L5 acceptance 2: the point and the angle', () => {
    test('t = 1/16 gives (0.92979, 0.36809) at 21.598 degrees, t = 1/8 gives (sqrt2/2, sqrt2/2) at 45 degrees', () => {
        const {graph, view} = mount();
        const data = nurbsExample('circle');
        const [x, y] = nurbsPointAt(data, 1 / 16);
        // Exact rational quadratic value on the first quarter, local s = 1/4, middle weight sqrt2/2 (spec rounds to 5 digits).
        expect(Math.abs(x - 0.9297883010624303)).toBeLessThan(1e-12);
        expect(Math.abs(y - 0.3680947095618728)).toBeLessThan(1e-12);
        expect(angleDegrees([1, -1e-17])).toBe(0);
        expect(Math.abs(angleDegrees([x, y]) - 21.598161)).toBeLessThan(1e-4);
        const [x2, y2] = nurbsPointAt(data, 1 / 8);
        expect(Math.abs(x2 - S)).toBeLessThan(1e-12);
        expect(Math.abs(y2 - S)).toBeLessThan(1e-12);
        expect(Math.abs(angleDegrees([x2, y2]) - 45)).toBeLessThan(1e-12);
        // The inspector shows the default t = 1/16, then 1/8 after the slider moves; the board marker agrees.
        const point = () => document.querySelector('[data-nurbs-readout="point"]')!.textContent!;
        expect(point()).toContain('21,598°');
        act(() => graph.setT(0.125));
        expect(point()).toContain('45°');
        graph.boardUpdate();
        const marker = graph.sceneOf().markerElement()!;
        expect(Math.abs(marker.X() - S)).toBeLessThan(1e-12);
        expect(Math.abs(marker.Y() - S)).toBeLessThan(1e-12);
        view.unmount();
    });

    test('the parameter is clamped to the domain', () => {
        const {graph, view} = mount();
        act(() => graph.setT(7));
        expect(graph.state.t).toBe(1);
        act(() => graph.setT(-2));
        expect(graph.state.t).toBe(0);
        view.unmount();
    });
});

describe('L5 acceptance 3: weights are positive', () => {
    test.each([[0], [-1.5], [NaN], [Infinity]])('the weight value %s is refused with a reason and the curve keeps its state', value => {
        const {graph, view} = mount();
        const before = [...graph.state.weights];
        const sampled = graph.sample();
        let reason: string | undefined;
        act(() => { reason = graph.setWeight(3, value); });
        expect(reason).toMatch(/^utež 4 mora biti (pozitivna|končno število)$/);
        expect(graph.state.weights).toEqual(before);
        expect(graph.sample()).toEqual(sampled);
        expect(graph.state.refusal?.index).toBe(3);
        expect(screen.getByRole('alert').textContent).toBe(reason);
        view.unmount();
    });

    test('a valid weight is applied (state and drawn curve) and clears the refusal; the typed field refuses 0', () => {
        const {graph, view} = mount();
        const field = screen.getByLabelText('Utež 2');
        fireEvent.change(field, {target: {value: '0'}});
        expect(graph.state.weights[1]).toBe(S);
        expect(screen.getByRole('alert').textContent).toBe('utež 2 mora biti pozitivna');
        const before = graph.sample();
        act(() => { expect(graph.setWeight(1, 2)).toBeUndefined(); });
        expect(graph.state.weights[1]).toBe(2);
        expect(graph.state.refusal).toBeNull();
        expect(graph.sample()).not.toEqual(before);
        view.unmount();
    });
});

describe('L5 acceptance 4: scaling the weights', () => {
    test('all weights times 3.7 leave the sampled points unchanged to 1e-12', () => {
        const {graph, view} = mount();
        const circle = graph.sample();
        // Make the weights non-trivial first, so the check would fail if weights were ignored.
        act(() => { graph.setWeight(1, 2); });
        const before = graph.sample();
        expect(Math.max(...before.map((p, i) => Math.hypot(p[0] - circle[i][0], p[1] - circle[i][1])))).toBeGreaterThan(1e-2);
        const original = [...graph.state.weights];
        act(() => { original.forEach((w, i) => graph.setWeight(i, w * 3.7)); });
        expect(graph.state.weights[0]).toBeCloseTo(3.7, 12);
        expect(graph.state.weights[1]).toBeCloseTo(7.4, 12);
        const after = graph.sample();
        before.forEach((p, i) => {
            expect(Math.abs(p[0] - after[i][0])).toBeLessThan(1e-12);
            expect(Math.abs(p[1] - after[i][1])).toBeLessThan(1e-12);
        });
        view.unmount();
    });
});

describe('controls', () => {
    test('Reset restores the example after a weight edit and a parameter change', () => {
        const {graph, view} = mount();
        act(() => { graph.setWeight(1, 3); graph.setT(0.5); });
        fireEvent.click(screen.getByRole('button', {name: 'Nazaj na primer'}));
        expect(graph.state.weights).toEqual(nurbsExample('circle').weights);
        expect(graph.state.t).toBe(1 / 16);
        expect(graph.radialError()).toBeLessThan(1e-12);
        view.unmount();
    });

    test('the example switch changes weights and the Reset target', () => {
        const {graph, view} = mount();
        act(() => graph.selectExample('unit'));
        expect(graph.state.weights).toEqual(Array(9).fill(1));
        expect(graph.state.example).toBe('unit');
        act(() => { graph.setWeight(1, 3); graph.resetToOrigin(); });
        expect(graph.state.weights).toEqual(Array(9).fill(1));
        act(() => graph.selectExample('circle'));
        expect(graph.state.example).toBe('circle');
        expect(maxRadialError(graph.state)).toBeLessThan(1e-12);
        view.unmount();
    });

    test('the overlay toggle controls the unit circle on the board, default on', () => {
        const {graph, view} = mount();
        const shown = () => (graph.sceneOf().circleElement() as unknown as {evalVisProp(name: string): unknown}).evalVisProp('visible');
        expect(graph.state.showCircle).toBe(true);
        expect(shown()).toBe(true);
        act(() => graph.setShowCircle(false));
        graph.boardUpdate();
        expect(shown()).toBe(false);
        view.unmount();
    });

    test('the board draws no text', () => {
        const {graph, view} = mount();
        const drawn = [...graph.sceneOf().ownedElements(), ...graph.sceneOf().curve.getJxgPoints(), graph.sceneOf().curve.getJxgCurve()];
        expect(drawn.filter(element => element.elType === 'text')).toHaveLength(0);
        view.unmount();
    });
});

describe('presets', () => {
    test('weights round-trip through the shared collection and a second graph', () => {
        const {graph, view} = mount();
        act(() => { graph.setWeight(1, 2.5); });
        const exported = graph.exportPresetData();
        const data = accepted(JSON.parse(JSON.stringify(exported)));
        expect(data.weights).toEqual(exported.weights);
        view.unmount();
        const other = mount();
        act(() => other.graph.importPresetData(data));
        expect(other.graph.state.weights).toEqual(exported.weights);
        expect(other.graph.state.example).toBe('custom');
        expect(other.graph.sceneOf().curve.getCurve().getWeights()).toEqual(exported.weights);
        other.view.unmount();
    });

    test('a stored curve without weights loads with unit weights and is the unit example', () => {
        const {graph, view} = mount();
        const unit = nurbsExample('unit');
        const data = accepted({degree: unit.degree, knots: unit.knots, points: unit.points});
        expect(data.weights).toBeUndefined();
        act(() => graph.importPresetData(data));
        expect(graph.state.weights).toEqual(Array(9).fill(1));
        expect(graph.state.example).toBe('unit');
        view.unmount();
    });

    test('an import that changes only the knots draws the new knots', () => {
        const {graph, view} = mount();
        const data = {degree: 2, points: [[0, 0], [1, 1], [2, 0], [3, 1]] as [number, number][], weights: [1, 1, 1, 1]};
        act(() => graph.importPresetData({...data, knots: [0, 0, 0, 0.5, 1, 1, 1]}));
        act(() => graph.importPresetData({...data, knots: [0, 0, 0, 0.25, 1, 1, 1]}));
        expect(graph.sceneOf().curve.getCurve().getKnots()).toEqual([0, 0, 0, 0.25, 1, 1, 1]);
        view.unmount();
    });

    test('mounting and importing each build one scene: no scene is built only to be thrown away', () => {
        const dispose = vi.spyOn(BSplineNurbsScene.prototype, 'dispose');
        const {graph, view} = mount();
        expect(dispose).not.toHaveBeenCalled();
        const smaller = {degree: 2, knots: [0, 0, 0, 1, 1, 1], points: [[0, 0], [1, 1], [2, 0]] as [number, number][], weights: [1, 2, 1]};
        act(() => graph.importPresetData(smaller));
        expect(dispose).toHaveBeenCalledTimes(1);
        expect(graph.sceneOf().curve.getCurve().getWeights()).toEqual([1, 2, 1]);
        dispose.mockClear();
        act(() => graph.importPresetData({...smaller, weights: [1, 3, 1]}));
        expect(dispose).not.toHaveBeenCalled();
        expect(graph.sceneOf().curve.getCurve().getWeights()).toEqual([1, 3, 1]);
        dispose.mockRestore();
        view.unmount();
    });

    test('the default Preset is the circle, and the host Reset follows the chosen example', () => {
        const {graph, view} = mount();
        expect(graph.defaultPreset().weights).toEqual(nurbsExample('circle').weights);
        act(() => graph.selectExample('unit'));
        expect(graph.defaultPreset().weights).toEqual(Array(9).fill(1));
        view.unmount();
    });
});

describe('disposal', () => {
    test('scene rebuilds and unmount leave no board objects and no language subscription', () => {
        const before = liveSubscriptions.count;
        const {graph, view, board} = mount();
        const owned = () => [...graph.sceneOf().ownedElements(), ...graph.sceneOf().curve.getJxgPoints(), graph.sceneOf().curve.getJxgCurve()];
        const first = owned();
        expect(first.length).toBeGreaterThan(5);
        act(() => graph.importPresetData({degree: 2, knots: [0, 0, 0, 1, 1, 1], points: [[0, 0], [1, 1], [2, 0]], weights: [1, 2, 1]}));
        expect(first.some(element => board.objectsList.includes(element))).toBe(false);
        const second = owned();
        expect(second.every(element => board.objectsList.includes(element))).toBe(true);
        expect(liveSubscriptions.count).toBe(before + 1); // The board's own, for its tick labels; the scene holds none.
        view.unmount();
        expect(second.some(element => board.objectsList.includes(element))).toBe(false);
        expect(liveSubscriptions.count).toBe(before);
    });
});

describe('lesson scenes and refused data', () => {
    type Apply = Parameters<ReturnType<ObservedGraph['getLessonCapabilities']>['apply']>[0];
    const fixture = (curve: object) => ({kind: 'prepared-scene', sceneId: 's', source: 'lesson-fixture', curve}) as unknown as Apply;
    const square: [number, number][] = [[0, 0], [1, 2], [3, 2], [4, 0]];

    test('a lesson fixture keeps points, weights (unit when absent), origin and example; t, circle and refusal reset', () => {
        const {graph, view} = mount();
        act(() => { graph.setT(0.4); graph.setShowCircle(false); graph.setWeight(1, 0); });
        expect(graph.state.refusal).not.toBeNull();
        act(() => graph.getLessonCapabilities().apply(fixture({points: square, degree: 2, weights: [1, 2, 3, 4]})));
        expect([graph.state.points, graph.state.weights, graph.state.degree]).toEqual([square, [1, 2, 3, 4], 2]);
        expect(graph.state.origin.weights).toEqual([1, 2, 3, 4]);
        expect(graph.state.origin.points).toEqual(square);
        expect(graph.state.example).toBe('custom');
        expect([graph.state.t, graph.state.showCircle, graph.state.refusal]).toEqual([1 / 16, true, null]);
        act(() => { graph.setT(0.5); graph.setShowCircle(false); });
        act(() => graph.getLessonCapabilities().apply(fixture({points: square, degree: 2})));
        expect(graph.state.weights).toEqual([1, 1, 1, 1]);
        expect(graph.state.origin.weights).toEqual([1, 1, 1, 1]);
        expect([graph.state.t, graph.state.showCircle, graph.state.refusal]).toEqual([1 / 16, true, null]);
        view.unmount();
    });

    test.each([[[1, 2, 3]], [[1, 2, 0, 4]], [[1, 2, -1, 4]]])('a lesson fixture with weights %j is refused with a localized weight message and the scene unchanged', weights => {
        const {graph, view} = mount();
        const before = [graph.state.points, graph.state.weights, graph.state.knots];
        let thrown: unknown;
        try { act(() => graph.getLessonCapabilities().apply(fixture({points: square, degree: 2, weights}))); } catch (error) { thrown = error; }
        expect(thrown).toBeInstanceOf(LocalizedError);
        expect((thrown as Error).message).toMatch(/^utež 3 mora biti pozitivna$|^uteži mora biti toliko kot kontrolnih točk \(4\)$/);
        expect([graph.state.points, graph.state.weights, graph.state.knots]).toEqual(before);
        view.unmount();
    });

    test.each([
        [[1, 2, 3], /^uteži mora biti toliko kot kontrolnih točk \(4\)$/],
        [[1, 2, 0, 4], /^utež 3 mora biti pozitivna$/],
        [[1, -2, 3, 4], /^utež 2 mora biti pozitivna$/],
    ])('importing weights %j is refused with an actionable message and the state is unchanged', (weights, text) => {
        const {graph, view} = mount();
        const data = {degree: 2, knots: [0, 0, 0, 1, 2, 2, 2], points: square, weights};
        const checked = bsplinePresetCollection.check(data);
        expect('rejection' in checked && renderMessage(checked.rejection)).toMatch(text);
        const before = JSON.stringify(graph.state);
        let thrown: unknown;
        try { act(() => graph.importPresetData(data)); } catch (error) { thrown = error; }
        expect(thrown).toBeInstanceOf(LocalizedError);
        expect((thrown as Error).message).toMatch(text);
        expect(JSON.stringify(graph.state)).toBe(before);
        view.unmount();
    });
});

describe('dragging and language', () => {
    test('a control-point drag updates the state points and the radial-error readout', () => {
        const {graph, view} = mount();
        const readout = () => document.querySelector('[data-nurbs-readout="radial-error"]')!.textContent!;
        const before = readout();
        const moved = graph.sceneOf().curve.getJxgPoints()[2];
        act(() => { moved.setPosition(JXG.COORDS_BY_USER, [1.5, 0.3]); (moved as unknown as {triggerEventHandlers(names: string[], args: unknown[]): void}).triggerEventHandlers(['drag'], []); });
        expect(graph.state.points[2]).toEqual([1.5, 0.3]);
        expect(graph.state.points.map(p => p.length)).toEqual(Array(9).fill(2));
        expect(graph.radialError()).toBeGreaterThan(0.1);
        expect(readout()).not.toBe(before);
        expect(readout()).toBe(`Največji odmik od enotske krožnice: ${errorText(graph.radialError())}`);
        view.unmount();
    });

    test('the refusal reason renders in English after a language switch', () => {
        const {graph, view} = mount();
        act(() => { graph.setWeight(3, 0); });
        expect(screen.getByRole('alert').textContent).toBe('utež 4 mora biti pozitivna');
        act(() => setLanguage('en'));
        expect(screen.getByRole('alert').textContent).toBe('weight 4 must be positive');
        view.unmount();
    });
});

/** The stored data a valid check returns; fails the test when the collection refused it. */
function accepted(raw: unknown): BSplinePresetData {
    const checked = bsplinePresetCollection.check(raw);
    if (!('data' in checked)) throw new Error('the collection refused the data');
    return checked.data;
}
