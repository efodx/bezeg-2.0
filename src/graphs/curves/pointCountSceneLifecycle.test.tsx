/**
 * Lifecycle of the point-count owned scenes (Interpolation, Hermite, Subdivision curves) through the real host: which scenes
 * Preset import, checkpoint restore, figure entry-and-return and remount release; that an ordinary commit and a same-count
 * import keep the scene (and show the changed inputs); that the new scene responds, a released scene's drag handler is inert,
 * a construction failure leaves nothing behind, and late playback work cannot touch a replaced scene.
 */
import {act} from '@testing-library/react';
import {afterEach, beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import JXG from 'jsxgraph';
import BaseGraph, {BaseGraphState} from '../base/BaseGraph';
import {appStorage} from '../../storage/appStorage';
import {installBoardShims, mountGraph, type MountedGraph, REAL_GRAPH_TEST_TIMEOUT, settle} from '../base/realGraphTestHarness';
import {internals} from '../base/realGraphScenes';
import {setLanguage} from '../../localization';
import type {AnimationScheduler} from '../../learning/runtime/animation';
import {InterpolationGraph} from './interpolation/InterpolationGraph';
import {InterpolationScene} from './interpolation/InterpolationScene';
import {HermiteGraph} from './hermite/HermiteGraph';
import {HermiteScene} from './hermite/HermiteScene';
import SubdivisionCurveGraph from './subdivisionCurves/SubdivisionCurveGraph';
import {SubdivisionScene} from './subdivisionCurves/SubdivisionScene';

vi.mock('../base/export/FigureCapture', async () => ({
    ...await vi.importActual<typeof import('../base/export/FigureCapture')>('../base/export/FigureCapture'),
    capturePNGBlob: vi.fn(async () => new Blob(['png'])),
    waitForFigureCaptureReady: vi.fn(async () => undefined),
    downloadBlob: vi.fn(),
}));

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => { appStorage.clear(); });
afterEach(() => { vi.restoreAllMocks(); setLanguage('sl'); });

type GraphLike = BaseGraph<BaseGraphState>;
type Pt = readonly [number, number];
type SceneLike = {pointElements(): readonly JXG.Point[]; ownedElements(): readonly JXG.GeometryElement[]; pointCount: number; dispose(): void};
type Fire = {triggerEventHandlers(names: string[], args: unknown[]): void};
type Data = {points: Pt[]; tangents?: Pt[]; mode?: string; parameterRule?: string; rule?: string; closed?: boolean; round?: number; showHull?: boolean};

class ManualScheduler implements AnimationScheduler {
    private next = 1;
    private time = 0;
    readonly pending = new Map<number, FrameRequestCallback>();
    request(callback: FrameRequestCallback) { const h = this.next++; this.pending.set(h, callback); return h; }
    cancel(handle: number) { this.pending.delete(handle); }
    tick(dt: number): boolean {
        const [handle, callback] = [...this.pending][0] ?? [];
        if (handle === undefined || !callback) return false;
        this.pending.delete(handle);
        this.time += dt;
        act(() => callback(this.time));
        return true;
    }
}

const stateOf = (graph: GraphLike) => graph.state as unknown as {points: readonly Pt[]; round?: number};
const sceneOf = (graph: GraphLike) => (graph as unknown as {scene?: SceneLike}).scene!;
const boardOf = (graph: GraphLike) => internals(graph).board;
const exported = (graph: GraphLike) => internals(graph).exportPresetData() as Data;
const dragTo = (point: JXG.Point, x: number, y: number) => {
    act(() => {
        point.setPosition(JXG.COORDS_BY_USER, [x, y]);
        (point as unknown as Fire).triggerEventHandlers(['drag'], []);
    });
};
const moved = (points: readonly Pt[]) => points.map(p => [p[0] * 0.5, p[1] * 0.5 + 0.1] as Pt);

interface Subject {
    name: string;
    make(scheduler: ManualScheduler): GraphLike;
    Scene: {prototype: SceneLike};
    /** Another point count than the default scene. */
    structural(defaults: Data): Data;
    /** The default point count with other creation-time inputs (mode, rule, closed) and moved points. */
    sameShape(defaults: Data): Data;
    /** Extra check that the drawn scene shows the inputs of `data`. */
    drawnInputs?(graph: GraphLike, data: Data): void;
}

const interpolation: Subject = {
    name: 'Interpolation',
    make: () => new InterpolationGraph() as unknown as GraphLike,
    Scene: InterpolationScene as unknown as Subject['Scene'],
    structural: d => ({...d, points: d.points.slice(0, 3)}),
    sameShape: d => ({...d, points: moved(d.points), parameterRule: d.parameterRule === 'chord' ? 'uniform' : 'chord', showHull: !d.showHull}),
};

const hermite: Subject = {
    name: 'Hermite',
    make: () => new HermiteGraph() as unknown as GraphLike,
    Scene: HermiteScene as unknown as Subject['Scene'],
    structural: d => ({...d, points: d.points.slice(0, 3), tangents: d.tangents!.slice(0, 3)}),
    sameShape: d => ({...d, points: moved(d.points), mode: d.mode === 'hermite' ? 'catmull-rom' : 'hermite'}),
    drawnInputs: (graph, data) => {
        // Tip handles are draggable only in Hermite mode.
        for (const tip of (sceneOf(graph) as unknown as HermiteScene).tipElements()) {
            expect(tip.getAttribute('fixed')).toBe(data.mode === 'catmull-rom');
        }
    },
};

const subdivision: Subject = {
    name: 'Subdivision',
    make: scheduler => new SubdivisionCurveGraph(scheduler) as unknown as GraphLike,
    Scene: SubdivisionScene as unknown as Subject['Scene'],
    structural: d => ({...d, points: d.points.slice(0, 3)}),
    sameShape: d => ({...d, points: moved(d.points), closed: !d.closed, rule: d.rule === 'four-point' ? 'chaikin' : 'four-point', round: 2}),
};

const SUBJECTS = [interpolation, hermite, subdivision];

interface Released {scene: SceneLike; points: JXG.Point[]; elements: JXG.GeometryElement[]}

/** Records every scene at its first disposal (with the elements it owned), without changing disposal. */
function watchReleases(subject: Subject): {released: Released[]; stop(): void} {
    const released: Released[] = [];
    const seen = new Set<SceneLike>();
    const original = subject.Scene.prototype.dispose;
    const spy = vi.spyOn(subject.Scene.prototype, 'dispose').mockImplementation(function (this: SceneLike) {
        if (!seen.has(this)) {
            seen.add(this);
            released.push({scene: this, points: [...this.pointElements()], elements: [...this.ownedElements()]});
        }
        return original.call(this);
    });
    return {released, stop: () => spy.mockRestore()};
}

function expectReleased(graph: GraphLike, released: Released[], boardGone = false) {
    const board = boardOf(graph);
    expect(new Set(released.map(r => r.scene)).size).toBe(released.length);
    for (const old of released) {
        if (!boardGone) {
            expect(old.points.some(point => board.objectsList.includes(point))).toBe(false);
            expect(old.elements.some(element => board.objectsList.includes(element))).toBe(false);
        }
        expect(sceneOf(graph)).not.toBe(old.scene);
    }
}

/** The data points (P0, P1, ...) on the board: a scene that was not released would leave its own behind. */
const labelledPoints = (graph: GraphLike) => boardOf(graph).objectsList.filter(element => /^P\d+$/.test((element as JXG.GeometryElement).name)).length;

/** The live scene answers a drag: the state follows, and the drawn data points sit on the state's points. */
function expectResponds(graph: GraphLike) {
    const points = sceneOf(graph).pointElements();
    dragTo(points[1], 0.37, 0.61);
    expect(stateOf(graph).points[1]).toEqual([0.37, 0.61]);
    expect(points).toHaveLength(stateOf(graph).points.length);
    points.forEach((point, i) => {
        expect(point.X()).toBeCloseTo(stateOf(graph).points[i][0], 9);
        expect(point.Y()).toBeCloseTo(stateOf(graph).points[i][1], 9);
    });
}

describe.each(SUBJECTS)('$name owned scene lifecycle', subject => {
    let mounted: MountedGraph;
    let graph: GraphLike;
    let defaultData: Data;
    let defaultPreset: ReturnType<GraphLike['exportPreset']>;
    beforeEach(() => {
        graph = subject.make(new ManualScheduler());
        mounted = mountGraph(graph);
        defaultData = exported(graph);
        defaultPreset = graph.exportPreset();
    });
    afterEach(() => { mounted.view.unmount(); });

    const importStructural = () => act(() => internals(graph).importPresetData(subject.structural(defaultData)));
    const figureOf = (data: Data) => [{...defaultPreset, id: 'figure', data: data as never}];

    const entries: Record<string, (checkpoint: ReturnType<ReturnType<GraphLike['getLessonCapabilities']>['captureState']>) => Promise<void>> = {
        'reset': async () => { await settle(() => graph.reset()); },
        'Preset import': async () => { act(() => internals(graph).importPresetData(defaultData)); },
        'checkpoint restore': async checkpoint => { act(() => graph.getLessonCapabilities().restoreState(checkpoint)); },
        'figure entry-and-return': async () => { await settle(() => internals(graph).exportPresetFigures(figureOf(defaultData))); },
    };

    test.each(Object.keys(entries))('after %s every old scene is released once, its board objects are gone, and the new scene responds', async entry => {
        const checkpoint = graph.getLessonCapabilities().captureState();
        const defaultCount = defaultData.points.length;
        importStructural();
        const structuralScene = sceneOf(graph);
        const watch = watchReleases(subject);
        await entries[entry](checkpoint);
        expect(watch.released.map(r => r.scene)).toContain(structuralScene);
        expect(watch.released.map(r => r.scene)).not.toContain(sceneOf(graph));
        expectReleased(graph, watch.released);
        // The figure batch returns to the entry scene (the structural one); every other entry ends on the default count.
        expect(stateOf(graph).points).toHaveLength(entry === 'figure entry-and-return' ? 3 : defaultCount);
        expect(sceneOf(graph).pointCount).toBe(stateOf(graph).points.length);
        expectResponds(graph);
        watch.stop();
    });

    test('a figure entry-and-return releases the entry scene and the figure scene, once each', async () => {
        importStructural();
        const watch = watchReleases(subject);
        await settle(() => internals(graph).exportPresetFigures(figureOf(defaultData)));
        // The entry scene has 3 points; the figure (default data, graphState from the default preset) has more.
        expect(defaultData.points.length).toBeGreaterThan(3);
        expect(watch.released).toHaveLength(2);
        expect(watch.released[0].points).toHaveLength(3);
        expect(watch.released[1].points).toHaveLength(defaultData.points.length);
        expect(stateOf(graph).points).toHaveLength(3);
        expect(sceneOf(graph).pointCount).toBe(3);
        expectReleased(graph, watch.released);
        expectResponds(graph);
        watch.stop();
    });

    test('an ordinary commit keeps the scene and moves its points', () => {
        const before = sceneOf(graph);
        const watch = watchReleases(subject);
        act(() => { (graph as unknown as {movePoint(i: number, x: number, y: number): unknown}).movePoint(0, 0.25, 0.5); });
        expect(sceneOf(graph)).toBe(before);
        expect(watch.released).toHaveLength(0);
        expect([before.pointElements()[0].X(), before.pointElements()[0].Y()]).toEqual([0.25, 0.5]);
        watch.stop();
    });

    test('a Preset import of the same count with other inputs keeps the scene and draws them', () => {
        const before = sceneOf(graph);
        const watch = watchReleases(subject);
        const data = subject.sameShape(defaultData);
        act(() => internals(graph).importPresetData(data));
        expect(sceneOf(graph)).toBe(before);
        expect(watch.released).toHaveLength(0);
        before.pointElements().forEach((point, i) => expect([point.X(), point.Y()]).toEqual(data.points[i]));
        subject.drawnInputs?.(graph, data);
        expectResponds(graph);
        watch.stop();
    });

    test('a checkpoint restore of the same count draws the checkpoint without stacking elements', () => {
        const checkpoint = graph.getLessonCapabilities().captureState();
        act(() => internals(graph).importPresetData(subject.sameShape(defaultData)));
        act(() => graph.getLessonCapabilities().restoreState(checkpoint));
        expect(labelledPoints(graph)).toBe(defaultData.points.length);
        sceneOf(graph).pointElements().forEach((point, i) => expect([point.X(), point.Y()]).toEqual(defaultData.points[i]));
        subject.drawnInputs?.(graph, defaultData);
        expectResponds(graph);
    });

    test('a figure return after a same-count figure draws the entry state without stacking elements', async () => {
        const entry = exported(graph);
        await settle(() => internals(graph).exportPresetFigures(figureOf(subject.sameShape(defaultData))));
        expect(labelledPoints(graph)).toBe(entry.points.length);
        expect(sceneOf(graph).pointCount).toBe(stateOf(graph).points.length);
        sceneOf(graph).pointElements().forEach((point, i) => expect([point.X(), point.Y()]).toEqual(entry.points[i]));
        subject.drawnInputs?.(graph, entry);
        expectResponds(graph);
    });

    test('remount releases the old scene once and builds the live one on the new board', () => {
        const oldBoard = boardOf(graph);
        const oldScene = sceneOf(graph);
        const oldPoints = [...oldScene.pointElements()];
        const watch = watchReleases(subject);
        mounted.view.unmount();
        expect(watch.released.map(r => r.scene)).toEqual([oldScene]);
        expect(oldBoard.objectsList.some(object => oldPoints.includes(object as JXG.Point))).toBe(false);
        mounted = mountGraph(graph);
        expect(boardOf(graph)).not.toBe(oldBoard);
        expect(watch.released).toHaveLength(1);
        expectReleased(graph, watch.released, true);
        const second = sceneOf(graph);
        mounted.view.unmount();
        mounted = mountGraph(graph);
        expect(watch.released.map(r => r.scene)).toContain(second);
        expect(watch.released).toHaveLength(2);
        expectReleased(graph, watch.released, true);
        expectResponds(graph);
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

    test('after a replacement a released scene\'s drag handler is inert (it neither throws nor writes the state)', () => {
        importStructural();
        const old = [...sceneOf(graph).pointElements()];
        act(() => internals(graph).importPresetData(defaultData));
        const before = JSON.stringify(graph.state);
        expect(() => dragTo(old[1], 5, 7)).not.toThrow();
        expect(JSON.stringify(graph.state)).toBe(before);
    });
});

describe('Subdivision playback and a replaced scene', () => {
    let mounted: MountedGraph;
    let graph: SubdivisionCurveGraph;
    let scheduler: ManualScheduler;
    const asGraph = () => graph as unknown as GraphLike;
    const sceneNow = () => (graph as unknown as {scene?: SceneLike}).scene;
    beforeEach(() => {
        scheduler = new ManualScheduler();
        graph = new SubdivisionCurveGraph(scheduler);
        mounted = mountGraph(asGraph());
    });
    afterEach(() => { mounted.view.unmount(); });

    test.each([
        ['a count-changing import', () => act(() => internals(asGraph()).importPresetData({...exported(asGraph()), points: [[0, 0], [1, 2], [3, 0]]}))],
        ['a checkpoint restore', () => act(() => graph.getLessonCapabilities().restoreState(checkpoint!))],
        ['an unmount', () => mounted.view.unmount()],
    ])('late frames after %s change nothing and touch no released scene', (_name, replace) => {
        checkpoint = graph.getLessonCapabilities().captureState();
        act(() => { graph.addPoint(); });
        act(() => graph.play());
        expect(scheduler.tick(1)).toBe(true);
        const old = [...sceneNow()!.pointElements()];
        const watch = watchReleases(subdivision);
        replace();
        const round = graph.state.round;
        const live = sceneNow();
        while (scheduler.pending.size > 0) expect(() => scheduler.tick(800)).not.toThrow();
        expect(graph.state.round).toBe(round);
        expect(sceneNow()).toBe(live);
        expect(old.some(point => (live?.pointElements() ?? []).includes(point))).toBe(false);
        watch.stop();
    });
});

let checkpoint: ReturnType<ReturnType<GraphLike['getLessonCapabilities']>['captureState']> | undefined;
