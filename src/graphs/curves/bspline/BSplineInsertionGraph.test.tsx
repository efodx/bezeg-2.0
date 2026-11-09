import React from 'react';
import JXG from 'jsxgraph';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeAll, describe, expect, test, vi} from 'vitest';
import BSplineInsertionGraph from './BSplineInsertionGraph';
import {GraphHost} from '../../base/GraphHost';
import {setLanguage} from '../../../localization';
import {combBySpan, joinReports, multiplicityRows} from './bsplineInsertionModel';
import {enterNumber} from '../../../inputs/testEntry';

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

const shown = (element: unknown) => (element as {evalVisProp(name: string): unknown}).evalVisProp('visible');

class ObservedGraph extends BSplineInsertionGraph {
    liveBoard() { return this.board; }
    sceneOf() { return this['scene']!; }
    /** The control points as the board holds them (what is drawn), after a board update. */
    boardPoints(): [number, number][] { return this.sceneOf().curve.getJxgPoints().map(p => [p.X(), p.Y()] as [number, number]); }
    ghostOnBoard(): [number, number][] { return this.sceneOf().ghostElements().map(p => [p.X(), p.Y()] as [number, number]); }
    /** The curve sampled from the model object the scene draws. */
    sample(count = 1000): [number, number][] {
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

const TOL = 1e-12;
const expectRows = (actual: readonly (readonly number[])[], expected: readonly (readonly number[])[]) => {
    expect(actual.length).toBe(expected.length);
    expected.forEach((row, i) => row.forEach((value, d) => expect(Math.abs(actual[i][d] - value)).toBeLessThanOrEqual(TOL)));
};
const maxDistance = (a: readonly (readonly number[])[], b: readonly (readonly number[])[]) =>
    Math.max(...a.map((p, i) => Math.hypot(p[0] - b[i][0], p[1] - b[i][1])));

describe('L3 acceptance 1-2: the inserted control points and the unchanged curve', () => {
    test('u = 1 on the L2 quadratic gives the five spec points, on the state and on the board', () => {
        const {graph, view} = mount();
        act(() => { expect(graph.insert(1)).toBe(true); });
        graph.boardUpdate();
        expect(graph.state.knots).toEqual([0, 0, 0, 1, 1, 2, 2, 2]);
        const expected = [[0, 0], [1, 2], [2, 2], [3, 2], [4, 0]];
        expectRows(graph.state.points, expected);
        expectRows(graph.boardPoints(), expected);
        expectRows(graph.sceneOf().curve.getCurve().getPoints().map(p => [p.X(), p.Y()]), expected);
        view.unmount();
    });

    test('u = 0.5 gives the de Boor level-1 points and knots (0,0,0,0.5,1,2,2,2)', () => {
        const {graph, view} = mount();
        act(() => { expect(graph.insert(0.5)).toBe(true); });
        graph.boardUpdate();
        expect(graph.state.knots).toEqual([0, 0, 0, 0.5, 1, 2, 2, 2]);
        const expected = [[0, 0], [0.5, 1], [1.5, 2], [3, 2], [4, 0]];
        expectRows(graph.state.points, expected);
        expectRows(graph.boardPoints(), expected);
        view.unmount();
    });

    test.each([[1], [0.5], [1.5]])('the curve sampled before and after inserting u = %s differs by less than 1e-12', x => {
        const {graph, view} = mount();
        const before = graph.sample();
        act(() => { graph.insert(x); });
        const after = graph.sample();
        expect(maxDistance(before, after)).toBeLessThan(1e-12);
        act(() => { graph.insert(0.25); });
        expect(maxDistance(before, graph.sample())).toBeLessThan(1e-12);
        view.unmount();
    });

    test('the input field and the button insert the typed knot', () => {
        const {graph, view} = mount();
        const field = screen.getByLabelText(/Vozel za vstavitev/);
        enterNumber(field, '0,5');
        fireEvent.click(screen.getByRole('button', {name: 'Vstavi vozel'}));
        expect(graph.state.knots).toEqual([0, 0, 0, 0.5, 1, 2, 2, 2]);
        view.unmount();
    });
});

describe('the ghost of the previous polygon', () => {
    test('after an insertion the old polygon is drawn faded, and the next insertion replaces it', () => {
        const {graph, view, board} = mount();
        expect(graph.sceneOf().ghostElements()).toHaveLength(0);
        act(() => { graph.insert(1); });
        graph.boardUpdate();
        const scene = graph.sceneOf();
        expectRows(graph.ghostOnBoard(), [[0, 0], [1, 2], [3, 2], [4, 0]]);
        expect(scene.ghostSegmentElements()).toHaveLength(3);
        scene.ghostSegmentElements().forEach(segment => {
            expect(board.objectsList.includes(segment)).toBe(true);
            expect(shown(segment)).toBe(true);
            expect((segment as unknown as { evalVisProp(name: string): number }).evalVisProp('strokeopacity')).toBeLessThan(0.5);
        });
        const first = [...scene.ghostSegmentElements()];
        act(() => { graph.insert(0.5); });
        graph.boardUpdate();
        expectRows(graph.ghostOnBoard(), [[0, 0], [1, 2], [2, 2], [3, 2], [4, 0]]);
        expect(first.some(segment => board.objectsList.includes(segment))).toBe(false);
        expect(graph.sceneOf().ghostSegmentElements()).toHaveLength(4);
        view.unmount();
    });

    test('a refused insertion leaves the ghost alone', () => {
        const {graph, view} = mount();
        act(() => { graph.insert(1); });
        const ghost = graph.state.ghost;
        act(() => { graph.insert(7); });
        expect(graph.state.ghost).toBe(ghost);
        view.unmount();
    });
});

const refusalText = () => document.querySelector('[data-refusal-notice]')?.textContent ?? '';

describe('L3 acceptance 4: refusals change nothing', () => {
    test('outside the domain and not finite are refused with a localized reason in both languages', () => {
        const {graph, view} = mount();
        const {knots, points, ghost} = graph.state;
        act(() => { expect(graph.insert(2.5)).toBe(false); });
        expect(graph.state.knots).toBe(knots);
        expect(graph.state.points).toBe(points);
        expect(graph.state.ghost).toBe(ghost);
        expect(refusalText()).toContain('zunaj definicijskega območja [0, 2]');
        act(() => setLanguage('en'));
        expect(refusalText()).toContain('outside the domain [0, 2]');
        act(() => { expect(graph.insert(-0.1)).toBe(false); });
        act(() => { expect(graph.insert(Number.NaN)).toBe(false); });
        expect(graph.state.refusal?.reason).toBe('not_finite');
        expect(refusalText()).toContain('finite number');
        expect(graph.state.knots).toBe(knots);
        expect(graph.state.points).toBe(points);
        view.unmount();
    });

    test('the domain ends are inside the domain: u = 0 raises the end knot above k + 1 only after k + 1 copies exist', () => {
        const {graph, view} = mount();
        // u = 0 already has multiplicity 3 = k + 1 in the clamped example, so it is refused for that reason.
        act(() => { expect(graph.insert(0)).toBe(false); });
        expect(graph.state.refusal?.reason).toBe('multiplicity_too_high');
        view.unmount();
    });

    test('a knot of multiplicity k + 1 cannot be raised again, and nothing changes', () => {
        const {graph, view} = mount();
        for (let i = 0; i < 2; i++) act(() => { expect(graph.insert(1)).toBe(true); });
        expect(multiplicityRows(graph.state.knots, 2).find(row => row.knot === 1)?.multiplicity).toBe(3);
        const {knots, points, ghost} = graph.state;
        act(() => { expect(graph.insert(1)).toBe(false); });
        expect(graph.state.knots).toBe(knots);
        expect(graph.state.points).toBe(points);
        expect(graph.state.ghost).toBe(ghost);
        expect(graph.state.refusal).toEqual({reason: 'multiplicity_too_high', value: 1});
        expect(refusalText()).toContain('največjo večkratnost 3');
        act(() => setLanguage('en'));
        expect(refusalText()).toContain('largest multiplicity 3');
        view.unmount();
    });
});

describe('the multiplicity readout', () => {
    test('lists each distinct interior knot with its multiplicity and continuity', () => {
        const {graph, view} = mount();
        act(() => graph.selectExample('cubic'));
        const items = [...document.querySelectorAll('[data-insertion-readout="multiplicity"] li')].map(li => li.textContent);
        expect(items).toEqual(['u = 1: večkratnost 1, zveznost C2', 'u = 2: večkratnost 2, zveznost C1']);
        act(() => { graph.insert(2); });
        expect([...document.querySelectorAll('[data-insertion-readout="multiplicity"] li')].map(li => li.textContent)[1])
            .toBe('u = 2: večkratnost 3, zveznost C0');
        act(() => { graph.insert(2); });
        expect([...document.querySelectorAll('[data-insertion-readout="multiplicity"] li')].map(li => li.textContent)[1])
            .toBe('u = 2: večkratnost 4, zveznost prekinitev (nezvezno)');
        view.unmount();
    });
});

describe('L3 acceptance 3 and 5: the cubic continuity demo and the comb', () => {
    const cubic = () => {
        const mounted = mount();
        act(() => mounted.graph.selectExample('cubic'));
        mounted.graph.boardUpdate();
        return mounted;
    };

    test('the cubic example has the spec knots and points', () => {
        const {graph, view} = cubic();
        expect(graph.state.knots).toEqual([0, 0, 0, 0, 1, 2, 2, 3, 3, 3, 3]);
        expectRows(graph.state.points, [[0, 0], [1, 2], [2, 3], [3, 1], [4, 1], [5, 3], [6, 0]]);
        view.unmount();
    });

    test('at the double knot u = 2 the tangents agree and kappa jumps from 8/3 to 16/3; at u = 1 kappa is -1.4311 on both sides', () => {
        const {graph, view} = cubic();
        const reports = joinReports(graph.state.knots, 3, graph.state.points);
        expect(reports.map(r => r.t)).toEqual([1, 2]);
        const [simple, double] = reports;
        expect(simple.kappaLeft).toBeCloseTo(-1.4311, 4);
        expect(simple.kappaRight).toBeCloseTo(-1.4311, 4);
        expect(Math.abs(simple.jump!)).toBeLessThan(1e-9);
        expect(double.kappaLeft!).toBeCloseTo(8 / 3, 10);
        expect(double.kappaRight!).toBeCloseTo(16 / 3, 10);
        expect(double.jump!).toBeCloseTo(8 / 3, 10);
        expect(double.tangentContinuous).toBe(true);
        // The common tangent is (1.5, 0) up to length: the unit tangent (1, 0).
        expect(double.tangentLeft![0]).toBeCloseTo(1, 12);
        expect(double.tangentRight![0]).toBeCloseTo(1, 12);
        expect(Math.abs(double.tangentLeft![1])).toBeLessThan(1e-12);
        view.unmount();
    });

    test('the jump readout in the inspector shows the same numbers, in both languages, and leaves the board', () => {
        const {graph, view} = cubic();
        const items = () => [...document.querySelectorAll('[data-insertion-readout="jumps"] li')].map(li => li.textContent);
        expect(items()).toEqual([
            'u = 1: κ −1,4311 → −1,4311, skok 0, tangenta zvezna',
            'u = 2: κ 2,6667 → 5,3333, skok 2,6667, tangenta zvezna',
        ]);
        expect(graph.sceneOf().ownedElements().some(element => element.elType === 'text')).toBe(false);
        act(() => setLanguage('en'));
        expect(items()[1]).toBe('u = 2: κ 2.6667 → 5.3333, jump 2.6667, tangent continuous');
        act(() => setLanguage('sl'));
        // A moved control point updates the lines.
        act(() => graph.setState({points: graph.state.points.map((p, i) => i === 3 ? [p[0], p[1] + 1] as const : p)}));
        expect(items()).not.toEqual([
            'u = 1: κ −1,4311 → −1,4311, skok 0, tangenta zvezna',
            'u = 2: κ 2,6667 → 5,3333, skok 2,6667, tangenta zvezna',
        ]);
        view.unmount();
    });

    test('the comb is computed per span and never sampled across a knot', () => {
        const {graph, view} = cubic();
        const spans = combBySpan(graph.state.knots, 3, graph.state.points);
        expect(spans).toHaveLength(3);
        // Span ends carry the one-sided values: the left tooth at u = 2 has 8/3, the right tooth 16/3.
        expect(spans[1][spans[1].length - 1].kappa).toBeCloseTo(8 / 3, 10);
        expect(spans[2][0].kappa).toBeCloseTo(16 / 3, 10);
        expect(spans[0][spans[0].length - 1].kappa).toBeCloseTo(spans[1][0].kappa, 10);
        const [teeth, envelope] = graph.sceneOf().combElements();
        // Two interior knots: the envelope is broken twice, so no segment joins two spans.
        expect(envelope.dataX.filter(Number.isNaN)).toHaveLength(2);
        expect(envelope.dataX).toHaveLength(spans.flat().length + 2);
        expect(teeth.dataX.filter(Number.isNaN)).toHaveLength(spans.flat().length);
        // The teeth on both sides of u = 2 have different lengths at the same base point.
        const lastLeft = spans[1][spans[1].length - 1];
        const firstRight = spans[2][0];
        expect(Math.hypot(lastLeft.base[0] - firstRight.base[0], lastLeft.base[1] - firstRight.base[1])).toBeLessThan(1e-12);
        expect(Math.hypot(lastLeft.tip[0] - firstRight.tip[0], lastLeft.tip[1] - firstRight.tip[1])).toBeGreaterThan(0.5);
        view.unmount();
    });

    test('the comb and its readout follow the switch', () => {
        const {graph, view} = cubic();
        const elements = graph.sceneOf().combElements();
        const list = () => document.querySelector('[data-insertion-readout="jumps"]');
        expect(elements.map(shown)).toEqual([true, true]);
        expect(list()).not.toBeNull();
        fireEvent.click(screen.getByLabelText('Glavnik ukrivljenosti'));
        expect(graph.state.showComb).toBe(false);
        expect(elements.map(shown)).toEqual([false, false]);
        expect(list()).toBeNull();
        view.unmount();
    });

    test('an inserted knot of multiplicity 2 on the quadratic splits it into two Bezier pieces with kappa -1 on both sides', () => {
        const {graph, view} = mount();
        act(() => { graph.insert(1); });
        const [join] = joinReports(graph.state.knots, 2, graph.state.points);
        expect(join.t).toBe(1);
        // Pieces (0,0),(1,2),(2,2) and (2,2),(3,2),(4,0). The tangent is continuous only because (1,2),(2,2),(3,2) are
        // collinear; a quadratic knot of multiplicity 2 is C0 in general. Insertion never changes the curve, so kappa does not jump.
        expect(join.tangentContinuous).toBe(true);
        expect(join.kappaLeft!).toBeCloseTo(-1, 12);
        expect(join.kappaRight!).toBeCloseTo(-1, 12);
        expect(Math.abs(join.jump!)).toBeLessThan(1e-12);
        view.unmount();
    });
});

describe('L3 acceptance 6: Reset, examples and import', () => {
    test('Reset restores the original knots and points and clears the ghost', () => {
        const {graph, view} = mount();
        const original = {knots: [...graph.state.knots], points: graph.state.points.map(p => [...p])};
        act(() => { graph.insert(1); graph.insert(0.5); });
        act(() => graph.setState({points: graph.state.points.map(p => [p[0] + 1, p[1]] as const)}));
        expect(graph.state.ghost.length).toBeGreaterThan(0);
        act(() => screen.getByRole('button', {name: 'Ponastavi primer'}).click());
        graph.boardUpdate();
        expect(graph.state.knots).toEqual(original.knots);
        expectRows(graph.state.points, original.points);
        expectRows(graph.boardPoints(), original.points);
        expect(graph.state.ghost).toEqual([]);
        expect(graph.sceneOf().ghostElements()).toHaveLength(0);
        view.unmount();
    });

    test('Reset returns to the chosen example, not the quadratic', () => {
        const {graph, view} = mount();
        act(() => graph.selectExample('cubic'));
        act(() => { graph.insert(0.5); });
        act(() => graph.resetToOrigin());
        expect(graph.state.knots).toEqual([0, 0, 0, 0, 1, 2, 2, 3, 3, 3, 3]);
        expect(graph.state.points).toHaveLength(7);
        view.unmount();
    });

    test('a dragged control point reaches the state', () => {
        const {graph, view} = mount();
        const point = graph.sceneOf().curve.getJxgPoints()[1];
        point.setPosition(JXG.COORDS_BY_USER, [1.5, 2.5]);
        (point as unknown as { triggerEventHandlers(names: string[], args: unknown[]): void }).triggerEventHandlers(['drag'], []);
        expectRows([graph.state.points[1]], [[1.5, 2.5]]);
        view.unmount();
    });

    test('an imported curve is the Reset target, and exporting gives the current curve', () => {
        const {graph, view} = mount();
        act(() => graph.importPresetData({degree: 2, knots: [0, 0, 0, 1, 1, 1], points: [[0, 0], [1, 1], [2, 0]]}));
        expect(graph.state.example).toBe('custom');
        act(() => { graph.insert(0.5); });
        expect(graph.exportPresetData().points).toHaveLength(4);
        act(() => graph.resetToOrigin());
        expect(graph.state.points).toHaveLength(3);
        expect(() => graph.importPresetData({degree: 2, knots: [0, 0, 0, 1], points: [[0, 0], [1, 1], [2, 0]]})).toThrow();
        view.unmount();
    });
});

describe('disposal', () => {
    test('scene rebuilds and unmount leave no board objects and the scene holds no language subscription (its readout is inspector text)', () => {
        const before = liveSubscriptions.count;
        const {graph, view, board} = mount();
        const owned = () => [...graph.sceneOf().ownedElements(), ...graph.sceneOf().curve.getJxgPoints(), graph.sceneOf().curve.getJxgCurve()];
        act(() => { graph.insert(1); });
        const first = owned();
        expect(first.length).toBeGreaterThan(10);
        act(() => { graph.insert(0.5); });
        expect(first.some(element => board.objectsList.includes(element))).toBe(false);
        const second = owned();
        expect(second.every(element => board.objectsList.includes(element))).toBe(true);
        expect(liveSubscriptions.count).toBe(before + 1); // The board's own, for its tick labels; the scene holds none.
        view.unmount();
        expect(second.some(element => board.objectsList.includes(element))).toBe(false);
        expect(liveSubscriptions.count).toBe(before);
    });
});

describe('shared controls wiring', () => {
    test('a typed control point reaches the model and out-of-range values are refused', () => {
        const {graph, view} = mount();
        const x = screen.getByLabelText('p₁, x');
        enterNumber(x, '1.5');
        expect(graph.state.points[1][0]).toBe(1.5);
        enterNumber(x, '2000000');
        expect(graph.state.points[1][0]).toBe(1.5);
        view.unmount();
    });
});
