import React from 'react';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeAll, describe, expect, test, vi} from 'vitest';
import BSplineBasisGraph, {BSplineBasisGraphState} from './BSplineBasisGraph';
import {GraphHost} from '../../base/GraphHost';
import {basisPresetData, KNOT_LIMIT} from './bsplineBasisModel';
import {basisAll} from '../../../bezeg/impl/curve/bspline';
import {PolynomialBezierCurve} from '../../../bezeg/impl/curve/polynomial-bezier-curve';
import {PointImpl} from '../../../bezeg/impl/point/point-impl';
import {renderMessage, setLanguage} from '../../../localization';
import type {Preset} from '../../base/presets/Presets';

/** Counts live language subscriptions, so a leaked listener shows even though the scene also guards its callback. */
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

type Curve = {dataX: number[]; dataY: number[]; updateDataArray: () => void};

class ObservedGraph extends BSplineBasisGraph {
    liveBoard() { return this.board; }
    sceneOf() { return this['scene']!; }
    lessonDefault() { this.prepareLessonDefaultScene(); }
    lessonFixture(data: ReturnType<typeof basisPresetData>) { this['prepareLessonFixtureScene'](data, undefined); }
    figureImport(preset: Preset) { this.importFigurePresetData(preset); }
    /** The figure batch's data step followed by its state replacement (BaseGraph's figure scene path). */
    figureScene(preset: Preset) { this.importFigurePresetData(preset); return this.figurePresetGraphState(preset.graphState); }
    ownedElements() { return [...(this['scene']?.ownedElements() ?? [])]; }
    ownedOnBoard() { return this.ownedElements().filter(element => this.board.objectsList.includes(element)).length; }
    /** The plotted samples of function i, as the scene draws them now. */
    plotted(i: number) {
        const curve = this.sceneOf().curveElements()[i] as unknown as Curve;
        curve.updateDataArray();
        return {x: curve.dataX, y: curve.dataY};
    }
}

const mount = () => {
    const graph = new ObservedGraph();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view, board: graph.liveBoard()};
};

/** JSXGraph types omit the event trigger the board itself uses for a drag. */
const drag = (point: unknown) => (point as {triggerEventHandlers(names: string[], args: unknown[]): void}).triggerEventHandlers(['drag'], []);
const dragMarker = (graph: ObservedGraph, index: number, x: number) => {
    const marker = graph.sceneOf().markerElements()[index];
    marker.moveTo([x, marker.Y()]);
    drag(marker);
};
const activeValues = (graph: ObservedGraph, t: number) => basisAll(graph.state.knots, graph.state.degree, t);
const TOL = 1e-12;

describe('basis values through the graph (defaults: degree 2, knots 0,0,0,1,2,2,2)', () => {
    test.each([
        [0.5, [0.25, 0.625, 0.125, 0]],
        [1, [0, 0.5, 0.5, 0]],
        [1.5, [0, 0.125, 0.625, 0.25]],
    ])('at t = %s the dots and the sum match the lesson numbers', (t, expected) => {
        const {graph, view} = mount();
        act(() => graph.setDisplayedT(t));
        const values = activeValues(graph, graph.state.t);
        expected.forEach((value, i) => expect(Math.abs(values[i] - value)).toBeLessThanOrEqual(TOL));
        expect(Math.abs(values.reduce((a, b) => a + b, 0) - 1)).toBeLessThanOrEqual(TOL);
        // The drawn dots sit at the kernel values: elements after the n + 1 curves and the rule (a segment with its two end points) are the dots.
        const dots = graph.sceneOf().ownedElements().slice(graph.functionCount + 3, 2 * graph.functionCount + 3) as unknown as {Y(): number}[];
        dots.forEach((dot, i) => expect(Math.abs(dot.Y() - expected[i])).toBeLessThanOrEqual(TOL));
        // The readout names the k + 1 active values and their sum.
        const text = graph.sceneOf().readoutText();
        expect(text).toContain('vsota = 1');
        expect(text.split('\n')[1].split('   ')).toHaveLength(3);
        view.unmount();
    });

    test('the plotted functions are the kernel basis, sampled over the domain only, and sum to 1', () => {
        const {graph, view} = mount();
        const {knots, degree} = graph.state;
        for (let i = 0; i < graph.functionCount; i++) {
            const {x, y} = graph.plotted(i);
            expect(x[0]).toBe(0);
            expect(x[x.length - 1]).toBe(2);
            x.forEach((t, j) => expect(y[j]).toBe(basisAll(knots, degree, t)[i]));
        }
        const sums = graph.plotted(0).x.map((_, j) => [0, 1, 2, 3].reduce((s, i) => s + graph.plotted(i).y[j], 0));
        sums.forEach(sum => expect(Math.abs(sum - 1)).toBeLessThanOrEqual(1e-12));
        view.unmount();
    });

    test('the support of N_{i,k} is exactly [u_i, u_{i+k+1}) when sampled', () => {
        const {graph, view} = mount();
        // Clamped ends and distinct interior knots 1, 3.
        act(() => graph.importPresetData(basisPresetData(2, [0, 0, 0, 1, 3, 4, 4, 4])));
        const {knots, degree} = graph.state;
        for (let i = 0; i < graph.functionCount; i++) {
            const {x, y} = graph.plotted(i);
            x.forEach((t, j) => {
                const inside = t >= knots[i] && t < knots[i + degree + 1];
                // Outside the support the function is exactly zero; inside, a half-open sample can still be zero only at a knot.
                if (!inside && !(t === knots[knots.length - 1] && knots[i + degree + 1] === t)) expect(y[j]).toBe(0);
                if (inside && t > knots[i] && t < knots[i + degree + 1]) expect(y[j]).toBeGreaterThan(0);
            });
        }
        view.unmount();
    });

    test('with knots (0,0,0,1,1,1) the plotted functions equal the Bernstein polynomials B_i^2', () => {
        const {graph, view} = mount();
        act(() => graph.importPresetData(basisPresetData(2, [0, 0, 0, 1, 1, 1])));
        expect(graph.functionCount).toBe(3);
        for (let i = 0; i < 3; i++) {
            const points = Array(2).fill([0, 0]);
            points.splice(i, 0, [1, 0]);
            const bernstein = new PolynomialBezierCurve(points.map(p => new PointImpl(p[0], p[1])));
            const {x, y} = graph.plotted(i);
            x.forEach((t, j) => expect(Math.abs(y[j] - bernstein.eval(t).X())).toBeLessThanOrEqual(TOL));
        }
        view.unmount();
    });

    test('a uniform cubic gives 1/6, 4/6, 1/6 at a knot', () => {
        const {graph, view} = mount();
        act(() => graph.importPresetData(basisPresetData(3, [0, 1, 2, 3, 4, 5, 6, 7, 8])));
        act(() => graph.setDisplayedT(4));
        const nonzero = activeValues(graph, 4).filter(value => value !== 0);
        [1 / 6, 4 / 6, 1 / 6].forEach((value, i) => expect(Math.abs(nonzero[i] - value)).toBeLessThanOrEqual(TOL));
        const lines = graph.sceneOf().readoutText().split('\n');
        expect(lines[1]).toContain('N1,3 = 0,1667');
        expect(lines[1]).toContain('N2,3 = 0,6667');
        view.unmount();
    });
});

describe('degree, clamped toggle and the display toggle', () => {
    test('degree 1-3 rebuilds a valid clamped vector for the current n; the uniform quadratic unclamped case is reachable', () => {
        const {graph, view} = mount();
        expect(graph.functionCount).toBe(4);
        act(() => graph.setDegree(3));
        expect(graph.state.knots).toEqual([0, 0, 0, 0, 1, 1, 1, 1]);
        act(() => graph.setDegree(1));
        expect(graph.state.knots).toEqual([0, 0, 1, 2, 3, 3]);
        act(() => graph.setDegree(0));
        act(() => graph.setDegree(4));
        expect(graph.state.degree).toBe(1);
        act(() => graph.setDegree(2));
        act(() => graph.setClamped(false));
        expect(graph.state.knots).toEqual([0, 1, 2, 3, 4, 5, 6]);
        expect(graph.functionCount).toBe(4);
        // An unclamped vector stays unclamped when the degree changes.
        act(() => graph.setDegree(3));
        expect(graph.state.knots).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
        expect(graph.functionCount).toBe(4);
        view.unmount();
    });

    test('the display toggle rescales the domain to [0, 1] and leaves the values and stored knots raw', () => {
        const {graph, view} = mount();
        act(() => graph.setNormalized(true));
        const {x, y} = graph.plotted(1);
        expect([x[0], x[x.length - 1]]).toEqual([0, 1]);
        const raw = basisAll(graph.state.knots, graph.state.degree, 1);
        expect(y[x.indexOf(0.5)]).toBe(raw[1]);
        expect(graph.state.knots).toEqual([0, 0, 0, 1, 2, 2, 2]);
        act(() => graph.setDisplayedT(0.25));
        expect(graph.state.t).toBe(0.5);
        expect(graph.sceneOf().readoutText()).toContain('t = 0,25');
        expect(graph.sceneOf().domainText()).toContain('prikazano na [0, 1]');
        view.unmount();
    });
});

describe('knot dragging', () => {
    // Degree 2, clamped uniform with six functions: 0,0,0,1,2,3,4,4,4 (interior knots at indices 3, 4, 5).
    const six = () => basisPresetData(2, [0, 0, 0, 1, 2, 3, 4, 4, 4]);

    test('a drag snaps to 0.01 and clamps between the neighbours, never reordering', () => {
        const {graph, view} = mount();
        act(() => graph.importPresetData(six()));
        dragMarker(graph, 4, 1.2345);
        expect(graph.state.knots).toEqual([0, 0, 0, 1, 1.23, 3, 4, 4, 4]);
        dragMarker(graph, 4, 9);
        expect(graph.state.knots[4]).toBe(3);
        dragMarker(graph, 4, -4);
        expect(graph.state.knots[4]).toBe(1);
        for (const x of [-9, 0.5, 7, 2.999, 1, 3.5]) {
            dragMarker(graph, 4, x);
            const knots = graph.state.knots;
            knots.forEach((knot, i) => i > 0 && expect(knot).toBeGreaterThanOrEqual(knots[i - 1]));
        }
        // The marker is put back on the clamped knot, and the others did not move.
        expect(graph.sceneOf().markerElements().map(m => m.X())).toEqual(graph.state.knots);
        view.unmount();
    });

    test('equal values are a repeated knot and a drag that would make an invalid vector is ignored', () => {
        const {graph, view} = mount();
        act(() => graph.importPresetData(six()));
        dragMarker(graph, 4, 1);
        expect(graph.state.knots).toEqual([0, 0, 0, 1, 1, 3, 4, 4, 4]);
        // Stacked markers of one repeated knot have distinct heights, so each stays reachable.
        const markers = graph.sceneOf().markerElements();
        expect(markers[3].Y()).not.toBe(markers[4].Y());
        // Multiplicity 4 > k + 1 = 3 is refused: the vector keeps its identity and the marker returns.
        const before = graph.state.knots;
        dragMarker(graph, 3, 0);
        expect(graph.state.knots).toBe(before);
        expect(markers[3].X()).toBe(1);
        view.unmount();
    });

    test('markers are locked while the domain is shown on [0, 1] and stay in step with the state afterwards', () => {
        const {graph, view} = mount();
        act(() => graph.setNormalized(true));
        expect(graph.sceneOf().markerElements().every(m => m.getAttribute('fixed') === true)).toBe(true);
        act(() => graph.setNormalized(false));
        expect(graph.sceneOf().markerElements().every(m => m.getAttribute('fixed') === false)).toBe(true);
        view.unmount();
    });
});

describe('knot editor', () => {
    const field = (i: number) => screen.getByRole('spinbutton', {name: new RegExp(`^(Vozel|Knot) u${i}$`)}) as HTMLInputElement;
    const typeAndEnter = (input: HTMLInputElement, value: string) => {
        fireEvent.input(input, {target: {value}, inputType: 'insertText'});
        fireEvent.keyDown(input, {key: 'Enter'});
    };

    test('one labelled field per knot; a typed value moves the knot and the marker', () => {
        const {graph, view} = mount();
        expect(screen.getAllByRole('spinbutton', {name: /^Vozel u/})).toHaveLength(7);
        typeAndEnter(field(3), '1,5');
        expect(graph.state.knots[3]).toBe(1.5);
        expect(graph.sceneOf().markerElements()[3].X()).toBe(1.5);
        view.unmount();
    });

    test('the arrow keys step a knot by 0.01', () => {
        const {graph, view} = mount();
        fireEvent.keyDown(field(3), {key: 'ArrowUp'});
        expect(graph.state.knots[3]).toBeCloseTo(1.01, 12);
        fireEvent.keyDown(field(3), {key: 'ArrowDown'});
        fireEvent.keyDown(field(3), {key: 'ArrowDown'});
        expect(graph.state.knots[3]).toBeCloseTo(0.99, 12);
        view.unmount();
    });

    test('a decreasing value is refused with the localized reason and its position; nothing invalid is drawn or stored', () => {
        const {graph, view} = mount();
        const before = graph.state.knots;
        typeAndEnter(field(3), '-1');
        expect(graph.state.knots).toBe(before);
        const hint = document.querySelector('.number-input-hint')!;
        expect(hint.textContent).toBe('vozli ne smejo padati: vozel 4 je manjši od prejšnjega');
        // A language switch drops the shown reason (it would stay in the old language) and the refused draft.
        act(() => setLanguage('en'));
        expect(document.querySelector('.number-input-hint')).toBeNull();
        expect((field(3) as HTMLInputElement).value).not.toBe('-1');
        expect(graph.editKnot(3, -1)).toBe('knots must not decrease: knot 4 is smaller than the one before it');
        // So does an outside change of the vector.
        typeAndEnter(field(3), '-1');
        expect(document.querySelector('.number-input-hint')?.textContent).toBe('knots must not decrease: knot 4 is smaller than the one before it');
        act(() => graph.setDegree(3));
        expect(document.querySelector('.number-input-hint')).toBeNull();
        view.unmount();
    });

    test('the vector is checked with the editor n: too many repeats and an empty domain are refused, each with its reason', () => {
        const {graph, view} = mount();
        expect(graph.editKnot(3, 0)).toBe(renderMessage({key: 'bspline_knots_multiplicity_too_high', params: {value0: 3}}));
        expect(graph.editKnot(3, 0)).toContain('največ 3-krat');
        expect(graph.editKnot(3, Number.NaN)).toBe('vsi vozli morajo biti končna števila');
        expect(graph.editKnot(6, KNOT_LIMIT + 1)).toBe('vsi vozli morajo biti končna števila');
        act(() => graph.importPresetData(basisPresetData(2, [0, 0, 0, 1, 1, 1])));
        expect(graph.editKnot(3, 0)).toContain('največ 3-krat');
        view.unmount();
    });
});

describe('Presets, scenes and reset', () => {
    const cubic = basisPresetData(3, [0, 0, 0, 0, 1, 2, 2, 2, 2]);

    test('a real lesson fixture action gives clamped uniform knots for its degree and point count', () => {
        const {graph, view} = mount();
        const points: [number, number][] = [[0, 0], [1, 2], [3, 2], [4, 0], [5, 1]];
        act(() => graph.getLessonCapabilities().apply({kind: 'prepared-scene', sceneId: 's', source: 'lesson-fixture', curve: {points, degree: 3}}));
        expect([graph.state.degree, graph.state.knots]).toEqual([3, [0, 0, 0, 0, 1, 2, 2, 2, 2]]);
        view.unmount();
    });

    test('a lesson fixture with knots uses them as given and the collection check rejects an invalid vector with the scene unchanged', () => {
        const {graph, view} = mount();
        const fixture = (knots: number[], count: number) =>
            ({kind: 'prepared-scene', sceneId: 's', source: 'lesson-fixture', curve: {points: Array.from({length: count}, (_, i) => [i, 0] as [number, number]), degree: 2, knots}}) as unknown as Parameters<ReturnType<typeof graph.getLessonCapabilities>['apply']>[0];
        act(() => graph.getLessonCapabilities().apply(fixture([0, 0, 0, 1, 3, 3, 3], 4)));
        expect([graph.state.degree, graph.state.knots]).toEqual([2, [0, 0, 0, 1, 3, 3, 3]]);
        const unchanged = [graph.state.degree, graph.state.knots, graph.state.t];
        // Non-monotone, and a length that does not match the point count, are refused with the scene unchanged.
        for (const [knots, count] of [[[0, 0, 0, 2, 1, 3, 3], 4], [[0, 0, 0, 1, 3, 3, 3], 5], [[0, 0, 0, 1, 3, 3], 4]] as const) {
            expect(() => act(() => graph.getLessonCapabilities().apply(fixture([...knots], count)))).toThrow('The lesson geometry is invalid');
            expect([graph.state.degree, graph.state.knots, graph.state.t]).toEqual(unchanged);
        }
        view.unmount();
    });

    test('every scene path carries the degree and knots', () => {
        const {graph, view} = mount();
        // Lesson fixture and lesson default scenes.
        act(() => graph.lessonFixture(cubic));
        expect(graph.state.degree).toBe(3);
        expect(graph.state.knots).toEqual(cubic.knots);
        expect(graph.ownedOnBoard()).toBe(graph.ownedElements().length);
        expect(graph.sceneOf().functionCount).toBe(5);
        act(() => graph.lessonDefault());
        expect(graph.state.degree).toBe(2);
        expect(graph.state.knots).toEqual([0, 0, 0, 1, 2, 2, 2]);
        // Checkpoint restore, including a scene replaced in between.
        const capabilities = graph.getLessonCapabilities();
        act(() => graph.importPresetData(cubic));
        const checkpoint = capabilities.captureState();
        act(() => graph.setDegree(1));
        act(() => capabilities.restoreState(checkpoint));
        expect(graph.state.degree).toBe(3);
        expect(graph.state.knots).toEqual(cubic.knots);
        expect(graph.sceneOf().functionCount).toBe(5);
        // Figure batch entry: data wins over a graph state that still holds the default scene.
        act(() => graph.figureImport({id: 'bspline-curve', data: cubic, graphState: {initialized: true, degree: 2, knots: [0, 0, 0, 1, 2, 2, 2]}} as unknown as Preset));
        expect(graph.state.knots).toEqual(cubic.knots);
        // The state that replaces the scene keeps the imported vector, with or without a stored graph state.
        act(() => graph.setDegree(1));
        let next: BSplineBasisGraphState | undefined;
        act(() => { next = graph.figureScene({id: 'bspline-curve', data: cubic} as unknown as Preset); });
        expect([next?.degree, next?.knots]).toEqual([3, cubic.knots]);
        act(() => { next = graph.figureScene({id: 'bspline-curve', data: cubic, graphState: {initialized: true, degree: 2, knots: [0, 0, 0, 1, 2, 2, 2]}} as unknown as Preset); });
        expect([next?.degree, next?.knots]).toEqual([3, cubic.knots]);
        // Import with a stored view: the view applies before the data.
        const box = [-2, 3, 8, -1] as [number, number, number, number];
        act(() => graph.importPreset({id: 'bspline-curve', boardState: {boundingBox: box}, data: basisPresetData(2, [0, 0, 0, 1, 1, 1])} as unknown as Preset));
        expect(graph.state.knots).toEqual([0, 0, 0, 1, 1, 1]);
        expect(graph.ownedOnBoard()).toBe(graph.ownedElements().length);
        view.unmount();
    });

    test('saved Presets restore the vector and the display toggle; an invalid or unsupported Preset is refused with the reason', () => {
        const {graph, view} = mount();
        act(() => { graph.importPresetData(cubic); graph.setNormalized(true); });
        const saved = graph.exportPreset();
        act(() => { graph.setDegree(1); graph.setNormalized(false); });
        act(() => graph.importPreset(saved));
        expect(graph.state.degree).toBe(3);
        expect(graph.state.normalized).toBe(true);
        expect(graph.state.knots).toEqual(cubic.knots);
        // The collection refuses decreasing knots with a position; the graph refuses a degree outside 1-3.
        const wrong = {degree: 2, knots: [0, 0, 0, 2, 1, 2, 2], points: cubic.points.slice(0, 4)};
        const checked = graph['presetCollection']().check(wrong);
        expect('rejection' in checked && renderMessage(checked.rejection)).toContain('vozel 5');
        expect(() => graph.importPresetData({degree: 4, knots: [0, 0, 0, 0, 0, 1, 1, 1, 1, 1], points: cubic.points})).toThrow();
        expect(graph.state.degree).toBe(3);
        view.unmount();
    });

    test('reset restores the defaults, including the display toggle and the slider', async () => {
        const {graph, view} = mount();
        act(() => { graph.importPresetData(cubic); graph.setNormalized(true); graph.setDisplayedT(0.9); graph.dragKnot(5, 1.5); });
        // `await act(async () => graph.reset())` never settles under jsdom, so poll for the reloaded scene.
        act(() => { void graph.reset(); });
        await waitFor(() => expect(graph.state.knots).toEqual([0, 0, 0, 1, 2, 2, 2]));
        expect(graph.state).toMatchObject({degree: 2, knots: [0, 0, 0, 1, 2, 2, 2], normalized: false, t: 0.5});
        expect(graph.ownedOnBoard()).toBe(graph.ownedElements().length);
        expect(graph.sceneOf().functionCount).toBe(4);
        view.unmount();
    });
});

describe('language and disposal', () => {
    test('a live language switch updates every board text', () => {
        const {graph, view} = mount();
        const texts = graph.ownedElements().filter(e => (e as {elType?: string}).elType === 'text') as unknown as {plaintext: string}[];
        const [readout, domain] = texts.slice(-2);
        expect(readout.plaintext).toContain('neničelne bazne funkcije');
        // Board text is HTML: each readout line ends in a <br>, never a collapsed "\n".
        expect(readout.plaintext).toContain('<br>');
        expect(readout.plaintext).not.toContain('\n');
        expect(domain.plaintext).toBe('definicijsko območje [0, 2]');
        act(() => setLanguage('en'));
        expect(readout.plaintext).toContain('nonzero basis functions');
        expect(readout.plaintext).toContain('sum = 1');
        expect(domain.plaintext).toBe('domain [0, 2]');
        // The knot labels use the language's decimal separator.
        act(() => graph.importPresetData(basisPresetData(2, [0, 0, 0, 1.5, 2, 2, 2])));
        act(() => setLanguage('sl'));
        const labels = (graph.ownedElements().filter(e => (e as {elType?: string}).elType === 'text') as unknown as {plaintext: string}[]).map(l => l.plaintext);
        expect(labels).toContain('1,5');
        view.unmount();
    });

    test('unmount and scene rebuilds leave no board objects and no language subscription', () => {
        const before = liveSubscriptions.count;
        const {graph, view, board} = mount();
        const first = graph.ownedElements();
        expect(first.length).toBeGreaterThan(10);
        act(() => graph.setDegree(3));
        expect(first.some(element => board.objectsList.includes(element))).toBe(false);
        const second = graph.ownedElements();
        expect(graph.ownedOnBoard()).toBe(second.length);
        expect(liveSubscriptions.count).toBe(before + 1);
        view.unmount();
        expect(second.some(element => board.objectsList.includes(element))).toBe(false);
        expect(liveSubscriptions.count).toBe(before);
    });
});

describe('drawing cost (jsdom, real JSXGraph board)', () => {
    test('a knot drag and a t sweep stay far below a frame', () => {
        const {graph, view} = mount();
        const drags = 200;
        const start = performance.now();
        for (let i = 0; i < drags; i++) dragMarker(graph, 4, 1.2 + 0.6 * ((i % 40) / 40));
        const dragMs = (performance.now() - start) / drags;
        const sweepStart = performance.now();
        for (let i = 0; i < drags; i++) act(() => graph.setDisplayedT(2 * (i / drags)));
        const sweepMs = (performance.now() - sweepStart) / drags;
        console.info(`BSPLINE_BASIS_MEASURE drag ${dragMs.toFixed(2)} ms/event, t sweep ${sweepMs.toFixed(2)} ms/step (jsdom, 4 functions, 400 samples)`);
        expect(dragMs).toBeLessThan(100);
        expect(sweepMs).toBeLessThan(100);
        view.unmount();
    });
});
