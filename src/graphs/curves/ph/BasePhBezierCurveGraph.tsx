import {currentLanguage, onLanguageChange, t} from "../../../localization";
import {HodographInputbox} from "./HodographInputBox";
import React from "react";
import {JXGBezierCurve} from "../object/JXGBezierCurve";
import {JXGPHBezierCurve} from "../object/JXGPHBezierCurve";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {PhBezierCurve} from "../../../bezeg/impl/curve/ph-bezier-curve";
import {PointAttributes} from "jsxgraph";
import {PhOffsetDisplayControls, PhOffsetParameterControls} from "../../base/controls/PhBezierCurveControls";
import {PointImpl} from "../../../bezeg/impl/point/point-impl";
import {Point} from "../../../bezeg/api/point/point";
import {ModelPointBinding} from "../object/ModelPointBinding";
import {PointCoordinateEditor} from "../../base/PointCoordinateEditor";
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";

function formatArcLength(value: number): string {
    const locale = currentLanguage() === 'en' ? 'en-US' : 'sl-SI';
    return new Intl.NumberFormat(locale, {minimumFractionDigits: 3, maximumFractionDigits: 3, useGrouping: false}).format(value);
}

export interface BasePhBezierCurveGraphStates extends BaseGraphStates {
    showArcLength?: boolean
}

abstract class BasePhBezierCurveGraph<S extends BasePhBezierCurveGraphStates> extends BaseBezierCurveGraph<S> {

    private hodographBoard!: JXG.Board;
    private hodographInitializedBoard?: JXG.Board;
    private pendingHodographBoundingBox?: [number, number, number, number];
    private hodographBindings: ModelPointBinding[] = [];
    private disposeHodographSessionResources?: () => void;
    /** Board text owned by this graph; removed with the figure scene and recreated after imports. */
    private arcLengthText?: JXG.Text;
    private stopArcLengthLanguageUpdates?: () => void;

    /** Sets PH display keys; see `setBaseState`. */
    private setPhState(patch: Partial<BasePhBezierCurveGraphStates>, callback?: () => void): void {
        this.setState(patch as Partial<S>, callback);
    }

    protected override workspaceUsesStructuredEditing() { return true; }
    protected override workspacePointEditing() { return false; }
    protected override workspaceDescription() { return t("explore_the_hodograph_offsets_and_their_geometry"); }
    /** Edit groups that belong before the hodograph board (for example a parametrization choice); none by default. */
    protected workspaceBeforeHodograph(): React.ReactNode { return null; }

    protected override workspaceEdit(): React.ReactNode {
        const parentBoard = this.board;
        return <>{super.workspaceEdit()}{this.workspaceBeforeHodograph()}{this.getSelectedCurve() && <div className="inspector-group">
            <h3>{t("hodograph")}</h3><p>{t("drag_points_w0_and_w1_to_change_the_shape_of_the_ph_curve")}</p>
            <HodographInputbox key={`hodograph-${this.workspaceRevision}`} axisStyles={this.styles.axis}
                setRef={board => this.setHodographBoard(board)}
                onResize={board => this.handleHodographBoardResize(board)} onDispose={() => {
                this.disposeHodographBoard(parentBoard);
            }}/><PointCoordinateEditor key={`hodograph-editor-${this.workspaceRevision}`} prefix="w" points={() => this.getFirstCurveAsPHBezierCurve().w}
                board={this.board} observeBoard={() => this.hodographBoard} onChange={() => this.boardUpdate()}/></div>}
            <div className="inspector-group"><h3>{t("curve_offsets")}</h3>
                <PhOffsetParameterControls curve={this.getFirstJxgCurveAsPHCurve()} onChanged={() => this.store.notify()}/></div></>;
    }
    protected override workspaceGraphDisplay(): React.ReactNode {
        return <>{super.workspaceGraphDisplay()}<div className="inspector-group"><h3>{t("curve_offsets")}</h3>
            <PhOffsetDisplayControls curve={this.getFirstJxgCurveAsPHCurve()} onChanged={() => this.store.notify()}/></div>
            <div className="inspector-group"><h3>{t("arc_length")}</h3>
                <OnOffSwitch checked={this.state.showArcLength !== false}
                    onChange={checked => this.setPhState({showArcLength: checked}, this.whileMounted(() => this.boardUpdate()))}
                    label={t("show_arc_length")}/>
                <p>{t("arc_length_description")}</p></div></>;
    }

    protected override resetSceneFields(): void {
        super.resetSceneFields();
        this.pendingHodographBoundingBox = undefined;
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
            fontSize: () => this.displaySettings.fontSize,
            visible: () => this.state.showArcLength !== false
        } as any) as JXG.Text;
        // Board text is only recomputed on board update, which a language change does not trigger.
        const session = this.getActiveGraphSession();
        const unsubscribe = onLanguageChange(() => {
            if (this.board === board && this.getActiveGraphSession() === session && board.renderer) board.update();
        });
        const unregister = session?.registerCleanup(unsubscribe);
        this.stopArcLengthLanguageUpdates = () => { unregister?.(); unsubscribe(); };
    }

    private removeArcLengthText() {
        this.stopArcLengthLanguageUpdates?.();
        this.stopArcLengthLanguageUpdates = undefined;
        const text = this.arcLengthText;
        this.arcLengthText = undefined;
        if (text && text.board?.objectsList.includes(text)) text.board.removeObject(text);
    }

    override getInitialState(): S {
        return {
            ...super.getInitialState(),
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

    getFirstCurveAsPHBezierCurve() {
        return this.getFirstCurve() as PhBezierCurve;
    }

    override getFirstJxgCurve(): JXGBezierCurve {
        return super.getFirstJxgCurve() as JXGBezierCurve;
    }

    getFirstJxgCurveAsPHCurve(): JXGPHBezierCurve {
        return super.getFirstJxgCurve() as JXGPHBezierCurve;
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
            ...this.styles.point.hodograph,
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

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.onDiscriminated('curve-visibility', 'offset-curve', action => {
            this.getFirstJxgCurveAsPHCurve().setShowOffsetCurve(action.visible);
            this.boardUpdate();
        });
        registry.onDiscriminated('parameter', 'offset-distance', action => {
            if (!Number.isFinite(action.value) || action.value < -3 || action.value > 3) {
                throw new Error('The PH offset distance must be between -3 and 3.');
            }
            this.setOffsetCurveDistance(action.value);
        });
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
        if (this.getActiveGraphSession()?.isAlive) this.requestRender();
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
