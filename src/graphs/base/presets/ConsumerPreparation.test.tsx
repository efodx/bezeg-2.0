/**
 * Step 7, slice 2: the consumer's own limits (Blossom degree 2 or 3, the NURBS point limit) are checked on the plain data inside
 * `checkPersistedPreset`, so a collection-valid Preset the graph cannot show is refused before the selection, the view, the
 * scene state, disposal or drawing change. The live scene stays and stays draggable.
 */
import JXG from 'jsxgraph';
import {act} from '@testing-library/react';
import {afterEach, beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {BSplineBlossomGraph} from '../../curves/bspline/BSplineBlossomGraph';
import {BSplineNurbsGraph} from '../../curves/bspline/BSplineNurbsGraph';
import {DeBoorGraph} from '../../curves/bspline/DeBoorGraph';
import {HermiteGraph} from '../../curves/hermite/HermiteGraph';
import {appStorage} from '../../../storage/appStorage';
import {LocalizedError, type Message, renderMessage} from '../../../localization';
import {capturePNGBlob} from '../export/FigureCapture';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, settle} from '../realGraphTestHarness';
import type {Preset} from './Presets';

vi.mock('../export/FigureCapture', async () => ({
    ...await vi.importActual<typeof import('../export/FigureCapture')>('../export/FigureCapture'),
    capturePNGBlob: vi.fn(async () => new Blob(['png'])),
    waitForFigureCaptureReady: vi.fn(async () => undefined),
    downloadBlob: vi.fn(),
}));

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());
afterEach(() => vi.restoreAllMocks());

class Blossom extends BSplineBlossomGraph {
    liveBoard() { return this.board; }
    sceneOf() { return this['scene']!; }
    exportAll(presets: Preset[]) { return this['exportPresetFigures'](presets); }
}
class Nurbs extends BSplineNurbsGraph {
    liveBoard() { return this.board; }
    exportAll(presets: Preset[]) { return this['exportPresetFigures'](presets); }
}
class DeBoor extends DeBoorGraph {
    liveBoard() { return this.board; }
}
class Hermite extends HermiteGraph {
    liveBoard() { return this.board; }
}
type Consumer = Blossom | Nurbs | DeBoor | Hermite;

const bspline = (degree: number, points: number[][]) => {
    const inner = Array.from({length: points.length - degree - 1}, (_, index) => index + 1);
    const last = inner.length + 1;
    return {degree, points, knots: [...Array(degree + 1).fill(0), ...inner, ...Array(degree + 1).fill(last)]};
};
const VIEW: [number, number, number, number] = [-1, 1, 1, -1];
const degreeOne = (): Preset => ({id: 'bad', data: bspline(1, [[0, 0], [1, 1]]), boardState: {boundingBox: VIEW}, graphState: {initialized: true}});
const overLimit = (): Preset => ({id: 'bad', data: bspline(2, Array.from({length: 17}, (_, i) => [i, i % 3])), boardState: {boundingBox: VIEW}});
// 13 points: over DEBOOR_MAX_POINTS (12), still a valid shared B-spline collection entry.
const deBoorOverLimit = (): Preset => ({id: 'bad', data: bspline(2, Array.from({length: 13}, (_, i) => [i, i % 3])), boardState: {boundingBox: VIEW}});
// 13 points: over INTERPOLATION_POINTS_MAX (12). The Hermite collection runs the same hermiteRejection, so the collection refuses it first.
const hermiteOverLimit = (): Preset => ({id: 'bad', data: {
    points: Array.from({length: 13}, (_, i) => [i, i % 3]), mode: 'hermite', tangents: Array.from({length: 13}, () => [1, 0]),
    parameterRule: 'uniform', tension: 1, showTangents: true, showBezier: false,
}, boardState: {boundingBox: VIEW}});

/** Everything a persisted entry must not touch before it is accepted. */
function watch(graph: Consumer) {
    const probe = graph as unknown as {
        importPresetData(data: unknown): void; setBaseState(patch: object): void; disposeFigureScene(): void; setState(patch: object): void;
    };
    return {
        imported: vi.spyOn(probe, 'importPresetData'),
        baseState: vi.spyOn(probe, 'setBaseState'),
        disposed: vi.spyOn(probe, 'disposeFigureScene'),
        setState: vi.spyOn(probe, 'setState'),
        bounds: vi.spyOn(graph.liveBoard(), 'setBoundingBox'),
        objects: graph.liveBoard().objectsList.length,
    };
}
const untouched = (seen: ReturnType<typeof watch>, graph: Consumer) => {
    expect(seen.imported).not.toHaveBeenCalled();
    expect(seen.baseState).not.toHaveBeenCalled();
    expect(seen.setState).not.toHaveBeenCalled();
    expect(seen.disposed).not.toHaveBeenCalled();
    expect(seen.bounds).not.toHaveBeenCalled();
    expect(graph.liveBoard().objectsList.length).toBe(seen.objects);
};
const expectNotice = (graph: Consumer) => {
    const notice = (graph as unknown as {presetNoticeValue?: Message}).presetNoticeValue;
    expect(notice).toBeDefined();
    expect(renderMessage(notice!)).toMatch(/bad/);
};
const store = (graph: Consumer, presets: Preset[]) => appStorage.setItem(`preset-${graph.presets()}`, JSON.stringify({data: presets}));

describe('consumer preparation refuses before any mutation', () => {
    test('blossom: importPreset of a degree-1 curve throws and changes nothing', () => {
        const graph = new Blossom();
        const view = mountGraph(graph).view;
        const seen = watch(graph);
        expect(() => graph.importPreset(degreeOne())).toThrow(LocalizedError);
        untouched(seen, graph);
        view.unmount();
    });

    test('nurbs: importPreset of 17 points throws and changes nothing', () => {
        const graph = new Nurbs();
        const view = mountGraph(graph).view;
        const seen = watch(graph);
        expect(() => graph.importPreset(overLimit())).toThrow(LocalizedError);
        untouched(seen, graph);
        view.unmount();
    });

    test('deboor: importPreset of 13 points (limit 12) throws and changes nothing', () => {
        const graph = new DeBoor();
        const view = mountGraph(graph).view;
        const seen = watch(graph);
        expect(() => graph.importPreset(deBoorOverLimit())).toThrow(LocalizedError);
        untouched(seen, graph);
        view.unmount();
    });

    test('hermite: importPreset of 13 points (limit 12) throws and changes nothing', () => {
        const graph = new Hermite();
        const view = mountGraph(graph).view;
        const seen = watch(graph);
        expect(() => graph.importPreset(hermiteOverLimit())).toThrow(LocalizedError);
        untouched(seen, graph);
        view.unmount();
    });

    test('blossom: selecting a stored degree-1 Preset keeps the selection, the scene and the view, and says why; dragging still works', async () => {
        const graph = new Blossom();
        store(graph, [degreeOne()]);
        const view = mountGraph(graph).view;
        const scene = graph.sceneOf();
        const seen = watch(graph);
        const box = [...graph.liveBoard().getBoundingBox()];
        await settle(() => graph.selectPreset('bad'));
        expect(graph.selectedPresetId).toBe('');
        untouched(seen, graph);
        expect(graph.liveBoard().getBoundingBox()).toEqual(box);
        expect(graph.sceneOf()).toBe(scene);
        expectNotice(graph);
        // The live scene is still the same draggable scene.
        const moved = graph.sceneOf().curve.getJxgPoints()[1];
        const before = graph.state.points[1];
        act(() => {
            moved.setPosition(JXG.COORDS_BY_USER, [before[0] + 0.5, before[1] + 0.25]);
            (moved as unknown as {triggerEventHandlers(names: string[], args: unknown[]): void}).triggerEventHandlers(['drag'], []);
        });
        expect(graph.state.points[1]).not.toEqual(before);
        view.unmount();
    });

    test('blossom: mounting with a refused selection shows the default scene and the notice', () => {
        const graph = new Blossom();
        store(graph, [degreeOne()]);
        void graph.selectPreset('bad');
        const view = mountGraph(graph).view;
        expect(graph.selectedPresetId).toBe('');
        expect(graph.state.degree).toBe(new Blossom().defaultPreset().degree);
        expectNotice(graph);
        view.unmount();
    });

    test('a figure batch with an unsupported later entry is refused before any scene changes', async () => {
        const graph = new Blossom();
        const view = mountGraph(graph).view;
        const good: Preset = {id: 'good', data: bspline(3, [[0, 0], [1, 2], [2, 0], [3, 2], [4, 0]])};
        const seen = watch(graph);
        const snapshot = JSON.stringify(graph.state);
        await settle(() => graph.exportAll([good, degreeOne()]));
        untouched(seen, graph);
        expect(capturePNGBlob).not.toHaveBeenCalled();
        expect(JSON.stringify(graph.state)).toBe(snapshot);
        expectNotice(graph);
        view.unmount();
    });
});

describe('other entry rules of the same preparation', () => {
    test('a graph without a collection still checks the view and the scene state before applying', () => {
        const graph = new Blossom();
        // A graph that stores no Presets: its collection is absent (the declared type of the hook allows it).
        vi.spyOn(graph, 'presetCollection').mockReturnValue(undefined as never);
        const view = mountGraph(graph).view;
        const seen = watch(graph);
        expect(() => graph.importPreset({id: 'p', boardState: {boundingBox: [1, 1, 1, 1]}})).toThrow(LocalizedError);
        expect(() => graph.importPreset({id: 'p', graphState: {initialized: true, overlays: {a: 1}} as never})).toThrow(LocalizedError);
        untouched(seen, graph);
        view.unmount();
    });

    test('selecting on an unreadable collection shows the collection problem, not a silent default', async () => {
        const graph = new Blossom();
        const view = mountGraph(graph).view;
        appStorage.setItem(`preset-${graph.presets()}`, JSON.stringify({data: 'not a list'}));
        await settle(() => graph.selectPreset('bad'));
        expect((graph as unknown as {presetNoticeValue?: Message}).presetNoticeValue).toBeDefined();
        view.unmount();
    });
});
