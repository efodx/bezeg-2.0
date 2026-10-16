import {t} from "../../localization";
import React from 'react';



import {Select} from "../../inputs/Select";
import {PointControlledCurve} from "../../bezeg/api/curve/point-controlled-curve";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import {Commands} from "./Commands";
import BaseGraph, {BaseGraphState} from "./BaseGraph";
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
import {CurveDisplayControls} from "./controls/CurveDisplayControls";
import {selectedCurveControls} from "./controls/SelectedCurveControls";
import {CurveEditingFeature, SelectedCurveOption} from "./CurveEditingFeature";
import {LessonActionRegistry} from "./lesson/LessonActionRegistry";
import {curveVisibilityActions} from "./lesson/curveLessonActions";

export {SelectedCurveOption};

interface BaseGraphStates extends BaseGraphState {
    selectedCurveOption: SelectedCurveOption;
    curveSelected: boolean;
}

/** Serialized curves of a preset: `[class name, curve DTO]` pairs, see `ClassMapper`. */
export type CurveCollectionPresetData = ReadonlyArray<readonly [string, unknown]>;

JXG.extend(JXG.Point.prototype, {});

/**
 * Abstract class for creating graphs.
 */
abstract class BaseCurveGraph<S extends BaseGraphStates> extends BaseGraph<S> {
    protected inputsDisabled: boolean = false;
    protected jxgCurves: AbstractJXGPointControlledCurve<PointControlledCurve, PointControlledCurveAttributes>[] = [];
    protected graphJXGPoints: JXG.Point[] = [];
    protected refreshWorkspace() {
        if (!this.graphSession?.isAlive) return;
        this.workspaceRevision++;
        this.requestRender();
    }

    /**
     * Pointer handling, selection and the editing mode live in the composed editing feature; the graph supplies the
     * scene it edits.
     */
    protected readonly editing = new CurveEditingFeature({
        board: () => this.board,
        curves: () => this.jxgCurves,
        allPoints: () => this.getAllJxgPoints(),
        editingMode: () => this.state.selectedCurveOption,
        inputsDisabled: () => this.inputsDisabled,
        interactionLocked: () => this.graphInteractionLocked,
        setEditingState: patch => this.setCurveState(patch),
        deselectSelectedCurve: () => this.deselectSelectedCurve(),
        selectCurve: curve => this.selectCurve(curve),
        unsuspendBoardUpdate: () => this.unsuspendBoardUpdate(),
        refreshWorkspace: () => this.refreshWorkspace(),
    });

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.use(curveVisibilityActions({
            curve: () => this.getFirstJxgCurve(),
            curveClass: () => {
                // A live curve is authoritative; before the board exists the default scene says which adapter the graph uses.
                const live: unknown = this.getFirstJxgCurve();
                if (live) return (live as { constructor: new (...args: any[]) => unknown }).constructor;
                const preset: unknown = this.defaultPreset();
                const className = Array.isArray(preset) && Array.isArray(preset[0]) ? preset[0][0] : undefined;
                return typeof className === 'string' ? ClassMapper.getClass(className) : undefined;
            },
            boardUpdate: () => this.boardUpdate(),
        }));
    }

    private registerSubdivisionResultConsumer<T extends AbstractJXGBezierCurve<any, any>>(curve: T) {
        curve.setSubdivisionResultConsumer((newCurve: T) => {
            this.applyCurveVisualRole(newCurve, this.jxgCurves.length);
            this.jxgCurves.push(newCurve);
            this.registerSubdivisionResultConsumer(newCurve);
            this.refreshWorkspace();
        });
    }

    /** Apply a stable visual role based on scene order without changing the curve or its model data. */
    protected applyCurveVisualRole(curve: AbstractJXGPointControlledCurve<PointControlledCurve, PointControlledCurveAttributes>, index: number): void {
        curve.getJxgCurve().setAttribute(this.styles.curve.series(index));
    }

    /** Sets curve-selection keys; see `setBaseState`. */
    protected setCurveState(patch: Partial<BaseGraphStates>, callback?: () => void): void {
        this.setState(patch as Partial<S>, callback);
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
            {selected && this.workspacePointEditing() && <CurveWorkspaceOperations key={`${this.jxgCurves.indexOf(selected)}-${this.workspaceRevision}`} curve={selected as JXGBezierCurve} onChanged={() => this.refreshWorkspace()}/>}
            {selected && this.workspacePointEditing() && <PointCoordinateEditor key={`points-${this.jxgCurves.indexOf(selected)}-${this.workspaceRevision}`}
                points={() => selected.getCurve().getPoints()} board={this.board}
                onChange={() => {this.boardUpdate(); this.requestRender();}}
                onAdd={(x, y) => selected.addPoint(x, y)} onDelete={i => selected.removePoint(i)}/>}
            <details className="inspector-group editing-mode"><summary>{t("editing_mode")}: {this.workspacePointEditing() ? [t('move'), t('add_point'), t('delete_point')][mode] : t('hodograph')}</summary>
                {this.workspacePointEditing() ? <><div className="workspace-modes">
                    {[t("move"), t("add_point"), t("delete_point")].map((label, i) =>
                        <button key={i} disabled={!selected && i !== 0} aria-pressed={mode === i}
                            onClick={() => this.setCurveState({selectedCurveOption: i})}>{label}</button>)}
                </div><p>{hints[mode]}</p></> : <p>{t("edit_the_ph_curve_using_its_hodograph_points_adding_and_deleting_points_is_unavailable_here")}</p>}
            </details>
        </>;
    }

    protected override workspaceGraphDisplay(): React.ReactNode {
        return <><div className="inspector-group"><h3>{t("graph_view")}</h3>
            <OnOffSwitch label={t("point_labels")} checked={this.displaySettings.pointLabelsVisible}
                onChange={checked => this.setPointLabelsVisible(checked)}/></div>
            {this.jxgCurves.map((curve, i) => <div className="inspector-group" key={i}><h3>{t("curve_display")} {i + 1}</h3>
                <CurveDisplayControls curve={curve} onChanged={() => this.store.notify()}/>
            </div>)}</>;
    }

    override importPreset(preset: Preset) {
        // A freshly imported preset never starts with a selected curve. The argument is left untouched.
        const graphState = {...preset.graphState, initialized: true, curveSelected: false, selectedCurveOption: SelectedCurveOption.MOVE_CURVE};
        super.importPreset({...preset, graphState});
    }

    initialize() {
    }

    override getInitialState(): S {
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

    override mount(container: HTMLElement) {
        super.mount(container);
        const session = this.getActiveGraphSession();
        if (!session) return;
        session.on('down', (e) => this.editing.handleDown(e));
        session.on('up', (e) => this.editing.handleUp(e));
        session.on('move', (e) => this.editing.handleMove(e));
    }

    override unmount() {
        const board = this.board;
        try {
            this.jxgCurves.filter(curve => curve.board === board).forEach(curve => curve.dispose());
        } finally {
            super.unmount();
            // The curves belonged to the disposed board; a later mount() on this instance starts with a fresh scene.
            this.jxgCurves = [];
            this.graphJXGPoints = [];
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
        this.applyCurveVisualRole(curve, this.jxgCurves.length);
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
            point = this.board.create('point', [x, y], this.styles.point.default);
        }
        point.on('drag', (e) => {
            refreshAfterControlPointDrag(this.board);
        });
        this.graphJXGPoints.push(point);
        return new JXGPointWrapper(point);
    }

    getSelect() {
        return <Select onChange={e => this.onSelectChange(e)}
                       value={String(this.state.selectedCurveOption)}
                       ariaLabel={t("editing_mode")}
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
            const curveNumber = this.jxgCurves.indexOf(this.getSelectedCurve()) + 1;
            return selectedCurveControls(this.getSelectedCurve(), () => this.store.notify(), curveNumber);
        }
        return [];
    }

    getSelectedCurve() {
        return this.editing.getSelectedCurve()!;
    }

    deselectSelectedCurve() {
        this.editing.deselect();
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
            return [ClassMapper.getClassName(curve.constructor), ClassMapper.getToDto(curve.constructor)(curve)];
        });
    }

    override importPresetData(str: CurveCollectionPresetData) {
        this.board.suspendUpdate();
        try {
            this.disposeFigureScene();
            str.forEach(p => {
                const [id, object] = [p[0], p[1]];
                let curve = ClassMapper.getFromDto(id)(object, this.board);
                if (curve instanceof AbstractJXGBezierCurve) {
                    this.registerSubdivisionResultConsumer(curve);
                }
                this.applyCurveVisualRole(curve, this.jxgCurves.length);
                return this.jxgCurves.push(curve);
            });
        } finally {
            this.board.unsuspendUpdate();
        }

    }

    protected selectCurve(selectableCurve: AbstractJXGPointControlledCurve<PointControlledCurve, PointControlledCurveAttributes>, additionalState: Partial<BaseGraphStates> = {}) {
        this.editing.select(selectableCurve, additionalState);
    }

    private onSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
        this.editing.setMode(Number(e.target.value));
    }

}

export default BaseCurveGraph;
export type {BaseGraphStates};
