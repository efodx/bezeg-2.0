import React from "react";
import {LocalizedError, t, currentLanguage} from "../../../localization";
import Slider from "../../../inputs/Slider";
import {ChoiceSelect} from "../../../inputs/ChoiceSelect";
import {CountSetter} from "../../../inputs/CountSetter";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {INTERPOLATION_POINTS_MAX, INTERPOLATION_POINTS_MIN, Point2} from "../../../analysis/interpolation";
import BaseGraph, {BaseGraphState} from "../../base/BaseGraph";
import {Preset} from "../../base/presets/Presets";
import {
    DEFAULT_INTERPOLATION_PRESET, INTERPOLATION_COORDINATE_LIMIT, interpolationRejection, InterpolationPresetData,
    isParameterRule, ParameterRule, readoutLines,
} from "./interpolationModel";
import {interpolationPresetCollection} from "./interpolationPresetCollection";
import {InterpolationScene} from "./InterpolationScene";

export interface InterpolationGraphState extends BaseGraphState {
    points: readonly (readonly [number, number])[];
    parameterRule: ParameterRule;
    showHull: boolean;
    showBezier: boolean;
    /** Shared position s in [0, 1] (Lagrange t = t_n s, Bezier u = s). */
    t: number;
    /** Why the last edit was refused (the state keeps the previous, valid data); empty when the last edit was accepted. */
    notice: '' | 'coincident';
}

/** The view that shows the points with a margin, so the interpolant's overshoot is mostly visible. */
export const interpolationViewBox = (points: readonly Point2[]): [number, number, number, number] => {
    const xs = points.map(p => p[0]);
    const ys = points.map(p => p[1]);
    const width = Math.max(1, Math.max(...xs) - Math.min(...xs));
    const height = Math.max(1, Math.max(...ys) - Math.min(...ys));
    const margin = Math.max(width, height) * 0.45;
    return [Math.min(...xs) - margin, Math.max(...ys) + margin, Math.max(...xs) + margin, Math.min(...ys) - margin];
};

/**
 * Lagrange interpolation versus Bezier approximation Demonstration (interpolation lesson I1). It extends `BaseGraph`
 * directly (not the Bezier base class): the control-point and spline machinery would have to be bypassed for a curve that
 * is not a Bezier spline, and the scene is a handful of owned elements like the parametric Demonstration's. The one owned
 * {@link InterpolationScene} is rebuilt when the point count changes or a Preset is imported and is disposed on unmount;
 * everything else is read lazily from the scene state, which is the only copy of the data.
 */
export class InterpolationGraph extends BaseGraph<InterpolationGraphState, InterpolationPresetData> {
    private scene?: InterpolationScene;

    override getInitialState(): InterpolationGraphState {
        return {initialized: false, ...DEFAULT_INTERPOLATION_PRESET, notice: ''};
    }

    override presetCollection() {
        return interpolationPresetCollection;
    }

    defaultPreset(): InterpolationPresetData {
        return {...DEFAULT_INTERPOLATION_PRESET, points: DEFAULT_INTERPOLATION_PRESET.points.map(p => [p[0], p[1]] as const)};
    }

    override exportPresetData(): InterpolationPresetData {
        const {points, parameterRule, showHull, showBezier, t: position} = this.state;
        return {points: points.map(p => [p[0], p[1]] as const), parameterRule, showHull, showBezier, t: position};
    }

    /**
     * Runs right after `importPresetData` for a lesson fixture or default scene and is laid over the initial state: the
     * data just imported must survive it, so the current data fields are returned.
     */
    protected override lessonDefaultState(): InterpolationGraphState {
        const {points, parameterRule, showHull, showBezier, t: position} = this.state;
        return {initialized: true, points, parameterRule, showHull, showBezier, t: position, notice: ''};
    }

    /** Rejects data the model cannot interpolate before touching the state, then rebuilds the scene. */
    override importPresetData(data: InterpolationPresetData) {
        const rejection = interpolationRejection(data.points, data.parameterRule);
        if (rejection) throw new LocalizedError(rejection);
        this.setState({
            points: data.points.map(p => [p[0], p[1]] as const), parameterRule: data.parameterRule, showHull: data.showHull,
            showBezier: data.showBezier, t: data.t, notice: '',
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
        this.scene = new InterpolationScene({
            board: this.board,
            points: () => this.state.points,
            rule: () => this.state.parameterRule,
            showHull: () => this.state.showHull,
            showBezier: () => this.state.showBezier,
            position: () => this.state.t,
            fontSize: () => this.displaySettings.fontSize,
            onMove: (index, x, y) => this.movePoint(index, x, y),
        });
    }

    private removeScene() {
        this.scene?.dispose();
        this.scene = undefined;
    }

    private fit() {
        if (!this.board) return;
        this.board.setBoundingBox(interpolationViewBox(this.state.points), true);
        this.board.fullUpdate();
    }

    protected override disposeFigureScene(): void {
        this.removeScene();
    }

    override unmount() {
        this.removeScene();
        super.unmount();
    }

    protected override onStateChange(prevState: Readonly<InterpolationGraphState>) {
        if (prevState === this.state || !this.board) return;
        this.scene?.sync();
        this.boardUpdate();
    }

    // ---- Actions -----------------------------------------------------------------------------------------------------

    /** Applies candidate points when they can be interpolated; otherwise keeps the old ones and sets the notice. */
    private tryPoints(points: readonly (readonly [number, number])[], rule: ParameterRule = this.state.parameterRule): boolean {
        if (interpolationRejection(points, rule)) {
            this.setState({notice: 'coincident'});
            return false;
        }
        this.setState({points, parameterRule: rule, notice: ''});
        return true;
    }

    /** Moves data point `index`; a move that would repeat a parameter, or leave the coordinate range, is refused. */
    movePoint(index: number, x: number, y: number): boolean {
        const points = this.state.points;
        if (!Number.isInteger(index) || index < 0 || index >= points.length || !Number.isFinite(x) || !Number.isFinite(y)) return false;
        const limit = INTERPOLATION_COORDINATE_LIMIT;
        const next = points.map((p, i) => i === index ? [Math.min(limit, Math.max(-limit, x)), Math.min(limit, Math.max(-limit, y))] as const : p);
        return this.tryPoints(next);
    }

    setParameterRule(rule: ParameterRule) {
        if (!isParameterRule(rule) || rule === this.state.parameterRule) return;
        this.tryPoints(this.state.points, rule);
    }

    /** Appends a point one unit right of the last one, up to INTERPOLATION_POINTS_MAX. */
    addPoint() {
        const points = this.state.points;
        if (points.length >= INTERPOLATION_POINTS_MAX) return;
        const last = points[points.length - 1];
        // One unit right of the last point, or left of it at the coordinate limit, so the new point is always distinct.
        const x = last[0] + 1 <= INTERPOLATION_COORDINATE_LIMIT ? last[0] + 1 : last[0] - 1;
        if (!this.tryPoints([...points, [x, last[1]] as const])) return;
        this.ensureScene();
        this.fit();
    }

    /** Removes the last point, down to INTERPOLATION_POINTS_MIN. */
    removePoint() {
        const points = this.state.points;
        if (points.length <= INTERPOLATION_POINTS_MIN) return;
        if (!this.tryPoints(points.slice(0, -1))) return;
        this.ensureScene();
    }

    setShowHull(show: boolean) {
        this.setState({showHull: show});
    }

    setShowBezier(show: boolean) {
        this.setState({showBezier: show});
    }

    setPosition(value: number) {
        if (!Number.isFinite(value)) return;
        this.setState({t: Math.min(1, Math.max(0, value))});
    }

    // ---- Controls ----------------------------------------------------------------------------------------------------

    override getGraphCommands(): JSX.Element[] {
        if (!this.state.initialized) return [];
        const {points, parameterRule, showHull, showBezier, t: position, notice} = this.state;
        const lines = readoutLines(points, parameterRule, position, showBezier, currentLanguage());
        return super.getGraphCommands().concat(
            <div key="rule"><ChoiceSelect label={t("interp_parameter_rule")} value={parameterRule}
                                          options={[{value: 'uniform', text: t("interp_rule_uniform")}, {value: 'chord', text: t("interp_rule_chord")}]}
                                          onChange={value => { if (isParameterRule(value)) this.setParameterRule(value); }}/></div>,
            <div key="count"><CountSetter label={t("interp_point_count")} n={points.length} min={INTERPOLATION_POINTS_MIN}
                                          max={INTERPOLATION_POINTS_MAX} onPlus={() => this.addPoint()} onMinus={() => this.removePoint()}/></div>,
            <div key="hull"><OnOffSwitch checked={showHull} label={t("interp_show_hull")} onChange={checked => this.setShowHull(checked)}/></div>,
            <div key="bezier"><OnOffSwitch checked={showBezier} label={t("interp_show_bezier")} onChange={checked => this.setShowBezier(checked)}/></div>,
            <div key="position"><Slider min={0} max={1} step={0.01} value={position} customText={t("interp_slider_position")}
                                        help={t("interp_slider_help")} onChange={value => this.setPosition(value)}/></div>,
            <div key="readout" role="status" className="inspector-help">
                {lines.map((line, i) => <p key={i}>{line}</p>)}
            </div>,
            ...(notice === 'coincident' ? [<div key="notice" role="alert" className="inspector-help">{t("interp_coincident_notice")}</div>] : []),
        );
    }
}

export default InterpolationGraph;
