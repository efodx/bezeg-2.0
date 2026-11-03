import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeAll, describe, expect, test, vi} from 'vitest';
import BSplineNurbsGraph from './BSplineNurbsGraph';
import {GraphHost} from '../../base/GraphHost';
import {setLanguage} from '../../../localization';
import {BSplinePresetData, bsplinePresetCollection} from './bsplinePresetCollection';
import {angleDegrees, maxRadialError, nurbsExample, nurbsPointAt} from './bsplineNurbsModel';

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
        expect(Math.abs(x - 0.92979)).toBeLessThan(1e-5);
        expect(Math.abs(y - 0.36809)).toBeLessThan(1e-5);
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
        const before = graph.sample();
        const original = [...graph.state.weights];
        act(() => { original.forEach((w, i) => graph.setWeight(i, w * 3.7)); });
        expect(graph.state.weights[0]).toBeCloseTo(3.7, 12);
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
        expect(liveSubscriptions.count).toBe(before);
        view.unmount();
        expect(second.some(element => board.objectsList.includes(element))).toBe(false);
        expect(liveSubscriptions.count).toBe(before);
    });
});

/** The stored data a valid check returns; fails the test when the collection refused it. */
function accepted(raw: unknown): BSplinePresetData {
    const checked = bsplinePresetCollection.check(raw);
    if (!('data' in checked)) throw new Error('the collection refused the data');
    return checked.data;
}
