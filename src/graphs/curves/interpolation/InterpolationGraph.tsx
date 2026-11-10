import React from "react";
import {message, renderMessage} from "../../../localization";
import type {Message} from "../../../localization";
import {DomainError} from "../../functions/BaseFunctionGraph";
import {constrainPoint, placeNewPoint, refitWhenOutside} from "../../base/points";
import {LocalizedError, t, currentLanguage} from "../../../localization";
import Slider from "../../../inputs/Slider";
import {ChoiceSelect} from "../../../inputs/ChoiceSelect";
import {PointCollection} from "../../../inputs/PointCollection";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {PointListInput} from "../../../inputs/PointListInput";
import {RefusalChannel, RefusalNotice} from "../../../inputs/RefusalChannel";
import {LiveReadout} from "../../base/controls/LiveReadout";
import {useStatusReadout} from "../../base/controls/useStatusReadout";
import {BasisPlot} from "./BasisPlot";
import {basisPlotData} from "./interpolationBasis";
import {INTERPOLATION_POINTS_MAX, INTERPOLATION_POINTS_MIN, Point2} from "../../../analysis/interpolation";
import BaseGraph, {BaseGraphState} from "../../base/BaseGraph";
import {Preset} from "../../base/presets/Presets";
import type {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
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
    showBasis: boolean;
    /** Shared position s in [0, 1] (Lagrange t = t_n s, Bezier u = s). */
    t: number;
    /** Why the last edit was refused (the state keeps the previous, valid data); empty when the last edit was accepted. */
    notice: '' | 'coincident';
}

/** The visible readout lines (no live role) and the graph's one live region; a slider drag publishes after the quiet period. */
function InterpolationReadout({lines}: {lines: readonly string[]}) {
    const readout = useStatusReadout(lines.join("\n"), true);
    return <>
        <div className="inspector-help">{lines.map((line, i) => <p key={i}>{line}</p>)}</div>
        <LiveReadout readout={readout}/>
    </>;
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
    /** The one refusal the panel shows (a repeated parameter keeps its stated reason); cleared by the next accepted edit. */
    private readonly refusals = new RefusalChannel(() => this.requestRender());

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
        const {points, parameterRule, showHull, showBezier, showBasis, t: position} = this.state;
        return {points: points.map(p => [p[0], p[1]] as const), parameterRule, showHull, showBezier, showBasis, t: position};
    }

    /**
     * Runs right after `importPresetData` for a lesson fixture or default scene and is laid over the initial state: the
     * data just imported must survive it, so the current data fields are returned.
     */
    protected override lessonDefaultState(): InterpolationGraphState {
        const {points, parameterRule, showHull, showBezier, showBasis, t: position} = this.state;
        return {initialized: true, points, parameterRule, showHull, showBezier, showBasis, t: position, notice: ''};
    }

    /** A lesson scene starts from the default points in their fitted view, since an earlier scene may have added a point. */
    protected override prepareLessonDefaultScene(): void {
        super.prepareLessonDefaultScene();
        this.fit();
    }

    /** Refuses persisted data this graph cannot show, before anything changes; same limits as importPresetData. */
    protected override consumerRefusal(data: InterpolationPresetData) {
        return interpolationRejection(data.points, data.parameterRule);
    }

    /** Rejects data the model cannot interpolate before touching the state, then rebuilds the scene. */
    override importPresetData(data: InterpolationPresetData) {
        const rejection = interpolationRejection(data.points, data.parameterRule);
        if (rejection) throw new LocalizedError(rejection);
        this.refusals.clear();
        this.setState({
            points: data.points.map(p => [p[0], p[1]] as const), parameterRule: data.parameterRule, showHull: data.showHull,
            showBezier: data.showBezier, showBasis: data.showBasis, t: data.t, notice: '',
        });
        this.ensureScene();
    }

    /** A Preset without a saved view is fitted to its points (the saved view is applied before the data, so not in `importPresetData`). */
    override importPreset(preset: Preset) {
        super.importPreset(preset);
        if (!preset.boardState && preset.data) this.fit();
    }

    override initialize() {
        // The figure path's import has just built the scene; mount has none yet. A stored scene state can name another
        // point count than the Preset data (a hand-edited Preset), which the built scene cannot sync to: rebuild then.
        if (!this.scene || this.scene.pointCount !== this.state.points.length) this.ensureScene();
        this.fit();
    }

    private ensureScene() {
        // Figure-path disposal has already removed the scene; tear down only a scene still standing (mount, lesson entries).
        if (this.scene) this.removeScene();
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
            this.refusals.refuse(message("interp_coincident_notice"));
            this.setState({notice: 'coincident'});
            return false;
        }
        this.refusals.clear();
        this.setState({points, parameterRule: rule, notice: ''});
        return true;
    }

    /** Moves data point `index`; a move that would repeat a parameter, or leave the coordinate range, is refused. */
    movePoint(index: number, x: number, y: number): boolean {
        const points = this.state.points;
        if (!Number.isInteger(index) || index < 0 || index >= points.length || !Number.isFinite(x) || !Number.isFinite(y)) return false;
        // The shared drag rule: a silent clamp to the coordinate range, no step. A repeated parameter is still refused with its notice.
        const limit = INTERPOLATION_COORDINATE_LIMIT;
        const moved = constrainPoint([x, y], {bounds: {x: [-limit, limit], y: [-limit, limit]}});
        const next = points.map((p, i) => i === index ? moved : p);
        return this.tryPoints(next);
    }

    /**
     * Applies typed coordinates of point `index` through the same validation as a drag (no repeated parameter, coordinates within
     * the limit); returns the localized refusal, or undefined when accepted. A refused edit leaves the points and the graph notice
     * alone: the refusal is shown (once) at the field that asked. An accepted edit that lands outside the view refits the view.
     */
    editPoint(index: number, value: readonly [number, number]): string | undefined {
        const points = this.state.points;
        if (!Number.isInteger(index) || index < 0 || index >= points.length) return undefined;
        const next = points.map((p, i) => i === index ? [value[0], value[1]] as const : p);
        const rejection = interpolationRejection(next, this.state.parameterRule);
        if (rejection) return renderMessage(rejection);
        this.tryPoints(next);
        this.refitFor([[value[0], value[1]]]);
        return undefined;
    }

    setShowBasis(show: boolean) {
        this.refusals.clear();
        this.setState({showBasis: show});
    }

    setParameterRule(rule: ParameterRule) {
        if (!isParameterRule(rule) || rule === this.state.parameterRule) return;
        this.tryPoints(this.state.points, rule);
    }

    /** The view policy of an add or a typed edit: the view moves only when a framed point lies outside it (a drag never calls this). */
    private refitFor(framed: readonly (readonly [number, number])[]) {
        if (this.board) refitWhenOutside(this.board.getBoundingBox() as [number, number, number, number], framed, () => this.fit());
    }

    /**
     * Appends a point up to INTERPOLATION_POINTS_MAX: exactly at `at` when given, else one unit right of the last one (left of it at
     * the coordinate limit). The model's rules still apply (a repeated parameter or an out-of-range value is refused with its
     * notice); the refusal is returned, undefined when the point was added (at the maximum the refusal is `count_at_maximum`).
     */
    addPoint(at?: readonly [number, number]): Message | undefined {
        const points = this.state.points;
        if (points.length >= INTERPOLATION_POINTS_MAX) return {key: 'count_at_maximum', params: {value0: INTERPOLATION_POINTS_MAX}};
        const placed = placeNewPoint(points, {at, limit: {max: INTERPOLATION_COORDINATE_LIMIT}, distinct: true});
        const next = [...points, [placed[0], placed[1]] as const];
        const rejection = interpolationRejection(next, this.state.parameterRule);
        if (!this.tryPoints(next)) return rejection;
        this.ensureScene();
        this.refitFor([placed]);
        return undefined;
    }

    /** Removes the last point, down to INTERPOLATION_POINTS_MIN. */
    removePoint() {
        const points = this.state.points;
        if (points.length <= INTERPOLATION_POINTS_MIN) return;
        if (!this.tryPoints(points.slice(0, -1))) return;
        this.ensureScene();
    }

    setShowHull(show: boolean) {
        this.refusals.clear();
        this.setState({showHull: show});
    }

    setShowBezier(show: boolean) {
        this.refusals.clear();
        this.setState({showBezier: show});
    }

    setPosition(value: number) {
        if (!Number.isFinite(value)) return;
        this.refusals.clear();
        this.setState({t: Math.min(1, Math.max(0, value))});
    }

    // ---- Lesson actions ----------------------------------------------------------------------------------------------

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on('interpolation', action => {
            if (action.operation === 'set-rule') {
                if (!isParameterRule(action.rule)) throw new Error('The parameter rule must be "uniform" or "chord".');
                this.setParameterRule(action.rule);
            } else if (action.operation === 'set-overlay') {
                if (typeof action.visible !== 'boolean') throw new Error('An interpolation set-overlay action needs a boolean visible.');
                if (action.overlay === 'hull') this.setShowHull(action.visible);
                else if (action.overlay === 'bezier') this.setShowBezier(action.visible);
                else if (action.overlay === 'basis') this.setShowBasis(action.visible);
                else throw new Error('The overlay must be "hull", "bezier" or "basis".');
            } else if (action.operation === 'add-point') {
                const {x, y} = action;
                if (x === undefined && y === undefined) {
                    // A refused authored add (the maximum, a repeated parameter) is a content defect: fail loudly (task-0 decision 6).
                    const refusal = this.addPoint();
                    if (refusal) throw new DomainError(refusal);
                    return;
                }
                if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) {
                    throw new Error('An interpolation add-point action needs finite x and y together, or neither.');
                }
                const refusal = this.addPoint([x, y]);
                if (refusal) throw new DomainError(refusal);
            } else {
                throw new Error('An interpolation action needs the operation set-rule, set-overlay or add-point.');
            }
        });
        registry.onDiscriminated('parameter', 't', action => {
            if (!Number.isFinite(action.value) || action.value < 0 || action.value > 1) throw new Error('The position must be a number from 0 to 1.');
            this.setPosition(action.value);
        });
    }

    // ---- Controls ----------------------------------------------------------------------------------------------------

    override getGraphCommands(): JSX.Element[] {
        if (!this.state.initialized) return [];
        const {points, parameterRule, showHull, showBezier, showBasis, t: position} = this.state;
        const lines = readoutLines(points, parameterRule, position, showBezier, currentLanguage());
        return super.getGraphCommands().concat(
            <div key="rule"><ChoiceSelect label={t("interp_parameter_rule")} value={parameterRule}
                                          options={[{value: 'uniform', text: t("interp_rule_uniform")}, {value: 'chord', text: t("interp_rule_chord")}]}
                                          onChange={value => { if (isParameterRule(value)) this.setParameterRule(value); }}/></div>,
            <div key="count"><PointCollection label={t("interp_point_count")} count={points.length} min={INTERPOLATION_POINTS_MIN}
                                                 max={INTERPOLATION_POINTS_MAX} onAdd={() => { const refusal = this.addPoint(); return refusal && renderMessage(refusal); }}
                                                 removal={{kind: 'last', onRemove: () => this.removePoint()}}/></div>,
            <div key="points"><PointListInput title={t("interp_point_list")} points={points} pointLabel={i => t("interp_point_name", {value0: i + 1})}
                                              min={-INTERPOLATION_COORDINATE_LIMIT} max={INTERPOLATION_COORDINATE_LIMIT}
                                              onCommit={(index, value) => this.editPoint(index, value)}/></div>,
            <div key="hull"><OnOffSwitch checked={showHull} label={t("interp_show_hull")} onChange={checked => this.setShowHull(checked)}/></div>,
            <div key="bezier"><OnOffSwitch checked={showBezier} label={t("interp_show_bezier")} onChange={checked => this.setShowBezier(checked)}/></div>,
            <div key="basis"><OnOffSwitch checked={showBasis} label={t("interp_show_basis")} onChange={checked => this.setShowBasis(checked)}/></div>,
            ...(showBasis ? [<div key="basis-plot"><BasisPlot data={basisPlotData(points, parameterRule, position)} fontSize={this.displaySettings.fontSize}/></div>] : []),
            <div key="position"><Slider min={0} max={1} step={0.01} value={position} customText={t("interp_slider_position")}
                                        help={t("interp_slider_help")} onChange={value => this.setPosition(value)}/></div>,
            <InterpolationReadout key="readout" lines={lines}/>,
            <RefusalNotice key="notice" channel={this.refusals}/>,
        );
    }
}

export default InterpolationGraph;
