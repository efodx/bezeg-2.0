import {currentLanguage, onLanguageChange, t} from "../../../localization";
import {HodographInputbox} from "./HodographInputBox";
import React from "react";
import {JXGBezierCurve} from "../object/JXGBezierCurve";
import {JXGPHBezierCurve, OFFSET_DISTANCE_MAX, OFFSET_DISTANCE_MIN} from "../object/JXGPHBezierCurve";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {TransientState} from "../../base/BaseGraph";
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {PhBezierCurve} from "../../../bezeg/impl/curve/ph-bezier-curve";
import {PhOffsetDisplayControls, PhOffsetParameterControls} from "../../base/controls/PhBezierCurveControls";
import {AuxiliaryBoardLifetime} from "./AuxiliaryBoardLifetime";
import {PointCoordinateEditor} from "../../base/PointCoordinateEditor";
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {CurveCollectionPresetData} from "../curvePresetCollections";

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
    /** The live hodograph board's lifetime; replaced when the inspector mounts a new host. */
    private hodographLifetime?: AuxiliaryBoardLifetime;
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
        return <>{super.workspaceEdit()}{this.workspaceBeforeHodograph()}{this.getSelectedCurve() && <div className="inspector-group">
            <h3>{t("hodograph")}</h3><p>{t("drag_points_w0_and_w1_to_change_the_shape_of_the_ph_curve")}</p>
            <HodographInputbox key={`hodograph-${this.workspaceRevision}`} attach={host => this.attachHodograph(host)}/><PointCoordinateEditor key={`hodograph-editor-${this.workspaceRevision}`} prefix="w" points={() => this.getFirstCurveAsPHBezierCurve().w}
                board={this.board} observeBoard={() => this.hodographBoard} onChange={() => this.boardUpdate()}/></div>}
            {this.getFirstJxgCurveIfAny() && <div className="inspector-group"><h3>{t("curve_offsets")}</h3>
                <PhOffsetParameterControls curve={this.getFirstJxgCurveAsPHCurve()} onChanged={() => this.store.notify()}/></div>}</>;
    }
    protected override workspaceGraphDisplay(): React.ReactNode {
        return <>{super.workspaceGraphDisplay()}{this.getFirstJxgCurveIfAny() && <div className="inspector-group"><h3>{t("curve_offsets")}</h3>
            <PhOffsetDisplayControls curve={this.getFirstJxgCurveAsPHCurve()} onChanged={() => this.store.notify()}/></div>}
            <div className="inspector-group"><h3>{t("arc_length")}</h3>
                <OnOffSwitch checked={this.state.showArcLength !== false}
                    onChange={checked => this.setPhState({showArcLength: checked}, this.whileMounted(() => this.boardUpdate()))}
                    label={t("show_arc_length")}/>
                <p>{t("arc_length_description")}</p></div></>;
    }

    override initialize() {
        super.initialize();
        this.ensureArcLengthText();
    }

    /** Preset, figure and lesson imports dispose the scene first, so the readout is recreated here. */
    override importPresetData(data: CurveCollectionPresetData) {
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
        // After an unmount the board is freed (no renderer) and the text went with it.
        if (text && text.board?.renderer && text.board.objectsList.includes(text)) text.board.removeObject(text);
    }

    override getInitialState(): S {
        return {
            ...super.getInitialState(),
            showArcLength: true
        };
    }

    /** The hodograph view: the child board's, or the one waiting for the board the inspector creates next. */
    protected override captureTransientState(): TransientState {
        return {
            ...super.captureTransientState(),
            hodographBoundingBox: this.pendingHodographBoundingBox ?? this.validHodographBoundingBox() ?? null,
        };
    }

    /** A fresh scene shows the hodograph at its default view. */
    protected override restoreTransientState(saved: TransientState | undefined): void {
        super.restoreTransientState(saved);
        const box = saved?.hodographBoundingBox;
        const boundingBox = Array.isArray(box) && box.length === 4 && box.every(value => typeof value === 'number' && Number.isFinite(value))
            ? box as [number, number, number, number]
            : undefined;
        if (boundingBox) {
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

    /** The curves are dropped on unmount and rebuilt by the next mount, so controls rendered in between find none. */
    private getFirstJxgCurveIfAny(): unknown {
        return this.jxgCurves?.[0];
    }

    getFirstJxgCurveAsPHCurve(): JXGPHBezierCurve {
        return super.getFirstJxgCurve() as JXGPHBezierCurve;
    }

    private initializeHodographs(lifetime: AuxiliaryBoardLifetime, board: JXG.Board) {
        lifetime.adopt(this.getFirstJxgCurveAsPHCurve().bindHodographPoints(board, this.styles.point.hodograph, () => this.boardUpdate()));
        lifetime.linkToParent();
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
            if (!Number.isFinite(action.value) || action.value < OFFSET_DISTANCE_MIN || action.value > OFFSET_DISTANCE_MAX) {
                throw new Error(`The PH offset distance must be between ${OFFSET_DISTANCE_MIN} and ${OFFSET_DISTANCE_MAX}.`);
            }
            this.setOffsetCurveDistance(action.value);
        });
    }

    /** Starts the hodograph board's lifetime on the host the inspector mounted; the view releases it on unmount. */
    private attachHodograph(host: HTMLElement): {release: () => void} | undefined {
        const session = this.getActiveGraphSession();
        if (!session) return undefined;
        this.hodographLifetime?.release();
        const lifetime = new AuxiliaryBoardLifetime({
            session, parent: this.board, host,
            boardOptions: {
                showFullscreen: false,
                boundingbox: [-5, 5, 5, -5],
                axis: true,
                showNavigation: false,
                showCopyright: false,
                showScreenshot: true,
                defaultAxes: {x: this.styles.axis.auxiliaryX, y: this.styles.axis.auxiliaryY},
            },
            onBoard: (board, current) => {
                this.hodographLifetime = current;
                this.hodographBoard = board;
                this.hodographInitializedBoard = undefined;
            },
            onResize: (board, current) => this.handleHodographBoardResize(current, board),
            onRelease: released => {
                if (this.hodographLifetime === released) {
                    this.hodographLifetime = undefined;
                    this.hodographBoard = undefined as unknown as JXG.Board;
                    this.hodographInitializedBoard = undefined;
                }
            },
        });
        return lifetime;
    }

    protected override disposeFigureSceneResources(): void {
        this.removeArcLengthText();
        this.hodographLifetime?.release();
    }

    private handleHodographBoardResize(lifetime: AuxiliaryBoardLifetime, board: JXG.Board) {
        if (this.hodographBoard !== board || !this.hasUsableHodographSize(board)) return;
        if (this.pendingHodographBoundingBox) {
            board.setBoundingBox(this.pendingHodographBoundingBox, true);
            this.pendingHodographBoundingBox = undefined;
        } else if (!this.validHodographBoundingBox()) {
            board.setBoundingBox([-5, 5, 5, -5], true);
        }
        if (this.hodographInitializedBoard === board) return;
        this.initializeHodographs(lifetime, board);
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

    private scale(number: number) {
        this.board.suspendUpdate();
        this.getSelectedCurve().getCurve().scale(number, number);
        this.unsuspendBoardUpdate();
    }
}

export default BasePhBezierCurveGraph;
