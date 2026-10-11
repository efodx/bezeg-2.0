import {t} from "../../../localization";
import {HodographInputbox} from "./HodographInputBox";
import React from "react";
import {JXGBezierCurve} from "../object/JXGBezierCurve";
import {JXGPHBezierCurve} from "../object/JXGPHBezierCurve";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import Slider from "../../../inputs/Slider";
import {PhBezierCurve} from "../../../bezeg/impl/curve/ph-bezier-curve";
import {CountSetter} from "../../../inputs/CountSetter";
import {SizeContext} from "../../context/SizeContext";
import {PointAttributes} from "jsxgraph";
import {PhBezierCurveCommands} from "../object/inputs/PhBezierCurveCommands";
import {PointImpl} from "../../../bezeg/impl/point/point-impl";
import {Point} from "../../../bezeg/api/point/point";
import {ModelPointBinding} from "../object/ModelPointBinding";
import {PointCoordinateEditor} from "../../base/PointCoordinateEditor";
import {LessonAction} from '../../../learning/model';

function formatArcLength(value: number): string {
    const locale = document.documentElement.lang === 'en' ? 'en-US' : 'sl-SI';
    return new Intl.NumberFormat(locale, {minimumFractionDigits: 3, maximumFractionDigits: 3, useGrouping: false}).format(value);
}

export interface BasePhBezierCurveGraphStates extends BaseGraphStates {
    showOffsetCurve: boolean,
    showOffsetCurveControlPoints: boolean,
    showArcLength?: boolean
}

abstract class BasePhBezierCurveGraph<P, S extends BasePhBezierCurveGraphStates> extends BaseBezierCurveGraph<P, S> {

    private hodographBoard!: JXG.Board;
    private hodographInitializedBoard?: JXG.Board;
    private pendingHodographBoundingBox?: [number, number, number, number];
    private hodographBindings: ModelPointBinding[] = [];
    private disposeHodographSessionResources?: () => void;
    /** Board text owned by this graph; removed with the figure scene and recreated after imports. */
    private arcLengthText?: JXG.Text;

    protected override workspaceUsesStructuredEditing() { return true; }
    protected override workspacePointEditing() { return false; }
    protected override workspaceDescription() { return t("explore_the_hodograph_offsets_and_their_geometry"); }
    protected override workspaceEdit(): React.ReactNode {
        const parentBoard = this.board;
        return <>{super.workspaceEdit()}{this.getSelectedCurve() && <div className="inspector-group">
            <h3>{t("hodograph")}</h3><p>{t("drag_points_w0_and_w1_to_change_the_shape_of_the_ph_curve")}</p>
            <HodographInputbox key={`hodograph-${this.workspaceRevision}`}
                setRef={board => this.setHodographBoard(board)}
                onResize={board => this.handleHodographBoardResize(board)} onDispose={() => {
                this.disposeHodographBoard(parentBoard);
            }}/><PointCoordinateEditor key={`hodograph-editor-${this.workspaceRevision}`} prefix="w" points={() => this.getFirstCurveAsPHBezierCurve().w}
                board={this.board} observeBoard={() => this.hodographBoard} onChange={() => this.boardUpdate()}/></div>}</>;
    }
    protected override workspaceDisplay(): React.ReactNode {
        return <>{super.workspaceDisplay()}<div className="inspector-group"><h3>{t("curve_offsets")}</h3>
            {PhBezierCurveCommands(this.getFirstJxgCurveAsPHCurve())}</div>
            <div className="inspector-group"><h3>{t("arc_length")}</h3>
                <OnOffSwitch initialState={this.state.showArcLength !== false}
                    onChange={checked => this.setState({...this.state, showArcLength: checked}, () => this.boardUpdate())}
                    label={t("show_arc_length")}/>
                <p>{t("arc_length_description")}</p></div></>;
    }

    override initialize() {
        super.initialize();
        this.ensureArcLengthText();
    }

    /** Preset, figure and lesson imports dispose the scene first, so the readout is recreated here. */
    override importPresetData(data: any) {
        super.importPresetData(data);
        this.ensureArcLengthText();
    }

    /** Idempotent: removes any earlier readout and creates one reading the current first curve lazily. */
    private ensureArcLengthText() {
        this.removeArcLengthText();
        const board = this.board;
        if (!board) return;
        const arcLength = () => (this.getFirstCurve() as PhBezierCurve | undefined)?.arcLength?.();
        const box = () => board.getBoundingBox();
        this.arcLengthText = board.create('text', [
            () => box()[0] + 0.02 * (box()[2] - box()[0]),
            () => box()[1] - 0.02 * (box()[1] - box()[3]),
            () => {
                const value = arcLength();
                return value === undefined || !Number.isFinite(value)
                    ? ""
                    : t("arc_length_value", {value0: formatArcLength(value)});
            }
        ], {
            anchorX: 'left',
            anchorY: 'top',
            fixed: true,
            highlight: false,
            useMathJax: false,
            fontSize: () => SizeContext.fontSize,
            visible: () => this.state.showArcLength !== false
        } as any) as JXG.Text;
    }

    private removeArcLengthText() {
        const text = this.arcLengthText;
        this.arcLengthText = undefined;
        if (text && text.board?.objectsList.includes(text)) text.board.removeObject(text);
    }

    override getInitialState(): S {
        return {
            ...super.getInitialState(),
            showOffsetCurve: false,
            showOffsetCurveControlPoints: false,
            showArcLength: true
        };
    }

    protected override captureFigureRuntimeState(): unknown {
        return {
            ...(super.captureFigureRuntimeState() as Record<string, unknown>),
            hodographBoundingBox: this.pendingHodographBoundingBox ?? this.validHodographBoundingBox(),
        };
    }

    protected override restoreFigureRuntimeState(runtimeState: unknown): void {
        super.restoreFigureRuntimeState(runtimeState);
        const boundingBox = (runtimeState as {hodographBoundingBox?: [number, number, number, number]} | undefined)?.hodographBoundingBox;
        if (boundingBox?.every(Number.isFinite)) {
            if (this.hodographBoard && this.hasUsableHodographSize(this.hodographBoard)) {
                this.hodographBoard.setBoundingBox(boundingBox, true);
                this.pendingHodographBoundingBox = undefined;
            } else {
                this.pendingHodographBoundingBox = [...boundingBox];
            }
        } else {
            this.pendingHodographBoundingBox = undefined;
        }
    }

    override getGraphCommands(): JSX.Element[] {
        if (!this.state.initialized) {
            return [];
        }
        const commands = [];
        commands.push(<OnOffSwitch
            initialState={this.getFirstJxgCurveAsPHCurve().isShowingOffsetCurve()}
            onChange={checked => {
                this.getFirstJxgCurveAsPHCurve().setShowOffsetCurve(checked);
                this.setState({...this.state, showOffsetCurve: checked});
            }}
            label={t("curve_offsets")}/>);

        if (this.getFirstJxgCurveAsPHCurve().isShowingOffsetCurve()) {
            commands.push(<Slider min={-3}
                                  max={3}
                                  initialValue={this.getFirstCurveAsPHBezierCurve()?.getOffsetCurveDistance() ? this.getFirstCurveAsPHBezierCurve()?.getOffsetCurveDistance() : 0}
                                  step={0.01}
                                  onChange={e => this.setOffsetCurveDistance(e)}/>);
            commands.push(<OnOffSwitch
                onChange={checked => {
                    this.getFirstJxgCurveAsPHCurve().setShowOffsetCurveControlPoints(checked);
                    this.setState({...this.state, showOffsetCurveControlPoints: checked});
                }}
                label={t("offset_curve_control_points")}
                initialState={this.state.showOffsetCurveControlPoints}/>);
            commands.push(<div>
                <div>{t("number_of_offsets")}</div>
                <CountSetter onPlus={() => {
                    this.getFirstJxgCurveAsPHCurve().addOffsetCurve();
                }} onCenter={() => 1} n={this.getFirstJxgCurveAsPHCurve().getNumberOfOffsetCurves()}
                             onMinus={() => {
                                 this.getFirstJxgCurveAsPHCurve().removeOffsetCurve();
                             }}
                             min={1}
                ></CountSetter></div>);
        }
        return super.getGraphCommands().concat(commands);
    }

    override getSelectedCurveCommands(): JSX.Element[] {
        const parentBoard = this.board;
        return super.getSelectedCurveCommands().concat(<HodographInputbox key={`hodograph-${this.workspaceRevision}`}
            setRef={board => this.setHodographBoard(board)}
            onResize={board => this.handleHodographBoardResize(board)} onDispose={() => {
                this.disposeHodographBoard(parentBoard);
            }}/>);
    }

    getFirstCurveAsPHBezierCurve() {
        return this.getFirstCurve() as PhBezierCurve;
    }

    override getFirstJxgCurve(): JXGBezierCurve {
        return super.getFirstJxgCurve() as JXGBezierCurve;
    }

    getFirstJxgCurveAsPHCurve(): JXGPHBezierCurve {
        return super.getFirstJxgCurve() as JXGPHBezierCurve;
    }

    override getSelect() {
        // TODO curve selection should be refactored
        return <div></div>;
    }

    private initializeHodographs(hodographs: Point[]) {
        if (!this.hodographBoard || !this.hasUsableHodographSize(this.hodographBoard)) return;
        const modelPoints = hodographs.map(point => point instanceof PointImpl && !point.isXFunction() && !point.isYFunction()
            ? point
            : new PointImpl(point.X(), point.Y()));
        if (modelPoints.some((point, i) => point !== hodographs[i])) {
            this.getFirstCurveAsPHBezierCurve().w = modelPoints;
        }
        const jxgGraphPoints = modelPoints.map(((w, i) => this.hodographBoard.create('point', [w.X(), w.Y()], {
            label: {
                fontSize: () => Math.max(20, 0.5 * SizeContext.fontSize),
                useMathJax: true,
                parse: false
            },
            size: () => Math.max(4, 0.5 * SizeContext.pointSize),
            name: "$$w_{" + i + "}$$"
        } as unknown as PointAttributes)));
        this.hodographBindings = jxgGraphPoints.map((point, i) => new ModelPointBinding(modelPoints[i], point));
        jxgGraphPoints.forEach(point => point.on("drag", () => {
            this.boardUpdate();
        }));
        this.board.addChild(this.hodographBoard);
    }

    private setOffsetCurveDistance(e: number) {
        this.board.suspendUpdate();
        this.getFirstCurveAsPHBezierCurve().setOffsetCurveDistance(e);
        this.unsuspendBoardUpdate();
    }

    protected override applyLessonAction(action: LessonAction): void {
        if (action.kind === 'curve-visibility' && action.target === 'offset-curve') {
            this.getFirstJxgCurveAsPHCurve().setShowOffsetCurve(action.visible);
            this.setState({...this.state, showOffsetCurve: action.visible});
            this.boardUpdate();
            return;
        }
        if (action.kind === 'parameter' && action.name === 'offset-distance') {
            if (!Number.isFinite(action.value) || action.value < -3 || action.value > 3) {
                throw new Error('The PH offset distance must be between -3 and 3.');
            }
            this.setOffsetCurveDistance(action.value);
            return;
        }
        super.applyLessonAction(action);
    }

    private setHodographBoard(board: JXG.Board) {
        if (this.hodographBoard && this.hodographBoard !== board) {
            this.disposeHodographSessionResources?.();
        }
        this.hodographBoard = board;
        this.hodographInitializedBoard = undefined;
        const parentBoard = this.board;
        this.disposeHodographSessionResources = this.getActiveGraphSession()?.registerCleanup(() => {
            this.disposeHodographBindings();
            if (parentBoard.renderer) parentBoard.removeChild(board);
            if (this.hodographBoard === board) {
                this.hodographBoard = undefined as unknown as JXG.Board;
            }
            this.hodographInitializedBoard = undefined;
            this.disposeHodographSessionResources = undefined;
        });
    }

    protected override disposeFigureSceneResources(): void {
        this.removeArcLengthText();
        this.disposeHodographBoard(this.board);
    }

    private disposeHodographBoard(parentBoard: JXG.Board) {
        const disposeResources = this.disposeHodographSessionResources;
        this.disposeHodographSessionResources = undefined;
        if (disposeResources) {
            disposeResources();
        } else {
            this.disposeHodographBindings();
            if (this.hodographBoard && parentBoard.renderer && this.getActiveGraphSession()?.isAlive) {
                parentBoard.removeChild(this.hodographBoard);
            }
        }
        this.hodographInitializedBoard = undefined;
        this.hodographBoard = undefined as unknown as JXG.Board;
    }

    private handleHodographBoardResize(board: JXG.Board) {
        if (this.hodographBoard !== board || !this.hasUsableHodographSize(board)) return;
        if (this.pendingHodographBoundingBox) {
            board.setBoundingBox(this.pendingHodographBoundingBox, true);
            this.pendingHodographBoundingBox = undefined;
        } else if (!this.validHodographBoundingBox()) {
            board.setBoundingBox([-5, 5, 5, -5], true);
        }
        if (this.hodographInitializedBoard === board) return;
        this.initializeHodographs(this.getFirstCurveAsPHBezierCurve().w);
        this.hodographInitializedBoard = board;
        // PointCoordinateEditor subscribes to the auxiliary board on mount.
        // Re-render without changing workspaceRevision so it binds this board.
        if (this.getActiveGraphSession()?.isAlive) this.forceUpdate();
    }

    private hasUsableHodographSize(board: JXG.Board): boolean {
        return Boolean(board.renderer && board.canvasWidth > 0 && board.canvasHeight > 0);
    }

    private validHodographBoundingBox(): [number, number, number, number] | undefined {
        if (!this.hodographBoard) return undefined;
        const box = this.hodographBoard.getBoundingBox();
        return box.length === 4 && box.every(Number.isFinite)
            ? [box[0], box[1], box[2], box[3]]
            : undefined;
    }

    private disposeHodographBindings() {
        this.hodographBindings.forEach(binding => binding.dispose());
        this.hodographBindings = [];
    }

    private scale(number: number) {
        this.board.suspendUpdate();
        this.getSelectedCurve().getCurve().scale(number, number);
        this.unsuspendBoardUpdate();
    }
}

export default BasePhBezierCurveGraph;
