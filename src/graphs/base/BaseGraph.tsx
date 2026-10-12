import {t, useLanguage} from "../../localization";
import React from 'react';


import {Board} from "jsxgraph";
import {fitBoundingBox} from "./fitBoundingBox";
import {SizeContext} from "../context/SizeContext";
import {Commands} from "./Commands";
import {AxisStyles} from "../styles/AxisStyles";
import Slider from "../../inputs/Slider";
import {Preset, PresetService} from "./presets/Presets";
import {PresetSelector} from "./PresetSelector";
import {SaveImage} from "./SaveImage";
import {AxisSelector} from "./AxisSelector";
import {SceneStateUpdate, SceneStore} from "./SceneStore";
import {LessonAction, LessonGraphCapabilities, LessonSceneCheckpoint, UnsupportedLessonActionError} from '../../learning/model';
import {GraphSession} from "./GraphSession";
import {downloadPNG, downloadSVG} from "./export/FigureCapture";
import {downloadPresetFigures, FigureBatchOwner} from "./export/PresetFigureBatch";


function SizeRange(props: { board: () => JXG.Board }) {
    useLanguage();
    return <div><Slider customText={t("graph_element_size")} help={t("size_of_points_lines_and_labels_does_not_change_the_viewport_zoom")} min={0} max={25} initialValue={SizeContext.getSize()} step={1}
                        onChange={(i) => {
                            SizeContext.setSize(i);
                            props.board().fullUpdate();
                        }}/></div>;
}

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

/** What the app shell tells the controller when it mounts. */
export interface GraphMountContext {
    /** Id of the browser-local preset selected in the app shell ("" for none). */
    selectedPreset: string;
}


/** Props the host passes to `DemonstrationWorkspace` for one render of the graph's panels. */
export interface GraphWorkspacePanels {
    title: React.ReactNode;
    description: string;
    edit: React.ReactNode;
    display: React.ReactNode;
    save: React.ReactNode;
    navigate: (action: string) => void;
    graphBusy: boolean;
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
    /** State from before the first update that `onStateChange` has not seen yet. */
    private pendingPreviousState?: S;
    private pendingCallbacks: Array<() => void> = [];
    private hasBeenMounted = false;
    protected board!: Board;
    protected graphSession?: GraphSession;
    protected graphInteractionLocked = false;
    private initialFigureGraphState?: S;
    private figureSceneGeneration = 0;
    private figureBatchActive = false;
    private activeSingleFigureExports = 0;
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
        return <><div className="inspector-control"><AxisSelector board={() => this.board}/></div>
            <SizeRange board={() => this.board}/></>;
    }
    protected workspaceSave(): React.ReactNode {
        return <><div className="inspector-group"><h3>{t("presets_in_this_browser")}</h3>
            {this.presetService && <PresetSelector presetService={this.presetService}
                batchExporter={presets => this.exportPresetFigures(presets)} presetProvider={() => this.exportPreset()}/>}</div>
            <div className="inspector-group"><h3>{t("export_figure")}</h3><SaveImage showLabel={false} saveAsSVG={name => this.saveAsSVG(name)}
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

    protected applyLessonAction(action: LessonAction): void {
        if (action.kind === 'prepared-scene' && action.source === 'demonstration-default') {
            this.prepareLessonDefaultScene();
            return;
        }
        throw new UnsupportedLessonActionError(action);
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
        this.board.setBoundingBox(state.boardState.boundingBox, true);
        this.setState(cloneLessonValue(state.graphState) as S);
        this.boardUpdate();
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
            const box = fitBoundingBox(points, parseFloat(String(width)), parseFloat(String(height)));
            if (box) {
                this.board.setBoundingBox(box, true, 'update');
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
    mount(container: HTMLElement, context: GraphMountContext = {selectedPreset: ""}): void {
        if (!this.graphSession?.isAlive) {
            const session = new GraphSession();
            this.graphSession = session;
            // A remount starts from a fresh scene state, exactly like a new instance.
            if (this.hasBeenMounted) this.store.replaceState(this.getInitialState());
            this.hasBeenMounted = true;
            this.initialFigureGraphState = cloneLessonValue(this.state);
            // JXG.Options.text.display = 'internal';
            this.board = session.createBoard(container, {
                showFullscreen: false,
                boundingBox: [-5, 5, 5, -5],
                axis: true,
                keepAspectRatio: true,
                showScreenshot: false,
                showCopyright: false,
                showNavigation: false,
                defaultAxes: {
                    x: AxisStyles.defaultX,
                    y: AxisStyles.defaultY
                },
            });

            this.setBaseState({initialized: true});
            const preset = this.presetService?.getPreset(context.selectedPreset);
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
        return downloadSVG(this.getFigureCaptureTarget(session), fileName)
            .finally(() => { this.activeSingleFigureExports = Math.max(0, this.activeSingleFigureExports - 1); });
    }


    /** The panels of one render, called by the host. */
    getWorkspacePanels(context: GraphPanelContext): GraphWorkspacePanels {
        return {
            title: this.workspaceTitle(context), description: this.workspaceDescription(context),
            edit: this.state.initialized ? this.workspaceEdit() : <p>{t("preparing_graph")}</p>,
            display: this.state.initialized ? this.workspaceDisplay() : null,
            save: this.workspaceSave(), navigate: action => this.navigateBoard(action), graphBusy: this.figureBatchActive,
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
        return downloadPNG(this.getFigureCaptureTarget(session), fileName)
            .finally(() => { this.activeSingleFigureExports = Math.max(0, this.activeSingleFigureExports - 1); });
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
                });
            });
        });
    }

    private async applyFigurePreset(
        session: GraphSession,
        preset: Preset,
        operationSignal: AbortSignal,
        runtimeState?: unknown,
    ): Promise<void> {
        const generation = ++this.figureSceneGeneration;
        const isCurrent = () => this.graphSession === session && session.isAlive &&
            !operationSignal.aborted && generation === this.figureSceneGeneration;
        if (!isCurrent()) return;
        const releaseTransition = session.beginTransition();
        try {
            this.stopLessonAnimations();
            this.board.suspendUpdate();
            try {
                this.disposeFigureScene();
                const preservedBoardObjects = this.boardInfrastructureObjectClosure();
                const remainingObjects = this.board.objectsList.filter((object: any) => !preservedBoardObjects.has(object)).reverse() as any[];
                if (remainingObjects.length) this.board.removeObject(remainingObjects);
                this.importFigurePresetData(preset);
            } finally {
                if (this.graphSession === session && session.isAlive) this.board.unsuspendUpdate();
            }

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
                    this.setState(() => isCurrent() ? nextState : null, () => {
                        if (!isCurrent()) {
                            finish(resolve);
                            return;
                        }
                        try {
                            this.initialize();
                            this.restoreFigureRuntimeState(runtimeState);
                            if (preset.boardState) this.board.setBoundingBox(preset.boardState.boundingBox, true);
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
        this.board.setBoundingBox(boardState.boundingBox, true);
        this.board.fullUpdate();
    }

}

export default BaseGraph;

