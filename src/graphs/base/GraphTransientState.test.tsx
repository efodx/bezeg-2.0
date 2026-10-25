/**
 * Every Demonstration in `graphFactories`, mounted for real: a scene is changed, captured, changed again and restored
 * through each scene replacement path, and the Preset data, scene state, transient state, curve adapters, drawn board
 * and inspector controls are compared with what was captured. Each test first checks that its change was observable,
 * so no comparison passes because nothing changed.
 */
import {act} from '@testing-library/react';
import {graphFactories} from '../graphFactories';
import type {DemonstrationId} from '../../demonstrations';
import BaseGraph, {BaseGraphState} from './BaseGraph';
import type {LessonAction} from '../../learning/model';
import {appStorage} from '../../storage/appStorage';
import {capturePNGBlob} from './export/FigureCapture';
import type {Mock} from 'vitest';
import {
    controlsSignature,
    installBoardShims,
    mountGraph,
    settle,
    waitUntil,
} from './realGraphTestHarness';
import {
    applyActions,
    changeScene,
    flipSwitches,
    full,
    internals,
    mainScene,
    perturbModel,
    scene,
    sceneActions,
    type SceneView,
    stale,
} from './realGraphScenes';
import type {Preset} from './presets/Presets';

vi.mock('./export/FigureCapture', async () => ({
    ...await vi.importActual<typeof import('./export/FigureCapture')>('./export/FigureCapture'),
    capturePNGBlob: vi.fn(async () => new Blob(['png'])),
    waitForFigureCaptureReady: vi.fn(async () => undefined),
    downloadBlob: vi.fn(),
}));

beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());
afterEach(() => vi.restoreAllMocks());

const ids = Object.keys(graphFactories) as DemonstrationId[];

/**
 * Graphs whose synchronous changes (lesson actions and model edits, the only changes possible inside one tick) cannot
 * change their scene. Their rollback test still compares the restored scene; it just cannot show a change first.
 */
const NO_SYNCHRONOUS_SCENE_CHANGE = new Set<DemonstrationId>([]);
/** No browser-local Preset collection (`presets()` is undefined), so no stored Preset can be loaded or exported. */
const NO_PRESET_COLLECTION = new Set<DemonstrationId>(['circle']);
/** The scene is described by its scene state alone: the Preset has no Preset data. */
const NO_PRESET_DATA = new Set<DemonstrationId>(['bernstein']);


/**
 * The display settings are graph preferences that scene replacement keeps, and the lesson default scene keeps the
 * view of a curve graph; put them back for comparisons with a new graph.
 */
function resetDisplay(graph: BaseGraph<BaseGraphState>, reference: BaseGraph<BaseGraphState>): void {
    act(() => {
        internals(graph).board.setBoundingBox(internals(reference).board.getBoundingBox() as [number, number, number, number], true);
        graph.setElementSize(reference.displaySettings.getSize());
        graph.setAxisSelect(reference.displaySettings.getAxisSelect());
        graph.setPointLabelsVisible(reference.displaySettings.pointLabelsVisible);
    });
}

/** Mounts a graph, changes its scene and returns it as a stored Preset with Preset data and scene state. */
function storedPreset(id: DemonstrationId, presetId: string): Preset {
    const source = mountGraph(graphFactories[id]());
    changeScene(source, 'a');
    const preset = {...source.graph.exportPreset(), id: presetId};
    source.view.unmount();
    if (!NO_PRESET_DATA.has(id)) expect(preset.data).toBeDefined();
    expect(preset.graphState).toBeDefined();
    // A changed scene stored as a Preset passes the graph's own collection check, so loading it shows it, not the default.
    const stored = preset.data === undefined ? undefined : JSON.parse(JSON.stringify(preset.data));
    if (stored !== undefined && !NO_PRESET_COLLECTION.has(id)) expect(source.graph.presetCollection()?.check(stored)).toEqual({data: stored});
    return preset;
}

/** What loading `preset` through the Preset selector shows on a newly mounted graph. */
async function loadedPresetScene(create: () => BaseGraph<BaseGraphState>, preset: Preset): Promise<SceneView> {
    const reference = mountGraph(create());
    reference.graph.presetService!.savePreset(preset);
    await settle(() => reference.graph.selectPreset(preset.id));
    const loaded = scene(reference.graph);
    reference.view.unmount();
    return loaded;
}


const DEFAULT_SCENE: LessonAction = {kind: 'prepared-scene', sceneId: 'default', source: 'demonstration-default'};

describe.each(ids)('%s', id => {
    const create = () => graphFactories[id]();

    test('a lesson checkpoint restores the captured scene, transient state, board and controls', () => {
        const mounted = mountGraph(create());
        const {graph} = mounted;
        const capabilities = graph.getLessonCapabilities();
        changeScene(mounted, 'a');
        const captured = full(mounted);
        expect(captured.board.length).toBeGreaterThan(0);
        const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
        const checkpoint = capabilities.captureState();
        changeScene(mounted, 'b');
        expect(full(mounted)).not.toEqual(captured);

        act(() => capabilities.restoreState(checkpoint));
        const comparable = stale(id, 'checkpoint');
        expect(comparable(full(mounted))).toEqual(comparable(captured));
        expect(storageWrite).not.toHaveBeenCalled();
        storageWrite.mockRestore();

        // State that is restorable but not drawn (the polygon the Elevation overlay replaced, a curve's effective
        // weights behind its standard form) shows only after a later change. A twin graph reaches the captured scene
        // through the same changes; the same follow-up change must then look the same on both.
        const twin = mountGraph(create());
        changeScene(twin, 'a');
        expect(full(twin)).toEqual(captured);
        flipSwitches(mounted);
        flipSwitches(twin);
        act(() => {
            applyActions(graph, sceneActions(graph, 'b'));
            applyActions(twin.graph, sceneActions(twin.graph, 'b'));
        });
        expect(comparable(full(mounted))).toEqual(comparable(full(twin)));
        twin.view.unmount();
        mounted.view.unmount();
    });

    test('a rollback within one tick leaves the board drawn for the restored scene before the host commits', () => {
        const mounted = mountGraph(create());
        const {graph} = mounted;
        const capabilities = graph.getLessonCapabilities();
        changeScene(mounted, 'a');
        const captured = scene(graph);
        const checkpoint = capabilities.captureState();
        let changed: SceneView | undefined;
        let inTick: SceneView | undefined;
        act(() => {
            applyActions(graph, sceneActions(graph, 'b'));
            perturbModel(graph, 'b');
            changed = scene(graph);
            capabilities.restoreState(checkpoint);
            inTick = scene(graph);
        });
        if (NO_SYNCHRONOUS_SCENE_CHANGE.has(id)) expect(mainScene(changed!)).toEqual(mainScene(captured));
        else expect(mainScene(changed!)).not.toEqual(mainScene(captured));
        // A child board (the PH hodograph) is recreated by the inspector when the host commits; until then its view
        // waits in the declared transient state, which is compared.
        const comparable = stale(id, 'rollback');
        expect(comparable(mainScene(inTick!))).toEqual(comparable(mainScene(captured)));
        expect(comparable(scene(graph))).toEqual(comparable(captured));
        mounted.view.unmount();
    });

    test('the lesson default scene drops every earlier change', () => {
        const reference = mountGraph(create());
        act(() => reference.graph.getLessonCapabilities().apply(DEFAULT_SCENE));
        const expected = full(reference);
        expect(expected.board.length).toBeGreaterThan(0);

        const mounted = mountGraph(create());
        changeScene(mounted, 'a');
        resetDisplay(mounted.graph, reference.graph);
        expect(full(mounted)).not.toEqual(expected);
        let inTick: unknown;
        act(() => {
            mounted.graph.getLessonCapabilities().apply(DEFAULT_SCENE);
            inTick = scene(mounted.graph);
        });
        const {controls: _controls, ...expectedScene} = expected;
        const comparable = stale(id, 'default');
        expect(comparable(inTick)).toEqual(comparable(expectedScene));
        expect(comparable(full(mounted))).toEqual(comparable(expected));
        reference.view.unmount();
        mounted.view.unmount();
    });

    test('Preset replacement (reset to the default scene) matches a newly mounted graph', async () => {
        const reference = mountGraph(create());
        const expected = full(reference);

        const mounted = mountGraph(create());
        changeScene(mounted, 'a');
        resetDisplay(mounted.graph, reference.graph);
        expect(full(mounted)).not.toEqual(expected);
        await settle(() => mounted.graph.reset());
        const comparable = stale(id, 'reset');
        expect(comparable(full(mounted))).toEqual(comparable(expected));
        reference.view.unmount();
        mounted.view.unmount();
    });

    test('a figure batch shows each Preset as loading it would, and restores the entry scene', async () => {
        const reference = mountGraph(create());
        const freshScene = scene(reference.graph);
        const viewOnly: Preset = {id: 'figure', boardState: {boundingBox: internals(reference.graph).board.getBoundingBox() as [number, number, number, number]}};
        // A Preset with Preset data and scene state, from a changed scene.
        const stored = NO_PRESET_COLLECTION.has(id) ? undefined : storedPreset(id, 'stored');
        const storedScene = stored && await loadedPresetScene(create, stored);
        appStorage.clear();

        const mounted = mountGraph(create());
        const {graph} = mounted;
        changeScene(mounted, 'a');
        resetDisplay(graph, reference.graph);
        const captured = full(mounted);
        expect(mainScene(scene(graph))).not.toEqual(mainScene(freshScene));
        const shown: SceneView[] = [];
        (capturePNGBlob as Mock).mockImplementation(async () => {
            shown.push(scene(graph));
            return new Blob(['png']);
        });
        const comparable = stale(id, 'batch');
        const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
        await settle(() => internals(graph).exportPresetFigures(stored ? [viewOnly, stored] : [viewOnly]));
        expect(shown).toHaveLength(stored ? 2 : 1);
        expect(shown[0]).toEqual(freshScene);
        if (storedScene) {
            expect(mainScene(storedScene)).not.toEqual(mainScene(freshScene));
            expect(comparable(shown[1])).toEqual(comparable(storedScene));
        }
        expect(comparable(full(mounted))).toEqual(comparable(captured));
        expect(storageWrite).not.toHaveBeenCalled();
        reference.view.unmount();
        mounted.view.unmount();
    });

    test('a figure batch cancelled by unmounting settles without restoring into the disposed board', async () => {
        const mounted = mountGraph(create());
        const {graph} = mounted;
        changeScene(mounted, 'a');
        let capturing = false;
        (capturePNGBlob as Mock).mockImplementation(() => {
            capturing = true;
            return new Promise<Blob>(() => undefined);
        });
        let batch!: Promise<void>;
        act(() => { batch = internals(graph).exportPresetFigures([{id: 'figure'}]); });
        await waitUntil(() => capturing);
        const errors = vi.spyOn(console, 'error');
        mounted.view.unmount();
        let settled = false;
        void batch.then(() => { settled = true; });
        await waitUntil(() => settled);
        expect(errors).not.toHaveBeenCalled();
        expect(graph.getLessonCapabilities().isAvailable?.()).toBe(false);
    });

    test('a disposed graph rejects capture and default scenes, and ignores restore', () => {
        const mounted = mountGraph(create());
        const {graph} = mounted;
        const capabilities = graph.getLessonCapabilities();
        changeScene(mounted, 'a');
        const checkpoint = capabilities.captureState();
        mounted.view.unmount();
        const disposedState = graph.state;
        expect(() => capabilities.restoreState(checkpoint)).not.toThrow();
        expect(graph.state).toBe(disposedState);
        expect(() => capabilities.captureState()).toThrow('still preparing');
        expect(() => capabilities.apply(DEFAULT_SCENE)).toThrow('still preparing');

        // A graph that was never mounted behaves the same and writes no scene state.
        const unready = create();
        const unreadyCapabilities = unready.getLessonCapabilities();
        const unreadyState = unready.state;
        expect(unreadyCapabilities.isAvailable?.()).toBe(false);
        expect(() => unreadyCapabilities.restoreState(checkpoint)).not.toThrow();
        expect(unready.state).toBe(unreadyState);
        expect(() => unreadyCapabilities.captureState()).toThrow('still preparing');
    });

    test('Preset export and checkpoints keep transient state out of the Preset', () => {
        const mounted = mountGraph(create());
        const {graph} = mounted;
        changeScene(mounted, 'a');
        const preset = graph.exportPreset();
        expect(Object.keys(preset).sort()).toEqual(['boardState', 'data', 'graphState', 'id']);
        expect(Object.keys(preset.graphState ?? {}).sort()).toEqual(Object.keys(graph.state).sort());
        const declared = internals(graph).captureTransientState?.();
        if (declared && typeof declared === 'object') {
            for (const key of Object.keys(declared)) expect(preset.graphState).not.toHaveProperty(key);
        }
        expect(controlsSignature(mounted.view.container).length).toBeGreaterThan(0);
        mounted.view.unmount();
    });
});

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
});
