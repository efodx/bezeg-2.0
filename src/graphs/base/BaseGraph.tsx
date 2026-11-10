import {LocalizedError, message, Message, onLanguageChange, renderMessage, t} from "../../localization";
import React from 'react';


import {AxisAttributes, Board} from "jsxgraph";
import {fitBoundingBox} from "./fitBoundingBox";
import {Commands} from "./Commands";
import {firstUnusedPresetName, Preset, PresetService} from "./presets/Presets";
import type {PresetCollection} from "./presets/PresetCollection";
import {checkPreset, type CheckedPreset, isBoundingBox} from "./presets/PresetImport";
import {PresetSelector} from "./PresetSelector";
import {SaveImage} from "./SaveImage";
import {AxisSelector} from "./AxisSelector";
import {SizeRange} from "./SizeRange";
import {InspectorDisclosure} from "../../inputs/InspectorDisclosure";
import {ReplacementRevision} from "../../inputs/replacementRevision";
import {SceneStateUpdate, SceneStore} from "./SceneStore";
import {LessonAction, LessonCurveFixture, LessonGraphCapabilities, LessonPatchFixture, LessonSceneCheckpoint, LessonView3D, LessonViewBox, UnsupportedLessonActionError} from '../../learning/model';
import {GraphSession} from "./GraphSession";
import {LessonActionRegistry} from "./lesson/LessonActionRegistry";
import {AxisSelect, DisplaySettings} from "./DisplaySettings";
import {GraphStyles, stylesFor} from "../styles/GraphStyles";
import {downloadPNG, downloadSVG} from "./export/FigureCapture";
import type {FigureCaptureTarget} from "./export/FigureCapture";
import {FigureExportScope} from "./export/FigureExportOperation";
import {downloadPresetFigures, FigureBatchOwner} from "./export/PresetFigureBatch";
import {replaceScene, type SceneReplacementHost} from "./SceneReplacement";


function cloneLessonValue<T>(value: T): T {
    if (value === undefined) return value;
    return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Transient state of a graph: graph state outside Preset data and the scene store that changes what is drawn or what
 * controls show (curve selection, subdivision steps, overlay switches, effective rational weights, a child board's
 * view). Captured into lesson checkpoints and figure batch entry scenes, which live in memory only; never written to
 * Presets, URLs or progress.
 */
export type TransientState = Readonly<Record<string, unknown>>;

/** Rejects a lesson view that is not a finite box [left, top, right, bottom] before any scene change. */
function checkLessonView(view: LessonViewBox | undefined): void {
    if (view && !(view.every(Number.isFinite) && view[0] < view[2] && view[3] < view[1])) {
        throw new Error('The lesson view must be a finite box [left, top, right, bottom] with left < right and bottom < top.');
    }
}

function isLessonState(value: unknown): value is {boardState?: BoardState; graphState: unknown; data: unknown; transientState?: TransientState;
    displayState?: {size: number; axis: AxisSelect; pointLabelsVisible: boolean}} {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as {boardState?: {boundingBox?: unknown}};
    // A graph without a board captures no view, so the view is optional; a stored view must still be well formed.
    if (candidate.boardState === undefined) return true;
    const boundingBox = candidate.boardState.boundingBox;
    return Array.isArray(boundingBox) && boundingBox.length === 4;
}

export interface BaseGraphState {
    initialized: boolean
}

export interface BoardState {
    boundingBox: [number, number, number, number]
}

/** A figure batch's entry scene: this graph's own export, restored without a stored-data check. */
interface FigureBatchScene<D> {
    preset: Preset<D>;
    transientState: TransientState;
}

/** Bounding box a new board starts with, and a reset returns to, unless the graph overrides `initialView()`. */
const DEFAULT_BOUNDING_BOX: [number, number, number, number] = [-5, 5, 5, -5];

/** Props the host passes to `DemonstrationWorkspace` for one render of the graph's panels. */
export interface GraphWorkspacePanels {
    description: string;
    edit: React.ReactNode;
    display: React.ReactNode;
    save: React.ReactNode;
    navigate: (action: string) => void;
    graphBusy: boolean;
    /** True while an export or scene replacement makes collection navigation unsafe. */
    pickerUnavailable: boolean;
    /** Pauses graph-owned playback at its current frame. */
    pausePlayback: () => void;
    lessonCapabilities: LessonGraphCapabilities | undefined;
}

/**
 * Abstract controller for creating graphs. It is not a React component: its state lives in a synchronous
 * `SceneStore`, and `GraphHost` renders its panels, mounts it on a container element and flushes its deferred
 * `onStateChange`/callback work after every commit.
 *
 * `S` is the scene state; `D` is the Preset data of the graph's family (curve entries, a function model), which the
 * graph's Preset collection checks whenever stored data enters the graph.
 */
abstract class BaseGraph<S extends BaseGraphState, D = unknown> {
    private sceneStore?: SceneStore<S>;
    private presetServiceInstance?: PresetService;
    private lessonActionRegistry?: LessonActionRegistry;
    /** State from before the first update that `onStateChange` has not seen yet. */
    private pendingPreviousState?: S;
    private pendingCallbacks: Array<() => void> = [];
    private hasBeenMounted = false;
    /**
     * App-shell seams the route host fills before mount, so graphs stay free of router code: `bezierHandoff` is the validated
     * one-shot points handoff (ADR 0038), `openAsBezier` navigates to the Bezier Demonstration with control points.
     */
    readonly hostBridge: {
        bezierHandoff?: ReadonlyArray<readonly [number, number]>;
        openAsBezier?: (points: ReadonlyArray<readonly [number, number]>) => void;
    } = {};
    private selectedPresetIdValue = "";
    private presetListVersionValue = 0;
    /** Why the last Preset save or delete did not happen; shown beside the Preset list until the next one succeeds. */
    private presetNoticeValue: Message | undefined;
    /** Counts scene replacements; keyed onto scene-backed inspector controls so they re-seed from the new scene. */
    protected workspaceRevision = 0;
    private displaySettingsInstance?: DisplaySettings;
    protected board!: Board;

    /** Whether the main view is a JSXGraph board; a subclass whose `createMainView` makes none has no board to touch. */
    protected get hasBoard(): boolean {
        return this.board !== undefined;
    }
    protected graphSession?: GraphSession;
    protected graphInteractionLocked = false;

    /**
     * The element a figure export captures and locks against input while a batch runs, or undefined when this graph has
     * nothing to export. The board's container by default; a graph with another kind of main view overrides it together
     * with `createFigureCaptureTarget`.
     */
    protected figureContainer(): HTMLElement | undefined {
        return this.hasBoard ? this.board.containerObj as HTMLElement : undefined;
    }
    private initialFigureGraphState?: S;
    private figureSceneGeneration = 0;
    /** Admission, busy state and the deferred reload of this graph's figure exports. */
    readonly figureExports = new FigureExportScope({
        requestRender: callback => this.requestRender(callback),
        reload: () => {
            if (this.graphSession?.isAlive) void this.reloadSelectedScene();
        },
    });
    private activeSceneReplacements = 0;
    private readonly lessonCapabilityAdapter: LessonGraphCapabilities = {
        captureState: () => this.captureLessonState(),
        restoreState: checkpoint => this.restoreLessonState(checkpoint),
        apply: action => this.applyLessonAction(action),
        adjustGuidedLessonView: cardWidth => this.adjustGuidedLessonView(cardWidth),
        stopAnimations: () => this.stopLessonAnimations(),
        pauseAnimations: () => this.pausePlayback(),
        isAvailable: () => this.graphSession?.isReady === true,
    };

    /**
     * The scene store, created on first use so that subclasses define their initial state in `getInitialState()`
     * (a prototype method) instead of a field initializer that would run before their own fields exist.
     */
    get store(): SceneStore<S> {
        if (!this.sceneStore) this.sceneStore = new SceneStore<S>(this.getInitialState());
        return this.sceneStore;
    }

    /** The current state. Updates are applied synchronously, so a later read in the same tick sees them. */
    get state(): Readonly<S> {
        return this.store.getState();
    }

    /** Initial scene state; subclasses extend it with their own fields. It must not read subclass fields. */
    getInitialState(): S {
        return {initialized: false} as S;
    }

    /**
     * Applies a partial update synchronously. Side effects keep React's batching: `onStateChange` runs once per host
     * commit with the state from before the first pending update, followed by the queued callbacks in order.
     */
    setState(update: SceneStateUpdate<S>, callback?: () => void): void {
        const before = this.store.getState();
        const changed = this.store.setState(update);
        if (changed && this.pendingPreviousState === undefined) this.pendingPreviousState = before;
        if (callback) {
            this.pendingCallbacks.push(callback);
            // Make sure the host commits (and therefore flushes) even when the update changed nothing.
            if (!changed) this.store.notify();
        }
    }

    /**
     * Sets keys every graph state has. TypeScript cannot see that a literal of `BaseGraphState` keys is a
     * `Partial<S>` for a generic `S`; this is the one place that says so.
     */
    protected setBaseState(patch: Partial<BaseGraphState>, callback?: () => void): void {
        this.setState(patch as Partial<S>, callback);
    }

    /** Runs `onStateChange` for the pending updates, then the queued callbacks, as one batch. */
    flushStateChanges(): void {
        const previous = this.pendingPreviousState;
        const callbacks = this.pendingCallbacks;
        this.pendingPreviousState = undefined;
        this.pendingCallbacks = [];
        let failure: { error: unknown } | undefined;
        const run = (work: () => void) => {
            try {
                work();
            } catch (error) {
                failure ??= {error};
            }
        };
        if (previous !== undefined) run(() => this.onStateChange(previous));
        for (const callback of callbacks) run(callback);
        if (failure) throw failure.error;
    }

    /** Called after the host committed a batch of state updates (the old React update lifecycle hook). */
    protected onStateChange(previousState: Readonly<S>): void {
    }

    /** Re-renders the panels; `callback` runs after the host has committed that render. */
    requestRender(callback?: () => void): void {
        if (callback) this.pendingCallbacks.push(callback);
        this.store.notify();
    }

    /**
     * Wraps a callback so it is skipped once the graph is unmounted. Queued callbacks still run at unmount to settle
     * promises; a callback that starts work (an animation, a board update) must not.
     */
    protected whileMounted(callback: () => void): () => void {
        return () => {
            if (this.graphSession?.isAlive) callback();
        };
    }

    /**
     * How this graph is displayed. Owned by the graph, so two graphs never share a setting; created on first use like
     * the scene store.
     */
    get displaySettings(): DisplaySettings {
        return this.displaySettingsInstance ??= new DisplaySettings();
    }

    /** Style presets whose callbacks read this graph's display settings. */
    protected get styles(): GraphStyles {
        return stylesFor(this.displaySettings);
    }

    /** Sets the element size step and redraws the board with it. */
    setElementSize(size: number): void {
        this.displaySettings.setSize(size);
        this.store.notify();
        if (this.graphSession?.isAlive && this.hasBoard) this.board.fullUpdate();
    }

    setAxisSelect(selected: AxisSelect): void {
        this.displaySettings.setAxisSelect(selected);
        this.store.notify();
        if (this.graphSession?.isAlive && this.hasBoard) this.board.fullUpdate();
    }

    setPointLabelsVisible(visible: boolean): void {
        this.displaySettings.pointLabelsVisible = visible;
        this.store.notify();
        if (!this.graphSession?.isAlive || !this.hasBoard) return;
        this.board.suspendUpdate();
        this.unsuspendBoardUpdate();
    }

    /** Id of the selected browser-local preset ("" for the default scene). */
    get selectedPresetId(): string {
        return this.selectedPresetIdValue;
    }

    /** Changes whenever the stored presets of this demonstration changed (save, delete, import). */
    get presetListVersion(): number {
        return this.presetListVersionValue;
    }

    /** Selects a preset ("" for the default scene) and loads it into the live board. */
    selectPreset(id: string): Promise<void> {
        if (this.exportBusy) {
            // The scene cannot be replaced under a running export; keep the previous selection and resync the selector.
            this.requestRender();
            return Promise.resolve();
        }
        const previous = this.selectedPresetIdValue;
        this.selectedPresetIdValue = id;
        return this.reloadSelectedScene(previous);
    }

    /** Reloads the selected preset, or the default scene, into the live board. */
    reset(): Promise<void> {
        return this.reloadSelectedScene();
    }

    /** Called after presets were imported: refreshes the list and reloads the selection, which may have changed. */
    reloadAfterImport(): Promise<void> {
        this.presetListVersionValue++;
        if (!this.figureExports.requestReload()) {
            this.requestRender();
            return Promise.resolve();
        }
        return this.reloadSelectedScene();
    }

    /** Stores the current scene under `name` (the first unused `preset-N` when empty) and selects it. */
    saveCurrentPreset(name: string): void {
        const service = this.presetService;
        if (!service) return;
        const id = name || firstUnusedPresetName(service.loadPresets().data);
        const outcome = service.savePreset({...this.exportPreset(), id});
        this.presetNoticeValue = outcome.problem;
        if (!outcome.problem) this.selectedPresetIdValue = id;
        this.presetListVersionValue++;
        this.requestRender();
    }

    /** Deletes the selected preset and loads the first remaining one, or the default scene. */
    deleteSelectedPreset(): Promise<void> {
        const service = this.presetService;
        if (!service || !this.selectedPresetIdValue || this.exportBusy) return Promise.resolve();
        const remaining = service.removePreset(this.selectedPresetIdValue);
        this.presetNoticeValue = remaining.problem;
        if (remaining.problem) {
            this.presetListVersionValue++;
            this.requestRender();
            return Promise.resolve();
        }
        this.selectedPresetIdValue = remaining.data[0]?.id ?? "";
        this.presetListVersionValue++;
        return this.reloadSelectedScene("");
    }

    /**
     * `previousId` is the selection to return to when the newly selected Preset is refused: the refusal happens before the
     * selection, view or scene change, so the live scene stays as it was (slice 1b of persisted scene validation).
     */
    private reloadSelectedScene(previousId: string = this.selectedPresetIdValue): Promise<void> {
        const session = this.getActiveGraphSession();
        if (!session) {
            // Not mounted: the selection is applied by the next mount().
            this.requestRender();
            return Promise.resolve();
        }
        if (!this.figureExports.requestReload()) {
            this.requestRender();
            return Promise.resolve();
        }
        const stored = this.presetService?.getPreset(this.selectedPresetIdValue);
        // An unreadable collection shows the default scene with its reason, not silently.
        const collectionProblem = this.presetService?.loadPresets().problem;
        if (collectionProblem) this.presetNoticeValue = collectionProblem;
        if (!stored) this.selectedPresetIdValue = "";
        if (stored) {
            try { this.checkPersistedPreset(stored); } catch (error) {
                this.selectedPresetIdValue = previousId;
                this.presetNoticeValue = message("preset_entry_refused", {value0: error instanceof LocalizedError ? error.description : String(error)});
                this.requestRender();
                return Promise.resolve();
            }
        }
        this.requestRender();
        // A new board starts at the default view; a stored preset's own view is applied after the scene.
        if (this.hasBoard) this.board.setBoundingBox(this.startingBox(this.board.container), true);
        return this.applyFigurePreset(session, stored ?? {id: ""}, session.signal)
            .catch(error => console.error("The preset could not be loaded.", error));
    }

    /**
     * Whether a view set from a bounding box (a preset's stored view, a restored lesson scene, the view of an imported example, the
     * fit button) gives both axes the same unit length. True for the curve and function demonstrations. A graph whose axes mean
     * different things, such as a sequence index against its value, returns false so that its stored box is applied exactly; its
     * fit button restores the graph's own default view (see `fitView`) instead of a canvas-aspect box.
     */
    protected get equalAxisUnits(): boolean {
        return true;
    }

    /** True while a single figure or a figure batch is being captured; scene-changing work must wait. */
    protected get exportBusy(): boolean {
        return this.figureExports.busy;
    }

    /** True while an export or scene replacement makes it unsafe to open the demonstration picker. */
    protected get pickerUnavailable(): boolean {
        return this.exportBusy || this.activeSceneReplacements > 0;
    }

    /**
     * The graph's transient state (see `TransientState`). This and `restoreTransientState` are the one place a graph
     * declares it; every capture path (lesson checkpoints, figure batch entry scenes) uses them. Overrides spread
     * `super.captureTransientState()` and add their own keys, which must not be scene-store keys.
     */
    protected captureTransientState(): TransientState {
        return {};
    }

    /**
     * Applies captured transient state, or, when `saved` is undefined, the transient state a freshly loaded scene starts
     * with. Every scene replacement calls it once (mount, Preset load, reset and import, figure batch scenes and entry
     * restore, lesson checkpoints and the lesson default scene), after the Preset data and the scene state are in place
     * and before `syncReplacedScene`. Validate what is read: missing or invalid values fall back to the fresh-scene value.
     */
    protected restoreTransientState(saved: TransientState | undefined): void {
    }

    /**
     * Brings drawing that a Preset import does not rebuild (adapter attributes, constructions on the imported curves,
     * samples, drawing caches) in line with the replaced scene. Called synchronously at the end of every scene
     * replacement, after `restoreTransientState`, so a restore within one tick is drawn before the host commits. Must be
     * idempotent; graphs whose `onStateChange` reconciles the same drawing call one shared method from both.
     */
    protected syncReplacedScene(): void {
    }

    /**
     * The scene state a Preset or a checkpoint saves. A graph whose drawing runs ahead of its scene store during playback
     * returns its drawn values here.
     */
    protected sceneGraphState(): S {
        return this.state;
    }

    /** The scene state as Presets and checkpoints store it; a graph whose live state differs from that shape adapts it here. */
    protected savedGraphState(): BaseGraphState {
        return this.sceneGraphState();
    }

    /** Browser-local presets of this demonstration; created once on first use. */
    get presetService(): PresetService | undefined {
        if (!this.presetServiceInstance) {
            const id = this.presets();
            if (id) this.presetServiceInstance = new PresetService(id);
        }
        return this.presetServiceInstance;
    }

    /** True while a batch export locks the workspace. */
    get graphBusy(): boolean {
        return this.figureExports.batchActive;
    }

    /** The one default description; graphs with their own wording override it. The title belongs to the route's Demonstration. */
    protected workspaceDescription(): string { return t("change_the_settings_and_observe_their_effect_on_the_graph"); }
    protected workspaceEdit(): React.ReactNode { return this.getGraphCommandsArea(); }
    /**
     * The graph-specific Display options (constructions, labels, shaded regions, offsets and their results), shown expanded
     * before the shared coordinate-system and element-size groups. Null when the graph has none.
     */
    protected workspaceGraphDisplay(): React.ReactNode { return null; }
    /** Display order: graph-specific elements, then the coordinate system, then element sizes (both collapsed initially). */
    protected workspaceDisplay(): React.ReactNode {
        const graphDisplay = this.workspaceGraphDisplay();
        return <>{graphDisplay && <div className="inspector-display-graph">{graphDisplay}</div>}
            <InspectorDisclosure title={t("coordinate_system")}><div className="inspector-control"><AxisSelector selected={this.displaySettings.getAxisSelect()}
                onChange={selected => this.setAxisSelect(selected)}/></div></InspectorDisclosure>
            <InspectorDisclosure title={t("element_sizes")}>
                <SizeRange size={this.displaySettings.getSize()} onChange={size => this.setElementSize(size)}/></InspectorDisclosure></>;
    }
    protected workspaceSave(): React.ReactNode {
        return <><div className="inspector-group"><h3>{t("presets_in_this_browser")}</h3>
            {this.presetService && <PresetSelector presetService={this.presetService}
                selectedPresetId={this.selectedPresetId} presetListVersion={this.presetListVersion} notice={this.presetNoticeValue}
                onSelect={id => { void this.selectPreset(id); }} onReset={() => { void this.reset(); }}
                onSave={name => this.saveCurrentPreset(name)} onDelete={() => { void this.deleteSelectedPreset(); }}
                onImported={() => { void this.reloadAfterImport(); }}
                batchExporter={presets => this.exportPresetFigures(presets)}/>}</div>
            <div className="inspector-group"><h3>{t("export_figure")}</h3><SaveImage showLabel={false} presetId={this.selectedPresetId} saveAsSVG={name => this.saveAsSVG(name)}
                saveAsPNG={name => this.saveAsPNG2(name)}/></div></>;
    }

    /** Exposes graph-owned behavior without leaking boards, controls, or Preset DTOs. */
    public getLessonCapabilities(): LessonGraphCapabilities {
        return this.lessonCapabilityAdapter;
    }

    /** Pans an ordinary 2D lesson view to make room for its reading card without changing scale. */
    protected adjustGuidedLessonView(cardWidth: number): void {
        if (!this.hasBoard || !this.supportsGuidedLessonPanning() || !Number.isFinite(cardWidth) || cardWidth <= 0) return;
        const {width: boardWidth} = JXG.getDimensions(this.board.container, document);
        const width = parseFloat(String(boardWidth));
        if (!Number.isFinite(width) || width <= 0) return;
        // Keep the half-card pan through three card widths and taper it to zero by four.
        const panPixels = Math.max(0, Math.min(cardWidth, 4 * cardWidth - width)) / 2;
        if (panPixels === 0) return;
        const [left, top, right, bottom] = this.board.getBoundingBox();
        const dx = (right - left) * (panPixels / width);
        this.board.setBoundingBox([left - dx, top, right - dx, bottom], false);
    }

    /** Graphs with a non-planar camera override this out. */
    protected supportsGuidedLessonPanning(): boolean { return true; }

    /** Exposes the active lifetime owner to graph-owned runtime integrations. */
    protected getActiveGraphSession(): GraphSession | undefined {
        return this.graphSession?.isAlive ? this.graphSession : undefined;
    }

    /**
     * The lesson actions this graph supports, composed from the features it uses on first use. Graphs add handlers by
     * overriding `registerLessonActions`; nothing dispatches through `super`.
     */
    protected get lessonActions(): LessonActionRegistry {
        if (!this.lessonActionRegistry) {
            const registry = new LessonActionRegistry();
            this.registerLessonActions(registry);
            this.lessonActionRegistry = registry;
        }
        return this.lessonActionRegistry;
    }

    /** Contributes this graph's lesson action handlers. Overrides call `super` first, then add their own. */
    protected registerLessonActions(registry: LessonActionRegistry): void {
        registry.on('prepared-scene', action => {
            if (action.source === 'demonstration-default') {
                checkLessonView(action.view);
                this.prepareLessonDefaultScene();
                if (action.view) {
                    this.applyLessonView(action.view);
                    this.boardUpdate();
                }
                return;
            }
            if (action.source === 'lesson-patch-fixture') {
                this.prepareLessonPatchScene(action.patch, action.view3d, action);
                return;
            }
            const data = this.lessonFixtureData(action.curve);
            if (data === undefined) throw new UnsupportedLessonActionError(action);
            this.prepareLessonFixtureScene(data, action.view);
        });
    }

    /** Prepares a lesson patch scene; only graphs with a patch scene store support it. */
    protected prepareLessonPatchScene(_patch: LessonPatchFixture, _view3d: LessonView3D | undefined, action: LessonAction): void {
        throw new UnsupportedLessonActionError(action);
    }

    /**
     * This graph's Preset data for a lesson curve fixture, or undefined when the graph has no fixture support. Only
     * builds data; `prepareLessonFixtureScene` checks it before anything is replaced.
     */
    protected lessonFixtureData(_curve: LessonCurveFixture): D | undefined {
        return undefined;
    }

    /**
     * The default scene's fresh state with fixture Preset data. The data is checked by the graph's Preset collection
     * first, so a rejected fixture leaves the current scene untouched.
     */
    private prepareLessonFixtureScene(data: D, view: LessonViewBox | undefined): void {
        if (!this.graphSession?.isReady) throw new Error('The graph is still preparing. Try again in a moment.');
        const collection = this.presetCollection();
        if (!collection) throw new Error('This demonstration cannot check lesson geometry.');
        const checked = collection.check(cloneLessonValue(data));
        if (!("data" in checked)) throw new Error(`The lesson geometry is invalid: ${renderMessage(checked.rejection)}`);
        checkLessonView(view);
        this.runLessonReplacement({
            importData: () => this.importPresetData(checked.data),
            afterImport: () => { if (view) this.applyLessonView(view); },
            // Replaced, not merged, as in the default scene.
            state: () => ({...this.getInitialState(), ...this.lessonDefaultState(checked.data)}),
            transientState: undefined,
        });
    }

    /** Whether the graph has a handler for the action (it may still reject the action's values or scene). */
    supportsLessonAction(action: LessonAction): boolean {
        return this.lessonActions.handles(action);
    }

    protected applyLessonAction(action: LessonAction): void {
        try {
            this.lessonActions.apply(action);
        } finally {
            // Handlers change adapters and boards outside the scene store; controls read those values live.
            this.store.notify();
        }
    }

    /** Restores a static lesson scene through the graph's own preset importer, with fresh transient state. */
    protected prepareLessonDefaultScene(): void {
        if (!this.graphSession?.isReady) throw new Error('The graph is still preparing. Try again in a moment.');
        const data = cloneLessonValue(this.defaultPreset());
        this.runLessonReplacement({
            importData: () => this.importPresetData(data),
            // Replaced, not merged: an optional key an earlier scene set must not survive into the default scene.
            state: () => ({...this.getInitialState(), ...this.lessonDefaultState(data)}),
            transientState: undefined,
        });
    }

    /**
     * Whether mount and the lesson paths dispose the previous scene before importing. They used to get it only from
     * `BaseCurveGraph.importPresetData`, so curve families (which override this to true) keep disposing there while
     * every other family keeps not disposing: its `importPresetData` rebuilds or its own teardown runs elsewhere, and
     * the lesson and contract tests do not show that an extra dispose is equivalent. The figure path always disposes.
     */
    protected disposesBeforeNonFigureImport(): boolean {
        return false;
    }

    /** The adapter the replacement module drives; `session` guards the figure path's board resume. */
    private sceneReplacementHost(session?: GraphSession): SceneReplacementHost<S, TransientState> {
        return {
            disposeScene: () => this.disposeFigureScene(),
            suspendBoard: () => { if (this.hasBoard) this.board.suspendUpdate(); },
            resumeBoard: () => {
                if ((!session || (this.graphSession === session && session.isAlive)) && this.hasBoard) this.board.unsuspendUpdate();
            },
            replaceState: state => this.replaceState(state),
            replaceSceneState: (next, afterCommit) => this.replaceSceneState(next, afterCommit),
            restoreTransientState: saved => this.restoreTransientState(saved),
            initialize: () => this.initialize(),
            syncReplacedScene: () => this.syncReplacedScene(),
            bumpWorkspaceRevision: () => { this.workspaceRevision++; },
        };
    }

    /**
     * A synchronous lesson replacement: no `initialize()` (ADR 0015), drawn before the host commits, then a
     * workspace revision so scene-backed controls (and child boards keyed on it) re-seed from the new scene.
     */
    protected runLessonReplacement(scene: {
        /** Overrides the family's disposal choice; a checkpoint without Preset data imports nothing, so it disposes nothing. */
        dispose?: boolean;
        importData: () => void;
        afterImport?: () => void;
        state: () => S;
        afterState?: () => void;
        transientState: TransientState | undefined;
    }): void {
        replaceScene(this.sceneReplacementHost(), {
            suspendBoard: false,
            initialize: false,
            ...scene,
            dispose: scene.dispose ?? this.disposesBeforeNonFigureImport(),
            state: {mode: 'sync', state: scene.state},
            finish: () => {
                this.workspaceRevision++;
                this.boardUpdate();
                this.requestRender();
            },
        });
    }

    /** The state of a fresh lesson scene over the initial state; `data` is the Preset data just imported (fixture or default). */
    protected lessonDefaultState(_data?: D): S {
        return {initialized: true} as S;
    }

    /** Hook for graph-owned animation drivers; lesson lifecycle calls it before scene replacement. */
    protected stopLessonAnimations(): void {
    }

    /**
     * Hook called before a single-figure SVG/PNG export or a figure batch captures the board, so a graph with running
     * playback can pause and the export represents one settled scene.
     */
    protected beforeFigureCapture(): void {
    }

    /** Pauses graph-owned playback without replacing its scene or resetting its current frame. */
    public pausePlayback(): void {
        this.beforeFigureCapture();
    }

    /** Releases scene objects whose lifetime is owned by a graph subclass. */
    protected disposeFigureScene(): void {
    }

    /** Imports preset data without replacing the board or its lifetime resources. */
    protected importFigurePresetData(preset: Preset): void {
        this.importPresetData(preset.data === undefined ? this.persistedDefaultData() : preset.data as D);
    }

    /**
     * The one check every persisted entry (a stored Preset, an explicit import, a figure) passes before anything changes:
     * the graph's Preset collection decides on the Preset's data, view and state, the same definition the file importer
     * uses. Returns a normalized copy (missing parts stay missing: missing data is the default scene's) or throws the
     * localized reason. A graph without a collection stores no Presets and takes none of the Preset's data.
     */
    protected checkPersistedPreset(preset: Preset): CheckedPreset {
        const collection = this.presetCollection();
        // A graph without a collection still has its view and scene state checked by the shared rules.
        const checked = checkPreset(collection ?? {key: "graph", check: () => ({data: undefined})}, preset);
        if ("rejection" in checked) throw new LocalizedError(checked.rejection);
        if (!collection) {
            return {...checked.preset, data: preset.data === undefined ? undefined : cloneLessonValue(this.defaultPreset())};
        }
        // Consumer preparation: the family's own limits, checked on the plain data before anything is written.
        if (checked.preset.data !== undefined) {
            const refusal = this.consumerRefusal(checked.preset.data as D);
            if (refusal) throw new LocalizedError(message("preset_check_in_preset", {value0: collection.key, value1: checked.preset.id, value2: "data", value3: refusal}));
        }
        return checked.preset;
    }

    /**
     * Side-effect-free consumer guard: the reason this graph cannot show checked Preset data (a degree it does not offer, a point
     * count over its limit), or undefined. Runs inside `checkPersistedPreset`, so every persisted entry path refuses before
     * the selection, view, scene state, disposal or drawing change. It must not read or write the live scene.
     */
    protected consumerRefusal(_data: D): Message | undefined {
        return undefined;
    }

    /** The scene state a figure scene starts with: the graph's initial state with the Preset's stored state over it. */
    protected figurePresetGraphState(graphState: BaseGraphState | undefined, _data?: unknown): S {
        return {
            ...(this.initialFigureGraphState ?? this.state),
            ...(graphState ? cloneLessonValue(graphState) : {}),
            initialized: true,
        } as S;
    }

    /**
     * A lesson checkpoint: view, scene state, Preset data, transient state and display settings, in memory only. The
     * display settings are graph preferences that Preset replacement keeps; only a checkpoint brings them back.
     */
    private captureLessonState(): LessonSceneCheckpoint {
        if (!this.graphSession?.isReady) throw new Error('The graph is still preparing. Try again in a moment.');
        return {
            version: 1,
            value: cloneLessonValue({
                ...(this.hasBoard ? {boardState: this.boardState()} : {}),
                graphState: this.savedGraphState(),
                data: this.exportPresetData(),
                transientState: this.captureTransientState(),
                displayState: {size: this.displaySettings.getSize(), axis: this.displaySettings.getAxisSelect(),
                    pointLabelsVisible: this.displaySettings.pointLabelsVisible},
            }),
        };
    }

    /** Restores a checkpoint synchronously, drawn before the host commits; a graph that is not ready ignores it. */
    private restoreLessonState(checkpoint: LessonSceneCheckpoint): void {
        if (!this.graphSession?.isReady) return;
        if (checkpoint.version !== 1 || !isLessonState(checkpoint.value)) {
            throw new Error('This lesson scene is no longer compatible with the graph.');
        }
        const state = checkpoint.value;
        // A checkpoint holds this graph's own exported Preset data, captured in memory by `captureLessonState`.
        this.runLessonReplacement({
            dispose: state.data !== undefined && this.disposesBeforeNonFigureImport(),
            importData: () => { if (state.data !== undefined) this.importPresetData(cloneLessonValue(state.data) as D); },
            afterImport: () => { if (this.hasBoard && state.boardState) this.board.setBoundingBox(state.boardState.boundingBox, this.equalAxisUnits); },
            // Replaced, not merged: optional keys set after the checkpoint was captured must not survive the restore.
            state: () => ({...this.getInitialState(), ...cloneLessonValue(state.graphState) as S, initialized: true}),
            afterState: () => {
                if (!state.displayState) return;
                this.displaySettings.setSize(state.displayState.size);
                this.displaySettings.setAxisSelect(state.displayState.axis);
                this.displaySettings.pointLabelsVisible = state.displayState.pointLabelsVisible;
                if (this.hasBoard) this.board.fullUpdate();
            },
            transientState: cloneLessonValue(state.transientState) ?? {},
        });
    }

    /**
     * The box the fit button applies for the visible points and the canvas size, or undefined to leave the view alone. The default is
     * the equal-unit box of `fitBoundingBox`; a graph without equal axis units returns its own default view instead.
     */
    protected fitView(points: readonly [number, number][], width: number, height: number): [number, number, number, number] | undefined {
        return fitBoundingBox(points, width, height);
    }

    /**
     * Shows the whole lesson view. With equal axis units JSXGraph keeps the left and top edges of a box whose aspect differs from the
     * canvas and drops the rest, so the view is widened to the canvas aspect around its centre; a canvas without size keeps the box.
     */
    private applyLessonView(view: LessonViewBox): void {
        if (!this.hasBoard) return;
        const [left, top, right, bottom] = view;
        const {width, height} = JXG.getDimensions(this.board.container, document);
        const box = this.equalAxisUnits ? fitBoundingBox([[left, top], [right, bottom]], parseFloat(String(width)), parseFloat(String(height))) : undefined;
        this.board.setBoundingBox(box ?? [...view], this.equalAxisUnits);
    }

    /**
     * The host Fit: fits the view to the visible points on the board plus `extra` (points not drawn yet), with the graph's `fitView`.
     * JSXGraph's zoomAllPoints depends on the current zoom, so this fits from the points and canvas size alone.
     */
    protected fitToVisiblePoints(extra: readonly [number, number][] = []): void {
        if (!this.hasBoard) return;
        const points: [number, number][] = extra.map(([x, y]) => [x, y]);
        for (const object of this.board.objectsList) {
            if (JXG.isPoint(object) && object.visPropCalc.visible) points.push([object.coords.usrCoords[1], object.coords.usrCoords[2]]);
        }
        // setBoundingBox re-reads the container size, so fit against the same size.
        const {width, height} = JXG.getDimensions(this.board.container, document);
        const box = this.fitView(points, parseFloat(String(width)), parseFloat(String(height)));
        if (box) {
            this.board.setBoundingBox(box, this.equalAxisUnits, 'update');
            this.board.applyZoom();
        }
    }

    private navigateBoard(action: string) {
        if (!this.hasBoard) return;
        if (action === 'fit') { this.fitToVisiblePoints(); return; }
        if (action === "in") { this.board.zoomIn(); return; }
        if (action === "out") { this.board.zoomOut(); return; }
        const [left, top, right, bottom] = this.board.getBoundingBox();
        const dx = (right - left) * (action === "left" ? -.15 : action === "right" ? .15 : 0);
        const dy = (top - bottom) * (action === "up" ? .15 : action === "down" ? -.15 : 0);
        this.board.setBoundingBox([left + dx, top + dy, right + dx, bottom + dy], false);
    }

    abstract initialize(): void;

    /**
     * Creates the board on the host's container and loads the selected preset or the default scene. Safe to call again
     * on the same instance after `unmount()` (React StrictMode mounts, unmounts and mounts again).
     */
    mount(container: HTMLElement): void {
        if (!this.graphSession?.isAlive) {
            const session = new GraphSession(undefined, this.displaySettings);
            this.graphSession = session;
            // A remount starts from a fresh scene state, exactly like a new instance.
            if (this.hasBeenMounted) this.store.replaceState(this.getInitialState());
            this.hasBeenMounted = true;
            this.initialFigureGraphState = cloneLessonValue(this.state);
            // JXG.Options.text.display = 'internal';
            this.createMainView(session, container);

            this.setBaseState({initialized: true});
            const stored = this.presetService?.loadPresets();
            let preset = stored?.data.find(candidate => candidate.id === this.selectedPresetIdValue);
            // A collection that fails the check is not read at all; the default scene is shown with the reason.
            if (stored?.problem) this.presetNoticeValue = stored.problem;
            if (preset) {
                try { this.checkPersistedPreset(preset); } catch (error) {
                    this.presetNoticeValue = message("preset_entry_refused_default_shown", {value0: error instanceof LocalizedError ? error.description : String(error)});
                    preset = undefined;
                }
            }
            // A selection whose preset no longer exists shows the default scene, so it is not a selection any more.
            if (!preset) this.selectedPresetIdValue = "";
            // A remount on this instance starts with fresh transient state.
            replaceScene(this.sceneReplacementHost(), {
                dispose: this.disposesBeforeNonFigureImport(),
                suspendBoard: false,
                    importData: () => {
                    if (preset) this.importPreset(preset);
                    else this.importPresetData(this.initialPresetData());
                },
                transientState: undefined,
                // TODO We should remove this...
                initialize: true,
            });
            session.observeResize(container);
            session.markReady();
        }
    }

    /** The data a mount without a selected Preset loads: the default scene, or a graph's validated host handoff. */
    protected initialPresetData(): D {
        return this.defaultPreset();
    }

    /**
     * Creates the main view on the host's container and assigns `this.board`. A subclass with another kind of main view
     * overrides this, adopts it with `session.adoptMainView(dispose)` and leaves `board` unset; the board paths then do nothing.
     */
    protected createMainView(session: GraphSession, container: HTMLElement): void {
        this.board = session.createBoard(container, {
            showFullscreen: false,
            boundingBox: this.startingBox(container),
            axis: true,
            keepAspectRatio: true,
            showScreenshot: false,
            showCopyright: false,
            showNavigation: false,
            defaultAxes: this.defaultAxesAttributes(),
        });
        // Tick labels use the language's decimal separator and are rebuilt only by a full update.
        session.registerCleanup(onLanguageChange(() => this.board?.fullUpdate()));
    }

    /**
     * The region a new board shows and a reload shows before a stored preset applies its own view, or undefined for the app default
     * box. A graph with equal axis units whose default example lies outside the default box returns the example's extent.
     */
    protected initialView(): [number, number, number, number] | undefined {
        return undefined;
    }

    /**
     * The starting box: the app default, or `initialView()` widened to the canvas aspect around its centre with the fit margin. A box
     * with the canvas aspect is applied alike by board creation and by `setBoundingBox`, so a reload matches a new board.
     */
    private startingBox(container: HTMLElement | string): [number, number, number, number] {
        const view = this.initialView();
        if (!view) return [...DEFAULT_BOUNDING_BOX];
        if (!this.equalAxisUnits || !container) return [...view];
        const [left, top, right, bottom] = view;
        const {width, height} = JXG.getDimensions(container, document);
        return fitBoundingBox([[left, top], [right, bottom]], parseFloat(String(width)), parseFloat(String(height))) ?? [...view];
    }

    /** The attributes of the board's default axes (the shared axis styles unless a graph needs its own tick labels). */
    protected defaultAxesAttributes(): { x: AxisAttributes; y: AxisAttributes } {
        return {x: this.styles.axis.defaultX, y: this.styles.axis.defaultY};
    }

    /** Disposes the board and everything the session owns. Pending state work is dropped; pending callbacks still settle. */
    unmount(): void {
        this.figureSceneGeneration++;
        this.figureExports.teardown();
        this.graphInteractionLocked = false;
        const session = this.graphSession;
        this.graphSession = undefined;
        this.board = undefined as unknown as Board;
        session?.dispose();
        // Nothing renders after this, so onStateChange would only touch a disposed scene. Callbacks (for example a
        // figure batch waiting for its commit) re-check the session and settle their promises.
        this.pendingPreviousState = undefined;
        const callbacks = this.pendingCallbacks;
        this.pendingCallbacks = [];
        for (const callback of callbacks) {
            try {
                callback();
            } catch (error) {
                // A failing late callback must not block the rest of the teardown, but it must not vanish either.
                console.error("A graph callback failed while the graph was unmounting.", error);
            }
        }
    }

    saveAsSVG(fileName: string) {
        const session = this.getActiveGraphSession();
        if (!session || !this.figureContainer()) return Promise.resolve();
        return this.figureExports.runSingle(() => {
            this.beforeFigureCapture();
            this.requestRender();
            return downloadSVG(this.createFigureCaptureTarget(session), fileName);
        });
    }


    /** Tells the panel's fields about scene replacements, so that a Reset to the same number still clears a stale hint. */
    private withReplacementRevision(panel: React.ReactNode): React.ReactNode {
        return <ReplacementRevision.Provider value={this.workspaceRevision}>{panel}</ReplacementRevision.Provider>;
    }

    /** The panels of one render, called by the host. */
    getWorkspacePanels(): GraphWorkspacePanels {
        return {
            description: this.workspaceDescription(),
            edit: this.state.initialized ? this.withReplacementRevision(this.workspaceEdit()) : <p>{t("preparing_graph")}</p>,
            display: this.state.initialized ? this.withReplacementRevision(this.workspaceDisplay()) : null,
            save: this.workspaceSave(), navigate: action => this.navigateBoard(action), graphBusy: this.figureExports.batchActive,
            pickerUnavailable: this.pickerUnavailable, pausePlayback: () => this.pausePlayback(),
            // A deep link can request a lesson before JSXGraph has created
            // its board. Do not mount the session until the graph-owned
            // capability is ready; otherwise captureState() fails once
            // and the overlay has no reason to retry.
            lessonCapabilities: this.state.initialized ? this.getLessonCapabilities() : undefined,
        };
    }

    unsuspendBoardUpdate() {
        if (!this.graphSession?.isAlive) return;
        this.boardUpdate();
        if (this.hasBoard) this.board.unsuspendUpdate();
    }

    getGraphCommands(): JSX.Element[] {
        return [];
    }

    boardUpdate() {
        if (!this.graphSession?.isAlive || !this.hasBoard) return;
        this.board.update();
    }

    getGraphCommandsArea() {
        return this.getGraphCommands().length > 0 ?
            <Commands commands={this.getGraphCommands()} title={t("graph_commands")}/> : null;
    }

    /** The static definition of this Demonstration's browser-local Preset collection; undefined when it has none. */
    presetCollection(): PresetCollection<D> | undefined {
        return undefined;
    }

    /** Key of the Preset collection (stored as `preset-<key>`); undefined when the graph has none. */
    presets(): undefined | string {
        return this.presetCollection()?.key;
    }

    exportPreset(): Preset<D> {
        const projected = this.projectPersistedScene();
        return {
            id: this.presets()!,
            // A view the board cannot show (a hidden or zero-size container) is left out: the check would refuse the whole collection.
            ...(this.hasBoard && isBoundingBox(this.board.getBoundingBox()) ? {boardState: this.boardState()} : {}),
            graphState: projected ? projected.graphState : this.savedGraphState(),
            data: projected ? projected.data : this.exportPresetData()
        };
    }

    /**
     * A graph family that declares a `ScenePersistence` returns its projection of the live scene here: the one source of a
     * persisted Preset's `data` and `graphState`. Checkpoints do not use it (they capture the full runtime state).
     */
    protected projectPersistedScene(): {data: D; graphState: BaseGraphState} | undefined {
        return undefined;
    }

    /**
     * Applies a persisted Preset. The Preset is checked first (`checkPersistedPreset`); a refusal throws before the
     * view, the scene state or the data change. An omitted part starts from the graph's defaults, never from the
     * preceding scene: no `boardState` is the initial view, no `graphState` the fresh initial state, no `data` the fixed
     * default data (`persistedDefaultData`).
     */
    importPreset(preset: Preset) {
        const checked = this.checkPersistedPreset(preset);
        if (checked.boardState) {
            this.importBoardState(checked.boardState);
        } else if (this.hasBoard) {
            this.showInitialView();
            this.board.fullUpdate();
        }
        // The checked state over the fresh initial state, never over the live scene: a partial graphState leaves the
        // omitted fields at their defaults, so the result does not depend on the preceding scene.
        this.replaceState({...this.getInitialState(), ...(checked.graphState ?? {}), initialized: true} as S);
        this.importPresetData(checked.data === undefined ? this.persistedDefaultData() : checked.data as D);
    }

    /** Shows the view a persisted Preset without `boardState` starts from: the graph's initial view, as a new board has it. */
    protected showInitialView(): void {
        this.board.setBoundingBox(this.startingBox(this.board.container), true);
    }

    /**
     * The data a persisted Preset without `data` starts from. It must not read the live scene, unlike `defaultPreset()`,
     * which may follow a chosen example so that Reset returns to it.
     */
    protected persistedDefaultData(): D {
        return cloneLessonValue(this.defaultPreset());
    }

    /** The visible box of the board; undefined when the main view is not a board. */
    boardState(): BoardState | undefined {
        if (!this.hasBoard) return undefined;
        return {boundingBox: this.board.getBoundingBox()};
    }

    exportPresetData(): D | undefined {
        return undefined;
    }

    /** Replaces the scene with Preset data of this graph's family: the default scene, a checkpoint, or checked stored data. */
    importPresetData(_data: D): void {
    }

    abstract defaultPreset(): D

    private saveAsPNG2(fileName: string): Promise<void> {
        const session = this.getActiveGraphSession();
        if (!session || !this.figureContainer()) return Promise.resolve();
        return this.figureExports.runSingle(() => {
            this.beforeFigureCapture();
            this.requestRender();
            return downloadPNG(this.createFigureCaptureTarget(session), fileName);
        });
    }

    /** What a figure export captures now; get a new one after each scene replacement. */
    protected createFigureCaptureTarget(session: GraphSession): FigureCaptureTarget {
        const board = this.board;
        return {
            container: board.containerObj as HTMLElement,
            rendererRoot: ('svgRoot' in board.renderer ? board.renderer.svgRoot : undefined) as SVGSVGElement,
            isAlive: () => this.graphSession === session && session.isAlive,
            signal: session.signal,
            waitUntilReady: () => session.waitUntilReady(),
        };
    }

    private exportPresetFigures(presets: Preset[]): Promise<void> {
        const session = this.getActiveGraphSession();
        const boardContainer = this.figureContainer();
        if (!session || !boardContainer) return Promise.resolve();
        // Every selected entry is checked and prepared before the batch touches any scene; one refusal refuses the batch.
        for (const preset of presets) {
            try { this.checkPersistedPreset(preset); } catch (error) {
                this.presetNoticeValue = message("preset_entry_refused", {value0: error instanceof LocalizedError ? error.description : String(error)});
                this.requestRender();
                return Promise.resolve();
            }
        }
        const releaseBatch = this.figureExports.admitBatch();
        if (!releaseBatch) return Promise.resolve();

        this.beforeFigureCapture();
        const previousPointerEvents = boardContainer.style.pointerEvents;
        this.graphInteractionLocked = true;
        boardContainer.style.pointerEvents = "none";
        const releaseLockTransition = session.beginTransition();

        return new Promise<void>(resolve => {
            let settled = false;
            const finish = () => {
                if (settled) return;
                settled = true;
                session.signal.removeEventListener("abort", abort);
                resolve();
            };
            const abort = () => {
                releaseLockTransition();
                finish();
            };
            session.signal.addEventListener("abort", abort, {once: true});
            this.requestRender(() => {
                releaseLockTransition();
                if (this.graphSession !== session || !session.isAlive) {
                    finish();
                    return;
                }
                const owner: FigureBatchOwner<Preset, FigureBatchScene<D>> = {
                    isAlive: () => this.graphSession === session && session.isAlive,
                    signal: session.signal,
                    waitUntilReady: () => session.waitUntilReady(),
                    getCaptureTarget: () => this.createFigureCaptureTarget(session),
                    captureEntryState: () => ({
                        preset: cloneLessonValue(this.exportPreset()),
                        transientState: cloneLessonValue(this.captureTransientState()),
                    }),
                    // Each Preset figure shows the Preset as loading it would: with fresh transient state.
                    applyPreset: (preset, operationSignal) => this.applyFigurePreset(session, preset, operationSignal),
                    restoreEntryState: (scene, operationSignal) => this.applyFigurePreset(session, scene.preset, operationSignal, scene),
                };
                void downloadPresetFigures(owner, presets).finally(() => {
                    if (this.graphSession !== session || !session.isAlive) {
                        finish();
                        return;
                    }
                    boardContainer.style.pointerEvents = previousPointerEvents;
                    this.graphInteractionLocked = false;
                    releaseBatch(finish);
                });
            });
        });
    }

    /**
     * Replaces the live scene with a Preset (a stored Preset, the default scene, a batch figure or the batch entry scene).
     * `transientState` is the entry scene's captured transient state; without it the scene starts with fresh transient
     * state, as loading the Preset would.
     */
    private async applyFigurePreset(
        session: GraphSession,
        preset: Preset,
        operationSignal: AbortSignal,
        entry?: FigureBatchScene<D>,
    ): Promise<void> {
        const transientState = entry?.transientState;
        // A persisted Preset is checked before the scene is touched. The entry scene is a trusted capture of the live graph.
        let checked: CheckedPreset | undefined;
        if (!entry) {
            try { checked = this.checkPersistedPreset(preset); } catch (error) {
                const reason = error instanceof LocalizedError ? error.description : message("preset_entry_refused", {value0: String(error)});
                this.presetNoticeValue = message("preset_entry_refused", {value0: reason});
                this.requestRender();
                throw error;
            }
        }
        const generation = ++this.figureSceneGeneration;
        const isCurrent = () => this.graphSession === session && session.isAlive &&
            !operationSignal.aborted && generation === this.figureSceneGeneration;
        if (!isCurrent()) return;
        this.activeSceneReplacements++;
        this.requestRender();
        try {
            const releaseTransition = session.beginTransition();
            try {
                this.stopLessonAnimations();
                await replaceScene(this.sceneReplacementHost(session), {
                    dispose: true,
                    suspendBoard: true,
                    // `restoreEntryState` imports the entry scene captured from the live graph, so there is no stored
                    // data to check against the Preset collection; a missing payload is the default scene.
                    importData: () => {
                        if (checked) this.importFigurePresetData(checked);
                        else if (entry) this.importPresetData(entry.preset.data == null ? cloneLessonValue(this.defaultPreset()) : cloneLessonValue(entry.preset.data));
                    },
                    workspaceRevisionAfterImport: true,
                    state: {
                        mode: 'deferred',
                        next: () => this.figurePresetGraphState((checked ?? preset).graphState, (checked ?? preset).data),
                        isCurrent,
                        signal: operationSignal,
                        onCancel: () => { if (generation === this.figureSceneGeneration) this.figureSceneGeneration++; },
                    },
                    // Each Preset figure shows the Preset as loading it would: fresh transient state without an entry scene.
                    transientState: cloneLessonValue(transientState),
                    initialize: true,
                    finish: () => {
                        const boardState = (checked ?? preset).boardState;
                        if (boardState && this.hasBoard) this.board.setBoundingBox(boardState.boundingBox, this.equalAxisUnits);
                        this.boardUpdate();
                        session.requestFullUpdate();
                    },
                });
            } finally {
                releaseTransition();
            }
            if (!operationSignal.aborted && session.isAlive) await session.waitUntilReady();
        } finally {
            this.activeSceneReplacements = Math.max(0, this.activeSceneReplacements - 1);
            this.requestRender();
        }
    }

    /**
     * Replaces the whole scene state (keys the new state does not have are dropped, unlike `setState`). The deferred
     * `onStateChange` still receives the state from before the load, so the board syncs to what changed.
     */
    private replaceSceneState(next: () => S | null, callback: () => void): void {
        const state = next();
        if (state === null) {
            this.setState(() => null, callback);
            return;
        }
        this.pendingCallbacks.push(callback);
        this.replaceState(state);
    }

    /** Replaces the whole scene state synchronously; the deferred `onStateChange` still sees the state from before. */
    protected replaceState(next: S): void {
        const before = this.store.getState();
        if (this.pendingPreviousState === undefined) this.pendingPreviousState = before;
        this.store.replaceState(next);
    }

    private importBoardState(boardState: BoardState) {
        if (!this.hasBoard) return;
        this.board.setBoundingBox(boardState.boundingBox, this.equalAxisUnits);
        this.board.fullUpdate();
    }

}

export default BaseGraph;

