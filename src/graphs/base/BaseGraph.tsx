import {t} from "../../localization";
import React from 'react';


import {Board} from "jsxgraph";
import {fitBoundingBox} from "./fitBoundingBox";
import {Commands} from "./Commands";
import {firstUnusedPresetName, Preset, PresetService} from "./presets/Presets";
import {PresetSelector} from "./PresetSelector";
import {SaveImage} from "./SaveImage";
import {AxisSelector} from "./AxisSelector";
import {SizeRange} from "./SizeRange";
import {SceneStateUpdate, SceneStore} from "./SceneStore";
import {LessonAction, LessonGraphCapabilities, LessonSceneCheckpoint, UnsupportedLessonActionError} from '../../learning/model';
import {GraphSession} from "./GraphSession";
import {LessonActionRegistry} from "./lesson/LessonActionRegistry";
import {AxisSelect, DisplaySettings} from "./DisplaySettings";
import {GraphStyles, stylesFor} from "../styles/GraphStyles";
import {downloadPNG, downloadSVG} from "./export/FigureCapture";
import {downloadPresetFigures, FigureBatchOwner} from "./export/PresetFigureBatch";


function cloneLessonValue<T>(value: T): T {
    if (value === undefined) return value;
    return JSON.parse(JSON.stringify(value)) as T;
}

function isLessonState(value: unknown): value is {boardState: BoardState; graphState: unknown; data: unknown} {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as {boardState?: {boundingBox?: unknown}};
    const boundingBox = candidate.boardState?.boundingBox;
    return Array.isArray(boundingBox) && boundingBox.length === 4;
}

export interface BaseGraphState {
    initialized: boolean
}

export interface BoardState {
    boundingBox: [number, number, number, number]
}

interface FigureBatchScene {
    preset: Preset;
    runtimeState: unknown;
}

/** What the app shell tells the host about the route, passed in for each render of the panels. */
export interface GraphPanelContext {
    /** Workspace title of the current route, if the app shell provides one. */
    title?: React.ReactNode;
    description?: string;
}

/** Bounding box a new board starts with, and a reset returns to. */
const DEFAULT_BOUNDING_BOX: [number, number, number, number] = [-5, 5, 5, -5];

/** Props the host passes to `DemonstrationWorkspace` for one render of the graph's panels. */
export interface GraphWorkspacePanels {
    title: React.ReactNode;
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
 * `P` is the historical props type parameter; graphs take no props any more.
 */
abstract class BaseGraph<S extends BaseGraphState> {
    private sceneStore?: SceneStore<S>;
    private presetServiceInstance?: PresetService;
    private lessonActionRegistry?: LessonActionRegistry;
    /** State from before the first update that `onStateChange` has not seen yet. */
    private pendingPreviousState?: S;
    private pendingCallbacks: Array<() => void> = [];
    private hasBeenMounted = false;
    private selectedPresetIdValue = "";
    private presetListVersionValue = 0;
    /** An import changed the stored presets while an export was running; the scene reloads when it finishes. */
    private reloadAfterExportPending = false;
    /** Counts scene replacements; keyed onto scene-backed inspector controls so they re-seed from the new scene. */
    protected workspaceRevision = 0;
    private displaySettingsInstance?: DisplaySettings;
    protected board!: Board;
    protected graphSession?: GraphSession;
    protected graphInteractionLocked = false;
    private initialFigureGraphState?: S;
    private figureSceneGeneration = 0;
    private figureBatchActive = false;
    private activeSingleFigureExports = 0;
    private activeSceneReplacements = 0;
    private readonly lessonCapabilityAdapter: LessonGraphCapabilities = {
        captureState: () => this.captureLessonState(),
        restoreState: checkpoint => this.restoreLessonState(checkpoint),
        apply: action => this.applyLessonAction(action),
        stopAnimations: () => this.stopLessonAnimations(),
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
        if (this.graphSession?.isAlive) this.board.fullUpdate();
    }

    setAxisSelect(selected: AxisSelect): void {
        this.displaySettings.setAxisSelect(selected);
        this.store.notify();
        if (this.graphSession?.isAlive) this.board.fullUpdate();
    }

    setPointLabelsVisible(visible: boolean): void {
        this.displaySettings.pointLabelsVisible = visible;
        this.store.notify();
        if (!this.graphSession?.isAlive) return;
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
        this.selectedPresetIdValue = id;
        return this.reloadSelectedScene();
    }

    /** Reloads the selected preset, or the default scene, into the live board. */
    reset(): Promise<void> {
        return this.reloadSelectedScene();
    }

    /** Called after presets were imported: refreshes the list and reloads the selection, which may have changed. */
    reloadAfterImport(): Promise<void> {
        this.presetListVersionValue++;
        if (this.exportBusy) {
            this.reloadAfterExportPending = true;
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
        service.savePreset({...this.exportPreset(), id});
        this.selectedPresetIdValue = id;
        this.presetListVersionValue++;
        this.requestRender();
    }

    /** Deletes the selected preset and loads the first remaining one, or the default scene. */
    deleteSelectedPreset(): Promise<void> {
        const service = this.presetService;
        if (!service || !this.selectedPresetIdValue || this.exportBusy) return Promise.resolve();
        const remaining = service.removePreset(this.selectedPresetIdValue);
        this.selectedPresetIdValue = remaining.data[0]?.id ?? "";
        this.presetListVersionValue++;
        return this.reloadSelectedScene();
    }

    private reloadSelectedScene(): Promise<void> {
        const session = this.getActiveGraphSession();
        if (!session) {
            // Not mounted: the selection is applied by the next mount().
            this.requestRender();
            return Promise.resolve();
        }
        if (this.exportBusy) {
            this.reloadAfterExportPending = true;
            this.requestRender();
            return Promise.resolve();
        }
        const stored = this.presetService?.getPreset(this.selectedPresetIdValue);
        if (!stored) this.selectedPresetIdValue = "";
        this.requestRender();
        // A new board starts at the default view; a stored preset's own view is applied after the scene.
        this.board.setBoundingBox(DEFAULT_BOUNDING_BOX, true);
        return this.applyFigurePreset(session, stored ?? {id: ""}, session.signal, undefined, true)
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
        return this.figureBatchActive || this.activeSingleFigureExports > 0;
    }

    /** True while an export or scene replacement makes it unsafe to open the demonstration picker. */
    protected get pickerUnavailable(): boolean {
        return this.exportBusy || this.activeSceneReplacements > 0;
    }

    /** Runs a reload that an import had to defer until the running export finished. */
    private runPendingReload(): void {
        if (!this.reloadAfterExportPending || this.exportBusy || !this.graphSession?.isAlive) return;
        this.reloadAfterExportPending = false;
        void this.reloadSelectedScene();
    }

    /**
     * Resets graph-owned instance fields that a new instance would start with, before a preset, the default scene or an
     * import replaces the scene in place. Not called when an export restores the scene it started from.
     */
    protected resetSceneFields(): void {
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
        return this.figureBatchActive;
    }

    protected workspaceTitle(context: GraphPanelContext): React.ReactNode { return context.title ?? "Bezeg"; }
    protected workspaceDescription(context: GraphPanelContext): string { return context.description ?? t("change_the_settings_and_observe_their_effect_on_the_graph"); }
    protected workspaceEdit(): React.ReactNode { return this.getGraphCommandsArea(); }
    protected workspaceDisplay(): React.ReactNode {
        return <><div className="inspector-control"><AxisSelector selected={this.displaySettings.getAxisSelect()}
                onChange={selected => this.setAxisSelect(selected)}/></div>
            <SizeRange size={this.displaySettings.getSize()} onChange={size => this.setElementSize(size)}/></>;
    }
    protected workspaceSave(): React.ReactNode {
        return <><div className="inspector-group"><h3>{t("presets_in_this_browser")}</h3>
            {this.presetService && <PresetSelector presetService={this.presetService}
                selectedPresetId={this.selectedPresetId} presetListVersion={this.presetListVersion}
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
            if (action.source !== 'demonstration-default') throw new UnsupportedLessonActionError(action);
            this.prepareLessonDefaultScene();
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

    /** Restores a static lesson scene through the graph's own preset importer. */
    protected prepareLessonDefaultScene(): void {
        if (!this.graphSession?.isReady) throw new Error('The graph is still preparing. Try again in a moment.');
        this.importPresetData(cloneLessonValue(this.defaultPreset()));
        this.setState(this.lessonDefaultState());
        this.boardUpdate();
    }

    protected lessonDefaultState(): S {
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
        this.importPresetData(preset.data == null ? cloneLessonValue(this.defaultPreset()) : cloneLessonValue(preset.data));
    }

    protected figurePresetGraphState(graphState: BaseGraphState | undefined, runtimeState?: unknown): S {
        return {
            ...(this.initialFigureGraphState ?? this.state),
            ...(graphState ? cloneLessonValue(graphState) : {}),
            initialized: true,
        } as S;
    }

    protected captureFigureRuntimeState(): unknown {
        return undefined;
    }

    /** Captures the in-memory entry scene for reversible figure batches. */
    protected captureFigureEntryPreset(): Preset {
        return this.exportPreset();
    }

    protected restoreFigureRuntimeState(runtimeState: unknown): void {
    }

    protected captureLessonState(): LessonSceneCheckpoint {
        if (!this.graphSession?.isReady) throw new Error('The graph is still preparing. Try again in a moment.');
        return {
            version: 1,
            value: cloneLessonValue({
                boardState: this.boardState(),
                graphState: this.state,
                data: this.exportPresetData(),
            }),
        };
    }

    protected restoreLessonState(checkpoint: LessonSceneCheckpoint): void {
        if (!this.graphSession?.isReady) return;
        if (checkpoint.version !== 1 || !isLessonState(checkpoint.value)) {
            throw new Error('This lesson scene is no longer compatible with the graph.');
        }
        const state = checkpoint.value;
        if (state.data !== undefined) this.importPresetData(cloneLessonValue(state.data));
        this.board.setBoundingBox(state.boardState.boundingBox, this.equalAxisUnits);
        this.setState(cloneLessonValue(state.graphState) as S);
        this.boardUpdate();
    }

    /**
     * The box the fit button applies for the visible points and the canvas size, or undefined to leave the view alone. The default is
     * the equal-unit box of `fitBoundingBox`; a graph without equal axis units returns its own default view instead.
     */
    protected fitView(points: readonly [number, number][], width: number, height: number): [number, number, number, number] | undefined {
        return fitBoundingBox(points, width, height);
    }

    private navigateBoard(action: string) {
        if (action === 'fit') {
            // JSXGraph's zoomAllPoints depends on the current zoom, so fit from the points and canvas size alone.
            const points: [number, number][] = [];
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
            return;
        }
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
            this.board = session.createBoard(container, {
                showFullscreen: false,
                boundingBox: DEFAULT_BOUNDING_BOX,
                axis: true,
                keepAspectRatio: true,
                showScreenshot: false,
                showCopyright: false,
                showNavigation: false,
                defaultAxes: {
                    x: this.styles.axis.defaultX,
                    y: this.styles.axis.defaultY
                },
            });

            this.setBaseState({initialized: true});
            const preset = this.presetService?.getPreset(this.selectedPresetIdValue);
            // A selection whose preset no longer exists shows the default scene, so it is not a selection any more.
            if (!preset) this.selectedPresetIdValue = "";
            if (preset) {
                this.importPreset(preset);
            } else {
                this.importPresetData(this.defaultPreset());
            }
            // TODO We should remove this...
            this.initialize();
            session.observeResize(container);
            session.markReady();
        }
    }

    /** Disposes the board and everything the session owns. Pending state work is dropped; pending callbacks still settle. */
    unmount(): void {
        this.figureSceneGeneration++;
        this.figureBatchActive = false;
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
        if (!session || this.figureBatchActive || this.activeSingleFigureExports > 0) return Promise.resolve();
        this.activeSingleFigureExports++;
        this.beforeFigureCapture();
        this.requestRender();
        return downloadSVG(this.getFigureCaptureTarget(session), fileName)
            .finally(() => {
                this.activeSingleFigureExports = Math.max(0, this.activeSingleFigureExports - 1);
                this.requestRender();
                this.runPendingReload();
            });
    }


    /** The panels of one render, called by the host. */
    getWorkspacePanels(context: GraphPanelContext): GraphWorkspacePanels {
        return {
            title: this.workspaceTitle(context), description: this.workspaceDescription(context),
            edit: this.state.initialized ? this.workspaceEdit() : <p>{t("preparing_graph")}</p>,
            display: this.state.initialized ? this.workspaceDisplay() : null,
            save: this.workspaceSave(), navigate: action => this.navigateBoard(action), graphBusy: this.figureBatchActive,
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
        this.board.unsuspendUpdate();
    }

    getGraphCommands(): JSX.Element[] {
        return [];
    }

    boardUpdate() {
        if (!this.graphSession?.isAlive) return;
        this.board.update();
    }

    getGraphCommandsArea() {
        return this.getGraphCommands().length > 0 ?
            <Commands commands={this.getGraphCommands()} title={t("graph_commands")}/> : null;
    }

    presets(): undefined | string {
        return undefined;
    }

    exportPreset(): Preset {
        return {
            id: this.presets()!,
            boardState: this.boardState(),
            graphState: this.state,
            data: this.exportPresetData()
        };
    }

    importPreset(preset: Preset) {
        if (preset.boardState) {
            this.importBoardState(preset.boardState);
        }
        if (preset.graphState) {
            this.setBaseState({...preset.graphState, initialized: true});
        }
        if (preset.data) {
            this.importPresetData(preset.data);
        }
    }

    boardState(): BoardState {
        return {boundingBox: this.board.getBoundingBox()};
    }

    exportPresetData(): undefined | any {
        return undefined;
    }

    importPresetData(data: any) {
        // throw "NOT IMPLEMENTED"
    }

    abstract defaultPreset(): string

    private saveAsPNG2(fileName: string): Promise<void> {
        const session = this.getActiveGraphSession();
        if (!session || this.figureBatchActive || this.activeSingleFigureExports > 0) return Promise.resolve();
        this.activeSingleFigureExports++;
        this.beforeFigureCapture();
        this.requestRender();
        return downloadPNG(this.getFigureCaptureTarget(session), fileName)
            .finally(() => {
                this.activeSingleFigureExports = Math.max(0, this.activeSingleFigureExports - 1);
                this.requestRender();
                this.runPendingReload();
            });
    }

    private getFigureCaptureTarget(session: GraphSession) {
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
        if (!session || this.figureBatchActive || this.activeSingleFigureExports > 0) return Promise.resolve();

        this.beforeFigureCapture();
        const boardContainer = this.board.containerObj as HTMLElement;
        const previousPointerEvents = boardContainer.style.pointerEvents;
        this.figureBatchActive = true;
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
                const owner: FigureBatchOwner<Preset, FigureBatchScene> = {
                    isAlive: () => this.graphSession === session && session.isAlive,
                    signal: session.signal,
                    waitUntilReady: () => session.waitUntilReady(),
                    getCaptureTarget: () => this.getFigureCaptureTarget(session),
                    captureEntryState: () => ({
                        preset: cloneLessonValue(this.captureFigureEntryPreset()),
                        runtimeState: cloneLessonValue(this.captureFigureRuntimeState()),
                    }),
                    applyPreset: (preset, operationSignal) => this.applyFigurePreset(session, preset, operationSignal),
                    restoreEntryState: (scene, operationSignal) => this.applyFigurePreset(session, scene.preset, operationSignal, scene.runtimeState),
                };
                void downloadPresetFigures(owner, presets).finally(() => {
                    if (this.graphSession !== session || !session.isAlive) {
                        finish();
                        return;
                    }
                    boardContainer.style.pointerEvents = previousPointerEvents;
                    this.graphInteractionLocked = false;
                    this.figureBatchActive = false;
                    this.requestRender(finish);
                    this.runPendingReload();
                });
            });
        });
    }

    private async applyFigurePreset(
        session: GraphSession,
        preset: Preset,
        operationSignal: AbortSignal,
        runtimeState?: unknown,
        freshScene = false,
    ): Promise<void> {
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
                this.board.suspendUpdate();
                try {
                    this.disposeFigureScene();
                    if (freshScene) this.resetSceneFields();
                    const preservedBoardObjects = this.boardInfrastructureObjectClosure();
                    const remainingObjects = this.board.objectsList.filter((object: any) => !preservedBoardObjects.has(object)).reverse() as any[];
                    if (remainingObjects.length) this.board.removeObject(remainingObjects);
                    this.importFigurePresetData(preset);
                } finally {
                    if (this.graphSession === session && session.isAlive) this.board.unsuspendUpdate();
                }

                this.workspaceRevision++;
                const nextState = this.figurePresetGraphState(preset.graphState, runtimeState);
                await new Promise<void>((resolve, reject) => {
                    let finished = false;
                    const finish = (callback: () => void) => {
                        if (finished) return;
                        finished = true;
                        operationSignal.removeEventListener("abort", cancel);
                        callback();
                    };
                    const cancel = () => {
                        if (generation === this.figureSceneGeneration) this.figureSceneGeneration++;
                        finish(resolve);
                    };
                    operationSignal.addEventListener("abort", cancel, {once: true});
                    try {
                        this.replaceSceneState(() => isCurrent() ? nextState : null, () => {
                            if (!isCurrent()) {
                                finish(resolve);
                                return;
                            }
                            try {
                                this.initialize();
                                this.restoreFigureRuntimeState(runtimeState);
                                if (preset.boardState) this.board.setBoundingBox(preset.boardState.boundingBox, this.equalAxisUnits);
                                this.boardUpdate();
                                session.requestFullUpdate();
                                finish(resolve);
                            } catch (error) {
                                finish(() => reject(error));
                            }
                        });
                    } catch (error) {
                        finish(() => reject(error));
                    }
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
        const before = this.store.getState();
        if (this.pendingPreviousState === undefined) this.pendingPreviousState = before;
        this.pendingCallbacks.push(callback);
        this.store.replaceState(state);
    }

    private boardInfrastructureObjectClosure(): Set<object> {
        const preserved = new Set<object>();
        const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
        const valuesOf = (value: unknown): unknown[] => isObject(value) ? Object.values(value) : [];
        const visit = (object: unknown): void => {
            if (!isObject(object) || preserved.has(object)) return;
            preserved.add(object);
            valuesOf(object.childElements).forEach(visit);
            valuesOf(object.ticks).forEach(visit);
            valuesOf(object.labels).forEach(visit);
            visit(object.defaultTicks);
        };
        const defaultAxes = this.board.defaultAxes;
        // JSXGraph creates one board-owned infobox even when it is hidden. It
        // remains part of its pointer/drag infrastructure for the board's
        // entire lifetime, so scene replacement must leave it in place.
        visit(this.board.infobox);
        for (const axis of [defaultAxes?.x, defaultAxes?.y]) {
            visit(axis);
            if (!isObject(axis)) continue;
            valuesOf(axis.ancestors).forEach(visit);
            visit(axis.point1);
            visit(axis.point2);
        }
        return preserved;
    }

    private importBoardState(boardState: BoardState) {
        this.board.setBoundingBox(boardState.boundingBox, this.equalAxisUnits);
        this.board.fullUpdate();
    }

}

export default BaseGraph;

