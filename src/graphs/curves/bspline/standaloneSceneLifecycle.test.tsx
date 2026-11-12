/**
 * Characterization of the Blossom and NURBS standalone scene lifecycle (lesson-authoring architecture, section 4, slice 1),
 * written before the owned-scene refactor. It pins the observable behavior on the real graphs, through the real host:
 * which scenes are released by reset, Preset import, checkpoint restore, figure entry-and-return and remount; that the old
 * elements and language subscription go inactive; that the new scene responds; same-tick scene sequences with rollback;
 * and the NURBS difference between an ordinary same-shape commit and a replacement with different knots.
 *
 * A released scene's drag handler is inert (the defect pinned in slice 1 is fixed).
 */
import {act} from '@testing-library/react';
import {afterEach, beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import JXG from 'jsxgraph';
import BaseGraph, {BaseGraphState} from '../../base/BaseGraph';
import {appStorage} from '../../../storage/appStorage';
import {installBoardShims, mountGraph, type MountedGraph, REAL_GRAPH_TEST_TIMEOUT, settle} from '../../base/realGraphTestHarness';
import {internals} from '../../base/realGraphScenes';
import {setLanguage} from '../../../localization';
import type {LessonAction} from '../../../learning/model';
import {BSplineBlossomGraph} from './BSplineBlossomGraph';
import {BSplineNurbsGraph} from './BSplineNurbsGraph';
import {BSplineBlossomScene} from './BSplineBlossomScene';
import {BSplineNurbsScene} from './BSplineNurbsScene';
import {BSplineBasisGraph} from './BSplineBasisGraph';
import {DeBoorGraph} from './DeBoorGraph';
import {BSplineInsertionGraph} from './BSplineInsertionGraph';
import {BSplineExtractionGraph} from './BSplineExtractionGraph';
import {BSplineBasisScene} from './BSplineBasisScene';
import {DeBoorScene} from './DeBoorScene';
import {BSplineInsertionScene} from './BSplineInsertionScene';
import {BSplineExtractionScene} from './BSplineExtractionScene';
import {basisPresetData} from './bsplineBasisModel';
import {JXGBSplineCurve} from '../object/JXGBSplineCurve';
import {blossomSegments, blossomSnapshot} from './bsplineBlossomModel';

/** The language subscriptions made while a Blossom scene is being built (the scene's own, not the board's). */
const subscriptions = vi.hoisted(() => ({scene: [] as Array<{listener: () => void; live: boolean}>}));
vi.mock('../../../localization', async importOriginal => {
    const original = await importOriginal<typeof import('../../../localization')>();
    return {
        ...original,
        onLanguageChange: (listener: () => void) => {
            const entry = {listener, live: true};
            if (new Error().stack?.includes('BSplineBlossomScene')) subscriptions.scene.push(entry);
            const unsubscribe = original.onLanguageChange(listener);
            return () => { entry.live = false; unsubscribe(); };
        },
    };
});
vi.mock('../../base/export/FigureCapture', async () => ({
    ...await vi.importActual<typeof import('../../base/export/FigureCapture')>('../../base/export/FigureCapture'),
    capturePNGBlob: vi.fn(async () => new Blob(['png'])),
    waitForFigureCaptureReady: vi.fn(async () => undefined),
    downloadBlob: vi.fn(),
}));

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => { appStorage.clear(); subscriptions.scene.length = 0; });
afterEach(() => { vi.restoreAllMocks(); setLanguage('sl'); });

type GraphLike = BaseGraph<BaseGraphState>;
type Pt = readonly [number, number];
type SceneLike = {curve: JXGBSplineCurve; ownedElements(): readonly JXG.GeometryElement[]; dispose(): void};
type Fire = {triggerEventHandlers(names: string[], args: unknown[]): void};

const stateOf = (graph: GraphLike) => graph.state as unknown as {points: readonly Pt[]; weights: readonly number[]; knots: readonly number[]; degree: number};
const sceneOf = (graph: GraphLike) => (graph as unknown as {scene?: SceneLike}).scene!;
const boardOf = (graph: GraphLike) => internals(graph).board;
const near = (actual: readonly number[], expected: readonly number[], tol = 1e-9) => {
    expect(actual).toHaveLength(expected.length);
    expected.forEach((value, i) => expect(Math.abs(actual[i] - value)).toBeLessThanOrEqual(tol));
};
const liveListeners = () => subscriptions.scene.filter(entry => entry.live);

/** Moves a control point the way a board drag does: position first, then the drag event the scene subscribed to. */
const dragTo = (point: JXG.Point, x: number, y: number) => {
    act(() => {
        point.setPosition(JXG.COORDS_BY_USER, [x, y]);
        (point as unknown as Fire).triggerEventHandlers(['drag'], []);
    });
};

interface Released {scene: SceneLike; points: JXG.Point[]; elements: JXG.GeometryElement[]; knots: number[]; curveDisposals: () => number}

interface Subject {
    name: string;
    make(): GraphLike;
    Scene: {prototype: SceneLike};
    /** Different degree/point count from the default scene. */
    structural: unknown;
    /** The default scene's degree and point count with moved points. */
    sameShape(defaults: Data): unknown;
    /** Whether a Preset import of the same shape keeps the scene (NURBS, Blossom). */
    keepsSceneOnSameShapeImport: boolean;
    /** Scenes a remount builds and throws away before the live one. */
    discardedOnRemount: number;
    /** Scenes released by a figure entry-and-return from a 3-point scene: the entry scene and the figure scene. */
    figureReleases: number;
    /** Where the dependent drawing shows C or f now, and where the state says it is. */
    dependent(graph: GraphLike): {drawn: number[]; expected: number[]};
}

type Data = {degree: number; knots: number[]; points: Pt[]; weights?: number[]};
const exported = (graph: GraphLike) => internals(graph).exportPresetData() as Data;
const moved = (defaults: Data) => ({...defaults, points: defaults.points.map(p => [p[0] * 0.5, p[1] * 0.5 + 0.1] as Pt)});

const blossomSubject: Subject = {
    name: 'Blossom',
    make: () => new BSplineBlossomGraph() as unknown as GraphLike,
    Scene: BSplineBlossomScene as unknown as Subject['Scene'],
    structural: {degree: 2, knots: [0, 0, 0, 1, 1, 1], points: [[0, 0], [1, 2], [3, 0]]},
    sameShape: moved,
    keepsSceneOnSameShapeImport: true,
    discardedOnRemount: 0,
    figureReleases: 2,
    dependent: graph => {
        const {knots, degree, points} = stateOf(graph);
        const b = graph as unknown as BSplineBlossomGraph;
        const final = (sceneOf(graph) as unknown as BSplineBlossomScene).levelElements(degree)[0];
        return {drawn: [final.X(), final.Y()], expected: [...blossomSnapshot(knots, degree, points, b.state.segment, b.state.args)!.value]};
    },
};

const nurbsSubject: Subject = {
    name: 'NURBS',
    make: () => new BSplineNurbsGraph() as unknown as GraphLike,
    Scene: BSplineNurbsScene as unknown as Subject['Scene'],
    structural: {degree: 2, knots: [0, 0, 0, 1, 1, 1], points: [[0, 0], [1, 1], [2, 0]], weights: [1, 2, 1]},
    sameShape: moved,
    keepsSceneOnSameShapeImport: true,
    discardedOnRemount: 0,
    figureReleases: 2,
    dependent: graph => {
        const marker = (sceneOf(graph) as unknown as BSplineNurbsScene).markerElement()!;
        return {drawn: [marker.X(), marker.Y()], expected: [...(graph as unknown as BSplineNurbsGraph).markerPoint()!]};
    },
};

/** The point on the independent formula (unit weights) at the fraction `f` of the state's parameter domain. */
const probeAt = (graph: GraphLike, f: number): {u: number; expected: number[]; drawn: number[]} => {
    const {knots, degree, points} = stateOf(graph);
    const u = knots[degree] + f * (knots[points.length] - knots[degree]);
    const p = sceneOf(graph).curve.getCurve().eval(u);
    return {u, expected: [...rationalPoint(degree, knots, points, points.map(() => 1), u)], drawn: [p.X(), p.Y()]};
};

const deBoorSubject: Subject = {
    name: 'De Boor',
    make: () => new DeBoorGraph() as unknown as GraphLike,
    Scene: DeBoorScene as unknown as Subject['Scene'],
    structural: {degree: 2, knots: [0, 0, 0, 1, 1, 1], points: [[0, 0], [1, 2], [3, 0]]},
    sameShape: moved,
    keepsSceneOnSameShapeImport: true,
    discardedOnRemount: 0,
    figureReleases: 2,
    dependent: graph => {
        const {knots, degree, points} = stateOf(graph);
        const t = (graph as unknown as DeBoorGraph).state.t;
        const final = (sceneOf(graph) as unknown as DeBoorScene).levelElements(degree)[0];
        return {drawn: [final.X(), final.Y()], expected: [...rationalPoint(degree, knots, points, points.map(() => 1), t)]};
    },
};

const insertionSubject: Subject = {
    name: 'Insertion',
    make: () => new BSplineInsertionGraph() as unknown as GraphLike,
    Scene: BSplineInsertionScene as unknown as Subject['Scene'],
    structural: {degree: 2, knots: [0, 0, 0, 1, 1, 1], points: [[0, 0], [1, 2], [3, 0]]},
    sameShape: moved,
    keepsSceneOnSameShapeImport: true,
    discardedOnRemount: 0,
    figureReleases: 2,
    dependent: graph => { const {drawn, expected} = probeAt(graph, 0.3); return {drawn, expected}; },
};

const extractionSubject: Subject = {
    name: 'Extraction',
    make: () => new BSplineExtractionGraph() as unknown as GraphLike,
    Scene: BSplineExtractionScene as unknown as Subject['Scene'],
    structural: {degree: 2, knots: [0, 0, 0, 1, 1, 1], points: [[0, 0], [1, 2], [3, 0]]},
    sameShape: moved,
    keepsSceneOnSameShapeImport: true,
    discardedOnRemount: 0,
    figureReleases: 2,
    dependent: graph => { const {drawn, expected} = probeAt(graph, 0.3); return {drawn, expected}; },
};

const SUBJECTS = [blossomSubject, nurbsSubject, deBoorSubject, insertionSubject, extractionSubject];

/** Records every scene at its first disposal (with the elements and points it owned), without changing disposal. */
function watchReleases(subject: Subject): {released: Released[]; stop(): void} {
    const released: Released[] = [];
    const seen = new Set<SceneLike>();
    const original = subject.Scene.prototype.dispose;
    const curveDispose = vi.spyOn(JXGBSplineCurve.prototype, 'dispose');
    const spy = vi.spyOn(subject.Scene.prototype, 'dispose').mockImplementation(function (this: SceneLike) {
        if (!seen.has(this)) {
            seen.add(this);
            const curve = this.curve;
            released.push({scene: this, points: [...curve.getJxgPoints()], elements: [...this.ownedElements()], knots: [...curve.getCurve().getKnots()],
                curveDisposals: () => curveDispose.mock.contexts.filter(context => context === curve).length});
        }
        return original.call(this);
    });
    return {released, stop: () => { spy.mockRestore(); curveDispose.mockRestore(); }};
}

/** The old scenes are released exactly once and none of their board objects is still on the board. */
function expectReleased(graph: GraphLike, released: Released[], boardGone = false) {
    const board = boardOf(graph);
    expect(new Set(released.map(r => r.scene)).size).toBe(released.length);
    for (const old of released) {
        expect(old.curveDisposals()).toBe(1);
        if (!boardGone) {
            expect(old.points.some(point => board.objectsList.includes(point))).toBe(false);
            expect(old.elements.some(element => board.objectsList.includes(element))).toBe(false);
        }
        expect(sceneOf(graph)).not.toBe(old.scene);
    }
}

/** The live scene answers a drag: the state, the model curve and the dependent drawing all follow. */
function expectResponds(subject: Subject, graph: GraphLike) {
    const scene = sceneOf(graph);
    const points = scene.curve.getJxgPoints();
    const before = subject.dependent(graph).drawn;
    dragTo(points[1], 0.37, 0.61);
    expect(stateOf(graph).points[1]).toEqual([0.37, 0.61]);
    expect(stateOf(graph).points).toHaveLength(points.length);
    const {drawn, expected} = subject.dependent(graph);
    near(drawn, expected);
    expect(Math.hypot(drawn[0] - before[0], drawn[1] - before[1])).toBeGreaterThan(1e-6);
    near([sceneOf(graph).curve.getCurve().getPoints()[1].X(), sceneOf(graph).curve.getCurve().getPoints()[1].Y()], [0.37, 0.61]);
}

describe.each(SUBJECTS)('$name standalone scene lifecycle', subject => {
    let mounted: MountedGraph;
    let graph: GraphLike;
    /** The default scene's data, captured before any test moves the graph to the structural scene. */
    let defaultData: Data;
    beforeEach(() => {
        graph = subject.make();
        mounted = mountGraph(graph);
        defaultData = exported(graph);
    });
    afterEach(() => { mounted.view.unmount(); });

    const importStructural = () => act(() => internals(graph).importPresetData(subject.structural));

    /** Each entry starts on the structural scene and moves to another shape, so the scene must be replaced. */
    const entries: Record<string, (checkpoint: ReturnType<ReturnType<GraphLike['getLessonCapabilities']>['captureState']>) => Promise<void>> = {
        'reset': async () => { await settle(() => graph.reset()); },
        'Preset import': async () => { act(() => internals(graph).importPresetData(subject.sameShape(defaultData))); },
        'checkpoint restore': async checkpoint => { act(() => graph.getLessonCapabilities().restoreState(checkpoint)); },
        'figure entry-and-return': async () => {
            await settle(() => internals(graph).exportPresetFigures([{...graph.exportPreset(), id: 'figure', data: subject.sameShape(defaultData) as never}]));
        },
    };

    test.each(Object.keys(entries))('after %s every old scene is released once, its board objects are gone, and the new scene responds', async entry => {
        const checkpoint = graph.getLessonCapabilities().captureState();
        const defaultPoints = stateOf(graph).points.length;
        importStructural();
        const structuralScene = sceneOf(graph);
        const structuralPoints = [...structuralScene.curve.getJxgPoints()];
        const watch = watchReleases(subject);
        await entries[entry](checkpoint);
        expect(watch.released.map(r => r.scene)).toContain(structuralScene);
        expect(watch.released.map(r => r.scene)).not.toContain(sceneOf(graph));
        expect(watch.released.find(r => r.scene === structuralScene)!.points).toEqual(structuralPoints);
        expectReleased(graph, watch.released);
        // The figure batch returns to the entry scene (the structural one); every other entry ends on the default shape.
        expect(stateOf(graph).points).toHaveLength(entry === 'figure entry-and-return' ? 3 : defaultPoints);
        expectResponds(subject, graph);
        watch.stop();
    });

    test('a figure entry-and-return shows the figure scene and releases it on the way back', async () => {
        importStructural();
        const watch = watchReleases(subject);
        const figure = subject.sameShape(defaultData) as {points: Pt[]};
        await settle(() => internals(graph).exportPresetFigures([{...graph.exportPreset(), id: 'figure', data: figure as never}]));
        // Two scenes released: the entry scene when the figure replaced it, the figure scene when the entry returned.
        expect(watch.released).toHaveLength(subject.figureReleases);
        expect(watch.released[0].points).toHaveLength(3);
        expect(watch.released[1].points).toHaveLength(figure.points.length);
        expectReleased(graph, watch.released);
        expectResponds(subject, graph);
        watch.stop();
    });

    test(`a Preset import of the same shape ${subject.keepsSceneOnSameShapeImport ? 'keeps' : 'rebuilds'} the scene`, () => {
        const before = sceneOf(graph);
        const watch = watchReleases(subject);
        act(() => internals(graph).importPresetData(subject.sameShape(defaultData)));
        if (subject.keepsSceneOnSameShapeImport) {
            expect(sceneOf(graph)).toBe(before);
            expect(watch.released).toHaveLength(0);
        } else {
            expect(sceneOf(graph)).not.toBe(before);
            expect(watch.released.map(r => r.scene)).toEqual([before]);
            expectReleased(graph, watch.released);
        }
        near([sceneOf(graph).curve.getCurve().getPoints()[0].X(), sceneOf(graph).curve.getCurve().getPoints()[0].Y()], [...stateOf(graph).points[0]]);
        expectResponds(subject, graph);
        watch.stop();
    });

    test('remount releases the old scene once and builds the live one on the new board', () => {
        const oldBoard = boardOf(graph);
        const oldScene = sceneOf(graph);
        const oldPoints = [...oldScene.curve.getJxgPoints()];
        const watch = watchReleases(subject);
        mounted.view.unmount();
        expect(watch.released.map(r => r.scene)).toEqual([oldScene]);
        expect(oldBoard.objectsList.some(object => oldPoints.includes(object as JXG.Point))).toBe(false);
        mounted = mountGraph(graph);
        expect(boardOf(graph)).not.toBe(oldBoard);
        expect(watch.released).toHaveLength(1 + subject.discardedOnRemount);
        expect(watch.released[0].scene).toBe(oldScene);
        expectReleased(graph, watch.released, true);
        // A second StrictMode-style cycle leaves exactly one live scene and releases the previous one once.
        const second = sceneOf(graph);
        mounted.view.unmount();
        mounted = mountGraph(graph);
        expect(watch.released.map(r => r.scene)).toContain(second);
        expectReleased(graph, watch.released, true);
        expectResponds(subject, graph);
        watch.stop();
    });

    test('a construction failure releases what the half-built scene acquired and publishes no scene', () => {
        const checkpoint = graph.getLessonCapabilities().captureState();
        importStructural();
        const board = boardOf(graph);
        const created: unknown[] = [];
        const create = board.create.bind(board);
        let calls = 0;
        vi.spyOn(board, 'create').mockImplementation(((...args: Parameters<typeof create>) => {
            // Fail late enough that the curve layer and some scene elements already exist.
            if (++calls === 4) throw new Error('board refused an element');
            const element = create(...args);
            created.push(element);
            return element;
        }) as typeof board.create);
        expect(() => act(() => graph.getLessonCapabilities().restoreState(checkpoint))).toThrow('board refused an element');
        expect(created.length).toBeGreaterThan(0);
        expect((graph as unknown as {scene?: unknown}).scene).toBeUndefined();
        expect(created.filter(element => board.objectsList.includes(element as JXG.GeometryElement))).toEqual([]);
    });

    test('after a replacement a released scene\'s drag handler is inert (it neither throws nor writes the state)', () => {
        importStructural();
        const old = [...sceneOf(graph).curve.getJxgPoints()];
        act(() => internals(graph).importPresetData(subject.sameShape(defaultData)));
        act(() => { void graph.reset(); });
        const before = JSON.stringify(graph.state);
        expect(() => dragTo(old[1], 5, 7)).not.toThrow();
        expect(JSON.stringify(graph.state)).toBe(before);
    });
});

describe('Blossom language subscription', () => {
    let mounted: MountedGraph;
    let graph: GraphLike;
    beforeEach(() => { graph = blossomSubject.make(); mounted = mountGraph(graph); });
    afterEach(() => { mounted.view.unmount(); });

    test.each([
        ['Preset import', () => act(() => internals(graph).importPresetData(blossomSubject.structural))],
        ['reset', () => { act(() => { (graph as unknown as BSplineBlossomGraph).setDegree(3); }); act(() => (graph as unknown as BSplineBlossomGraph).resetToDefaults()); }],
        ['checkpoint restore', () => {
            const checkpoint = graph.getLessonCapabilities().captureState();
            act(() => internals(graph).importPresetData(blossomSubject.structural));
            act(() => graph.getLessonCapabilities().restoreState(checkpoint));
        }],
    ] as Array<[string, () => void]>)('a replacement by %s unsubscribes the old scene and subscribes the new one', (_name, replace) => {
        expect(liveListeners()).toHaveLength(1);
        const old = liveListeners()[0];
        replace();
        expect(old.live).toBe(false);
        expect(liveListeners()).toHaveLength(1);
        const current = liveListeners()[0];
        expect(current).not.toBe(old);
        const update = vi.spyOn(boardOf(graph), 'update');
        act(() => old.listener());
        expect(update).not.toHaveBeenCalled();
        act(() => current.listener());
        expect(update).toHaveBeenCalledTimes(1);
    });

    test('a figure entry-and-return leaves one live subscription, not the one that existed before', async () => {
        const old = liveListeners()[0];
        await settle(() => internals(graph).exportPresetFigures([{...graph.exportPreset(), id: 'figure', data: moved(exported(graph)) as never}]));
        expect(old.live).toBe(false);
        expect(liveListeners()).toHaveLength(1);
        const update = vi.spyOn(boardOf(graph), 'update');
        act(() => old.listener());
        expect(update).not.toHaveBeenCalled();
        act(() => liveListeners()[0].listener());
        expect(update).toHaveBeenCalledTimes(1);
    });

    test('unmount releases the scene subscription and a remount subscribes once', () => {
        const old = liveListeners()[0];
        mounted.view.unmount();
        expect(old.live).toBe(false);
        expect(liveListeners()).toHaveLength(0);
        mounted = mountGraph(graph);
        expect(liveListeners()).toHaveLength(1);
        expect(liveListeners()[0]).not.toBe(old);
        const update = vi.spyOn(boardOf(graph), 'update');
        act(() => old.listener());
        expect(update).not.toHaveBeenCalled();
    });

    test('a real language change redraws the board through the live subscription', () => {
        const update = vi.spyOn(boardOf(graph), 'update');
        act(() => setLanguage('en'));
        expect(update).toHaveBeenCalled();
    });
});

describe('same-tick scene sequences with rollback (S1)', () => {
    const wide = {degree: 2, knots: [0, 0, 0, 1, 2.5, 4, 4, 4], points: [[0, 0], [1, 3], [2.5, -1], [4, 2], [5, 0.5]]};

    test('Blossom: later actions read the earlier writes in the same tick and rollback restores the checkpoint drawn', () => {
        const graph = blossomSubject.make();
        const mounted = mountGraph(graph);
        const blossom = graph as unknown as BSplineBlossomGraph;
        act(() => internals(graph).importPresetData(wide));
        const capabilities = graph.getLessonCapabilities();
        const checkpoint = capabilities.captureState();
        const start = JSON.stringify(graph.state);
        const apply = (action: LessonAction) => capabilities.apply(action);
        act(() => {
            // Three arguments exist only for degree 3: this action reads the degree written one action earlier.
            expect(() => apply({kind: 'blossom', operation: 'set-args', args: [0.25, 0.75, 1.5]})).toThrow();
            apply({kind: 'blossom', operation: 'set-degree', degree: 3});
            expect(blossom.state.degree).toBe(3);
            expect(blossom.state.knots).toHaveLength(9);
            const last = blossomSegments(blossom.state.knots, 3).slice(-1)[0];
            apply({kind: 'blossom', operation: 'set-segment', segment: last});
            expect(blossom.state.segment).toBe(last);
            apply({kind: 'blossom', operation: 'set-args', args: [0.25, 0.75, 1.5]});
            expect(blossom.state.args).toEqual([0.25, 0.75, 1.5]);
            // Roll back in the same tick: state restored and the old degree drawn before the host commits.
            capabilities.restoreState(checkpoint);
            expect(JSON.stringify(graph.state)).toBe(start);
            expect(blossom.state.degree).toBe(2);
            const scene = sceneOf(graph) as unknown as BSplineBlossomScene;
            expect(scene.levelElements(2)).toHaveLength(1);
            expect(scene.levelElements(3)).toHaveLength(0);
            expect(scene.curve.getCurve().getKnots()).toEqual(wide.knots);
        });
        expect(JSON.stringify(graph.state)).toBe(start);
        expect((sceneOf(graph) as unknown as BSplineBlossomScene).levelElements(2)).toHaveLength(1);
        expectResponds(blossomSubject, graph);
        mounted.view.unmount();
    });

    test('Blossom: the same sequence without rollback draws the degree-3 blossom with the written arguments', () => {
        const graph = blossomSubject.make();
        const mounted = mountGraph(graph);
        const blossom = graph as unknown as BSplineBlossomGraph;
        act(() => internals(graph).importPresetData(wide));
        const capabilities = graph.getLessonCapabilities();
        act(() => {
            capabilities.apply({kind: 'blossom', operation: 'set-degree', degree: 3});
            capabilities.apply({kind: 'blossom', operation: 'set-args', args: [0.25, 0.75, 1.5]});
        });
        const scene = sceneOf(graph) as unknown as BSplineBlossomScene;
        expect(scene.levelElements(3)).toHaveLength(1);
        expect(scene.labelText()).toBe('f(0,25; 0,75; 1,5)');
        near([scene.levelElements(3)[0].X(), scene.levelElements(3)[0].Y()], [...blossom.snapshot()!.value]);
        expectResponds(blossomSubject, graph);
        mounted.view.unmount();
    });

    test('Blossom: a refused action in the middle throws and a checkpoint restore rolls the earlier writes back', () => {
        const graph = blossomSubject.make();
        const mounted = mountGraph(graph);
        const capabilities = graph.getLessonCapabilities();
        const checkpoint = capabilities.captureState();
        const start = JSON.stringify(graph.state);
        act(() => {
            capabilities.apply({kind: 'blossom', operation: 'set-bezier', visible: false});
            expect(() => capabilities.apply({kind: 'blossom', operation: 'set-segment', segment: 99})).toThrow();
            capabilities.restoreState(checkpoint);
        });
        expect(JSON.stringify(graph.state)).toBe(start);
        expectResponds(blossomSubject, graph);
        mounted.view.unmount();
    });

    test('NURBS: a fixture then weight and parameter edits read the earlier writes in the same tick; rollback restores the circle drawn', () => {
        const graph = nurbsSubject.make();
        const mounted = mountGraph(graph);
        const nurbs = graph as unknown as BSplineNurbsGraph;
        const capabilities = graph.getLessonCapabilities();
        const checkpoint = capabilities.captureState();
        const start = JSON.stringify(graph.state);
        const square: [number, number][] = [[0, 0], [1, 2], [3, 2], [4, 0]];
        act(() => {
            // Weight index 8 exists on the circle (nine weights) but not on the fixture written in the previous action.
            capabilities.apply({kind: 'prepared-scene', sceneId: 's', source: 'lesson-fixture', curve: {points: square, degree: 2, weights: [1, 2, 3, 4]}} as unknown as LessonAction);
            expect(nurbs.state.weights).toEqual([1, 2, 3, 4]);
            expect(() => capabilities.apply({kind: 'nurbs-circle', operation: 'set-weight', index: 8, value: 5})).toThrow();
            capabilities.apply({kind: 'nurbs-circle', operation: 'set-weight', index: 3, value: 7});
            expect(nurbs.state.weights).toEqual([1, 2, 3, 7]);
            capabilities.apply({kind: 'nurbs-circle', operation: 'set-t', value: 0.4});
            expect(nurbs.state.t).toBe(0.4);
            capabilities.restoreState(checkpoint);
            expect(JSON.stringify(graph.state)).toBe(start);
            expect(sceneOf(graph).curve.getJxgPoints()).toHaveLength(9);
            expect(sceneOf(graph).curve.getCurve().getWeights()).toEqual(nurbs.state.weights);
        });
        expect(JSON.stringify(graph.state)).toBe(start);
        expect(sceneOf(graph).curve.getCurve().getWeights()).toEqual(nurbs.state.weights);
        expectResponds(nurbsSubject, graph);
        mounted.view.unmount();
    });

    test('NURBS: the same sequence without rollback draws the written weights', () => {
        const graph = nurbsSubject.make();
        const mounted = mountGraph(graph);
        const nurbs = graph as unknown as BSplineNurbsGraph;
        const capabilities = graph.getLessonCapabilities();
        const square: [number, number][] = [[0, 0], [1, 2], [3, 2], [4, 0]];
        act(() => {
            capabilities.apply({kind: 'prepared-scene', sceneId: 's', source: 'lesson-fixture', curve: {points: square, degree: 2, weights: [1, 2, 3, 4]}} as unknown as LessonAction);
            capabilities.apply({kind: 'nurbs-circle', operation: 'set-weight', index: 3, value: 7});
        });
        expect(sceneOf(graph).curve.getJxgPoints()).toHaveLength(4);
        expect(sceneOf(graph).curve.getCurve().getWeights()).toEqual([1, 2, 3, 7]);
        near([...nurbs.markerPoint()!], rationalPoint(2, nurbs.state.knots, square, [1, 2, 3, 7], nurbs.state.t));
        expectResponds(nurbsSubject, graph);
        mounted.view.unmount();
    });
});

// ---- NURBS: ordinary same-shape commit versus replacement with different knots (S5) ---------------------------------------

/** Cox-de Boor basis N_{i,k}(u) by the textbook recursion, written here independently of the app's evaluator. */
function basis(i: number, k: number, u: number, knots: readonly number[], count: number): number {
    if (k === 0) {
        // Half-open spans; the right end of the domain belongs to the last non-empty span.
        const inside = knots[i] <= u && u < knots[i + 1];
        const atEnd = u === knots[count] && knots[i] < knots[i + 1] && knots[i + 1] === knots[count];
        return inside || atEnd ? 1 : 0;
    }
    const left = knots[i + k] - knots[i];
    const right = knots[i + k + 1] - knots[i + 1];
    return (left === 0 ? 0 : (u - knots[i]) / left * basis(i, k - 1, u, knots, count))
        + (right === 0 ? 0 : (knots[i + k + 1] - u) / right * basis(i + 1, k - 1, u, knots, count));
}

/** The rational point sum w_i P_i N_i / sum w_i N_i. */
function rationalPoint(degree: number, knots: readonly number[], points: readonly Pt[], weights: readonly number[], u: number): [number, number] {
    let x = 0, y = 0, w = 0;
    points.forEach((p, i) => {
        const n = weights[i] * basis(i, degree, u, knots, points.length);
        x += n * p[0]; y += n * p[1]; w += n;
    });
    return [x / w, y / w];
}

describe('NURBS: ordinary same-shape commit versus replacement with different knots (S5)', () => {
    const knotsA = [0, 0, 0, 1, 2, 3, 3, 3];
    const knotsB = [0, 0, 0, 1, 1.5, 3, 3, 3];
    const points: Pt[] = [[0, 0], [1, 2], [3, 3], [4, 1], [5, 3]];
    const weights = [1, 2, 0.5, 3, 1];
    const dataA = {degree: 2, knots: knotsA, points, weights};
    const dataB = {...dataA, knots: knotsB};
    const U = 2.2;

    const mountWith = (data: typeof dataA) => {
        const graph = nurbsSubject.make();
        const mounted = mountGraph(graph);
        act(() => internals(graph).importPresetData(data));
        return {graph, mounted, nurbs: graph as unknown as BSplineNurbsGraph};
    };
    const drawnPoint = (graph: GraphLike, u: number) => {
        const p = sceneOf(graph).curve.getCurve().eval(u);
        return [p.X(), p.Y()];
    };
    const expectDrawn = (graph: GraphLike, knots: readonly number[], pts: readonly Pt[] = points, w: readonly number[] = weights) => {
        expect(sceneOf(graph).curve.getCurve().getKnots()).toEqual(knots);
        near(drawnPoint(graph, U), rationalPoint(2, knots, pts, w, U), 1e-9);
    };

    test('the independent formula is a partition of unity and tells the two knot vectors apart', () => {
        const a = rationalPoint(2, knotsA, points, weights, U);
        const b = rationalPoint(2, knotsB, points, weights, U);
        expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeGreaterThan(0.05);
        for (const knots of [knotsA, knotsB]) {
            expect(points.reduce((sum, _p, i) => sum + basis(i, 2, U, knots, points.length), 0)).toBeCloseTo(1, 12);
        }
        // By hand for A on the span [2,3): the basis N_{2,2}(u) = (3-u)^2 / 2 = 0.32 at u = 2.2.
        expect(basis(2, 2, 2.2, knotsA, 5)).toBeCloseTo(0.32, 12);
    });

    test('an ordinary commit of weights or a point keeps the scene, the knots and the independent point', () => {
        const {graph, mounted, nurbs} = mountWith(dataA);
        const scene = sceneOf(graph);
        expectDrawn(graph, knotsA);
        const watch = watchReleases(nurbsSubject);
        act(() => { nurbs.setWeight(2, 2); });
        act(() => nurbs.editPoint(1, [1, 2.5]));
        expect(sceneOf(graph)).toBe(scene);
        expect(watch.released).toHaveLength(0);
        expectDrawn(graph, knotsA, [[0, 0], [1, 2.5], [3, 3], [4, 1], [5, 3]], [1, 2, 2, 3, 1]);
        watch.stop();
        mounted.view.unmount();
    });

    test('an ordinary state commit of different knots (equal degree and point count) rebuilds the scene with the new knots', () => {
        const {graph, mounted, nurbs} = mountWith(dataA);
        const scene = sceneOf(graph);
        const watch = watchReleases(nurbsSubject);
        act(() => nurbs.setState({knots: knotsB}));
        expect(sceneOf(graph)).not.toBe(scene);
        expect(watch.released.map(r => r.scene)).toEqual([scene]);
        expectDrawn(graph, knotsB);
        watch.stop();
        mounted.view.unmount();
    });

    test('a Preset import with equal degree and point count but different knots replaces the scene and draws the new knots', () => {
        const {graph, mounted} = mountWith(dataA);
        const scene = sceneOf(graph);
        const watch = watchReleases(nurbsSubject);
        act(() => internals(graph).importPresetData(dataB));
        expect(sceneOf(graph)).not.toBe(scene);
        expect(watch.released.map(r => r.scene)).toEqual([scene]);
        expect(stateOf(graph).knots).toEqual(knotsB);
        expectDrawn(graph, knotsB);
        const stale = rationalPoint(2, knotsA, points, weights, U);
        expect(Math.hypot(drawnPoint(graph, U)[0] - stale[0], drawnPoint(graph, U)[1] - stale[1])).toBeGreaterThan(0.05);
        expectReleased(graph, watch.released);
        watch.stop();
        mounted.view.unmount();
    });

    test('a checkpoint restore with equal degree and point count but different knots shows the checkpoint knots', () => {
        const {graph, mounted} = mountWith(dataA);
        const capabilities = graph.getLessonCapabilities();
        const checkpoint = capabilities.captureState();
        act(() => internals(graph).importPresetData(dataB));
        expectDrawn(graph, knotsB);
        const scene = sceneOf(graph);
        act(() => capabilities.restoreState(checkpoint));
        expect(sceneOf(graph)).not.toBe(scene);
        expectDrawn(graph, knotsA);
        mounted.view.unmount();
    });

    test('a figure entry-and-return with equal degree and point count but different knots draws the figure knots, then the entry knots', async () => {
        const {graph, mounted} = mountWith(dataA);
        const watch = watchReleases(nurbsSubject);
        await settle(() => internals(graph).exportPresetFigures([{...graph.exportPreset(), id: 'figure', data: dataB as never}]));
        expect(watch.released.map(r => r.knots)).toEqual([knotsA, knotsB]);
        expectDrawn(graph, knotsA);
        watch.stop();
        mounted.view.unmount();
    });

    test('the marker follows the state on the replaced knots', () => {
        const {graph, mounted, nurbs} = mountWith(dataB);
        act(() => nurbs.setT(U));
        const marker = (sceneOf(graph) as unknown as BSplineNurbsScene).markerElement()!;
        near([marker.X(), marker.Y()], rationalPoint(2, knotsB, points, weights, U), 1e-9);
        mounted.view.unmount();
    });
});

// ---- De Boor, Insertion, Extraction: same-shape different knots (task 07, batch 1) -----------------------------------------

describe.each([deBoorSubject, insertionSubject, extractionSubject])('$name: ordinary same-shape commit versus replacement with different knots', subject => {
    const knotsA = [0, 0, 0, 1, 2, 3, 3, 3];
    const knotsB = [0, 0, 0, 1, 1.5, 3, 3, 3];
    const points: Pt[] = [[0, 0], [1, 2], [3, 3], [4, 1], [5, 3]];
    const ones = points.map(() => 1);
    const dataA = {degree: 2, knots: knotsA, points};
    const dataB = {...dataA, knots: knotsB};
    const U = 2.2;
    const mountWith = (data: typeof dataA) => {
        const graph = subject.make();
        const mounted = mountGraph(graph);
        act(() => internals(graph).importPresetData(data));
        return {graph, mounted};
    };
    const expectDrawn = (graph: GraphLike, knots: readonly number[]) => {
        expect(sceneOf(graph).curve.getCurve().getKnots()).toEqual(knots);
        const p = sceneOf(graph).curve.getCurve().eval(U);
        near([p.X(), p.Y()], rationalPoint(2, knots, points, ones, U), 1e-9);
    };

    test('an ordinary commit of a point or of equal-length knots keeps the scene and draws the new knots', () => {
        const {graph, mounted} = mountWith(dataA);
        const scene = sceneOf(graph);
        expectDrawn(graph, knotsA);
        const watch = watchReleases(subject);
        act(() => graph.setState({points: points.map((p, i) => i === 1 ? [1, 2.5] as Pt : p)} as never));
        expect(sceneOf(graph)).toBe(scene);
        act(() => graph.setState({knots: knotsB, points} as never));
        expect(sceneOf(graph)).toBe(scene);
        expect(watch.released).toHaveLength(0);
        expectDrawn(graph, knotsB);
        watch.stop();
        mounted.view.unmount();
    });

    test('a Preset import with equal degree and point count but different knots draws the new knots', () => {
        const {graph, mounted} = mountWith(dataA);
        act(() => internals(graph).importPresetData(dataB));
        expect(stateOf(graph).knots).toEqual(knotsB);
        expectDrawn(graph, knotsB);
        expectResponds(subject, graph);
        mounted.view.unmount();
    });

    test('a checkpoint restore with equal degree and point count but different knots shows the checkpoint knots', () => {
        const {graph, mounted} = mountWith(dataA);
        const capabilities = graph.getLessonCapabilities();
        const checkpoint = capabilities.captureState();
        act(() => internals(graph).importPresetData(dataB));
        expectDrawn(graph, knotsB);
        act(() => capabilities.restoreState(checkpoint));
        expectDrawn(graph, knotsA);
        mounted.view.unmount();
    });

    test('a figure entry-and-return draws the figure knots, then the entry knots', async () => {
        const {graph, mounted} = mountWith(dataA);
        const watch = watchReleases(subject);
        await settle(() => internals(graph).exportPresetFigures([{...graph.exportPreset(), id: 'figure', data: dataB as never}]));
        expect(watch.released.map(r => r.knots)).toEqual([knotsA, knotsB]);
        expectDrawn(graph, knotsA);
        watch.stop();
        mounted.view.unmount();
    });
});

// ---- Synchronous multi-action sequences with rebuilt-scene identity (all four) ---------------------------------------------

type SeqSubject = {name: string; make(): GraphLike; drawnKnots(graph: GraphLike): number[]; drawnPointCount(graph: GraphLike): number | undefined; responds(graph: GraphLike): void};
const basisSceneOf = (graph: GraphLike) => (graph as unknown as {scene?: BSplineBasisScene}).scene!;
const respondsBasis = (graph: GraphLike) => {
    const {knots} = stateOf(graph);
    const target = 0.4 * knots[2] + 0.6 * knots[4];
    dragTo(basisSceneOf(graph).markerElements()[3], target, basisSceneOf(graph).markerElements()[3].Y());
    expect(stateOf(graph).knots[3]).toBeCloseTo(target, 12);
    expect(basisSceneOf(graph).markerElements()[3].X()).toBeCloseTo(target, 12);
};
const curveSeq = (subject: Subject): SeqSubject => ({
    name: subject.name, make: subject.make,
    drawnKnots: graph => [...sceneOf(graph).curve.getCurve().getKnots()],
    drawnPointCount: graph => sceneOf(graph).curve.getJxgPoints().length,
    responds: graph => expectResponds(subject, graph),
});
const SEQUENCE_SUBJECTS: SeqSubject[] = [
    {name: 'Basis', make: () => new BSplineBasisGraph() as unknown as GraphLike,
        drawnKnots: graph => basisSceneOf(graph).markerElements().map(m => m.X()), drawnPointCount: () => undefined, responds: respondsBasis},
    curveSeq(deBoorSubject), curveSeq(insertionSubject), curveSeq(extractionSubject),
];

describe.each(SEQUENCE_SUBJECTS)('$name: same-tick scene sequences with rollback', subject => {
    const fixture = (points: Pt[], knots: number[]) => ({kind: 'prepared-scene', sceneId: 's', source: 'lesson-fixture', curve: {points, degree: 2, knots}}) as unknown as LessonAction;
    const five: Pt[] = [[0, 0], [1, 2], [3, 3], [4, 1], [5, 3]];
    const knotsA = [0, 0, 0, 1, 2, 3, 3, 3];
    const knotsB = [0, 0, 0, 1, 1.5, 3, 3, 3];

    test('later actions read the earlier writes in the same tick, each rebuilt scene is the live one, and rollback restores the checkpoint drawn', () => {
        const graph = subject.make();
        const mounted = mountGraph(graph);
        const capabilities = graph.getLessonCapabilities();
        const checkpoint = capabilities.captureState();
        const start = JSON.stringify(graph.state);
        const defaultKnots = [...stateOf(graph).knots];
        const scenes: unknown[] = [];
        const live = () => (graph as unknown as {scene?: unknown}).scene;
        act(() => {
            capabilities.apply(fixture(five, knotsA));
            scenes.push(live());
            expect(subject.drawnKnots(graph)).toEqual(knotsA);
            expect(subject.drawnPointCount(graph) ?? five.length).toBe(five.length);
            capabilities.apply(fixture(five, knotsB));
            expect(subject.drawnKnots(graph)).toEqual(knotsB);
            capabilities.apply(fixture([[0, 0], [1, 2], [3, 0]], [0, 0, 0, 1, 1, 1]));
            scenes.push(live());
            expect(scenes[1]).not.toBe(scenes[0]);
            expect(subject.drawnKnots(graph)).toEqual([0, 0, 0, 1, 1, 1]);
            expect(subject.drawnPointCount(graph) ?? 3).toBe(3);
            // Roll back in the same tick: state restored and the checkpoint drawn before the host commits.
            capabilities.restoreState(checkpoint);
            expect(JSON.stringify(graph.state)).toBe(start);
            expect(live()).not.toBe(scenes[1]);
            expect(subject.drawnKnots(graph)).toEqual(defaultKnots);
        });
        expect(JSON.stringify(graph.state)).toBe(start);
        expect(subject.drawnKnots(graph)).toEqual(defaultKnots);
        subject.responds(graph);
        mounted.view.unmount();
    });

    test('the same sequence without rollback draws the last fixture', () => {
        const graph = subject.make();
        const mounted = mountGraph(graph);
        const capabilities = graph.getLessonCapabilities();
        act(() => {
            capabilities.apply(fixture(five, knotsA));
            capabilities.apply(fixture(five, knotsB));
        });
        expect(subject.drawnKnots(graph)).toEqual(knotsB);
        expect(subject.drawnPointCount(graph) ?? five.length).toBe(five.length);
        subject.responds(graph);
        mounted.view.unmount();
    });
});

describe('Insertion and Extraction: graph actions in one tick read the earlier writes', () => {
    // An ordinary commit draws after the tick (the host commits then); only the state is read mid-tick.
    test('Insertion: two insertions read each other in one tick and are drawn after it; a rollback restores the checkpoint drawn', () => {
        const graph = insertionSubject.make();
        const mounted = mountGraph(graph);
        const capabilities = graph.getLessonCapabilities();
        const checkpoint = capabilities.captureState();
        const start = JSON.stringify(graph.state);
        const before = stateOf(graph).points.length;
        act(() => {
            capabilities.apply({kind: 'knot-insertion', operation: 'insert', value: 0.5});
            expect(stateOf(graph).points).toHaveLength(before + 1);
            capabilities.apply({kind: 'knot-insertion', operation: 'insert', value: 1.5});
            expect(stateOf(graph).points).toHaveLength(before + 2);
        });
        expect(sceneOf(graph).curve.getJxgPoints()).toHaveLength(before + 2);
        expect(sceneOf(graph).curve.getCurve().getKnots()).toEqual(stateOf(graph).knots);
        act(() => capabilities.restoreState(checkpoint));
        expect(JSON.stringify(graph.state)).toBe(start);
        expect(sceneOf(graph).curve.getJxgPoints()).toHaveLength(before);
        expectResponds(insertionSubject, graph);
        mounted.view.unmount();
    });

    test('Extraction: a point only the cubic example has is moved in the same tick and drawn after it; a rollback restores the checkpoint drawn', () => {
        const graph = extractionSubject.make();
        const mounted = mountGraph(graph);
        const capabilities = graph.getLessonCapabilities();
        const checkpoint = capabilities.captureState();
        const start = JSON.stringify(graph.state);
        act(() => {
            expect(() => capabilities.apply({kind: 'bezier-extraction', operation: 'move-point', index: 6, to: [6, 1]})).toThrow();
            capabilities.apply({kind: 'bezier-extraction', operation: 'set-example', exampleId: 'cubic'});
            capabilities.apply({kind: 'bezier-extraction', operation: 'move-point', index: 6, to: [6, 1]});
            expect(stateOf(graph).points[6]).toEqual([6, 1]);
        });
        const p = sceneOf(graph).curve.getJxgPoints()[6];
        near([p.X(), p.Y()], [6, 1]);
        act(() => capabilities.restoreState(checkpoint));
        expect(JSON.stringify(graph.state)).toBe(start);
        expect(sceneOf(graph).curve.getJxgPoints()).toHaveLength(stateOf(graph).points.length);
        expectResponds(extractionSubject, graph);
        mounted.view.unmount();
    });
});

// ---- De Boor: late playback work cannot touch a replaced scene ----------------------------------------------------------------

describe('De Boor: playback cannot reach a replaced scene', () => {
    test('a frame requested before a replacement or the unmount never runs afterwards', () => {
        const callbacks = new Map<number, FrameRequestCallback>();
        let handle = 0;
        const graph = new DeBoorGraph({request: cb => { callbacks.set(++handle, cb); return handle; }, cancel: id => { callbacks.delete(id); }});
        const asGraph = graph as unknown as GraphLike;
        const mounted = mountGraph(asGraph);
        const oldRings = [...(sceneOf(asGraph) as unknown as DeBoorScene).ringElements()];
        act(() => graph.play());
        expect(graph.playing).toBe(true);
        act(() => internals(asGraph).importPresetData(deBoorSubject.structural));
        expect(graph.playing).toBe(false);
        expect(callbacks.size).toBe(0);
        const replaced = sceneOf(asGraph) as unknown as DeBoorScene;
        expect(oldRings.some(ring => replaced.ringElements().includes(ring))).toBe(false);
        act(() => graph.play());
        mounted.view.unmount();
        expect(callbacks.size).toBe(0);
        expect(graph.playing).toBe(false);
    });
});

// ---- Basis: no curve layer, so its own helpers ----------------------------------------------------------------------------------

interface BasisReleased {scene: BSplineBasisScene; elements: JXG.GeometryElement[]; markers: JXG.Point[]; knots: number[]}

function watchBasis(): {released: BasisReleased[]; stop(): void} {
    const released: BasisReleased[] = [];
    const seen = new Set<BSplineBasisScene>();
    const original = BSplineBasisScene.prototype.dispose;
    const spy = vi.spyOn(BSplineBasisScene.prototype, 'dispose').mockImplementation(function (this: BSplineBasisScene) {
        if (!seen.has(this)) {
            seen.add(this);
            released.push({scene: this, elements: [...this.ownedElements()], markers: [...this.markerElements()], knots: this.markerElements().map(m => m.X())});
        }
        return original.call(this);
    });
    return {released, stop: () => spy.mockRestore()};
}

function expectBasisReleased(graph: GraphLike, released: BasisReleased[], boardGone = false) {
    const board = boardOf(graph);
    expect(new Set(released.map(r => r.scene)).size).toBe(released.length);
    for (const old of released) {
        if (!boardGone) expect(old.elements.some(element => board.objectsList.includes(element))).toBe(false);
        expect(basisSceneOf(graph)).not.toBe(old.scene);
    }
}

describe('Basis standalone scene lifecycle', () => {
    const structural = basisPresetData(2, [0, 0, 0, 1, 1, 1]);
    const sameShape = basisPresetData(2, [0, 0, 0, 1.5, 2, 2, 2]);
    let mounted: MountedGraph;
    let graph: GraphLike;
    beforeEach(() => { graph = new BSplineBasisGraph() as unknown as GraphLike; mounted = mountGraph(graph); });
    afterEach(() => { mounted.view.unmount(); });
    const importStructural = () => act(() => internals(graph).importPresetData(structural));
    const knotsDrawn = () => basisSceneOf(graph).markerElements().map(m => m.X());

    const entries: Record<string, (checkpoint: ReturnType<ReturnType<GraphLike['getLessonCapabilities']>['captureState']>) => Promise<void>> = {
        'reset': async () => { await settle(() => graph.reset()); },
        'Preset import': async () => { act(() => internals(graph).importPresetData(sameShape)); },
        'checkpoint restore': async checkpoint => { act(() => graph.getLessonCapabilities().restoreState(checkpoint)); },
        'figure entry-and-return': async () => {
            await settle(() => internals(graph).exportPresetFigures([{...graph.exportPreset(), id: 'figure', data: sameShape as never}]));
        },
    };

    test.each(Object.keys(entries))('after %s every old scene is released once, its board objects are gone, and the new scene responds', async entry => {
        const checkpoint = graph.getLessonCapabilities().captureState();
        const defaultKnots = [...stateOf(graph).knots];
        importStructural();
        const structuralScene = basisSceneOf(graph);
        const watch = watchBasis();
        await entries[entry](checkpoint);
        expect(watch.released.map(r => r.scene)).toContain(structuralScene);
        expect(watch.released.map(r => r.scene)).not.toContain(basisSceneOf(graph));
        expectBasisReleased(graph, watch.released);
        expect(stateOf(graph).knots).toEqual(entry === 'figure entry-and-return' ? structural.knots : entry === 'Preset import' ? sameShape.knots : defaultKnots);
        expect(knotsDrawn()).toEqual(stateOf(graph).knots);
        respondsBasis(graph);
        watch.stop();
    });

    test('a figure entry-and-return releases the entry scene and the figure scene', async () => {
        importStructural();
        const watch = watchBasis();
        await settle(() => internals(graph).exportPresetFigures([{...graph.exportPreset(), id: 'figure', data: sameShape as never}]));
        expect(watch.released).toHaveLength(2);
        expect(watch.released[0].markers).toHaveLength(structural.knots.length);
        expect(watch.released[1].markers).toHaveLength(sameShape.knots.length);
        expect(watch.released[1].knots).toEqual(sameShape.knots);
        expectBasisReleased(graph, watch.released);
        respondsBasis(graph);
        watch.stop();
    });

    test('a Preset import of the same shape keeps the scene and moves the markers', () => {
        const before = basisSceneOf(graph);
        const watch = watchBasis();
        act(() => internals(graph).importPresetData(sameShape));
        expect(basisSceneOf(graph)).toBe(before);
        expect(watch.released).toHaveLength(0);
        expect(knotsDrawn()).toEqual(sameShape.knots);
        respondsBasis(graph);
        watch.stop();
    });

    test('an ordinary commit keeps the scene; a checkpoint restore and a figure return show the checkpoint knots drawn', async () => {
        const scene = basisSceneOf(graph);
        const defaultKnots = [...stateOf(graph).knots];
        const checkpoint = graph.getLessonCapabilities().captureState();
        act(() => graph.setState({knots: sameShape.knots} as never));
        expect(basisSceneOf(graph)).toBe(scene);
        expect(knotsDrawn()).toEqual(sameShape.knots);
        act(() => graph.getLessonCapabilities().restoreState(checkpoint));
        expect(knotsDrawn()).toEqual(defaultKnots);
        await settle(() => internals(graph).exportPresetFigures([{...graph.exportPreset(), id: 'figure', data: sameShape as never}]));
        expect(knotsDrawn()).toEqual(defaultKnots);
    });

    test('remount releases the old scene once and builds the live one on the new board', () => {
        const oldBoard = boardOf(graph);
        const oldScene = basisSceneOf(graph);
        const oldElements = [...oldScene.ownedElements()];
        const watch = watchBasis();
        mounted.view.unmount();
        expect(watch.released.map(r => r.scene)).toEqual([oldScene]);
        expect(oldBoard.objectsList.some(object => oldElements.includes(object as JXG.GeometryElement))).toBe(false);
        mounted = mountGraph(graph);
        expect(boardOf(graph)).not.toBe(oldBoard);
        expect(watch.released).toHaveLength(1);
        const second = basisSceneOf(graph);
        mounted.view.unmount();
        mounted = mountGraph(graph);
        expect(watch.released.map(r => r.scene)).toContain(second);
        expectBasisReleased(graph, watch.released, true);
        respondsBasis(graph);
        watch.stop();
    });

    test('a construction failure releases what the half-built scene acquired and publishes no scene', () => {
        const checkpoint = graph.getLessonCapabilities().captureState();
        importStructural();
        const board = boardOf(graph);
        const created: unknown[] = [];
        const create = board.create.bind(board);
        let calls = 0;
        vi.spyOn(board, 'create').mockImplementation(((...args: Parameters<typeof create>) => {
            if (++calls === 4) throw new Error('board refused an element');
            const element = create(...args);
            created.push(element);
            return element;
        }) as typeof board.create);
        expect(() => act(() => graph.getLessonCapabilities().restoreState(checkpoint))).toThrow('board refused an element');
        expect(created.length).toBeGreaterThan(0);
        expect((graph as unknown as {scene?: unknown}).scene).toBeUndefined();
        expect(created.filter(element => board.objectsList.includes(element as JXG.GeometryElement))).toEqual([]);
    });

    test('after a replacement a released scene\'s marker drag is inert (it neither throws nor writes the state)', () => {
        importStructural();
        const old = [...basisSceneOf(graph).markerElements()];
        act(() => internals(graph).importPresetData(sameShape));
        act(() => { void graph.reset(); });
        const before = JSON.stringify(graph.state);
        const dragKnot = vi.spyOn(graph as unknown as BSplineBasisGraph, 'dragKnot');
        expect(() => dragTo(old[3], 0.5, old[3].Y())).not.toThrow();
        expect(dragKnot).not.toHaveBeenCalled();
        expect(JSON.stringify(graph.state)).toBe(before);
    });
});

describe('De Boor, Insertion, Extraction: a released scene\'s point drag after a figure return is inert', () => {
    test.each([deBoorSubject, insertionSubject, extractionSubject])('$name', async subject => {
        const graph = subject.make();
        const mounted = mountGraph(graph);
        const old = [...sceneOf(graph).curve.getJxgPoints()];
        await settle(() => internals(graph).exportPresetFigures([{...graph.exportPreset(), id: 'figure', data: subject.sameShape(exported(graph)) as never}]));
        const before = JSON.stringify(graph.state);
        expect(() => dragTo(old[1], 5, 7)).not.toThrow();
        expect(JSON.stringify(graph.state)).toBe(before);
        mounted.view.unmount();
    });
});
