import React from "react";
import {LocalizedError, message, renderMessage, t} from "../../../localization";
import type {Message} from "../../../localization";
import {DomainError} from "../../functions/BaseFunctionGraph";
import {placeNewPoint, refitWhenOutside} from "../../base/points";
import Slider from "../../../inputs/Slider";
import {ChoiceSelect} from "../../../inputs/ChoiceSelect";
import {PointCollection} from "../../../inputs/PointCollection";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {PointListInput} from "../../../inputs/PointListInput";
import {RefusalChannel, RefusalNotice} from "../../../inputs/RefusalChannel";
import {catmullRomTangents} from "../../../analysis/hermite";
import {INTERPOLATION_POINTS_MAX, INTERPOLATION_POINTS_MIN} from "../../../analysis/interpolation";
import BaseGraph, {BaseGraphState} from "../../base/BaseGraph";
import {Preset} from "../../base/presets/Presets";
import type {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
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
    /** The one refusal the panel shows (coincident neighbours keep their stated reason); cleared by the next accepted edit. */
    private readonly refusals = new RefusalChannel(() => this.requestRender());

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

    /** A lesson scene starts from the default points in their fitted view, since an earlier scene may have added points. */
    protected override prepareLessonDefaultScene(): void {
        super.prepareLessonDefaultScene();
        this.fit();
    }

    /** Rejects data the model cannot draw before touching the state, then rebuilds the scene. */
    override importPresetData(data: HermitePresetData) {
        const rejection = hermiteRejection(data);
        if (rejection) throw new LocalizedError(rejection);
        this.refusals.clear();
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
        // The figure path's import has just built the scene; mount has none yet. A stored scene state can name another
        // point count than the Preset data (a hand-edited Preset), which the built scene cannot sync to: rebuild then.
        if (!this.scene || this.scene.pointCount !== this.state.points.length) this.ensureScene();
        this.fit();
    }

    private ensureScene() {
        // Figure-path disposal has already removed the scene; tear down only a scene still standing (mount, lesson entries).
        if (this.scene) this.removeScene();
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
            this.refusals.refuse(message("hermite_coincident_notice"));
            this.setState({notice: 'coincident'});
            return false;
        }
        this.refusals.clear();
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
        this.refusals.clear();
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
        this.refitFor([[value[0], value[1]], ...this.arrowTips(index)]);
        return undefined;
    }

    /** Applies the typed components of tangent `index` (Hermite mode); returns the localized refusal when out of range. */
    editTangent(index: number, value: readonly [number, number]): string | undefined {
        const {tangents, mode} = this.state;
        if (mode !== 'hermite' || !Number.isInteger(index) || index < 0 || index >= tangents.length) return undefined;
        const next = tangents.map((m, i) => i === index ? [value[0], value[1]] as const : m);
        const rejection = hermiteRejection({...this.exportPresetData(), tangents: next});
        if (rejection) return renderMessage(rejection);
        this.refusals.clear();
        this.setState({tangents: next, notice: ''});
        return undefined;
    }

    /** Switching to Hermite mode copies the current (tension-scaled) Catmull-Rom tangents, so the curve does not jump. */
    setMode(mode: HermiteMode) {
        if (!isHermiteMode(mode) || mode === this.state.mode) return;
        this.refusals.clear();
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
        this.refusals.clear();
        this.setState({tension: Math.min(HERMITE_TENSION_MAX, Math.max(HERMITE_TENSION_MIN, value))});
    }

    /**
     * Appends a point, with its Catmull-Rom tangent: exactly at `at` when given, else one unit right of the last one (left of it at the
     * limit). The model's rules apply as for a typed edit; the refusal is returned, undefined when added (at the maximum the refusal is `count_at_maximum`).
     * The view follows the shared policy: it refits only when the new point or its tangent tip lies outside it.
     */
    addPoint(at?: readonly [number, number]): Message | undefined {
        const {points, tangents, parameterRule} = this.state;
        if (points.length >= INTERPOLATION_POINTS_MAX) return {key: 'count_at_maximum', params: {value0: INTERPOLATION_POINTS_MAX}};
        const placed = placeNewPoint(points, {at, limit: {max: HERMITE_COORDINATE_LIMIT}, distinct: true});
        const next = [...points, [placed[0], placed[1]] as const];
        // Coincident neighbours first: the Catmull-Rom tangent below is not defined for them.
        const pair = firstCoincidentPair(next, parameterRule);
        if (pair !== undefined) {
            this.refusals.refuse(message("hermite_coincident_notice"));
            this.setState({notice: 'coincident'});
            return message("hermite_coincident_points", {value0: pair, value1: pair + 1});
        }
        const tangent = catmullRomTangents(next, parameterRule, 1)[next.length - 1];
        const nextTangents = [...tangents, [clamp(tangent[0], HERMITE_TANGENT_LIMIT), clamp(tangent[1], HERMITE_TANGENT_LIMIT)] as const];
        const rejection = hermiteRejection({...this.exportPresetData(), points: next, tangents: nextTangents});
        if (rejection) return rejection;
        this.tryPoints(next, parameterRule, nextTangents);
        this.ensureScene();
        this.refitFor([placed, ...this.arrowTips(next.length - 1)]);
        return undefined;
    }

    /** The tip of the drawn tangent arrow of point `index` (the stored tangent in Hermite mode, the Catmull-Rom one otherwise). */
    private arrowTips(index: number): [number, number][] {
        const {points, mode, tangents, parameterRule, tension} = this.state;
        const arrow = (mode === 'hermite' ? tangents : catmullRomStored(points, parameterRule, tension))[index];
        return arrow ? [[points[index][0] + arrow[0], points[index][1] + arrow[1]]] : [];
    }

    private refitFor(framed: readonly (readonly [number, number])[]) {
        if (this.board) refitWhenOutside(this.board.getBoundingBox() as [number, number, number, number], framed, () => this.fit());
    }

    /** Removes the last point and its tangent, down to INTERPOLATION_POINTS_MIN. */
    removePoint() {
        const {points, tangents} = this.state;
        if (points.length <= INTERPOLATION_POINTS_MIN) return;
        if (!this.tryPoints(points.slice(0, -1), this.state.parameterRule, tangents.slice(0, -1))) return;
        this.ensureScene();
    }

    setShowTangents(show: boolean) {
        this.refusals.clear();
        this.setState({showTangents: show});
    }

    setShowBezier(show: boolean) {
        this.refusals.clear();
        this.setState({showBezier: show});
    }

    // ---- Lesson actions ----------------------------------------------------------------------------------------------

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on('hermite', action => {
            if (action.operation === 'set-mode') {
                if (!isHermiteMode(action.mode)) throw new Error('The mode must be "catmull-rom" or "hermite".');
                this.setMode(action.mode);
            } else if (action.operation === 'set-rule') {
                if (!isParameterRule(action.rule)) throw new Error('The parameter rule must be "uniform" or "chord".');
                this.setParameterRule(action.rule);
            } else if (action.operation === 'set-tension') {
                if (!Number.isFinite(action.value) || action.value < HERMITE_TENSION_MIN || action.value > HERMITE_TENSION_MAX) {
                    throw new Error(`The tension must be a number from ${HERMITE_TENSION_MIN} to ${HERMITE_TENSION_MAX}.`);
                }
                this.setTension(action.value);
            } else if (action.operation === 'set-overlay') {
                if (typeof action.visible !== 'boolean') throw new Error('A hermite set-overlay action needs a boolean visible.');
                if (action.overlay === 'tangents') this.setShowTangents(action.visible);
                else if (action.overlay === 'bezier') this.setShowBezier(action.visible);
                else throw new Error('The overlay must be "tangents" or "bezier".');
            } else if (action.operation === 'add-point') {
                const {x, y} = action;
                if (x === undefined && y === undefined) {
                    // A refused authored add (the maximum, a repeated parameter) is a content defect: fail loudly (task-0 decision 6).
                    const refusal = this.addPoint();
                    if (refusal) throw new DomainError(refusal);
                    return;
                }
                if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) {
                    throw new Error('A hermite add-point action needs finite x and y together, or neither.');
                }
                const refusal = this.addPoint([x, y]);
                if (refusal) throw new DomainError(refusal);
            } else {
                throw new Error('A hermite action needs the operation set-mode, set-rule, set-tension, set-overlay or add-point.');
            }
        });
    }

    // ---- Controls ----------------------------------------------------------------------------------------------------

    override getGraphCommands(): JSX.Element[] {
        if (!this.state.initialized) return [];
        const {points, mode, tangents, parameterRule, tension, showTangents, showBezier} = this.state;
        const hermite = mode === 'hermite';
        return super.getGraphCommands().concat(
            <div key="mode"><ChoiceSelect label={t("hermite_mode")} value={mode}
                                          options={[{value: 'catmull-rom', text: t("hermite_mode_catmull")}, {value: 'hermite', text: t("hermite_mode_hermite")}]}
                                          help={t("hermite_mode_help")}
                                          onChange={value => { if (isHermiteMode(value)) this.setMode(value); }}/></div>,
            <div key="rule"><ChoiceSelect label={t("interp_parameter_rule")} value={parameterRule}
                                          options={[{value: 'uniform', text: t("interp_rule_uniform")}, {value: 'chord', text: t("interp_rule_chord")}]}
                                          onChange={value => { if (isParameterRule(value)) this.setParameterRule(value); }}/></div>,
            <div key="count"><PointCollection label={t("interp_point_count")} count={points.length} min={INTERPOLATION_POINTS_MIN}
                                                 max={INTERPOLATION_POINTS_MAX} onAdd={() => { const refusal = this.addPoint(); return refusal && renderMessage(refusal); }}
                                                 removal={{kind: "last", onRemove: () => this.removePoint()}}/></div>,
            <div key="points"><PointListInput title={t("interp_point_list")} points={points} pointLabel={i => t("interp_point_name", {value0: i + 1})}
                                              min={-HERMITE_COORDINATE_LIMIT} max={HERMITE_COORDINATE_LIMIT}
                                              onCommit={(index, value) => this.editPoint(index, value)}/></div>,
            ...(hermite ? [<div key="tangents"><PointListInput title={t("hermite_tangent_list")} points={tangents} axisLabels={["m_x", "m_y"]}
                                                               pointLabel={i => t("hermite_tangent_name", {value0: i + 1})}
                                                               min={-HERMITE_TANGENT_LIMIT} max={HERMITE_TANGENT_LIMIT}
                                                               onCommit={(index, value) => this.editTangent(index, value)}/></div>] : []),
            <div key="tension"><Slider min={HERMITE_TENSION_MIN} max={HERMITE_TENSION_MAX} step={HERMITE_TENSION_STEP} value={tension}
                                       customText={t("hermite_tension")} help={hermite ? undefined : t("hermite_tension_help")}
                                       unavailableReason={hermite ? t("hermite_tension_disabled") : undefined} onChange={value => this.setTension(value)}/></div>,
            <div key="tangent-switch"><OnOffSwitch checked={showTangents} label={t("hermite_show_tangents")} onChange={checked => this.setShowTangents(checked)}/></div>,
            <div key="bezier"><OnOffSwitch checked={showBezier} label={t("hermite_show_bezier")} onChange={checked => this.setShowBezier(checked)}/></div>,
            ...(hermite ? [] : [<div key="end-note" className="inspector-help">{t("hermite_end_note")}</div>]),
            <RefusalNotice key="notice" channel={this.refusals}/>,
        );
    }
}

export default HermiteGraph;
