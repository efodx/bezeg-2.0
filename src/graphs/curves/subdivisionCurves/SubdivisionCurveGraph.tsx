import React from "react";
import {LocalizedError, renderMessage, t} from "../../../localization";
import {ChoiceSelect} from "../../../inputs/ChoiceSelect";
import {CountSetter} from "../../../inputs/CountSetter";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {PointListInput} from "../../../inputs/PointListInput";
import {AnimationScheduler} from "../../../learning/runtime/animation";
import {IterationController} from "../../../learning/runtime/iterationController";
import BaseGraph, {BaseGraphState} from "../../base/BaseGraph";
import {Preset} from "../../base/presets/Presets";
import {
    DEFAULT_SUBDIVISION_PRESET, isSubdivisionRule, MAX_SUBDIVISION_ROUNDS, Row, stageOf, SUBDIVISION_CLOSED_POINTS_MIN,
    SUBDIVISION_COORDINATE_LIMIT, SUBDIVISION_POINTS_MAX, SUBDIVISION_POINTS_MIN, SUBDIVISION_STEP_INTERVAL_MS, SubdivisionPresetData,
    subdivisionRejection, SubdivisionRule, subdivisionViewBox,
} from "./subdivisionModel";
import {subdivisionPresetCollection} from "./subdivisionPresetCollection";
import {SubdivisionScene} from "./SubdivisionScene";

export interface SubdivisionGraphState extends BaseGraphState {
    points: readonly Row[];
    closed: boolean;
    rule: SubdivisionRule;
    /** Revealed rounds, 0..MAX_SUBDIVISION_ROUNDS. */
    round: number;
    showLimit: boolean;
    /** Why the last point removal or closing was refused (the state keeps the previous, valid data); empty otherwise. */
    notice: '' | 'closed-needs-three';
}

const clamp = (value: number) => Math.min(SUBDIVISION_COORDINATE_LIMIT, Math.max(-SUBDIVISION_COORDINATE_LIMIT, value));
const copyRows = (rows: readonly Row[]) => rows.map(r => [r[0], r[1]] as const);

/**
 * Chaikin and four-point subdivision Demonstration (interpolation lesson I5). It extends `BaseGraph` directly and drives the
 * revealed round with an `IterationController` (it mirrors `IterativeFunctionGraph`, whose base class belongs to the function
 * graphs): Next step and every playback step run the one `transition()`; anything that edits the data, replaces the scene,
 * exports a figure or unmounts the graph pauses playback. The stages are always derived from the polygon by
 * `subdivisionRounds`, never stored. The one owned {@link SubdivisionScene} is rebuilt when the point count changes or a Preset
 * is imported and is disposed on unmount.
 */
export class SubdivisionCurveGraph extends BaseGraph<SubdivisionGraphState, SubdivisionPresetData> {
    private scene?: SubdivisionScene;
    private controller: IterationController;
    private controllerDisposed = false;
    /** The polygon the scene started with (default, imported Preset or lesson scene): what Reset returns to. */
    private start: {points: readonly Row[]; closed: boolean} = {points: copyRows(DEFAULT_SUBDIVISION_PRESET.points), closed: false};

    constructor(private readonly scheduler?: AnimationScheduler) {
        super();
        this.controller = this.createController();
    }

    private createController(): IterationController {
        return new IterationController({
            transition: () => this.transition(),
            stepIntervalMs: SUBDIVISION_STEP_INTERVAL_MS,
            maxIterations: MAX_SUBDIVISION_ROUNDS,
            onComplete: () => this.requestRender(),
            scheduler: this.scheduler,
        });
    }

    /** The one step of the iteration: reveal the next round. The controller completes at the round cap. */
    private transition(): void {
        // The controller completes at the cap; the clamp keeps a state restored without a controller reset in range.
        this.setState({round: Math.min(this.state.round + 1, MAX_SUBDIVISION_ROUNDS), notice: ''});
    }

    override getInitialState(): SubdivisionGraphState {
        return {initialized: false, ...DEFAULT_SUBDIVISION_PRESET, notice: ''};
    }

    override presetCollection() {
        return subdivisionPresetCollection;
    }

    defaultPreset(): SubdivisionPresetData {
        return {...DEFAULT_SUBDIVISION_PRESET, points: copyRows(DEFAULT_SUBDIVISION_PRESET.points)};
    }

    override exportPresetData(): SubdivisionPresetData {
        const {points, closed, rule, round, showLimit} = this.state;
        return {points: copyRows(points), closed, rule, round, showLimit};
    }

    /**
     * Runs right after `importPresetData` for a lesson fixture or default scene and is laid over the initial state: the data just
     * imported must survive it, so the current data fields are returned.
     */
    protected override lessonDefaultState(): SubdivisionGraphState {
        const {points, closed, rule, round, showLimit} = this.state;
        return {initialized: true, points, closed, rule, round, showLimit, notice: ''};
    }

    /** Rejects data the model cannot draw before touching the state; a Preset never starts playback and becomes the polygon Reset returns to. */
    override importPresetData(data: SubdivisionPresetData) {
        const rejection = subdivisionRejection(data);
        if (rejection) throw new LocalizedError(rejection);
        this.start = {points: copyRows(data.points), closed: data.closed};
        this.setState({points: copyRows(data.points), closed: data.closed, rule: data.rule, round: data.round, showLimit: data.showLimit, notice: ''});
        this.controller.reset(data.round);
        this.ensureScene();
        this.requestRender();
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
        this.scene = new SubdivisionScene({
            board: this.board,
            input: () => this.state,
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
        this.board.setBoundingBox(subdivisionViewBox(this.state.points), true);
        this.board.fullUpdate();
    }

    override mount(container: HTMLElement): void {
        // A disposed controller stays silent for good; a remount (React StrictMode) needs a new one.
        if (this.controllerDisposed) {
            this.controller = this.createController();
            this.controllerDisposed = false;
        }
        super.mount(container);
    }

    override unmount() {
        this.controller.dispose();
        this.controllerDisposed = true;
        this.removeScene();
        super.unmount();
    }

    protected override disposeFigureScene(): void {
        this.removeScene();
    }

    protected override stopLessonAnimations(): void {
        this.pause();
    }

    protected override beforeFigureCapture(): void {
        this.pause();
    }

    protected override onStateChange(prevState: Readonly<SubdivisionGraphState>) {
        if (prevState === this.state || !this.board) return;
        this.scene?.sync();
        this.boardUpdate();
    }

    // ---- Playback (SUBDIVISION_ANIMATION_ID; lesson wiring belongs to the registration slice) ------------------------

    /** True while every round up to the cap is shown. */
    isComplete(): boolean {
        return this.state.round >= MAX_SUBDIVISION_ROUNDS;
    }

    isPlaying(): boolean {
        return this.controller.isPlaying();
    }

    /** Reveals the next round (taking over from playback); false when the cap is reached or a figure is being captured. */
    nextStep(): boolean {
        if (this.exportBusy || this.isComplete()) return false;
        this.controller.pause();
        const advanced = this.controller.nextStep();
        this.requestRender();
        return advanced;
    }

    play(): void {
        if (this.exportBusy || this.isComplete()) return;
        this.controller.play();
        this.requestRender();
    }

    pause(): void {
        this.controller.pause();
        this.requestRender();
    }

    /** Back to round 0 and the polygon (and closed setting) the scene started with; playback stops. Rule and overlay stay. */
    resetRounds(): void {
        this.controller.reset(0);
        const {points, closed} = this.start;
        const rebuilt = points.length !== this.state.points.length;
        this.setState({points: copyRows(points), closed, round: 0, notice: ''});
        if (rebuilt) {
            this.ensureScene();
            this.fit();
        }
        this.requestRender();
    }

    // ---- Edits -------------------------------------------------------------------------------------------------------

    /** Moves polygon point `index`; playback pauses and the round is kept. */
    movePoint(index: number, x: number, y: number): boolean {
        const points = this.state.points;
        if (!Number.isInteger(index) || index < 0 || index >= points.length || !Number.isFinite(x) || !Number.isFinite(y)) return false;
        this.pause();
        this.setState({points: points.map((p, i) => i === index ? [clamp(x), clamp(y)] as const : p), notice: ''});
        return true;
    }

    /** Applies typed coordinates of point `index`; returns the localized refusal, or undefined when accepted. An edit outside the view refits it. */
    editPoint(index: number, value: Row): string | undefined {
        const points = this.state.points;
        if (!Number.isInteger(index) || index < 0 || index >= points.length) return undefined;
        const next = points.map((p, i) => i === index ? [value[0], value[1]] as const : p);
        const rejection = subdivisionRejection({...this.exportPresetData(), points: next});
        if (rejection) return renderMessage(rejection);
        this.pause();
        this.setState({points: next, notice: ''});
        if (this.board) {
            const [left, top, right, bottom] = this.board.getBoundingBox();
            const [x, y] = value;
            if (x < Math.min(left, right) || x > Math.max(left, right) || y < Math.min(top, bottom) || y > Math.max(top, bottom)) this.fit();
        }
        return undefined;
    }

    /** Appends a point one unit right of the last one (left of it at the limit); playback pauses, the round is kept. */
    addPoint() {
        const points = this.state.points;
        if (points.length >= SUBDIVISION_POINTS_MAX) return;
        const last = points[points.length - 1];
        const x = last[0] + 1 <= SUBDIVISION_COORDINATE_LIMIT ? last[0] + 1 : last[0] - 1;
        this.pause();
        this.setState({points: [...points, [x, last[1]] as const], notice: ''});
        this.ensureScene();
        this.fit();
    }

    /** Removes the last point, down to 2 (3 when closed: refused with a notice). */
    removePoint() {
        const {points, closed} = this.state;
        if (points.length <= SUBDIVISION_POINTS_MIN) return;
        if (closed && points.length <= SUBDIVISION_CLOSED_POINTS_MIN) {
            this.setState({notice: 'closed-needs-three'});
            return;
        }
        this.pause();
        this.setState({points: points.slice(0, -1), notice: ''});
        this.ensureScene();
    }

    /** Opens or closes the polygon; closing needs 3 points (refused with a notice). Playback pauses and the round is kept. */
    setClosed(closed: boolean) {
        if (typeof closed !== 'boolean' || closed === this.state.closed) return;
        if (closed && this.state.points.length < SUBDIVISION_CLOSED_POINTS_MIN) {
            this.setState({notice: 'closed-needs-three'});
            return;
        }
        this.pause();
        this.setState({closed, notice: ''});
    }

    /** Switching the rule returns to round 0 (paused), so the four-point reveal is not shown before the prediction step. */
    setRule(rule: SubdivisionRule) {
        if (!isSubdivisionRule(rule) || rule === this.state.rule) return;
        this.controller.reset(0);
        this.setState({rule, round: 0, notice: ''});
        this.requestRender();
    }

    setShowLimit(show: boolean) {
        this.setState({showLimit: show});
    }

    // ---- Controls ----------------------------------------------------------------------------------------------------

    override getGraphCommands(): JSX.Element[] {
        if (!this.state.initialized) return [];
        const {points, closed, rule, round, showLimit, notice} = this.state;
        const playing = this.controller.isPlaying();
        const complete = this.isComplete();
        const nextUnavailable = complete || playing;
        const playUnavailable = complete && !playing;
        const resetUnavailable = !playing && round === 0 && this.isStartPolygon();
        return super.getGraphCommands().concat(
            <div key="rule"><ChoiceSelect label={t("subdiv_rule")} value={rule}
                                          options={[{value: 'chaikin', text: t("subdiv_rule_chaikin")}, {value: 'four-point', text: t("subdiv_rule_four_point")}]}
                                          onChange={value => { if (isSubdivisionRule(value)) this.setRule(value); }}/></div>,
            <div key="closed"><OnOffSwitch checked={closed} label={t("subdiv_closed")} onChange={checked => this.setClosed(checked)}/></div>,
            <div key="count"><CountSetter label={t("subdiv_point_count")} n={points.length} min={SUBDIVISION_POINTS_MIN}
                                          max={SUBDIVISION_POINTS_MAX} onPlus={() => this.addPoint()} onMinus={() => this.removePoint()}/></div>,
            <div key="points"><PointListInput title={t("interp_point_list")} points={points} pointLabel={i => t("interp_point_name", {value0: i + 1})}
                                              min={-SUBDIVISION_COORDINATE_LIMIT} max={SUBDIVISION_COORDINATE_LIMIT}
                                              onCommit={(index, value) => this.editPoint(index, value)}/></div>,
            <div key="limit"><OnOffSwitch checked={showLimit} label={t("subdiv_show_limit")} disabled={rule !== 'chaikin'}
                                          onChange={checked => this.setShowLimit(checked)}/>
                {rule !== 'chaikin' ? <p className="inspector-help">{t("subdiv_limit_disabled")}</p> : null}</div>,
            // An unavailable control stays focusable (aria-disabled, not disabled), as in the other iterations.
            <div key="playback" className="inspector-group">
                <div className="inspector-playback" role="group" aria-label={t("subdiv_controls")}>
                    <button type="button" data-action="next-step" aria-disabled={nextUnavailable}
                            onClick={() => { if (!nextUnavailable) this.nextStep(); }}>{t("subdiv_next_step")}</button>
                    <button type="button" data-action="play-pause" aria-disabled={playUnavailable}
                            onClick={() => { if (!playUnavailable) { if (playing) this.pause(); else this.play(); } }}>{playing ? t("pause") : t("play")}</button>
                    <button type="button" data-action="reset" aria-disabled={resetUnavailable}
                            onClick={() => { if (!resetUnavailable) this.resetRounds(); }}>{t("subdiv_reset")}</button>
                </div>
                <p className="inspector-help">{t("subdiv_playback_note", {value0: MAX_SUBDIVISION_ROUNDS})}</p>
            </div>,
            <div key="status" className="inspector-group" role="status" aria-live="polite">
                <p className="inspector-help" data-subdivision-status="step">{t("subdiv_step_readout", {value0: round, value1: MAX_SUBDIVISION_ROUNDS})}</p>
                <p className="inspector-help" data-subdivision-status="vertices">{t("subdiv_vertex_count", {value0: stageOf(this.state).length})}</p>
                {complete ? <p className="inspector-help" data-subdivision-status="complete">{t("subdiv_complete", {value0: MAX_SUBDIVISION_ROUNDS})}</p> : null}
            </div>,
            ...(notice === 'closed-needs-three' ? [<div key="notice" role="alert" className="inspector-help">{t("subdiv_closed_notice")}</div>] : []),
        );
    }

    /** Whether the polygon and the closed setting are the starting ones, so Reset would change nothing. */
    private isStartPolygon(): boolean {
        const {points, closed} = this.state;
        return closed === this.start.closed && points.length === this.start.points.length
            && points.every((p, i) => p[0] === this.start.points[i][0] && p[1] === this.start.points[i][1]);
    }
}

export default SubdivisionCurveGraph;
