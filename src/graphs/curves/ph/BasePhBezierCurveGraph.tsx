import {currentLanguage, message, onLanguageChange, t} from "../../../localization";
import {HodographInputbox} from "./HodographInputBox";
import React from "react";
import {JXGBezierCurve} from "../object/JXGBezierCurve";
import {JXGPHBezierCurve, OFFSET_DISTANCE_MAX, OFFSET_DISTANCE_MIN} from "../object/JXGPHBezierCurve";
import {BaseCurveIds, BaseGraphStates} from "../../base/BaseCurveGraph";
import type {ActionDeclaration, GraphDeclaration, LegendEntry, ParameterDeclaration, ReadoutRow, ViewMark, ViewMarks} from "../../base/declare/graphDeclaration";
import type {ParameterBinding} from "../../base/writes/parameterArbiter";
import {runAs} from "../../base/writes/writeSource";
import {DomainError} from "../../functions/BaseFunctionGraph";
import {TransientState} from "../../base/BaseGraph";
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {PhBezierCurve} from "../../../bezeg/impl/curve/ph-bezier-curve";
import {PhOffsetDisplayControls, PhOffsetParameterControls} from "../../base/controls/PhBezierCurveControls";
import {AuxiliaryBoardLifetime} from "./AuxiliaryBoardLifetime";
import {CurvePointControls} from "../../base/CurvePointControls";
import {refitWhenOutside} from "../../base/points";
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {CurveCollectionPresetData} from "../curvePresetCollections";

function formatArcLength(value: number): string {
    const locale = currentLanguage() === 'en' ? 'en-US' : 'sl-SI';
    return new Intl.NumberFormat(locale, {minimumFractionDigits: 3, maximumFractionDigits: 3, useGrouping: false}).format(value);
}

export interface BasePhBezierCurveGraphStates extends BaseGraphStates {
    showArcLength?: boolean
}

/** The ids of the PH workspace declaration (opt-in, `declaresPhWorkspace`): the offset distance, the arc length row and its switch. */
export type PhIds = {
    param: 'ph-offset-d'; row: 'arc-length'; note: never; section: never;
    legend: BaseCurveIds['legend'] | 'offset';
    action: BaseCurveIds['action'] | 'arc-length-shown' | 'ph-geometry';
};

const PH_OFFSET_WATCH_SAMPLES = 25;

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
    /** The hodograph follows the curve selection: select the curve, then edit its hodograph. */
    protected override workspaceAfterCurveSelection(): React.ReactNode {
        return this.getSelectedCurve() && <div className="inspector-group">
            <h3>{t("hodograph")}</h3><p>{t("drag_points_w0_and_w1_to_change_the_shape_of_the_ph_curve")}</p>
            <HodographInputbox key={`hodograph-${this.workspaceRevision}`} attach={host => this.attachHodograph(host)}/><CurvePointControls key={`hodograph-editor-${this.workspaceRevision}`} prefix="w" points={() => this.getFirstCurveAsPHBezierCurve().w}
                boards={() => [this.board, this.hodographBoard]} onEdit={(_, to) => this.afterTypedHodographEdit(to)}/></div>;
    }

    protected override workspaceEdit(): React.ReactNode {
        return <>{super.workspaceEdit()}
            {this.getFirstJxgCurveIfAny() && <div className="inspector-group"><h3>{t("curve_offsets")}</h3>
                <PhOffsetParameterControls distanceParam="ph-offset-d" curve={this.getFirstJxgCurveAsPHCurve()} onChanged={() => this.store.notify()}/></div>}</>;
    }
    protected override workspaceGraphDisplay(): React.ReactNode {
        return <>{super.workspaceGraphDisplay()}{this.getFirstJxgCurveIfAny() && <div className="inspector-group">
            <PhOffsetDisplayControls curve={this.getFirstJxgCurveAsPHCurve()} onChanged={() => this.store.notify()}/></div>}
            <div className="inspector-group"><h3>{t("arc_length")}</h3>
                <OnOffSwitch checked={this.state.showArcLength !== false}
                    onChange={checked => this.setPhState({showArcLength: checked}, this.whileMounted(() => this.boardUpdate()))}
                    label={t("show_arc_length")}/>
                <p>{t("arc_length_description")}</p></div></>;
    }

    // ---- Declaration (task 08, lane L56): opt-in, the quintic and the parameterisations keep their panels --------------------

    /** Opt-in: true declares the PH workspace (common curve declaration, the offset distance d, the arc length row, the offset legend entry). */
    protected declaresPhWorkspace(): boolean { return false; }
    protected override declaresCurveWorkspace(): boolean { return this.declaresPhWorkspace(); }
    /** The arc length is the board text `Dolžina loka: ..` unless the workspace declares it as a row. */
    protected arcLengthOnBoard(): boolean { return !this.declaresPhWorkspace(); }
    /** Actions a subclass adds to the declaration. */
    protected phExtraActions(): ActionDeclaration<PhIds>[] { return []; }

    private offsetDistanceOf(): number {
        const curve = this.getFirstJxgCurveIfAny() as JXGPHBezierCurve | undefined;
        return curve ? curve.getCurve().getOffsetCurveDistance() : 0;
    }

    private offsetShown(): boolean {
        const curve = this.getFirstJxgCurveIfAny() as JXGPHBezierCurve | undefined;
        return Boolean(curve?.isShowingOffsetCurve());
    }

    /** Parameter writes (ADR 0064): the key reads and writes d through the validated setter the lesson action also uses. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            ...super.parameterBindings(),
            'ph-offset-d': {
                read: () => this.offsetDistanceOf(),
                apply: (value: unknown) => {
                    if (typeof value !== 'number' || !Number.isFinite(value) || value < OFFSET_DISTANCE_MIN || value > OFFSET_DISTANCE_MAX) {
                        throw new DomainError(message('offset_d_refused', {value0: String(OFFSET_DISTANCE_MIN), value1: String(OFFSET_DISTANCE_MAX)}));
                    }
                    this.setOffsetCurveDistance(value);
                    this.store.notify();
                },
            },
        };
    }

    private phMarksCache: {key: string; base: ViewMarks; marks: ViewMarks} | undefined;

    /** The curve's marks plus 25 samples of each drawn offset curve (`nice`), memoized on d, the offset count and the base marks. */
    protected override curveViewMarks(): ViewMarks {
        const base = super.curveViewMarks();
        if (!this.declaresPhWorkspace() || !this.offsetShown()) return base;
        const model = (this.getFirstJxgCurveIfAny() as JXGPHBezierCurve).getCurve();
        const offsets = model.getOffsetCurves();
        const key = `${model.getOffsetCurveDistance()}|${offsets.length}`;
        const cached = this.phMarksCache;
        if (cached && cached.key === key && cached.base === base) return cached.marks;
        const nice: ViewMark[] = [...(base.nice ?? [])];
        for (const offset of offsets) {
            const samples: [number, number][] = [];
            for (let i = 0; i < PH_OFFSET_WATCH_SAMPLES; i++) {
                try {
                    const p = offset.eval(i / (PH_OFFSET_WATCH_SAMPLES - 1));
                    if (Number.isFinite(p.X()) && Number.isFinite(p.Y())) samples.push([p.X(), p.Y()]);
                } catch {
                    // a sample the offset refuses is left out
                }
            }
            if (samples.length > 1) nice.push({kind: 'polyline', points: samples});
        }
        const marks: ViewMarks = {...base, nice};
        this.phMarksCache = {key, base, marks};
        return marks;
    }

    /** The box around the control points and the samples of the curve and its offsets, grown by a fifth with room above for labels. */
    private watchedBox(marks: ViewMarks): [number, number, number, number] | undefined {
        const points = [...marks.must, ...(marks.nice ?? [])].flatMap(mark => mark.kind === 'point' ? [[mark.x, mark.y]] : mark.kind === 'polyline' ? mark.points.map(p => [p[0], p[1]]) : []);
        if (points.length === 0) return undefined;
        const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
        const left = Math.min(...xs), right = Math.max(...xs), bottom = Math.min(...ys), top = Math.max(...ys);
        const pad = Math.max(0.2 * Math.max(right - left, top - bottom), 0.3);
        return [left - pad, top + 2 * pad, right + pad, bottom - pad];
    }

    private arcLengthValue(): number | undefined {
        const value = (this.getFirstCurve() as PhBezierCurve | undefined)?.arcLength?.();
        return value !== undefined && Number.isFinite(value) ? value : undefined;
    }

    /**
     * The common curve declaration plus the offset distance d as a board puck while the offsets are drawn (the lesson's step "Predznak
     * odmika" compares d = 1 and d = -1), the arc length as a row while its switch is on (it was board text), the offset in the legend
     * while drawn, and the arc length switch as a display action. The offset switch, their number and the hodograph stay in Orodja.
     */
    protected override declaration(): GraphDeclaration | undefined {
        if (!this.declaresPhWorkspace()) return undefined;
        const common = this.commonCurveDeclaration();
        const offsetShown = this.offsetShown();
        const parameters: ParameterDeclaration<PhIds['param']>[] = offsetShown
            ? [{key: 'ph-offset-d', kind: 'range', label: message('offset_d_name'), symbol: 'd', placement: 'board', min: OFFSET_DISTANCE_MIN, max: OFFSET_DISTANCE_MAX, step: 0.01, maxDecimals: 2}]
            : [];
        const legend: LegendEntry<PhIds>[] = [...(common.legend ?? []),
            ...(offsetShown ? [{id: 'offset' as const, label: message('curve_offsets'), kind: 'line' as const, object: 'offset'}] : [])];
        const arc = this.state.showArcLength !== false ? this.arcLengthValue() : undefined;
        const rows: ReadoutRow<PhIds>[] = arc === undefined ? [] : [{id: 'arc-length', name: message('arc_length'), value: {kind: 'formatted', text: formatArcLength(arc)}}];
        const marks = this.curveViewMarks();
        return {
            ...common, parameters, legend,
            actions: [...(common.actions ?? []),
                {id: 'arc-length-shown', label: message('show_arc_length'), placement: 'tools', section: 'display', enabled: true, pressed: this.state.showArcLength !== false},
                ...this.phExtraActions()],
            readouts: [{id: 'arc-length', rows}],
            marks, followView: this.watchedBox(marks),
        };
    }

    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        if (id !== 'offset') return super.drawnObject(id);
        const element = (this.getFirstJxgCurveIfAny() as JXGPHBezierCurve | undefined)?.getJxgOffsetCurves()[0];
        if (!element) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const drawn = element as typeof element & {evalVisProp(name: string): unknown};
        return {color: String(drawn.evalVisProp('strokecolor')), visible: Boolean(drawn.evalVisProp('visible'))};
    }

    override performAction(id: string): void {
        if (id === 'arc-length-shown') runAs('learner', () => this.setPhState({showArcLength: this.state.showArcLength === false}, this.whileMounted(() => this.boardUpdate())));
        else super.performAction(id);
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
        if (!board || !this.arcLengthOnBoard()) return;
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
                this.hodographLifetime?.view?.setIntent(boundingBox, {keepAspectRatio: true});
                this.pendingHodographBoundingBox = undefined;
            } else {
                this.pendingHodographBoundingBox = [...boundingBox];
            }
        } else {
            this.pendingHodographBoundingBox = undefined;
        }
    }

    /** A typed w redraws, and refits the hodograph view only when the point lies outside it (decision 6); a drag never does. */
    private afterTypedHodographEdit(to: readonly [number, number]): void {
        this.boardUpdate();
        const board = this.hodographBoard;
        if (!board) return;
        const [left, top, right, bottom] = board.getBoundingBox();
        refitWhenOutside([left, top, right, bottom], [[to[0], to[1]]], () => {
            const margin = 0.1;
            const xMin = Math.min(left, right, to[0]), xMax = Math.max(left, right, to[0]);
            const yMin = Math.min(top, bottom, to[1]), yMax = Math.max(top, bottom, to[1]);
            const padX = (xMax - xMin) * margin, padY = (yMax - yMin) * margin;
            this.hodographLifetime?.view?.setIntent([xMin - padX, yMax + padY, xMax + padX, yMin - padY], {keepAspectRatio: true});
        });
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
        const view = lifetime.view;
        if (view) view.resizing(() => {
            if (this.pendingHodographBoundingBox) {
                view.setIntent(this.pendingHodographBoundingBox, {keepAspectRatio: true});
                this.pendingHodographBoundingBox = undefined;
            } else if (!this.validHodographBoundingBox()) {
                view.setIntent([-5, 5, 5, -5], {keepAspectRatio: true});
            }
        });
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
