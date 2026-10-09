import {t} from "../../localization";
import React from 'react';


import {Board} from "jsxgraph";
import {Select} from "../../inputs/Select";
import {PointControlledCurve} from "../../bezeg/api/curve/point-controlled-curve";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import {Commands} from "./Commands";
import BaseGraph, {BaseGraphState} from "./BaseGraph";
import {VisibilityContext} from "../context/VisibilityContext";
import {PointStyles} from "../styles/PointStyles";
import {Preset} from "./presets/Presets";
import {
    AbstractJXGPointControlledCurve,
    PointControlledCurveAttributes,
    refreshAfterControlPointDrag
} from "../curves/object/AbstractJXGPointControlledCurve";
import {JXGRationalBezierCurve} from "../curves/object/JXGRationalBezierCurve";
import {ClassMapper} from "../curves/object/ClassMapper";
import {AbstractJXGBezierCurve} from "../curves/object/AbstractJXGBezierCurve";
import {JXGPointWrapper} from "../curves/object/JXGPointWrapper";
import {CurveWorkspaceOperations} from "./CurveWorkspaceControls";
import {JXGBezierCurve} from "../curves/object/JXGBezierCurve";
import {PointCoordinateEditor} from "./PointCoordinateEditor";
import {PointControlledCurveCommands} from "../curves/object/inputs/PointControlledCurveCommands";
import {LessonAction} from '../../learning/model';

enum SelectedCurveOption {
    MOVE_CURVE, ADD_POINTS, DELETE_POINTS
}

interface BaseGraphStates extends BaseGraphState {
    selectedCurveOption: SelectedCurveOption;
    curveSelected: boolean;
}

JXG.extend(JXG.Point.prototype, {});

/**
 * Abstract class for creating graphs.
 */
abstract class BaseCurveGraph<P, S extends BaseGraphStates> extends BaseGraph<P, S> {
    public override readonly state = this.getInitialState();
    protected inputsDisabled: boolean = false;
    protected jxgCurves: AbstractJXGPointControlledCurve<PointControlledCurve, PointControlledCurveAttributes>[] = [];
    protected graphJXGPoints: JXG.Point[] = [];
    protected workspaceRevision = 0;
    protected refreshWorkspace() {
        if (!this.graphSession?.isAlive) return;
        this.workspaceRevision++;
        this.forceUpdate();
    }

    protected override applyLessonAction(action: LessonAction): void {
        const curve = this.getFirstJxgCurve();
        if (action.kind === 'curve-visibility' && action.target === 'control-polygon') {
            curve.showControllPolygon(action.visible);
            this.boardUpdate();
            return;
        }
        if (action.kind === 'curve-visibility' && action.target === 'convex-hull') {
            curve.showConvexHull(action.visible);
            this.boardUpdate();
            return;
        }
        if (action.kind === 'curve-visibility' && action.target === 'decasteljau-scheme' && curve instanceof AbstractJXGBezierCurve) {
            curve.showCurrentDecasteljauScheme(action.visible);
            this.boardUpdate();
            return;
        }
        if (action.kind === 'curve-evaluation') {
            curve.showEvaluationPoint(action.parameter);
            this.boardUpdate();
            return;
        }
        if (action.kind === 'curve-visibility' && action.target === 'weights' && curve instanceof JXGRationalBezierCurve) {
            curve.showwWeights(action.visible);
            this.boardUpdate();
            return;
        }
        super.applyLessonAction(action);
    }

    private registerSubdivisionResultConsumer<T extends AbstractJXGBezierCurve<any, any>>(curve: T) {
        curve.setSubdivisionResultConsumer((newCurve: T) => {
            this.jxgCurves.push(newCurve);
            this.registerSubdivisionResultConsumer(newCurve);
            if (this.workspaceTitle()) { this.refreshWorkspace(); }
        });
    }

    protected workspacePointEditing() { return true; }
    protected workspaceUsesStructuredEditing() { return false; }
    private workspaceCurveSelection(): React.ReactNode {
        const selectableCurves = this.jxgCurves.filter(curve => curve.getAttributes().selectable !== false);
        if (selectableCurves.length === 0) { return null; }
        const selected = this.getSelectedCurve();
        return <div className="inspector-group curve-selection"><h3>{t("curve_selection")}</h3>
            <p role="status">{selected ? t("selected_curve", {value0: this.jxgCurves.indexOf(selected) + 1}) : t("no_curve_selected")}</p>
            <div className="workspace-curve-picker">{selectableCurves.map(curve => {
                const index = this.jxgCurves.indexOf(curve);
                return <button key={index} aria-pressed={selected === curve} onClick={() => {
                    if (selected === curve) { return; }
                    if (selected) { this.deselectSelectedCurve(); }
                    this.selectCurve(curve, {selectedCurveOption: SelectedCurveOption.MOVE_CURVE});
                    this.board.update();
                }}>{t("curve")}{index + 1}</button>;
            })}{selected && <button onClick={() => {this.deselectSelectedCurve(); this.board.update();}}>{t("clear_selection")}</button>}</div>
            {!selected && <p>{t("select_a_curve_on_the_graph_or_with_a_button_to_access_its_operations")}</p>}
        </div>;
    }

    protected override workspaceEdit(): React.ReactNode {
        if (!this.workspaceUsesStructuredEditing()) {
            return <>{this.workspaceCurveSelection()}{super.workspaceEdit()}</>;
        }
        const selected = this.getSelectedCurve();
        const mode = this.state.selectedCurveOption;
        const hints = [t("drag_a_control_point_drag_inside_the_frame_to_move_the_selected_curve_use_a_corner_to_scale_it_or_an_edge_to_rotate_it"),
            t("click_an_empty_part_of_the_graph_to_add_a_point_to_the_selected_curve"), t("click_a_control_point_of_the_selected_curve_to_delete_it")];
        return <>
            {this.workspaceCurveSelection()}
            {selected && this.workspacePointEditing() && <CurveWorkspaceOperations key={this.jxgCurves.indexOf(selected)} curve={selected as JXGBezierCurve} onChanged={() => this.refreshWorkspace()}/>}
            {selected && this.workspacePointEditing() && <PointCoordinateEditor key={`points-${this.jxgCurves.indexOf(selected)}-${this.workspaceRevision}`}
                points={() => selected.getCurve().getPoints()} board={this.board}
                onChange={() => {this.boardUpdate(); this.forceUpdate();}}
                onAdd={(x, y) => selected.addPoint(x, y)} onDelete={i => selected.removePoint(i)}/>}
            <details className="inspector-group editing-mode"><summary>{t("editing_mode")}: {this.workspacePointEditing() ? [t('move'), t('add_point'), t('delete_point')][mode] : t('hodograph')}</summary>
                {this.workspacePointEditing() ? <><div className="workspace-modes">
                    {[t("move"), t("add_point"), t("delete_point")].map((label, i) =>
                        <button key={i} disabled={!selected && i !== 0} aria-pressed={mode === i}
                            onClick={() => this.setState({selectedCurveOption: i} as Pick<S, keyof S>)}>{label}</button>)}
                </div><p>{hints[mode]}</p></> : <p>{t("edit_the_ph_curve_using_its_hodograph_points_adding_and_deleting_points_is_unavailable_here")}</p>}
            </details>
        </>;
    }

    protected override workspaceDisplay(): React.ReactNode {
        return <><div className="inspector-group"><h3>{t("graph_view")}</h3>{super.workspaceDisplay()}
            <OnOffSwitch label={t("point_labels")} initialState={VisibilityContext.pointsVisible()}
                onChange={checked => this.showPointLabels(checked)}/></div>
            {this.jxgCurves.map((curve, i) => <div className="inspector-group" key={i}><h3>{t("curve_display")} {i + 1}</h3>
                {PointControlledCurveCommands(curve).map((control, index) => <div className="inspector-control" key={index}>{control}</div>)}
            </div>)}</>;
    }

    override importPreset(preset: Preset) {
        // TODO fix this in another way, this is ugly..
        // @ts-ignore
        preset.graphState = {...preset.graphState, curveSelected: false, selectedCurveOption: SelectedCurveOption.MOVE_CURVE};
        super.importPreset(preset);
    }

    initialize() {
    }

    getInitialState(): S {
        return {
            selectedCurveOption: SelectedCurveOption.MOVE_CURVE, curveSelected: false
        } as S;
    }

    protected override lessonDefaultState(): S {
        return {...this.getInitialState(), initialized: true};
    }

    getFirstCurve() {
        return this.getFirstJxgCurve()?.getCurve();
    }

    getFirstJxgCurve() {
        return this.jxgCurves[0];
    }

    getAllJxgPoints() {
        return this.jxgCurves.flatMap(c => c.getJxgPoints()).concat(this.graphJXGPoints);
    }

    override componentDidMount() {
        super.componentDidMount();
        const session = this.getActiveGraphSession();
        if (!session) return;
        session.on('down', (e) => this.handleDown(e));
        session.on('up', (e) => this.handleUp(e));
        session.on('move', (e) => this.handleMove(e));
    }

    override componentWillUnmount() {
        const board = this.board;
        try {
            this.jxgCurves.filter(curve => curve.board === board).forEach(curve => curve.dispose());
        } finally {
            super.componentWillUnmount();
        }
    }

    protected override disposeFigureScene(): void {
        this.disposeFigureSceneResources();
        this.workspaceRevision++;
        const board = this.board;
        if (!this.graphSession?.isAlive) return;
        this.jxgCurves.filter(curve => curve.board === board).forEach(curve => curve.dispose());
        const remainingPoints = this.graphJXGPoints
            .filter(point => point.board === board && board.objectsList.includes(point))
            .reverse();
        if (remainingPoints.length) board.removeObject(remainingPoints);
        this.jxgCurves = [];
        this.graphJXGPoints = [];
    }

    /** Hook for child boards or other curve-owned resources that outlive adapter disposal. */
    protected disposeFigureSceneResources(): void {
    }

    protected override captureFigureRuntimeState(): unknown {
        return {
            selectedCurveIndex: this.jxgCurves.findIndex(curve => curve.isSelected()),
            selectedCurveOption: this.state.selectedCurveOption,
            rationalStandardForms: this.jxgCurves.map(curve => curve instanceof JXGRationalBezierCurve
                ? curve.inStandardForm()
                : undefined),
        };
    }

    protected override captureFigureEntryPreset(): Preset {
        const preset = super.captureFigureEntryPreset();
        const data = preset.data === undefined ? undefined : JSON.parse(JSON.stringify(preset.data));
        this.jxgCurves.forEach((curve, index) => {
            if (curve instanceof JXGRationalBezierCurve && data?.[index]?.[1]) {
                // Existing preset DTOs use display-normalized weights in
                // standard form. The batch entry snapshot must retain the
                // effective weights so restoring the live scene is lossless.
                data[index][1].weights = curve.getCurve().getEffectiveWeights().slice();
            }
        });
        return {...preset, data};
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined, runtimeState?: unknown): S {
        const state = super.figurePresetGraphState(graphState, runtimeState);
        const rationalStandardForms = (runtimeState as {rationalStandardForms?: Array<boolean | undefined>} | undefined)?.rationalStandardForms;
        if (rationalStandardForms) {
            this.jxgCurves.forEach((curve, index) => {
                const standardForm = rationalStandardForms[index];
                if (curve instanceof JXGRationalBezierCurve && typeof standardForm === "boolean") {
                    // Restore before React renders controls that read this flag.
                    curve.setStandardForm(standardForm);
                }
            });
        }
        const selectedCurveIndex = (runtimeState as {selectedCurveIndex?: number} | undefined)?.selectedCurveIndex;
        const selectedCurve = typeof selectedCurveIndex === "number" ? this.jxgCurves[selectedCurveIndex] : undefined;
        selectedCurve?.select();
        const selectedCurveOption = (runtimeState as {selectedCurveOption?: SelectedCurveOption} | undefined)?.selectedCurveOption;
        return {
            ...state,
            curveSelected: Boolean(selectedCurve),
            selectedCurveOption: selectedCurve ? selectedCurveOption ?? SelectedCurveOption.MOVE_CURVE : SelectedCurveOption.MOVE_CURVE,
        } as S;
    }

    createRationalJSXBezierCurve(points: number[][], weights: number[]): JXGRationalBezierCurve {
        const curve = new JXGRationalBezierCurve(points, weights, this.board);
        this.jxgCurves.push(curve);
        this.registerSubdivisionResultConsumer(curve);
        return curve;
    }

    /**
     * Creates a JSXGraph point ands wraps it with the Point interface.
     * @param x
     * @param y
     * @param opts
     */
    createJSXGraphPoint(x: number | (() => number), y: number | (() => number), opts?: any): JXGPointWrapper {
        let point;
        if (opts) {
            point = this.board.create('point', [x, y], opts);
        } else {
            point = this.board.create('point', [x, y], PointStyles.default);
        }
        point.on('drag', (e) => {
            refreshAfterControlPointDrag(this.board);
        });
        this.graphJXGPoints.push(point);
        return new JXGPointWrapper(point);
    }

    // TODO change e to pointerevent
    getMouseCoords(e: any) {
        const pos = this.board.getMousePosition(e);
        return new JXG.Coords(JXG.COORDS_BY_SCREEN, pos, this.board as Board);
    }

    getSelect() {
        return <Select onChange={e => this.onSelectChange(e)}
                       options={[{
                           "value": "0", "text": t("manipulate_curve")
                       }, {
                           "value": "1", "text": t("add_points")
                       }, {
                           "value": "2", "text": t("delete_points")
                       }]}/>;
    }

    override getGraphCommandsArea(): React.JSX.Element | null {
        return this.state.curveSelected ? this.getSelectableCurveArea() : super.getGraphCommandsArea();
    }

    getSelectedCurveCommands(): JSX.Element[] {
        if (this.getSelectedCurve()) {
            return this.getSelectedCurve().getCurveCommands();
        }
        return [];
    }

    handleDown(e: PointerEvent) {
        if (this.inputsDisabled || this.graphInteractionLocked) {
            return;
        }
        this.board.suspendUpdate();
        let coords = this.getMouseCoords(e);
        let selectedCurve, selectableCurve;
        if (this.state.selectedCurveOption === SelectedCurveOption.MOVE_CURVE) {
            selectedCurve = this.getSelectedCurve();
            if (selectedCurve) {
                selectedCurve.coords = coords;
                if (selectedCurve.isMouseInsidePaddedBoundingBox()) {
                    selectedCurve.processMouseDown(e);
                } else {
                    this.deselectSelectedCurve();
                }
            }
            selectedCurve = this.getSelectedCurve();
            if (!selectedCurve) {
                // @ts-ignore
                if (!this.getAllJxgPoints().some(p => p.hasPoint(coords.scrCoords[1], coords.scrCoords[2]))) {
                    selectableCurve = this.jxgCurves.filter(curve => curve.isSelectable(e))[0];
                    if (selectableCurve) {
                        this.selectCurve(selectableCurve);
                    }
                }
            }
            this.unsuspendBoardUpdate();
            return;
        }
        let canCreate = true;

        for (let el of this.board.objectsList) {
            // @ts-ignore
            if (JXG.isPoint(el) && el.hasPoint(coords.scrCoords[1], coords.scrCoords[2])) {
                canCreate = false;
                break;
            }
        }
        if (canCreate && this.state.selectedCurveOption === SelectedCurveOption.ADD_POINTS && this.getSelectedCurve()) {
            this.getSelectedCurve().addPoint(coords.usrCoords[1], coords.usrCoords[2]);
        }
        if (!canCreate && this.state.selectedCurveOption === SelectedCurveOption.DELETE_POINTS && this.getSelectedCurve()) {
            this.getSelectedCurve().getJxgPoints().every((point, i) => {
                // @ts-ignore
                if (point.hasPoint(coords.scrCoords[1], coords.scrCoords[2])) {
                    if (this.getSelectedCurve().getJxgPoints().length > 1) { this.getSelectedCurve().removePoint(i); }
                    return false;
                }
                return true;
            });
        }

        this.unsuspendBoardUpdate();
        if (this.workspaceTitle()) {this.refreshWorkspace();}
    };

    getSelectedCurve() {
        return this.jxgCurves.filter(curve => curve.isSelected())[0];
    }


    override getTools(): JSX.Element[] {
        return super.getTools().concat(<OnOffSwitch label={t("point_labels")}
                                                    initialState={VisibilityContext.pointsVisible()}
                                                    onChange={checked => this.showPointLabels(checked)}/>);
    }

    deselectSelectedCurve() {
        this.getSelectedCurve().deselect();

        this.setState({...this.state, curveSelected: false, selectedCurveOption: SelectedCurveOption.MOVE_CURVE, showingControlPolygon: false});
    }

    getAllJxgCurves() {
        return this.jxgCurves.map(curve => curve.getJxgCurve());
    }

    getSelectableCurveArea() {
        let commands = [this.getSelect()];
        commands = commands.concat(this.getSelectedCurveCommands());
        return <Commands commands={commands} title={t("selected_curve_25")}></Commands>;
    }

    override exportPresetData() {
        return this.jxgCurves.map(curve => {
            // @ts-ignore
            return [ClassMapper.getClassName(curve.constructor), ClassMapper.getToDto(curve.constructor)(curve)];
        });
    }

    override importPresetData(str: string) {
        this.board.suspendUpdate();
        try {
            this.disposeFigureScene();
            // @ts-ignore
            str.forEach(p => {
                const [id, object] = [p[0], p[1]];
                let curve = ClassMapper.getFromDto(id)(object, this.board);
                if (curve instanceof AbstractJXGBezierCurve) {
                    this.registerSubdivisionResultConsumer(curve);
                }
                return this.jxgCurves.push(curve);
            });
        } finally {
            this.board.unsuspendUpdate();
        }

    }

    protected selectCurve(selectableCurve: AbstractJXGPointControlledCurve<PointControlledCurve, PointControlledCurveAttributes>, additionalState = {}) {
        selectableCurve.select();
        this.setState({...this.state, curveSelected: true, ...additionalState});
    }

    private onSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
        let selectTool = e.target.value;
        let selectedCurveOption = Number(selectTool);
        this.setState({...this.state, selectedCurveOption: selectedCurveOption});
    }

    private handleUp(e: PointerEvent) {
        if (this.graphInteractionLocked) return;
        if (this.state.selectedCurveOption !== SelectedCurveOption.MOVE_CURVE) {
            // only handle when we're just moving curve
            return;
        }
        let selectedCurve = this.getSelectedCurve();
        if (selectedCurve && selectedCurve.needToProcessMoveEvent()) {
            this.board.suspendUpdate();
            selectedCurve?.processMouseUp(e);
            this.unsuspendBoardUpdate();
        }
    }

    private handleMove(e: PointerEvent) {
        if (this.graphInteractionLocked) return;
        if (this.state.selectedCurveOption !== SelectedCurveOption.MOVE_CURVE) {
            return;
        }
        let selectedCurve = this.getSelectedCurve();
        if (!selectedCurve?.needToProcessMoveEvent()) {
            selectedCurve?.processMouseCursor(e);
        }
        if (selectedCurve && selectedCurve.needToProcessMoveEvent()) {
            this.board.suspendUpdate();
            selectedCurve?.processMouseMove(e);
            this.unsuspendBoardUpdate();
        }
    }

    private showPointLabels(show: boolean) {
        this.board.suspendUpdate();
        VisibilityContext.setPointVisibility(show);
        this.unsuspendBoardUpdate();
    }


}

export default BaseCurveGraph;
export type {BaseGraphStates};

