/**
 * Test support: the transient state contract, run by the `GraphTransientState.part*.test.tsx` files.
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
    createGraph,
    installBoardShims,
    mountGraph,
    REAL_GRAPH_TEST_TIMEOUT,
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
    viewOnlyPreset,
    scene,
    sceneActions,
    type SceneView,
} from './realGraphScenes';
import type {Preset} from './presets/Presets';
import TensorPatchGraph from '../patches/TensorPatchGraph';

vi.mock('./export/FigureCapture', async () => ({
    ...await vi.importActual<typeof import('./export/FigureCapture')>('./export/FigureCapture'),
    capturePNGBlob: vi.fn(async () => new Blob(['png'])),
    waitForFigureCaptureReady: vi.fn(async () => undefined),
    downloadBlob: vi.fn(),
}));

/** The number of part files; each mounts a share of the graphs, so CI can run them in parallel. */
export const TRANSIENT_STATE_PARTS = 4;

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
    // A graph without a board keeps no board display preferences; its camera is scene state that every replacement path
    // must restore, but the vertical-drag mode is a session preference that Preset replacement keeps.
    if (graph instanceof TensorPatchGraph && reference instanceof TensorPatchGraph) {
        act(() => graph.setZMode(reference.state.zMode));
        return;
    }
    if (!internals(graph).board) return;
    act(() => {
        internals(graph).board.setBoundingBox(internals(reference).board.getBoundingBox() as [number, number, number, number], true);
        graph.setElementSize(reference.displaySettings.getSize());
        graph.setAxisSelect(reference.displaySettings.getAxisSelect());
        graph.setPointLabelsVisible(reference.displaySettings.pointLabelsVisible);
    });
}

/** Mounts a graph, changes its scene and returns it as a stored Preset with Preset data and scene state. */
function storedPreset(id: DemonstrationId, presetId: string): Preset {
    const source = mountGraph(createGraph(id));
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

/** Runs the contract for every `TRANSIENT_STATE_PARTS`-th Demonstration from `part` (0-based); the part files cover the catalog. */
export function describeGraphTransientState(part: number): void {
    vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
    beforeAll(installBoardShims);
    beforeEach(() => appStorage.clear());
    afterEach(() => vi.restoreAllMocks());
    const ids = (Object.keys(graphFactories) as DemonstrationId[]).filter((_id, index) => index % TRANSIENT_STATE_PARTS === part);

    describe.each(ids)('%s', id => {
        const create = () => createGraph(id);

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
            expect(full(mounted)).toEqual(captured);
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
            expect(full(mounted)).toEqual(full(twin));
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
            expect(mainScene(inTick!)).toEqual(mainScene(captured));
            expect(scene(graph)).toEqual(captured);
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
            expect(inTick).toEqual(expectedScene);
            expect(full(mounted)).toEqual(expected);
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
            expect(full(mounted)).toEqual(expected);
            reference.view.unmount();
            mounted.view.unmount();
        });

        test('a figure batch shows each Preset as loading it would, and restores the entry scene', async () => {
            const reference = mountGraph(create());
            const freshScene = scene(reference.graph);
            const viewOnly = viewOnlyPreset(reference.graph);
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
            const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
            await settle(() => internals(graph).exportPresetFigures(stored ? [viewOnly, stored] : [viewOnly]));
            expect(shown).toHaveLength(stored ? 2 : 1);
            expect(shown[0]).toEqual(freshScene);
            if (storedScene) {
                expect(mainScene(storedScene)).not.toEqual(mainScene(freshScene));
                expect(shown[1]).toEqual(storedScene);
            }
            expect(full(mounted)).toEqual(captured);
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
            if (internals(graph).board) {
                expect(Object.keys(preset).sort()).toEqual(['boardState', 'data', 'graphState', 'id']);
                expect(Object.keys(preset.graphState ?? {}).sort()).toEqual(Object.keys(graph.state).sort());
            } else {
                // All surface state is Preset data; the Preset's graphState only marks the graph initialized.
                expect(Object.keys(preset).sort()).toEqual(['data', 'graphState', 'id']);
                expect(preset.graphState).toEqual({initialized: true});
            }
            const declared = internals(graph).captureTransientState?.();
            if (declared && typeof declared === 'object') {
                for (const key of Object.keys(declared)) expect(preset.graphState).not.toHaveProperty(key);
            }
            expect(controlsSignature(mounted.view.container).length).toBeGreaterThan(0);
            mounted.view.unmount();
        });
    });
}
