/**
 * Graph-specific transient state on real graphs. The contract every Demonstration meets is in
 * `graphTransientStateContract.tsx`, run by the `GraphTransientState.part*.test.tsx` files.
 */
import {act} from '@testing-library/react';
import {graphFactories} from '../graphFactories';
import BaseGraph, {BaseGraphState} from './BaseGraph';
import {appStorage} from '../../storage/appStorage';
import {capturePNGBlob} from './export/FigureCapture';
import type {Mock} from 'vitest';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, settle} from './realGraphTestHarness';
import {applyActions, internals} from './realGraphScenes';
import type {Preset} from './presets/Presets';

vi.mock('./export/FigureCapture', async () => ({
    ...await vi.importActual<typeof import('./export/FigureCapture')>('./export/FigureCapture'),
    capturePNGBlob: vi.fn(async () => new Blob(['png'])),
    waitForFigureCaptureReady: vi.fn(async () => undefined),
    downloadBlob: vi.fn(),
}));

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());
afterEach(() => vi.restoreAllMocks());

/** Graph-specific Preset contents a figure batch and a checkpoint must reproduce exactly. */
describe('scenes saved with graph-specific state', () => {
    type Playback = BaseGraph<BaseGraphState> & {
        state: {t: number; animationStatus: string};
        playAnimation(): void;
        getFirstJxgCurve(): {getDecasteljauT(): number};
        lessonAnimation?: {isRunning(): boolean};
        animation?: {isRunning(): boolean};
    };
    const driverRunning = (graph: Playback) => (graph.lessonAnimation ?? graph.animation)!.isRunning();

    test.each(['decasteljau', 'decasteljau-alternative'] as const)('%s: a Preset saved during playback is shown paused at its parameter', async id => {
        const mounted = mountGraph(graphFactories[id]());
        const graph = mounted.graph as Playback;
        const stored: Preset = {...graph.exportPreset(), id: 'playing',
            graphState: {...graph.exportPreset().graphState!, t: 0.3, animationStatus: 'playing'} as BaseGraphState};
        const shown: Array<{t: number; drawn: number; status: string; running: boolean}> = [];
        (capturePNGBlob as Mock).mockImplementation(async () => {
            shown.push({t: graph.state.t, drawn: graph.getFirstJxgCurve().getDecasteljauT(), status: graph.state.animationStatus,
                running: driverRunning(graph)});
            return new Blob(['png']);
        });
        await settle(() => internals(graph).exportPresetFigures([stored]));
        expect(shown).toEqual([{t: 0.3, drawn: 0.3, status: 'paused', running: false}]);
        expect(graph.state).toMatchObject({t: 0.5, animationStatus: 'ready'});
        mounted.view.unmount();
    });

    test.each(['decasteljau', 'decasteljau-alternative'] as const)('%s: a checkpoint captured during playback restores paused, with no driver running', id => {
        const mounted = mountGraph(graphFactories[id]());
        const graph = mounted.graph as Playback;
        const capabilities = graph.getLessonCapabilities();
        act(() => graph.playAnimation());
        expect(graph.state.animationStatus).toBe('playing');
        // A lesson stops graph animations before it captures; the alternative graph keeps its frame and status.
        act(() => capabilities.stopAnimations?.());
        const checkpoint = capabilities.captureState();
        act(() => capabilities.restoreState(checkpoint));
        expect(graph.state.animationStatus).not.toBe('playing');
        expect(driverRunning(graph)).toBe(false);
        expect(graph.getFirstJxgCurve().getDecasteljauT()).toBe(graph.state.t);
        mounted.view.unmount();
    });

    test('farin: a Preset saved in standard form is shown with its stored weights, the entry keeps its effective weights', async () => {
        type Rational = BaseGraph<BaseGraphState> & {getFirstJxgCurve(): {inStandardForm(): boolean; getCurve(): {getEffectiveWeights(): number[]}}};
        const source = mountGraph(graphFactories.farin());
        act(() => applyActions(source.graph, [{kind: 'rational-weights', weights: [1, 2, 3, 4]}, {kind: 'standard-form', enabled: true}]));
        const stored = {...source.graph.exportPreset(), id: 'standard'};
        source.view.unmount();
        const storedWeights = (stored.data as Array<[string, {weights: number[]}]>)[0][1].weights;
        expect(storedWeights).not.toEqual([1, 2, 3, 4]);

        const mounted = mountGraph(graphFactories.farin());
        const graph = mounted.graph as Rational;
        act(() => applyActions(graph, [{kind: 'rational-weights', weights: [2, 1, 1, 3]}, {kind: 'standard-form', enabled: true}]));
        const shown: Array<{standardForm: boolean; weights: number[]}> = [];
        (capturePNGBlob as Mock).mockImplementation(async () => {
            const curve = graph.getFirstJxgCurve();
            shown.push({standardForm: curve.inStandardForm(), weights: curve.getCurve().getEffectiveWeights().slice()});
            return new Blob(['png']);
        });
        await settle(() => internals(graph).exportPresetFigures([stored]));
        expect(shown).toEqual([{standardForm: false, weights: storedWeights}]);
        expect(graph.getFirstJxgCurve().inStandardForm()).toBe(true);
        expect(graph.getFirstJxgCurve().getCurve().getEffectiveWeights()).toEqual([2, 1, 1, 3]);
        mounted.view.unmount();
    });

    test('repeated-subdivision: a Preset with several pieces is shown with them and counts their steps', async () => {
        type Pieces = BaseGraph<BaseGraphState> & {jxgCurves: unknown[]; stepsDone: number};
        const source = mountGraph(graphFactories['repeated-subdivision']());
        act(() => applyActions(source.graph, [{kind: 'subdivide'}, {kind: 'subdivide'}]));
        const stored = {...source.graph.exportPreset(), id: 'pieces'};
        source.view.unmount();

        const mounted = mountGraph(graphFactories['repeated-subdivision']());
        const graph = mounted.graph as Pieces;
        act(() => applyActions(graph, [{kind: 'subdivide'}]));
        const shown: Array<{pieces: number; steps: number}> = [];
        (capturePNGBlob as Mock).mockImplementation(async () => {
            shown.push({pieces: graph.jxgCurves.length, steps: graph.stepsDone});
            return new Blob(['png']);
        });
        await settle(() => internals(graph).exportPresetFigures([stored]));
        expect(shown).toEqual([{pieces: 4, steps: 2}]);
        expect({pieces: graph.jxgCurves.length, steps: graph.stepsDone}).toEqual({pieces: 2, steps: 1});
        mounted.view.unmount();
    });

    test('JSXGraph pointer-sketch curves survive batch scene replacement and leave with their board', async () => {
        const mounted = mountGraph(graphFactories.bezier());
        const graph = mounted.graph;
        const board = internals(graph).board;
        const sketches = board.sketches.filter((sketch): sketch is JXG.GeometryElement => sketch !== null);
        expect(sketches).toHaveLength(2);
        for (const sketch of sketches) expect(board.objects[sketch.id]).toBe(sketch);

        await settle(() => internals(graph).exportPresetFigures([{...graph.exportPreset(), id: 'sketch-board'}]));

        for (const sketch of sketches) expect(board.objects[sketch.id]).toBe(sketch);
        mounted.view.unmount();
        for (const sketch of sketches) expect(board.objects[sketch.id]).toBeUndefined();
    });
});
