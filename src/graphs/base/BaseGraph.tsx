import {t, useLanguage} from "../../localization";
import React, {Component} from 'react';


import {Board} from "jsxgraph";
import {fitBoundingBox} from "./fitBoundingBox";
import {SizeContext} from "../context/SizeContext";
import {Commands} from "./Commands";
import {AxisStyles} from "../styles/AxisStyles";
import Slider from "../../inputs/Slider";
import {geometryCache} from "../../bezeg/cache/GeometryCache";
import {Preset, PresetService} from "./presets/Presets";
import {SiteContext} from "../context/react/SiteContext";
import {PresetSelector} from "./PresetSelector";
import {SaveImage} from "./SaveImage";
import {AxisSelector} from "./AxisSelector";
import {DemonstrationWorkspace} from "./DemonstrationWorkspace";
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

/**
 * Abstract class for creating graphs.
 */
abstract class BaseGraph<P, S extends BaseGraphState> extends Component<P, S> {
    static override contextType = SiteContext;
    // TODO fix this, it doesn't work for some reason :/
    //  declare context: React.ContextType<typeof PresetContext>

    presetService: PresetService | undefined;
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

    protected workspaceTitle(): React.ReactNode { return (this.context as React.ContextType<typeof SiteContext>).workspace?.title ?? "Bezeg"; }
    protected workspaceDescription(): string { return (this.context as React.ContextType<typeof SiteContext>).workspace?.description ?? t("change_the_settings_and_observe_their_effect_on_the_graph"); }
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

    override componentDidMount() {
        if (!this.graphSession?.isAlive) {
            const session = new GraphSession();
            this.graphSession = session;
            this.initialFigureGraphState = cloneLessonValue(this.state);
            // JXG.Options.text.display = 'internal';
            this.board = session.createBoard("jgbox", {
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

            const siteContext = this.context as React.ContextType<typeof SiteContext>;
            this.setState({initialized: true});
            const preset = this.presetService?.getPreset(siteContext.preset.selected);
            if (preset) {
                this.importPreset(preset);
            } else {
                this.importPresetData(this.defaultPreset());
            }
            // TODO We should remove this...
            this.initialize();
            const container = document.getElementById("jgbox");
            if (container) {
                session.observeResize(container);
            }
            session.markReady();
        }
    }

    override componentWillUnmount() {
        this.figureSceneGeneration++;
        this.figureBatchActive = false;
        this.graphInteractionLocked = false;
        const session = this.graphSession;
        this.graphSession = undefined;
        this.board = undefined as unknown as Board;
        session?.dispose();
    }

    saveAsSVG(fileName: string) {
        const session = this.getActiveGraphSession();
        if (!session || this.figureBatchActive || this.activeSingleFigureExports > 0) return Promise.resolve();
        this.activeSingleFigureExports++;
        return downloadSVG(this.getFigureCaptureTarget(session), fileName)
            .finally(() => { this.activeSingleFigureExports = Math.max(0, this.activeSingleFigureExports - 1); });
    }


    override render() {
        const presetsId = this.presets();
        if (presetsId) {
            this.presetService = new PresetService(presetsId);
        }
        return <DemonstrationWorkspace title={this.workspaceTitle()} description={this.workspaceDescription()}
            edit={this.state.initialized ? this.workspaceEdit() : <p>{t("preparing_graph")}</p>}
            display={this.state.initialized ? this.workspaceDisplay() : null}
            save={this.workspaceSave()} navigate={action => this.navigateBoard(action)} graphBusy={this.figureBatchActive}
            // A deep link can request a lesson before JSXGraph has created
            // its board. Do not mount the session until the graph-owned
            // capability is ready; otherwise captureState() fails once
            // and the overlay has no reason to retry.
            lessonCapabilities={this.state.initialized ? this.getLessonCapabilities() : undefined}/>;
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
        geometryCache.invalidate();
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
            this.setState({...preset.graphState, initialized: true});
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
            this.forceUpdate(() => {
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
                    this.forceUpdate(finish);
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

