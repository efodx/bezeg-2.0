import React from 'react';
import JXG from 'jsxgraph';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeAll, describe, expect, test, vi} from 'vitest';
import DeBoorGraph, {DEBOOR_ANIMATION_ID} from './DeBoorGraph';
import {GraphHost} from '../../base/GraphHost';
import {basisAll} from '../../../bezeg/impl/curve/bspline';
import {setLanguage} from '../../../localization';
import {AnimationScheduler} from '../../../learning/runtime/animation';
import {bsplinePresetCollection, type BSplinePresetData} from './bsplinePresetCollection';
import type {LessonAction} from '../../../learning/model';
import type {Preset} from '../../base/presets/Presets';

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

/** Manual frame source: the test decides when a requested frame runs. */
function manualScheduler() {
    let handle = 0;
    let time = 0;
    const callbacks = new Map<number, FrameRequestCallback>();
    const scheduler: AnimationScheduler = {
        request: callback => { handle++; callbacks.set(handle, callback); return handle; },
        cancel: id => { callbacks.delete(id); },
    };
    const frame = (elapsed: number) => {
        const entry = callbacks.entries().next().value as [number, FrameRequestCallback] | undefined;
        if (!entry) return false;
        callbacks.delete(entry[0]);
        time += elapsed;
        entry[1](time);
        return true;
    };
    return {scheduler, frame, pending: () => callbacks.size};
}

/** JSXGraph's typings omit the evaluated visibility the renderer reads. */
const shown = (element: unknown) => (element as {evalVisProp(name: string): unknown}).evalVisProp('visible');

class ObservedGraph extends DeBoorGraph {
    liveBoard() { return this.board; }
    sceneOf() { return this['scene']!; }
    lessonDefault() { this.prepareLessonDefaultScene(); }
    figureScene(preset: Preset) { this.importFigurePresetData(preset); return this.figurePresetGraphState(preset.graphState); }
    /** The board point (x, y) of entry `i` of level `r`, as drawn after a board update. */
    drawn(r: number, i: number): [number, number] {
        const point = this.sceneOf().levelElements(r)[i];
        return [point.X(), point.Y()];
    }
}

const mount = (scheduler?: AnimationScheduler) => {
    const graph = new ObservedGraph(scheduler);
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view, board: graph.liveBoard()};
};

const drag = (point: unknown) => (point as {triggerEventHandlers(names: string[], args: unknown[]): void}).triggerEventHandlers(['drag'], []);
const dragPoint = (graph: ObservedGraph, index: number, x: number, y: number) => {
    const point = graph.sceneOf().curve.getJxgPoints()[index];
    point.setPosition(JXG.COORDS_BY_USER, [x, y]);
    drag(point);
};
const show = (graph: ObservedGraph, t: number, level = 99) => {
    act(() => { graph.setT(t); graph.setState({level: Math.min(level, graph.state.degree)}); });
    graph.boardUpdate();
};
const TOL = 1e-12;
const expectPoint = (actual: readonly number[], expected: readonly number[]) =>
    expected.forEach((value, d) => expect(Math.abs(actual[d] - value)).toBeLessThanOrEqual(TOL));
/** The curve value from the basis functions: sum N_i(t) P_i. */
const basisSum = (graph: ObservedGraph, t: number): [number, number] => {
    const {knots, degree, points} = graph.state;
    const values = basisAll(knots, degree, t);
    return [0, 1].map(d => values.reduce((sum, value, i) => sum + value * points[i][d], 0)) as [number, number];
};

describe('the de Boor triangle through the graph (defaults: degree 2, knots 0,0,0,1,2,2,2)', () => {
    test.each([
        [0.5, [[0, 0], [1, 2], [3, 2]], [[0.5, 1], [1.5, 2]], [1, 1.5]],
        [1.5, [[1, 2], [3, 2], [4, 0]], [[2.5, 2], [3.5, 1]], [3, 1.5]],
        // t = 1 is an interior knot: alpha_3^1 = 0, so level 1 keeps P2 unchanged.
        [1, [[1, 2], [3, 2], [4, 0]], [[2, 2], [3, 2]], [2, 2]],
    ])('at t = %s the levels and the result match the lesson numbers and the basis sum', (t, level0, level1, result) => {
        const {graph, view} = mount();
        show(graph, t);
        level0.forEach((point, i) => expectPoint(graph.drawn(0, i), point));
        level1?.forEach((point, i) => expectPoint(graph.drawn(1, i), point));
        expectPoint(graph.drawn(2, 0), result);
        // The result equals sum N_i(t) P_i, computed from the basis functions and not from the triangle.
        expectPoint(basisSum(graph, t), result);
        expectPoint(graph.drawn(2, 0), basisSum(graph, t));
        view.unmount();
    });

    test("the readout names the span, each level's points and each alpha, up to the revealed level", () => {
        const {graph, view} = mount();
        show(graph, 0.5, 1);
        const text = graph.sceneOf().readoutText();
        expect(text).toContain('[u2, u3) = [0, 1)');
        expect(text).toContain('P0 = (0; 0)');
        expect(text).toContain('α1^1 = 0,5');
        expect(text).toContain('P1^1 = (0,5; 1)');
        expect(text).not.toContain('raven 2');
        show(graph, 0.5, 2);
        expect(graph.sceneOf().readoutText()).toContain('C(t) = (1; 1,5)');
        view.unmount();
    });

    test('only the levels up to the revealed one are visible', () => {
        const {graph, view} = mount();
        show(graph, 0.5, 1);
        const visible = (r: number) => graph.sceneOf().levelElements(r).map(shown);
        expect([visible(0), visible(1), visible(2)]).toEqual([[true, true, true], [true, true], [false]]);
        expect(graph.sceneOf().segmentElements(1).map(shown)).toEqual([true]);
        view.unmount();
    });

    test.each([
        [1, [0, 0, 1, 2, 3, 4, 4]],
        [2, [0, 0, 0, 1, 2, 3, 3, 3]],
        [3, [0, 0, 0, 0, 1, 2, 3, 3, 3, 3]],
    ])('exactly k + 1 control points are highlighted for degree %s, on the active ones', (degree, knots) => {
        const {graph, view} = mount();
        const points = [[0, 0], [1, 2], [2, 0], [3, 2], [4, 0], [5, 2]].slice(0, knots.length - degree - 1);
        act(() => graph.importPresetData({degree, knots, points: points as [number, number][]}));
        const model = graph.sceneOf().curve.getCurve();
        const [start, end] = model.getDomain();
        for (const t of [0.2, 0.9, 1.4, 2.2, 2.9]) {
            if (t < start || t > end) continue;
            show(graph, t, 0);
            const rings = graph.sceneOf().ringElements();
            expect(rings).toHaveLength(degree + 1);
            const active = model.activeIndices(graph.sceneOf().parameter());
            const covered = graph.sceneOf().curve.getJxgPoints().map(p => rings.some(r => r.X() === p.X() && r.Y() === p.Y()));
            expect(covered.filter(Boolean)).toHaveLength(degree + 1);
            active.forEach(index => expect(covered[index]).toBe(true));
        }
        view.unmount();
    });

    test('the highlight rings never take a pointer hit, and dragging a highlighted control point moves it', () => {
        const {graph, view} = mount();
        show(graph, 0.5, 0);
        const rings = graph.sceneOf().ringElements();
        const control = graph.sceneOf().curve.getJxgPoints()[0];
        const ring = rings.find(r => r.X() === control.X() && r.Y() === control.Y());
        expect(ring).toBeDefined();
        const [, sx, sy] = control.coords.scrCoords;
        expect(ring!.hasPoint(sx, sy)).toBe(false);
        act(() => dragPoint(graph, 0, -1, 2));
        expect(graph.state.points[0]).toEqual([-1, 2]);
        expect(control.X()).toBeCloseTo(-1, 12);
        view.unmount();
    });

    test('moving P0 leaves the curve for t > 1 unchanged and moves it for t < 1', () => {
        const {graph, view} = mount();
        const model = () => graph.sceneOf().curve.getCurve();
        const samples = (from: number, to: number) => Array.from({length: 21}, (_, i) => model().eval(from + (to - from) * i / 20)).map(p => [p.X(), p.Y()]);
        const tail = samples(1.0001, 2);
        const head = samples(0, 0.9);
        act(() => dragPoint(graph, 0, -2, 3));
        expect(graph.state.points[0]).toEqual([-2, 3]);
        expect(samples(1.0001, 2)).toEqual(tail);
        expect(samples(0, 0.9)).not.toEqual(head);
        view.unmount();
    });

    test("every sampled point of each span lies in the convex hull of that span's k + 1 active points", () => {
        const {graph, view} = mount();
        act(() => graph.importPresetData({degree: 3, knots: [0, 0, 0, 0, 1, 2, 3, 3, 3, 3], points: [[0, 0], [1, 3], [2, -1], [4, 2], [5, 0], [6, 3]]}));
        const model = graph.sceneOf().curve.getCurve();
        const hullContains = (cloud: number[][], p: number[]) => {
            const sorted = [...cloud].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
            const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
            const build = (list: number[][]) => list.reduce<number[][]>((hull, q) => {
                while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], q) <= 0) hull.pop();
                hull.push(q);
                return hull;
            }, []);
            const polygon = [...build(sorted).slice(0, -1), ...build([...sorted].reverse()).slice(0, -1)];
            return polygon.every((a, i) => cross(a, polygon[(i + 1) % polygon.length], p) >= -1e-9);
        };
        const knots = model.getKnots();
        let sampled = 0;
        for (let span = 3; span <= 5; span++) {
            const cloud = model.getPoints().slice(span - 3, span + 1).map(p => [p.X(), p.Y()]);
            for (let i = 0; i <= 40; i++) {
                const t = knots[span] + (knots[span + 1] - knots[span]) * (i / 40) * (i === 40 ? 1 - 1e-9 : 1);
                const p = model.eval(t);
                expect(hullContains(cloud, [p.X(), p.Y()])).toBe(true);
                sampled++;
            }
        }
        expect(sampled).toBe(123);
        view.unmount();
    });
});

describe('the deboor iteration', () => {
    test('the id is exported and the animation is stopped by default', () => {
        expect(DEBOOR_ANIMATION_ID).toBe('deboor');
        const frames = manualScheduler();
        const {graph, view} = mount(frames.scheduler);
        expect([graph.state.level, graph.playing, frames.pending()]).toEqual([0, false, 0]);
        view.unmount();
    });

    test('next step reveals one level at a time up to k, then refuses; reset returns to level 0', () => {
        const {graph, view} = mount(manualScheduler().scheduler);
        act(() => { expect(graph.nextStep()).toBe(true); });
        expect(graph.state.level).toBe(1);
        act(() => { expect(graph.nextStep()).toBe(true); });
        expect(graph.state.level).toBe(2);
        act(() => { expect(graph.nextStep()).toBe(false); });
        act(() => graph.resetLevels());
        expect(graph.state.level).toBe(0);
        view.unmount();
    });

    test('playback reveals one level per interval and stops at the last level; pause stops it; an edit pauses it', () => {
        const frames = manualScheduler();
        const {graph, view} = mount(frames.scheduler);
        act(() => graph.play());
        expect(graph.playing).toBe(true);
        act(() => { frames.frame(0); frames.frame(900); });
        expect(graph.state.level).toBe(1);
        act(() => graph.pause());
        expect([graph.playing, frames.pending(), graph.state.level]).toEqual([false, 0, 1]);
        act(() => graph.play());
        act(() => { frames.frame(0); frames.frame(900); });
        expect([graph.state.level, graph.playing]).toEqual([2, false]);
        // An edit while playing pauses.
        act(() => graph.resetLevels());
        act(() => graph.play());
        expect(graph.playing).toBe(true);
        act(() => dragPoint(graph, 1, 1, 3));
        expect([graph.playing, graph.state.level]).toEqual([false, 0]);
        act(() => graph.play());
        act(() => graph.setT(1.2));
        expect(graph.playing).toBe(false);
        view.unmount();
    });

    test('scene replacement, import, capture, checkpoint and unmount stop playback', () => {
        const frames = manualScheduler();
        const {graph, view} = mount(frames.scheduler);
        act(() => graph.play());
        act(() => graph.lessonDefault());
        expect([graph.playing, frames.pending()]).toEqual([false, 0]);
        act(() => graph.play());
        act(() => graph.importPresetData(graph.defaultPreset()));
        act(() => graph.setT(0.6));
        expect(graph.playing).toBe(false);
        act(() => graph.play());
        act(() => graph.pausePlayback());
        expect(graph.playing).toBe(false);
        act(() => graph.play());
        const capabilities = graph.getLessonCapabilities();
        const checkpoint = capabilities.captureState();
        act(() => capabilities.restoreState(checkpoint));
        expect(graph.playing).toBe(false);
        act(() => graph.play());
        view.unmount();
        expect(frames.pending()).toBe(0);
        expect(graph.playing).toBe(false);
    });
});

describe('knot editor, degree and point count', () => {
    const field = (i: number) => screen.getByRole('spinbutton', {name: new RegExp(`^(Vozel|Knot) u${i}$`)}) as HTMLInputElement;
    const typeAndEnter = (input: HTMLInputElement, value: string) => {
        fireEvent.input(input, {target: {value}, inputType: 'insertText'});
        fireEvent.keyDown(input, {key: 'Enter'});
    };

    test('a typed knot goes through setKnots; an invalid one is refused with the reason and keeps the vector', () => {
        const {graph, view} = mount();
        typeAndEnter(field(3), '1,5');
        expect(graph.state.knots).toEqual([0, 0, 0, 1.5, 2, 2, 2]);
        expect(graph.sceneOf().curve.getCurve().getKnots()).toEqual([0, 0, 0, 1.5, 2, 2, 2]);
        expect(graph.editKnot(3, 5)).toBeDefined();
        expect(graph.editKnot(0, 3)).toBeDefined();
        expect(graph.state.knots).toEqual([0, 0, 0, 1.5, 2, 2, 2]);
        view.unmount();
    });

    test('a point-count change rebuilds the vector of the same kind; the degree is limited by the count', () => {
        const {graph, view} = mount();
        act(() => graph.changePointCount(true));
        expect(graph.state.points).toHaveLength(5);
        expect(graph.state.knots).toEqual([0, 0, 0, 1, 2, 3, 3, 3]);
        expect(graph.sceneOf().curve.getCurve().getPoints()).toHaveLength(5);
        act(() => graph.changePointCount(false));
        act(() => graph.changePointCount(false));
        expect(graph.state.points).toHaveLength(3);
        act(() => graph.changePointCount(false));
        expect(graph.state.points).toHaveLength(3);
        act(() => graph.setDegree(3));
        expect(graph.state.degree).toBe(2);
        act(() => graph.changePointCount(true));
        act(() => graph.setDegree(3));
        expect([graph.state.degree, graph.state.knots]).toEqual([3, [0, 0, 0, 0, 1, 1, 1, 1]]);
        view.unmount();
    });
});

describe('Reset, scenes, language and disposal', () => {
    test('reset restores the defaults', async () => {
        const {graph, view} = mount();
        act(() => { graph.changePointCount(true); graph.setT(1.7); graph.setState({level: 2}); });
        act(() => { void graph.reset(); });
        await waitFor(() => expect(graph.state.points).toHaveLength(4));
        expect(graph.state).toMatchObject({degree: 2, knots: [0, 0, 0, 1, 2, 2, 2], t: 0.5, level: 0});
        expect(graph.state.points).toEqual([[0, 0], [1, 2], [3, 2], [4, 0]]);
        view.unmount();
    });

    test('lesson default, checkpoint and figure paths carry degree, knots and points', () => {
        const {graph, view} = mount();
        const cubic: BSplinePresetData = {degree: 3, knots: [0, 0, 0, 0, 1, 1, 1, 1], points: [[0, 0], [1, 2], [3, 2], [4, 0]]};
        act(() => graph.importPresetData(cubic));
        expect(graph.sceneOf().degree).toBe(3);
        act(() => graph.lessonDefault());
        expect(graph.state.degree).toBe(2);
        const capabilities = graph.getLessonCapabilities();
        act(() => graph.importPresetData(cubic));
        const checkpoint = capabilities.captureState();
        act(() => graph.setDegree(2));
        act(() => capabilities.restoreState(checkpoint));
        expect([graph.state.degree, graph.state.knots, graph.state.points]).toEqual([3, cubic.knots, cubic.points]);
        view.unmount();
    });

    test('the Preset collection checks the exported and the default data', () => {
        const {graph, view} = mount();
        const collection = graph.presetCollection()!;
        expect(collection).toBe(bsplinePresetCollection);
        expect(collection.check(graph.exportPresetData())).toEqual({data: graph.exportPresetData()});
        expect(collection.check(graph.defaultPreset())).toEqual({data: graph.defaultPreset()});
        view.unmount();
    });

    test('a real lesson fixture action loads its points on clamped knots through the collection check', () => {
        const cubic: BSplinePresetData = {degree: 3, knots: [0, 0, 0, 0, 1, 1, 1, 1], points: [[0, 0], [1, 2], [3, 2], [4, 0]]};
        const fixtureAction = (points: BSplinePresetData['points'], degree?: number) =>
            ({kind: 'prepared-scene', sceneId: 's', source: 'lesson-fixture', curve: {points: points.map(([x, y]) => [x, y]), ...(degree ? {degree} : {})}}) as unknown as LessonAction;
        const {graph, view} = mount();
        const action = fixtureAction(cubic.points, 3);
        act(() => graph.getLessonCapabilities().apply(action));
        expect([graph.state.degree, graph.state.knots, graph.state.points]).toEqual([3, cubic.knots, cubic.points]);
        expect(graph.sceneOf().degree).toBe(3);
        // Invalid fixture data is rejected by the collection with the lesson geometry error; the scene stays.
        expect(() => act(() => graph.getLessonCapabilities().apply(fixtureAction(cubic.points.slice(0, 3), 3)))).toThrow('The lesson geometry is invalid');
        expect([graph.state.degree, graph.state.knots]).toEqual([3, cubic.knots]);
        view.unmount();
    });

    test('a figure Preset restores its points and a Preset without data gives the default scene', () => {
        const {graph, view} = mount();
        const data: BSplinePresetData = {degree: 3, knots: [0, 0, 0, 0, 1, 1, 1, 1], points: [[0, 0], [1, 2], [3, 2], [4, 0]]};
        const next = graph.figureScene({id: 'x', data, graphState: {initialized: true, level: 5}} as unknown as Preset);
        expect([next.degree, next.knots, next.points, next.level]).toEqual([3, data.knots, data.points, 3]);
        const fallback = graph.figureScene({id: 'y', graphState: {initialized: true, level: 5}} as unknown as Preset);
        expect([fallback.degree, fallback.level]).toEqual([2, 2]);
        view.unmount();
    });

    test('invalid imports are rejected by the collection and the import leaves the state unchanged', () => {
        const {graph, view} = mount();
        const collection = graph.presetCollection()!;
        const before = graph.exportPresetData();
        const tooFew: BSplinePresetData = {degree: 3, knots: [0, 0, 0, 0, 1, 1, 1, 1], points: [[0, 0], [1, 2], [3, 2]]};
        const badKnots: BSplinePresetData = {degree: 2, knots: [0, 0, 0, 2, 1, 2, 2, 2], points: [[0, 0], [1, 2], [3, 2], [4, 0], [5, 1]]};
        for (const data of [tooFew, badKnots]) {
            expect(collection.check(data)).toHaveProperty('rejection');
            expect(() => graph.importPresetData(data)).toThrow();
            expect(graph.exportPresetData()).toEqual(before);
        }
        view.unmount();
    });

    test('NURBS weights pass the collection but the graph ignores them and exports none', () => {
        const {graph, view} = mount();
        const weighted = {...graph.defaultPreset(), weights: [1, 2, 2, 1]};
        const checked = bsplinePresetCollection.check(weighted);
        expect(checked).toEqual({data: weighted});
        act(() => graph.importPresetData(weighted));
        expect(graph.exportPresetData()).not.toHaveProperty('weights');
        expect(graph.exportPresetData()).toEqual(graph.defaultPreset());
        view.unmount();
    });

    test('a live language switch updates the board readout', () => {
        const {graph, view} = mount();
        show(graph, 0.5, 1);
        const readout = graph.sceneOf().readout() as unknown as {plaintext: string};
        expect(readout.plaintext).toContain('vozelni razpon');
        act(() => setLanguage('en'));
        expect(readout.plaintext).toContain('knot span');
        expect(readout.plaintext).toContain('level 1');
        expect(readout.plaintext).toContain('α1<sup>1</sup> = 0.5');
        view.unmount();
    });

    test('unmount and scene rebuilds leave no board objects and no language subscription', () => {
        const before = liveSubscriptions.count;
        const {graph, view, board} = mount();
        const owned = () => [...graph.sceneOf().ownedElements(), ...graph.sceneOf().curve.getJxgPoints(), graph.sceneOf().curve.getJxgCurve()];
        const first = owned();
        expect(first.length).toBeGreaterThan(10);
        act(() => graph.changePointCount(true));
        expect(first.some(element => board.objectsList.includes(element))).toBe(false);
        const second = owned();
        expect(second.every(element => board.objectsList.includes(element))).toBe(true);
        expect(liveSubscriptions.count).toBe(before + 1);
        view.unmount();
        expect(second.some(element => board.objectsList.includes(element))).toBe(false);
        expect(liveSubscriptions.count).toBe(before);
    });
});

describe('drawing cost (jsdom, real JSXGraph board)', () => {
    test('a control-point drag and a t sweep stay far below a frame', () => {
        const {graph, view} = mount();
        act(() => graph.setState({level: 2}));
        const drags = 200;
        const start = performance.now();
        for (let i = 0; i < drags; i++) dragPoint(graph, 1, 1 + 0.5 * ((i % 40) / 40), 2);
        const dragMs = (performance.now() - start) / drags;
        const sweepStart = performance.now();
        for (let i = 0; i < drags; i++) act(() => graph.setT(2 * (i / drags)));
        const sweepMs = (performance.now() - sweepStart) / drags;
        console.info(`BSPLINE_DEBOOR_MEASURE drag ${dragMs.toFixed(2)} ms/event, t sweep ${sweepMs.toFixed(2)} ms/step (jsdom, degree 2, 4 points)`);
        expect(dragMs).toBeLessThan(100);
        expect(sweepMs).toBeLessThan(100);
        view.unmount();
    });
});
