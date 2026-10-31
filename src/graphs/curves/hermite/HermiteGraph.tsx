import React from "react";
import {LocalizedError, renderMessage, t} from "../../../localization";
import Slider from "../../../inputs/Slider";
import {ChoiceSelect} from "../../../inputs/ChoiceSelect";
import {CountSetter} from "../../../inputs/CountSetter";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {PointListInput} from "../../../inputs/PointListInput";
import {catmullRomTangents} from "../../../analysis/hermite";
import {INTERPOLATION_POINTS_MAX, INTERPOLATION_POINTS_MIN} from "../../../analysis/interpolation";
import BaseGraph, {BaseGraphState} from "../../base/BaseGraph";
import {Preset} from "../../base/presets/Presets";
import {
    catmullRomStored, DEFAULT_HERMITE_PRESET, firstCoincidentPair, HERMITE_COORDINATE_LIMIT, HERMITE_TANGENT_LIMIT, HERMITE_TENSION_MAX,
    HERMITE_TENSION_MIN, HERMITE_TENSION_STEP, hermiteRejection, HermiteMode, HermitePresetData, hermiteViewBox, isHermiteMode, isParameterRule,
    ParameterRule,
} from "./hermiteModel";
import {hermitePresetCollection} from "./hermitePresetCollection";
import {HermiteScene} from "./HermiteScene";

export interface HermiteGraphState extends BaseGraphState {
    points: readonly (readonly [number, number])[];
    mode: HermiteMode;
    /** Hermite-mode global derivatives m_i, one per point (stored but unused in Catmull-Rom mode). */
    tangents: readonly (readonly [number, number])[];
    parameterRule: ParameterRule;
    tension: number;
    showTangents: boolean;
    showBezier: boolean;
    /** Why the last drag was refused (the state keeps the previous, valid data); empty when the last edit was accepted. */
    notice: '' | 'coincident';
}

const clamp = (value: number, limit: number) => Math.min(limit, Math.max(-limit, value));
const copyRows = (rows: readonly (readonly [number, number])[]) => rows.map(r => [r[0], r[1]] as const);

/**
 * Hermite and Catmull-Rom Demonstration (interpolation lesson I3). Like {@link InterpolationGraph} it extends `BaseGraph`
 * directly: the curve is a chain of cubic Hermite segments, not a Bezier spline. The one owned {@link HermiteScene} is
 * rebuilt when the point count changes or a Preset is imported and is disposed on unmount; everything else is read lazily
 * from the scene state, which is the only copy of the data.
 */
export class HermiteGraph extends BaseGraph<HermiteGraphState, HermitePresetData> {
    private scene?: HermiteScene;

    override getInitialState(): HermiteGraphState {
        return {initialized: false, ...DEFAULT_HERMITE_PRESET, notice: ''};
    }

    override presetCollection() {
        return hermitePresetCollection;
    }

    defaultPreset(): HermitePresetData {
        return {...DEFAULT_HERMITE_PRESET, points: copyRows(DEFAULT_HERMITE_PRESET.points), tangents: copyRows(DEFAULT_HERMITE_PRESET.tangents)};
    }

    override exportPresetData(): HermitePresetData {
        const {points, mode, tangents, parameterRule, tension, showTangents, showBezier} = this.state;
        return {points: copyRows(points), mode, tangents: copyRows(tangents), parameterRule, tension, showTangents, showBezier};
    }

    /**
     * Runs right after `importPresetData` for a lesson fixture or default scene and is laid over the initial state: the
     * data just imported must survive it, so the current data fields are returned.
     */
    protected override lessonDefaultState(): HermiteGraphState {
        const {points, mode, tangents, parameterRule, tension, showTangents, showBezier} = this.state;
        return {initialized: true, points, mode, tangents, parameterRule, tension, showTangents, showBezier, notice: ''};
    }

    /** Rejects data the model cannot draw before touching the state, then rebuilds the scene. */
    override importPresetData(data: HermitePresetData) {
        const rejection = hermiteRejection(data);
        if (rejection) throw new LocalizedError(rejection);
        this.setState({
            points: copyRows(data.points), mode: data.mode, tangents: copyRows(data.tangents), parameterRule: data.parameterRule,
            tension: data.tension, showTangents: data.showTangents, showBezier: data.showBezier, notice: '',
        });
        this.ensureScene();
    }

    /** A Preset without a saved view is fitted to its points (the saved view is applied before the data, so not in `importPresetData`). */
    override importPreset(preset: Preset) {
        super.importPreset(preset);
        if (!preset.boardState && preset.data) this.fit();
    }

    override initialize() {
        this.ensureScene();
        this.fit();
    }

    private ensureScene() {
        this.removeScene();
        if (!this.board || !this.graphSession?.isAlive) return;
        this.scene = new HermiteScene({
            board: this.board,
            input: () => this.state,
            showTangents: () => this.state.showTangents,
            showBezier: () => this.state.showBezier,
            fontSize: () => this.displaySettings.fontSize,
            onMove: (index, x, y) => this.movePoint(index, x, y),
            onTangent: (index, x, y) => this.moveTangent(index, x, y),
        });
    }

    private removeScene() {
        this.scene?.dispose();
        this.scene = undefined;
    }

    private fit() {
        if (!this.board) return;
        // The drawn tangent arrows too, so their tips (Hermite-mode drag handles) start in view.
        const {points, mode, tangents, parameterRule, tension} = this.state;
        const arrows = mode === 'hermite' ? tangents : catmullRomStored(points, parameterRule, tension);
        this.board.setBoundingBox(hermiteViewBox(points, arrows), true);
        this.board.fullUpdate();
    }

    protected override disposeFigureScene(): void {
        this.removeScene();
    }

    override unmount() {
        this.removeScene();
        super.unmount();
    }

    protected override onStateChange(prevState: Readonly<HermiteGraphState>) {
        if (prevState === this.state || !this.board) return;
        this.scene?.sync();
        this.boardUpdate();
    }

    // ---- Actions -----------------------------------------------------------------------------------------------------

    /** Applies candidate points (and tangents) when the chain can be drawn; otherwise keeps the old data and sets the notice. */
    private tryPoints(points: readonly (readonly [number, number])[], rule: ParameterRule = this.state.parameterRule,
                      tangents: readonly (readonly [number, number])[] = this.state.tangents): boolean {
        if (firstCoincidentPair(points, rule) !== undefined) {
            this.setState({notice: 'coincident'});
            return false;
        }
        this.setState({points, tangents, parameterRule: rule, notice: ''});
        return true;
    }

    /** Moves data point `index`; a move that makes neighbours coincide is refused. In Hermite mode its tangent is kept. */
    movePoint(index: number, x: number, y: number): boolean {
        const points = this.state.points;
        if (!Number.isInteger(index) || index < 0 || index >= points.length || !Number.isFinite(x) || !Number.isFinite(y)) return false;
        const limit = HERMITE_COORDINATE_LIMIT;
        const next = points.map((p, i) => i === index ? [clamp(x, limit), clamp(y, limit)] as const : p);
        return this.tryPoints(next);
    }

    /** Drags the tip of tangent arrow `index` to (x, y): the tangent becomes tip - P. Only in Hermite mode; false when refused. */
    moveTangent(index: number, x: number, y: number): boolean {
        const {points, tangents, mode} = this.state;
        if (mode !== 'hermite' || !Number.isInteger(index) || index < 0 || index >= points.length || !Number.isFinite(x) || !Number.isFinite(y)) return false;
        const next: readonly [number, number] = [clamp(x - points[index][0], HERMITE_TANGENT_LIMIT), clamp(y - points[index][1], HERMITE_TANGENT_LIMIT)];
        this.setState({tangents: tangents.map((m, i) => i === index ? next : m), notice: ''});
        return true;
    }

    /**
     * Applies typed coordinates of point `index` through the same validation as a drag; returns the localized refusal, or
     * undefined when accepted. A refused edit leaves the points and the graph notice alone. An accepted edit that lands
     * outside the view refits the view.
     */
    editPoint(index: number, value: readonly [number, number]): string | undefined {
        const points = this.state.points;
        if (!Number.isInteger(index) || index < 0 || index >= points.length) return undefined;
        const next = points.map((p, i) => i === index ? [value[0], value[1]] as const : p);
        const rejection = hermiteRejection({...this.exportPresetData(), points: next});
        if (rejection) return renderMessage(rejection);
        this.tryPoints(next);
        if (this.board) {
            const [left, top, right, bottom] = this.board.getBoundingBox();
            const [x, y] = value;
            if (x < Math.min(left, right) || x > Math.max(left, right) || y < Math.min(top, bottom) || y > Math.max(top, bottom)) this.fit();
        }
        return undefined;
    }

    /** Applies the typed components of tangent `index` (Hermite mode); returns the localized refusal when out of range. */
    editTangent(index: number, value: readonly [number, number]): string | undefined {
        const {tangents, mode} = this.state;
        if (mode !== 'hermite' || !Number.isInteger(index) || index < 0 || index >= tangents.length) return undefined;
        const next = tangents.map((m, i) => i === index ? [value[0], value[1]] as const : m);
        const rejection = hermiteRejection({...this.exportPresetData(), tangents: next});
        if (rejection) return renderMessage(rejection);
        this.setState({tangents: next, notice: ''});
        return undefined;
    }

    /** Switching to Hermite mode copies the current (tension-scaled) Catmull-Rom tangents, so the curve does not jump. */
    setMode(mode: HermiteMode) {
        if (!isHermiteMode(mode) || mode === this.state.mode) return;
        if (mode === 'hermite') {
            const {points, parameterRule, tension} = this.state;
            this.setState({mode, tangents: catmullRomStored(points, parameterRule, tension), notice: ''});
        } else {
            this.setState({mode, notice: ''});
        }
    }

    setParameterRule(rule: ParameterRule) {
        if (!isParameterRule(rule) || rule === this.state.parameterRule) return;
        this.tryPoints(this.state.points, rule);
    }

    /** Tension scales the Catmull-Rom tangents; it has no meaning in Hermite mode and is ignored there. */
    setTension(value: number) {
        if (!Number.isFinite(value) || this.state.mode !== 'catmull-rom') return;
        this.setState({tension: Math.min(HERMITE_TENSION_MAX, Math.max(HERMITE_TENSION_MIN, value))});
    }

    /** Appends a point one unit right of the last one (left of it at the limit), with its Catmull-Rom tangent. */
    addPoint() {
        const {points, tangents, parameterRule} = this.state;
        if (points.length >= INTERPOLATION_POINTS_MAX) return;
        const last = points[points.length - 1];
        const x = last[0] + 1 <= HERMITE_COORDINATE_LIMIT ? last[0] + 1 : last[0] - 1;
        const next = [...points, [x, last[1]] as const];
        const tangent = catmullRomTangents(next, parameterRule, 1)[next.length - 1];
        if (!this.tryPoints(next, parameterRule, [...tangents, [clamp(tangent[0], HERMITE_TANGENT_LIMIT), clamp(tangent[1], HERMITE_TANGENT_LIMIT)] as const])) return;
        this.ensureScene();
        this.fit();
    }

    /** Removes the last point and its tangent, down to INTERPOLATION_POINTS_MIN. */
    removePoint() {
        const {points, tangents} = this.state;
        if (points.length <= INTERPOLATION_POINTS_MIN) return;
        if (!this.tryPoints(points.slice(0, -1), this.state.parameterRule, tangents.slice(0, -1))) return;
        this.ensureScene();
    }

    setShowTangents(show: boolean) {
        this.setState({showTangents: show});
    }

    setShowBezier(show: boolean) {
        this.setState({showBezier: show});
    }

    // ---- Controls ----------------------------------------------------------------------------------------------------

    override getGraphCommands(): JSX.Element[] {
        if (!this.state.initialized) return [];
        const {points, mode, tangents, parameterRule, tension, showTangents, showBezier, notice} = this.state;
        const hermite = mode === 'hermite';
        return super.getGraphCommands().concat(
            <div key="mode"><ChoiceSelect label={t("hermite_mode")} value={mode}
                                          options={[{value: 'catmull-rom', text: t("hermite_mode_catmull")}, {value: 'hermite', text: t("hermite_mode_hermite")}]}
                                          onChange={value => { if (isHermiteMode(value)) this.setMode(value); }}/></div>,
            <div key="rule"><ChoiceSelect label={t("interp_parameter_rule")} value={parameterRule}
                                          options={[{value: 'uniform', text: t("interp_rule_uniform")}, {value: 'chord', text: t("interp_rule_chord")}]}
                                          onChange={value => { if (isParameterRule(value)) this.setParameterRule(value); }}/></div>,
            <div key="count"><CountSetter label={t("interp_point_count")} n={points.length} min={INTERPOLATION_POINTS_MIN}
                                          max={INTERPOLATION_POINTS_MAX} onPlus={() => this.addPoint()} onMinus={() => this.removePoint()}/></div>,
            <div key="points"><PointListInput title={t("interp_point_list")} points={points} pointLabel={i => t("interp_point_name", {value0: i + 1})}
                                              min={-HERMITE_COORDINATE_LIMIT} max={HERMITE_COORDINATE_LIMIT}
                                              onCommit={(index, value) => this.editPoint(index, value)}/></div>,
            ...(hermite ? [<div key="tangents"><PointListInput title={t("hermite_tangent_list")} points={tangents} axisLabels={["m_x", "m_y"]}
                                                               pointLabel={i => t("hermite_tangent_name", {value0: i + 1})}
                                                               min={-HERMITE_TANGENT_LIMIT} max={HERMITE_TANGENT_LIMIT}
                                                               onCommit={(index, value) => this.editTangent(index, value)}/></div>] : []),
            <div key="tension"><Slider min={HERMITE_TENSION_MIN} max={HERMITE_TENSION_MAX} step={HERMITE_TENSION_STEP} value={tension}
                                       customText={t("hermite_tension")} help={t(hermite ? "hermite_tension_disabled" : "hermite_tension_help")}
                                       disabled={hermite} onChange={value => this.setTension(value)}/></div>,
            <div key="tangent-switch"><OnOffSwitch checked={showTangents} label={t("hermite_show_tangents")} onChange={checked => this.setShowTangents(checked)}/></div>,
            <div key="bezier"><OnOffSwitch checked={showBezier} label={t("hermite_show_bezier")} onChange={checked => this.setShowBezier(checked)}/></div>,
            ...(hermite ? [] : [<div key="end-note" className="inspector-help">{t("hermite_end_note")}</div>]),
            ...(notice === 'coincident' ? [<div key="notice" role="alert" className="inspector-help">{t("hermite_coincident_notice")}</div>] : []),
        );
    }
}

export default HermiteGraph;
