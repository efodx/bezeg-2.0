import {t, useLanguage, beginFigureExport, reportFigureExportFailure} from "../../localization";
import React, {Component, useRef, useState} from 'react';


import {Board, JSXGraph} from "jsxgraph";
import {JGBox} from "../../JGBox";
import {Col, Container, Overlay, Popover, Row} from "react-bootstrap";
import {SizeContext} from "../context/SizeContext";
import {Commands} from "./Commands";
import {Tools} from "./Tools";
import {AxisStyles} from "../styles/AxisStyles";
import Slider from "../../inputs/Slider";
import html2canvas from "html2canvas";
import {geometryCache} from "../../bezeg/cache/GeometryCache";
import {Preset, PresetService} from "./presets/Presets";
import {SiteContext} from "../context/react/SiteContext";
import {PresetSelector} from "./PresetSelector";
import {SaveImage} from "./SaveImage";
import {AxisSelector} from "./AxisSelector";
import {AxisContext} from "../context/AxisContext";
import ToolTippedButton from "../../inputs/ToolTippedButton";
import {ImageStore} from "./ImageStore";
import {DemonstrationWorkspace} from "./DemonstrationWorkspace";
import {LessonAction, LessonGraphCapabilities, LessonSceneCheckpoint, UnsupportedLessonActionError} from '../../learning/model';


function Help() {
    useLanguage();
    const [show, setShow] = useState(false);
    const [target, setTarget] = useState(null);
    const ref = useRef(null);

    const handleClick = (event: any) => {
        setShow(!show);
        setTarget(event.target);
    };


    return (
        <div className={'help-button'} ref={ref}>
            <ToolTippedButton tooltip={t("help")} onClick={handleClick}>🛈</ToolTippedButton>
            <Overlay
                show={show}
                target={target}
                placement="top-start"
                container={ref}
                containerPadding={20}
            >
                <Popover id="popover-contained">
                    <Popover.Header as="h3">{t("navigating_the_graph")}</Popover.Header>
                    <Popover.Body>
                        <strong>{t("pan")}</strong>:
                        <div><strong>Shift</strong> + <strong>{t("left_mouse_button")}</strong></div>
                    </Popover.Body>
                    <Popover.Body>
                        <strong>{t("zoom")}</strong>:
                        <div>
                            <strong>Shift</strong> + <strong>{t("mouse_wheel")}</strong>
                        </div>
                    </Popover.Body>
                </Popover>
            </Overlay>
        </div>
    );
}

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

/**
 * Abstract class for creating graphs.
 */
abstract class BaseGraph<P, S extends BaseGraphState> extends Component<P, S> {
    static override contextType = SiteContext;
    // TODO fix this, it doesn't work for some reason :/
    //  declare context: React.ContextType<typeof PresetContext>

    presetService: PresetService | undefined;
    protected board!: Board;
    private resizeObserver?: ResizeObserver;
    private readonly lessonCapabilityAdapter: LessonGraphCapabilities = {
        captureState: () => this.captureLessonState(),
        restoreState: checkpoint => this.restoreLessonState(checkpoint),
        apply: action => this.applyLessonAction(action),
        stopAnimations: () => this.stopLessonAnimations(),
        isAvailable: () => Boolean(this.board),
    };

    protected workspaceTitle(): React.ReactNode | undefined { return (this.context as React.ContextType<typeof SiteContext>).workspace?.title; }
    protected workspaceDescription(): string { return (this.context as React.ContextType<typeof SiteContext>).workspace?.description ?? t("change_the_settings_and_observe_their_effect_on_the_graph"); }
    protected workspaceEdit(): React.ReactNode { return this.getGraphCommandsArea(); }
    protected workspaceDisplay(): React.ReactNode {
        return <><div className="inspector-control"><AxisSelector board={() => this.board}/></div>
            <SizeRange board={() => this.board}/></>;
    }
    protected workspaceSave(): React.ReactNode {
        return <><div className="inspector-group"><h3>{t("presets_in_this_browser")}</h3>
            {this.presetService && <PresetSelector presetService={this.presetService}
                exporter={(name: string) => this.saveAsPNG(name)} presetProvider={() => this.exportPreset()}/>}</div>
            <div className="inspector-group"><h3>{t("export_figure")}</h3><SaveImage saveAsSVG={name => this.saveAsSVG(name)}
                saveAsPNG={name => this.saveAsPNG2(name)}/></div></>;
    }

    /** Exposes graph-owned behavior without leaking boards, controls, or Preset DTOs. */
    public getLessonCapabilities(): LessonGraphCapabilities {
        return this.lessonCapabilityAdapter;
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
        if (!this.board) throw new Error('The graph is still preparing. Try again in a moment.');
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

    protected captureLessonState(): LessonSceneCheckpoint {
        if (!this.board) throw new Error('The graph is still preparing. Try again in a moment.');
        return {
            version: 1,
            value: cloneLessonValue({
                boardState: this.boardState(),
                graphState: this.state,
                data: this.exportPresetData(),
            }),
        };
    }

    private restoreLessonState(checkpoint: LessonSceneCheckpoint): void {
        if (!this.board) return;
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
            // JSXGraph fits visible points; an empty set would zoom into the origin.
            const hasVisiblePoints = this.board.objectsList.some(object => JXG.isPoint(object) && object.visPropCalc.visible);
            if (hasVisiblePoints) { this.board.zoomAllPoints(); }
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
        if (this.board == null) {
            // JXG.Options.text.display = 'internal';
            this.board = JSXGraph.initBoard("jgbox", {
                showFullscreen: false,
                boundingBox: [-5, 5, 5, -5],
                // @ts-ignore
                axis: AxisContext.axisVisible,
                keepAspectRatio: true,
                showScreenshot: false,
                showCopyright: false,
                showNavigation: false,
                defaultAxes: {
                    x: AxisStyles.defaultX,
                    y: AxisStyles.defaultY
                },
            });

            // this is a way to brute force the updates, but it is not efficient.... like ... AT ALL. Avoid this and use it only when testing.
            // PLEASE DO NOT LET THIS INTO PRODUCTION... PLEASE
            // this.board.on('update', (e) => {
            //    geometryCache.invalidate()
            // });


            let siteContext = this.context;
            this.setState({initialized: true});
            // @ts-ignore
            const preset = this.presetService?.getPreset(siteContext.preset.selected);
            if (preset) {
                console.debug("Loading preset:");
                console.debug(preset);
                this.importPreset(preset);
            } else {
                console.debug("Loading default preset:");
                console.debug(this.defaultPreset());
                this.importPresetData(this.defaultPreset());
            }
            // TODO We should remove this...
            this.initialize();
            if (this.workspaceTitle() && typeof ResizeObserver !== "undefined") {
                this.resizeObserver = new ResizeObserver(entries => {
                    const {width, height} = entries[0].contentRect;
                    if (width > 0 && height > 0) { this.board.resizeContainer(width, height, true); }
                });
                this.resizeObserver.observe(document.getElementById("jgbox")!);
            }
        }
    }

    override componentWillUnmount() {
        this.resizeObserver?.disconnect();
        if (this.workspaceTitle() && this.board) {
            JSXGraph.freeBoard(this.board);
            this.board = undefined as unknown as Board;
        }
    }

    saveAsSVG(fileName: string) {
        const finish = beginFigureExport();
        try {
        // @ts-ignore
        var svg = new XMLSerializer().serializeToString(this.board.renderer.svgRoot);
        const file = new File([svg], fileName, {type: "image/svg+xml"});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(file);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        } catch { reportFigureExportFailure(); } finally { finish(); }
    }


    override render() {
        const presetsId = this.presets();
        if (presetsId) {
            this.presetService = new PresetService(presetsId);
        }
        // @ts-ignore
        const fullScreenContext = this.context.fullScreen;
        const title = this.workspaceTitle();
        if (title) {
            return <DemonstrationWorkspace title={title} description={this.workspaceDescription()}
                edit={this.state.initialized ? this.workspaceEdit() : <p>{t("preparing_graph")}</p>}
                display={this.state.initialized ? this.workspaceDisplay() : null}
                save={this.workspaceSave()} navigate={action => this.navigateBoard(action)}
                // A deep link can request a lesson before JSXGraph has created
                // its board. Do not mount the session until the graph-owned
                // capability is ready; otherwise captureState() fails once
                // and the overlay has no reason to retry.
                lessonCapabilities={this.state.initialized ? this.getLessonCapabilities() : undefined}/>;
        }
        return <Container fluid>
            <Row className={"align-items-center"} style={{height: "92vh"}}>
                <Col className={(fullScreenContext.fullScreen ? 'tools-fs' : '')}
                     xs={0} lg={2}><Tools
                    tools={this.getTools()}/></Col>
                <Col className={fullScreenContext.fullScreen ? 'graph-fs' : 'graph'} xs={12}
                     lg={fullScreenContext.fullScreen ? 12 : 8}><JGBox/>
                    <div className={"help-container"}><Help></Help>
                        <div className={"fs-button"}>
                            <ToolTippedButton tooltip={t("presentation_mode")}
                                              onClick={() => fullScreenContext.setFullScreen(!fullScreenContext.fullScreen)}>⛶</ToolTippedButton>
                        </div>
                    </div>
                </Col>
                <Col className={fullScreenContext.fullScreen ? 'graph-commands-fs' : 'graph-commands'}
                     xs={0}
                     lg={2}>{this.getGraphCommandsArea()}</Col>
            </Row>
        </Container>;
    }

    unsuspendBoardUpdate() {
        this.boardUpdate();
        this.board.unsuspendUpdate();
    }

    getGraphCommands(): JSX.Element[] {
        return [];
    }

    getTools(): JSX.Element[] {
        const tools = [<AxisSelector board={() => this.board}></AxisSelector>,
            <SizeRange board={() => this.board}/>,
            <SaveImage saveAsSVG={name => this.saveAsSVG(name)} saveAsPNG={name => this.saveAsPNG2(name)}/>,
        ];
        if (this.presetService) {
            tools.push(<PresetSelector presetService={this.presetService}
                                       exporter={(fileName: string) => this.saveAsPNG(fileName)}
                                       presetProvider={() => this.exportPreset()}/>);
        }
        return tools;
    }

    boardUpdate() {
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

    private async saveAsPNG(fileName: string) {
        const finish = beginFigureExport();
        const mmls = document.querySelectorAll<HTMLElement>("mjx-assistive-mml");
        mmls.forEach(el =>
            el.style.setProperty("display", "none", "important"));
        try {
            const canvas = await html2canvas(document.getElementById('jgbox') as HTMLElement);
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve));
            if (!blob) throw new Error('PNG capture failed');
            ImageStore.addImage(blob, fileName);
        } finally {
        mmls.forEach(el =>
            el.style.removeProperty("display"));
            finish();
        }
    }

    private async saveAsPNG2(fileName: string) {
        const finish = beginFigureExport();
        const mmls = document.querySelectorAll<HTMLElement>("mjx-assistive-mml");
        mmls.forEach(el =>
            el.style.setProperty("display", "none", "important"));
        try {
            const canvas = await html2canvas(document.getElementById('jgbox') as HTMLElement);
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch { reportFigureExportFailure(); } finally {
        mmls.forEach(el =>
            el.style.removeProperty("display"));
            finish();
        }
    }

    private importBoardState(boardState: BoardState) {
        this.board.setBoundingBox(boardState.boundingBox, true);
        this.board.fullUpdate();
    }

}

export default BaseGraph;

