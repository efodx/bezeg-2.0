import {t} from "../../localization";
import React from 'react';



import {PointControlledCurve} from "../../bezeg/api/curve/point-controlled-curve";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import {Commands} from "./Commands";
import BaseGraph, {BaseGraphState, TransientState} from "./BaseGraph";
import {Preset} from "./presets/Presets";
import {
    AbstractJXGPointControlledCurve,
    PointControlledCurveAttributes,
    refreshAfterControlPointDrag
} from "../curves/object/AbstractJXGPointControlledCurve";
import {JXGRationalBezierCurve} from "../curves/object/JXGRationalBezierCurve";
import {ClassMapper} from "../curves/object/ClassMapper";
import {CurveCollectionPresetData} from "../curves/curvePresetCollections";
import {AbstractJXGBezierCurve} from "../curves/object/AbstractJXGBezierCurve";
import {JXGPointWrapper} from "../curves/object/JXGPointWrapper";
import {CurveWorkspaceOperations} from "./CurveWorkspaceControls";
import {JXGBezierCurve} from "../curves/object/JXGBezierCurve";
import {PointCoordinateEditor} from "./PointCoordinateEditor";
import {CurveDisplayControls} from "./controls/CurveDisplayControls";
import {selectedCurveControls} from "./controls/SelectedCurveControls";
import {CurveEditingFeature, SelectedCurveOption} from "./CurveEditingFeature";
import {LessonActionRegistry} from "./lesson/LessonActionRegistry";
import type {LessonCurveFixture} from "../../learning/model";
import {curveVisibilityActions} from "./lesson/curveLessonActions";

export {SelectedCurveOption};

interface BaseGraphStates extends BaseGraphState {
    selectedCurveOption: SelectedCurveOption;
    curveSelected: boolean;
}

/** A rational curve's entry in the captured transient state, read back without trusting its shape. */
interface SavedRationalCurve {
    standardForm?: boolean;
    effectiveWeights?: number[];
}

function savedRationalCurve(value: unknown): SavedRationalCurve | undefined {
    if (typeof value !== 'object' || value === null) return undefined;
    const {standardForm, effectiveWeights} = value as Record<string, unknown>;
    return {
        standardForm: typeof standardForm === 'boolean' ? standardForm : undefined,
        effectiveWeights: Array.isArray(effectiveWeights) && effectiveWeights.every((weight): weight is number => typeof weight === 'number')
            ? effectiveWeights : undefined,
    };
}

/** Numeric members only: a numeric enum's object also maps its member names, which are not editing modes. */
function isSelectedCurveOption(value: unknown): value is SelectedCurveOption {
    return typeof value === 'number' && SelectedCurveOption[value] !== undefined;
}

export type {CurveCollectionPresetData} from "../curves/curvePresetCollections";

JXG.extend(JXG.Point.prototype, {});

/**
 * Abstract class for creating graphs.
 */
abstract class BaseCurveGraph<S extends BaseGraphStates> extends BaseGraph<S, CurveCollectionPresetData> {
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
                const className = this.defaultPreset()[0]?.[0];
                return className === undefined ? undefined : ClassMapper.getClass(className);
            },
            boardUpdate: () => this.boardUpdate(),
        }));
    }

    /**
     * The default scene's single curve with the fixture's inputs: same curve type and display state, fixture geometry.
     * G1 junction ratios are reset unless given, since the default's ratios fit only its own point count.
     */
    protected override lessonFixtureData(curve: LessonCurveFixture): CurveCollectionPresetData | undefined {
        const defaults = this.defaultPreset();
        if (defaults.length !== 1) return undefined;
        const [type, dto] = defaults[0];
        const {b: _ratios, ...state} = dto.state ?? {};
        const ratios = curve.splineRatios ? {b: [...curve.splineRatios]} : {};
        return [[type, {
            ...dto,
            points: curve.points.map(point => [...point]),
            ...(curve.weights ? {weights: [...curve.weights]} : {}),
            ...(curve.hodographs ? {hodographs: curve.hodographs.map(point => [...point])} : {}),
            ...(curve.degree !== undefined ? {degree: curve.degree} : {}),
            ...(curve.continuity !== undefined ? {continuity: curve.continuity} : {}),
            ...(dto.state || curve.splineRatios ? {state: {...state, ...ratios}} : {}),
        }]];
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

    /**
     * The selected curve lives on the curve adapters, and so do a rational curve's standard form and its effective
     * weights: Preset DTOs store display-normalized weights in standard form, which would change the curve's
     * parametrization on restore. The editing mode is scene state and is restored with it.
     */
    protected override captureTransientState(): TransientState {
        return {
            ...super.captureTransientState(),
            selectedCurveIndex: this.jxgCurves.findIndex(curve => curve.isSelected()),
            rationalCurves: this.jxgCurves.map(curve => curve instanceof JXGRationalBezierCurve
                ? {standardForm: curve.inStandardForm(), effectiveWeights: curve.getCurve().getEffectiveWeights().slice()}
                : null),
        };
    }

    /**
     * A fresh scene has no selection and the imported weights in their imported form. Without a selected curve the
     * editing mode returns to moving, whatever the restored scene state says.
     */
    protected override restoreTransientState(saved: TransientState | undefined): void {
        super.restoreTransientState(saved);
        const rationalCurves = Array.isArray(saved?.rationalCurves) ? saved.rationalCurves : [];
        this.jxgCurves.forEach((curve, index) => {
            const entry = savedRationalCurve(rationalCurves[index]);
            if (!(curve instanceof JXGRationalBezierCurve) || !entry) return;
            const weights = entry.effectiveWeights;
            // The same domain as the rational-weights lesson action: finite and greater than zero.
            if (weights && weights.length === curve.getJxgPoints().length && weights.every(weight => Number.isFinite(weight) && weight > 0)) {
                curve.setEffectiveWeights(weights.slice());
            }
            if (entry.standardForm !== undefined) curve.setStandardForm(entry.standardForm);
        });
        this.jxgCurves.forEach(curve => { if (curve.isSelected()) curve.deselect(); });
        const index = saved?.selectedCurveIndex;
        const selectedCurve = typeof index === 'number' && Number.isInteger(index) ? this.jxgCurves[index] : undefined;
        selectedCurve?.select();
        const option: unknown = this.state.selectedCurveOption;
        const selectedCurveOption = selectedCurve && isSelectedCurveOption(option) ? option : SelectedCurveOption.MOVE_CURVE;
        this.setCurveState({curveSelected: Boolean(selectedCurve), selectedCurveOption});
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
        const modes = [
            {value: SelectedCurveOption.MOVE_CURVE, label: t("manipulate_curve")},
            {value: SelectedCurveOption.ADD_POINTS, label: t("add_points")},
            {value: SelectedCurveOption.DELETE_POINTS, label: t("delete_points")},
        ];
        return <div className="curve-editing-mode-buttons" role="group" aria-label={t("editing_mode")}>
            {modes.map(({value, label}) => {
                const selected = this.state.selectedCurveOption === value;
                return <button key={value} type="button" aria-pressed={selected}
                    onClick={() => this.setEditingMode(value)}>
                    <span className="curve-editing-mode-marker" aria-hidden="true">
                        {selected && <svg viewBox="0 0 16 16" focusable="false"><path d="m2.5 8.5 3.5 3.5 7.5-8"/></svg>}
                    </span>
                    <span>{label}</span>
                </button>;
            })}
        </div>;
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

    override exportPresetData(): CurveCollectionPresetData {
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

    private setEditingMode(mode: SelectedCurveOption) {
        this.editing.setMode(mode);
    }

}

export default BaseCurveGraph;
export type {BaseGraphStates};
