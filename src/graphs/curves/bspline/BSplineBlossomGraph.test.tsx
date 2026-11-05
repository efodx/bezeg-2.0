import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeAll, describe, expect, test, vi} from 'vitest';
import JXG from 'jsxgraph';
import BSplineBlossomGraph from './BSplineBlossomGraph';
import {GraphHost} from '../../base/GraphHost';
import {LocalizedError, setLanguage} from '../../../localization';
import {BSplinePresetData, bsplinePresetCollection} from './bsplinePresetCollection';
import {blossomSnapshot, curveCheck} from './bsplineBlossomModel';
import {DEBOOR_DEFAULT_POINTS} from './bsplineDeBoorModel';

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

class ObservedGraph extends BSplineBlossomGraph {
    liveBoard() { return this.board; }
    sceneOf() { return this['scene']!; }
}

const mount = () => {
    const graph = new ObservedGraph();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view, board: graph.liveBoard()};
};

const TOL = 1e-12;
const near = (actual: readonly number[], expected: readonly number[], tol = TOL) => {
    expect(actual).toHaveLength(expected.length);
    expected.forEach((value, i) => expect(Math.abs(actual[i] - value)).toBeLessThanOrEqual(tol));
};
const evalVisible = (element: unknown) => (element as {evalVisProp(name: string): boolean}).evalVisProp('visible');
const drawn = (element: {X(): number, Y(): number}) => [element.X(), element.Y()];
const readout = (name: string) => document.querySelector(`[data-blossom-readout="${name}"]`)?.textContent ?? null;
const drag = (point: unknown) => (point as {triggerEventHandlers(names: string[], args: unknown[]): void}).triggerEventHandlers(['drag'], []);

/** f(args) on `segment` as drawn: the last triangle point on the board (state arguments set through the controls' setters). */
const drawnBlossom = (graph: ObservedGraph, segment: number, args: number[]): number[] => {
    act(() => { graph.setSegment(segment); args.forEach((a, i) => graph.setArgument(i, a)); });
    const [x, y] = drawn(graph.sceneOf().levelElements(graph.state.degree)[0]);
    near(graph.snapshot()!.value, [x, y]);
    return [x, y];
};

/** A seeded generator, so the random cases are reproducible. */
const seeded = (seed: number) => () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
};

const wide3: BSplinePresetData = {
    degree: 3, knots: [0, 0, 0, 0, 1, 2.5, 3, 4, 4, 4, 4],
    points: [[0, 0], [1, 3], [2.5, -1], [4, 2], [5, 0.5], [6.5, 3], [7, -2]],
};

describe('L6 acceptance 1: the listed values match the kernel, as drawn', () => {
    test('control points and Bezier points of the default example', () => {
        const {graph, view} = mount();
        expect(graph.state.degree).toBe(2);
        expect(graph.state.knots).toEqual([0, 0, 0, 1, 2, 2, 2]);
        expect(graph.state.segment).toBe(2);
        expect(graph.state.args.slice(0, 2)).toEqual([0, 0.5]);
        near(drawnBlossom(graph, 2, [0, 0]), [0, 0]);
        near(drawnBlossom(graph, 2, [0, 1]), [1, 2]);
        near(drawnBlossom(graph, 2, [1, 2]), [3, 2]);
        near(drawnBlossom(graph, 3, [2, 2]), [4, 0]);
        near(drawnBlossom(graph, 2, [0, 0.5]), [0.5, 1]);
        near(drawnBlossom(graph, 2, [0.5, 1]), [1.5, 2]);
        near(drawnBlossom(graph, 2, [0.5, 0.5]), [1, 1.5]);
        const bezier = graph.sceneOf().bezierElements().map(drawn);
        near(bezier.flat(), [0, 0, 1, 2, 2, 2]);
        view.unmount();
    });

    test('the board shows level 1 and the final point of the triangle, and the final label names the arguments', () => {
        const {graph, view} = mount();
        act(() => { graph.setSegment(2); graph.setArgument(0, 0); graph.setArgument(1, 0.5); });
        const scene = graph.sceneOf();
        expect(scene.levelElements(1)).toHaveLength(2);
        expect(scene.levelElements(2)).toHaveLength(1);
        expect(scene.labelText()).toBe('f(0; 0,5)');
        near(graph.snapshot()!.levels[1].flat(), [scene.levelElements(1)[0].X(), scene.levelElements(1)[0].Y(), scene.levelElements(1)[1].X(), scene.levelElements(1)[1].Y()]);
        view.unmount();
    });
});

describe('L6 acceptance 2: symmetry', () => {
    test('f is the same for every order of the arguments, degree 2 and 3, to 1e-12', () => {
        const {graph, view} = mount();
        act(() => graph.importPresetData(wide3));
        const random = seeded(7);
        const segments = [3, 4, 5, 6];
        for (let i = 0; i < 40; i++) {
            const segment = segments[Math.floor(random() * segments.length)];
            act(() => { graph.setSegment(segment); [0, 1, 2].forEach(j => graph.setArgument(j, random() * 4)); });
            const snap = graph.snapshot()!;
            expect(snap.deviation).toBeLessThan(TOL);
            near(snap.reversed, snap.value);
        }
        act(() => graph.importPresetData({degree: 2, knots: [0, 0, 0, 1, 2.5, 4, 4, 4], points: wide3.points.slice(0, 5)}));
        for (let i = 0; i < 40; i++) {
            act(() => { graph.setSegment([2, 3, 4][i % 3]); [0, 1].forEach(j => graph.setArgument(j, random() * 4)); });
            expect(graph.snapshot()!.deviation).toBeLessThan(TOL);
            near(graph.snapshot()!.reversed, graph.snapshot()!.value);
        }
        expect(readout('symmetry')).toMatch(/e-1\d$|: 0$/);
        view.unmount();
    });
});

describe('L6 acceptance 3: f(t, ..., t) and the curve', () => {
    test('inside the segment f(t, t) is the drawn de Boor curve point and the readout says so', () => {
        const {graph, view} = mount();
        for (const t of [0, 0.25, 0.5, 0.99, 1]) {
            act(() => { graph.setSegment(2); graph.setArgument(0, t); graph.setArgument(1, t); });
            const model = graph.sceneOf().curve.getCurve().eval(t);
            near(graph.snapshot()!.value, [model.X(), model.Y()]);
            near(graph.curveCheck()!.curve, [model.X(), model.Y()]);
            expect(graph.curveCheck()!.relation).toBe('equal');
            expect(document.querySelector('[data-blossom-relation]')!.getAttribute('data-blossom-relation')).toBe('equal');
            expect(readout('curve')).toContain('točka krivulje');
        }
        view.unmount();
    });

    test('outside the segment no equality is claimed: the extended polynomial differs from the curve and the readout says so', () => {
        const {graph, view} = mount();
        // On the symmetric default the neighbouring quadratics coincide; a moved end point makes them differ.
        act(() => graph.importPresetData({degree: 2, knots: [0, 0, 0, 1, 2, 2, 2], points: [[0, 0], [1, 2], [3, 2], [4, 1]]}));
        act(() => { graph.setSegment(2); graph.setArgument(0, 1.5); graph.setArgument(1, 1.5); });
        const check = graph.curveCheck()!;
        expect(check.relation).toBe('extended');
        const f = graph.snapshot()!.value;
        expect(Math.hypot(f[0] - check.curve[0], f[1] - check.curve[1])).toBeGreaterThan(1e-3);
        expect(readout('curve')).toContain('razširjen');
        expect(readout('curve')).not.toContain('je točka krivulje');
        // unequal arguments: no comparison at all
        act(() => graph.setArgument(1, 1));
        expect(graph.curveCheck()).toBeUndefined();
        expect(readout('curve')).toBeNull();
        view.unmount();
    });

    test('outside the segment on the default parabola the readout says f still equals the curve point, without claiming a difference', () => {
        const {graph, view} = mount();
        act(() => { graph.setSegment(2); graph.setArgument(0, 1.5); graph.setArgument(1, 1.5); });
        const check = graph.curveCheck()!;
        expect(check.relation).toBe('coincides');
        const f = graph.snapshot()!.value;
        expect(Math.hypot(f[0] - check.curve[0], f[1] - check.curve[1])).toBeLessThan(1e-12);
        expect(readout('curve')).toContain('razširjen');
        expect(readout('curve')).toContain('vseeno enaka');
        expect(readout('curve')).not.toContain('razlikuje');
        view.unmount();
    });

    test('at a break knot inside the closed segment the readout does not claim equality either', () => {
        const kn = [0, 0, 0, 1, 1, 1, 2, 2, 2];
        const points: [number, number][] = [[0, 0], [1, 2], [2, 0], [3, 3], [4, 1], [5, 2]];
        const check = curveCheck(kn, 2, points, 2, [1, 1]);
        expect(check?.relation).toBe('break');
        expect(curveCheck(kn, 2, points, 2, [0.5, 0.5])?.relation).toBe('equal');
    });
});

describe('L6 acceptance 4: only degree 2 and 3', () => {
    test('the selector offers exactly 2 and 3 and switching rebuilds a valid vector', () => {
        const {graph, view} = mount();
        const select = screen.getByLabelText('Stopnja B-zlepka k') as HTMLSelectElement;
        expect([...select.options].map(o => o.value)).toEqual(['2', '3']);
        fireEvent.change(select, {target: {value: '3'}});
        expect(graph.state.degree).toBe(3);
        expect(graph.state.knots).toEqual([0, 0, 0, 0, 1, 1, 1, 1]);
        expect(graph.state.segment).toBe(3);
        expect(graph.state.args).toHaveLength(3);
        expect(screen.getAllByRole('slider')).toHaveLength(3);
        act(() => graph.setDegree(4));
        expect(graph.state.degree).toBe(3);
        expect(graph.snapshot()!.bezier).toHaveLength(4);
        expect(graph.sceneOf().bezierElements()).toHaveLength(4);
        view.unmount();
    });

    test('a degree 1 or 4 Preset is refused with a localized reason and leaves the state alone', () => {
        const {graph, view} = mount();
        const before = graph.exportPresetData();
        const one: BSplinePresetData = {degree: 1, knots: [0, 0, 1, 1], points: [[0, 0], [1, 1]]};
        const four: BSplinePresetData = {degree: 4, knots: [0, 0, 0, 0, 0, 1, 1, 1, 1, 1], points: [[0, 0], [1, 1], [2, 0], [3, 1], [4, 0]]};
        for (const data of [one, four]) {
            expect('data' in bsplinePresetCollection.check(data)).toBe(true);
            let error: unknown;
            try { act(() => graph.importPresetData(data)); } catch (e) { error = e; }
            expect(error).toBeInstanceOf(LocalizedError);
            expect((error as LocalizedError).message).toBe(`cvetenje je na voljo za stopnji 2 in 3, krivulja pa ima stopnjo ${data.degree}`);
            setLanguage('en');
            expect((error as LocalizedError).message).toBe(`blossoms are offered for degree 2 and 3 only, but the curve has degree ${data.degree}`);
            setLanguage('sl');
            expect(graph.exportPresetData()).toEqual(before);
        }
        expect(graph.state.degree).toBe(2);
        view.unmount();
    });

    test('the segment selector lists the nonempty spans', () => {
        const {graph, view} = mount();
        const select = screen.getByLabelText('Odsek krivulje') as HTMLSelectElement;
        expect([...select.options].map(o => [o.value, o.text])).toEqual([['2', '[0, 1)'], ['3', '[1, 2)']]);
        fireEvent.change(select, {target: {value: '3'}});
        expect(graph.state.segment).toBe(3);
        view.unmount();
    });
});

describe('controls', () => {
    test('Reset restores the defaults and the board after degree, segment, argument, Bezier and drag changes', () => {
        const {graph, view} = mount();
        act(() => { graph.setSegment(3); graph.setArgument(0, 1.25); graph.setArgument(1, 2); graph.setShowBezier(false); });
        const moved = graph.sceneOf().curve.getJxgPoints()[1];
        act(() => { moved.setPosition(JXG.COORDS_BY_USER, [1.5, 0.3]); drag(moved); });
        expect(graph.state.points[1]).toEqual([1.5, 0.3]);
        act(() => graph.setDegree(3));
        act(() => { graph.setArgument(2, 0.75); });
        fireEvent.click(screen.getByRole('button', {name: 'Nazaj na privzeto'}));
        expect(graph.state.degree).toBe(2);
        expect(graph.state.knots).toEqual([0, 0, 0, 1, 2, 2, 2]);
        expect(graph.state.points).toEqual(DEBOOR_DEFAULT_POINTS);
        expect(graph.state.segment).toBe(2);
        expect(graph.state.args.slice(0, 2)).toEqual([0, 0.5]);
        expect(graph.state.showBezier).toBe(true);
        const scene = graph.sceneOf();
        expect(scene.degree).toBe(2);
        near(scene.curve.getJxgPoints().flatMap(p => [p.X(), p.Y()]), DEBOOR_DEFAULT_POINTS.flat());
        near(drawn(scene.levelElements(2)[0]), [0.5, 1]);
        near(scene.bezierElements().flatMap(drawn), [0, 0, 1, 2, 2, 2]);
        expect(evalVisible(scene.bezierElements()[0])).toBe(true);
        view.unmount();
    });

    test('a control-point drag moves the state, the triangle and the readout', () => {
        const {graph, view} = mount();
        const before = readout('value');
        const moved = graph.sceneOf().curve.getJxgPoints()[1];
        act(() => { moved.setPosition(JXG.COORDS_BY_USER, [1.5, 0.3]); drag(moved); });
        expect(graph.state.points[1]).toEqual([1.5, 0.3]);
        expect(readout('value')).not.toBe(before);
        near(drawn(graph.sceneOf().levelElements(2)[0]), graph.snapshot()!.value);
        view.unmount();
    });

    test('argument sliders reach the whole domain, not only the segment, and land exactly on knots', () => {
        const {graph, view} = mount();
        const sliders = screen.getAllByRole('slider') as HTMLInputElement[];
        expect(sliders.map(s => [s.min, s.max])).toEqual([['0', '2'], ['0', '2']]);
        fireEvent.change(sliders[1], {target: {value: '2'}});
        expect(graph.state.args[1]).toBe(2);
        for (let step = 0; step <= 200; step++) {
            act(() => graph.setArgument(0, step * 0.01));
            if (step === 100) expect(graph.state.args[0]).toBe(1);
            if (step === 7) expect(graph.state.args[0]).toBe(0.07);
        }
        act(() => { graph.setArgument(0, 99); });
        expect(graph.state.args[0]).toBe(2);
        view.unmount();
    });

    test('toggling the Bezier points hides the markers and their polygon', () => {
        const {graph, view} = mount();
        act(() => graph.setShowBezier(false));
        const scene = graph.sceneOf();
        expect(scene.bezierElements().every(p => !evalVisible(p))).toBe(true);
        expect(scene.bezierSegmentElements().every(s => !evalVisible(s))).toBe(true);
        view.unmount();
    });
});

describe('presets', () => {
    test('export, the shared collection and a second graph round-trip; the default Preset is the L2 example', () => {
        const {graph, view} = mount();
        expect(graph.defaultPreset()).toEqual({degree: 2, knots: [0, 0, 0, 1, 2, 2, 2], points: [[0, 0], [1, 2], [3, 2], [4, 0]]});
        act(() => graph.importPresetData(wide3));
        const data = bsplinePresetCollection.check(JSON.parse(JSON.stringify(graph.exportPresetData())));
        if (!('data' in data)) throw new Error('refused');
        expect(data.data).toEqual(wide3);
        view.unmount();
        const other = mount();
        act(() => other.graph.importPresetData(data.data));
        expect(other.graph.exportPresetData()).toEqual(wide3);
        expect(other.graph.state.segment).toBe(3);
        expect(other.graph.sceneOf().degree).toBe(3);
        expect(other.graph.sceneOf().curve.getCurve().getKnots()).toEqual(wide3.knots);
        other.view.unmount();
    });
});

describe('disposal', () => {
    test('scene rebuilds and unmount leave no board objects and no language subscription', () => {
        const before = liveSubscriptions.count;
        const {graph, view, board} = mount();
        const owned = () => [...graph.sceneOf().ownedElements(), ...graph.sceneOf().curve.getJxgPoints(), graph.sceneOf().curve.getJxgCurve()];
        const first = owned();
        expect(first.length).toBeGreaterThan(10);
        act(() => graph.setDegree(3));
        expect(first.some(element => board.objectsList.includes(element))).toBe(false);
        const second = owned();
        expect(second.every(element => board.objectsList.includes(element))).toBe(true);
        expect(liveSubscriptions.count).toBe(before + 1);
        view.unmount();
        expect(second.some(element => board.objectsList.includes(element))).toBe(false);
        expect(liveSubscriptions.count).toBe(before);
    });
});

describe('language', () => {
    test('the readouts and controls follow a language switch', () => {
        const {graph, view} = mount();
        expect(readout('reversed')).toMatch(/^Obrnjen vrstni red: f\(0,5; 0\) = \(0,5; 1\)/);
        act(() => setLanguage('en'));
        expect(readout('reversed')).toMatch(/^Reversed order: f\(0\.5, 0\) = \(0\.5, 1\)/);
        expect(readout('symmetry')).toContain('Difference caused by the order');
        expect(screen.getByRole('button', {name: 'Back to the default'})).toBeTruthy();
        expect(graph.sceneOf().labelText()).toBe('f(0, 0.5)');
        view.unmount();
    });

    test('Slovenian separates the arguments with a semicolon, so a decimal comma cannot read as a further argument', () => {
        const {graph, view} = mount();
        act(() => { graph.setDegree(3); graph.setArgument(0, 0.25); graph.setArgument(1, 0.5); graph.setArgument(2, 1); });
        expect(graph.sceneOf().labelText()).toBe('f(0,25; 0,5; 1)');
        expect(readout('value')).toMatch(/^f\(0,25; 0,5; 1\) = /);
        act(() => { graph.setDegree(2); graph.setArgument(0, 0.5); graph.setArgument(1, 0.5); });
        expect(readout('curve')).toContain('f(0,5; …)');
        act(() => setLanguage('en'));
        expect(readout('curve')).toContain('f(0.5, …)');
        view.unmount();
    });

    test('model: the snapshot is undefined for data the kernel refuses', () => {
        expect(blossomSnapshot([0, 0, 0, 1, 2, 2, 2], 2, [[0, 0], [1, 2], [3, 2], [4, 0]], 1, [0, 0])).toBeUndefined();
        expect(blossomSnapshot([0, 0, 0, 1, 2, 2, 2], 2, [[0, 0], [1, 2], [3, 2], [4, 0]], 2, [0, NaN])).toBeUndefined();
    });
});
