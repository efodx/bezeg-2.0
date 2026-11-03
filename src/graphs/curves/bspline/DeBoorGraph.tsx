import React from "react";
import {renderMessage, t} from "../../../localization";
import Slider from "../../../inputs/Slider";
import {ChoiceSelect} from "../../../inputs/ChoiceSelect";
import {CountSetter} from "../../../inputs/CountSetter";
import BaseGraph, {BaseGraphState, TransientState} from "../../base/BaseGraph";
import {BSplineCurve, InvalidKnotVectorError} from "../../../bezeg/impl/curve/bspline-curve";
import type {LessonAnimationCommand, LessonCurveFixture} from "../../../learning/model";
import type {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {AnimationScheduler} from "../../../learning/runtime/animation";
import {IterationController, IterationOutcome} from "../../../learning/runtime/iterationController";
import {BSplinePresetData, bsplinePresetCollection} from "./bsplinePresetCollection";
import {knotRejectionMessage} from "./bsplineKnotMessages";
import {DeBoorScene} from "./DeBoorScene";
import {KnotEditor} from "./KnotEditor";
import {BASIS_MAX_DEGREE, BASIS_MIN_DEGREE, isClamped, KNOT_LIMIT, knotProblem, lastIndexOf} from "./bsplineBasisModel";
import {
    appendedPoint, ControlPoint, DEBOOR_ANIMATION_ID, DEBOOR_DEFAULT_T, DEBOOR_MAX_LEVELS, DEBOOR_MAX_POINTS, DEBOOR_STEP_INTERVAL_MS, clampParameter,
    assertDrawableCurve, deBoorPresetData, defaultDeBoorData, knotsForCount,
} from "./bsplineDeBoorModel";

export {DEBOOR_ANIMATION_ID} from "./bsplineDeBoorModel";

const LESSON_COMMANDS: readonly LessonAnimationCommand[] = ['play', 'pause', 'next-step', 'reset'];

export interface DeBoorGraphState extends BaseGraphState {
    degree: number;
    /** Raw knots (ADR 0024). */
    knots: readonly number[];
    points: readonly ControlPoint[];
    /** Raw slider parameter; it is held inside the domain wherever it is read. */
    t: number;
    /** The revealed level of the triangle, 0..degree. */
    level: number;
}

const initialData = (): Omit<DeBoorGraphState, 'initialized'> => {
    const {degree, knots, points} = defaultDeBoorData();
    return {degree, knots, points, t: DEBOOR_DEFAULT_T, level: 0};
};

/**
 * De Boor graph (lesson L2): draggable control points, the B-spline curve, a slider t and the de Boor triangle at t drawn level by
 * level in the De Casteljau look, with a readout of the span, every level's points and every alpha. A level-by-level animation
 * (`DEBOOR_ANIMATION_ID`) is driven by an `IterationController`. The scene state (degree, knots, points, t, revealed level) is the
 * only copy of the data; the owned {@link DeBoorScene} reads it lazily. It extends `BaseGraph` directly, like the basis graph, and
 * is registered as the `bspline-deboor` Demonstration with the L2 lesson. Its Preset collection is `bsplinePresetCollection`. The graph draws only
 * the non-rational B-spline: optional NURBS `weights` pass the collection's check but are ignored by `importPresetData` and omitted
 * from `exportPresetData`.
 */
export class DeBoorGraph extends BaseGraph<DeBoorGraphState, BSplinePresetData> {
    private scene?: DeBoorScene;
    private controller: IterationController;
    private controllerDisposed = false;

    constructor(private readonly scheduler?: AnimationScheduler) {
        super();
        this.controller = this.createController();
    }

    private createController(): IterationController {
        return new IterationController({
            transition: () => this.transition(),
            stepIntervalMs: DEBOOR_STEP_INTERVAL_MS,
            maxIterations: DEBOOR_MAX_LEVELS,
            onComplete: () => this.requestRender(),
            scheduler: this.scheduler,
        });
    }

    override getInitialState(): DeBoorGraphState {
        return {initialized: false, ...initialData()};
    }

    override presetCollection() {
        return bsplinePresetCollection;
    }

    defaultPreset(): BSplinePresetData {
        return deBoorPresetData(defaultDeBoorData());
    }

    override exportPresetData(): BSplinePresetData {
        return deBoorPresetData(this.state);
    }

    /** A lesson curve fixture: its points and degree (the default degree if absent) on the given `knots` as they are (the Preset collection check rejects a non-monotone or wrong-length vector), else on the clamped uniform knot vector for that count. */
    protected override lessonFixtureData(curve: LessonCurveFixture): BSplinePresetData | undefined {
        const degree = curve.degree ?? this.defaultPreset().degree;
        return {degree, knots: curve.knots ? [...curve.knots] : knotsForCount(degree, true, curve.points.length), points: curve.points.map(point => [point[0], point[1]] as const)};
    }

    /** Runs right after `importPresetData` for a lesson fixture or default scene: the imported data survives, the rest is fresh. */
    protected override lessonDefaultState(): DeBoorGraphState {
        const {degree, knots, points} = this.state;
        return {initialized: true, ...initialData(), degree, knots, points};
    }

    /** Rejects data the graph cannot draw before touching the state, then rebuilds the scene and returns the iteration to level 0. */
    override importPresetData(data: BSplinePresetData) {
        assertDrawableCurve(data, DEBOOR_MAX_POINTS);
        this.setState({
            degree: data.degree, knots: [...data.knots], points: data.points.map(point => [point[0], point[1]] as const),
            level: Math.min(this.state.level, data.degree),
        });
        this.ensureScene();
    }

    /** The just-imported data wins over the mount-time defaults and over a stale stored state. */
    protected override figurePresetGraphState(graphState: BaseGraphState | undefined): DeBoorGraphState {
        const merged = super.figurePresetGraphState(graphState);
        const {degree, knots, points} = this.state;
        return {...merged, degree, knots: [...knots], points: points.map(point => [point[0], point[1]] as const), level: Math.min(merged.level, degree)};
    }

    protected override initialView(): [number, number, number, number] {
        return [-1.5, 3.5, 5.5, -1.5];
    }

    override initialize() {
        this.ensureScene();
    }

    private ensureScene() {
        this.removeScene();
        if (!this.board || !this.graphSession?.isAlive) return;
        this.scene = new DeBoorScene({
            board: this.board,
            degree: () => this.state.degree,
            knots: () => this.state.knots,
            points: () => this.state.points,
            t: () => this.state.t,
            level: () => this.state.level,
            fontSize: () => this.displaySettings.fontSize,
            onPointsDrag: points => this.setState({points}),
        });
    }

    private removeScene() {
        this.scene?.dispose();
        this.scene = undefined;
    }

    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.scene?.sync();
    }

    protected override disposeFigureScene(): void {
        this.removeScene();
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

    protected override onStateChange(prevState: Readonly<DeBoorGraphState>) {
        if (prevState === this.state || !this.board) return;
        const {state} = this;
        // Any edit (points, knots, degree, t) ends playback; the revealed level stays.
        if (state.degree !== prevState.degree || state.knots !== prevState.knots || state.points !== prevState.points || state.t !== prevState.t) {
            this.controller.reset(state.level);
        }
        if (this.scene && !this.scene.fits(state.degree, state.points.length)) this.ensureScene();
        else this.scene?.sync();
        this.boardUpdate();
    }

    // ---- Animation ---------------------------------------------------------------------------------------------------

    /** The one step of the iteration: reveal the next level. Completes at level k. */
    private transition(): IterationOutcome {
        const {level, degree} = this.state;
        if (level >= degree) return 'complete';
        this.setState({level: level + 1});
        return level + 1 >= degree ? 'complete' : 'continue';
    }

    /** Whether another level can be revealed. */
    get canAdvance(): boolean {
        return this.state.level < this.state.degree;
    }

    get playing(): boolean {
        return this.controller.isPlaying();
    }

    /** Reveals one level. It takes over from playback; false when all levels are shown (or a figure is being captured). */
    nextStep(): boolean {
        if (this.exportBusy || !this.canAdvance) return false;
        this.controller.pause();
        const moved = this.controller.nextStep();
        this.requestRender();
        return moved;
    }

    /** Starts or resumes playback; from the full triangle it starts again at level 0. */
    play(): void {
        if (this.exportBusy) return;
        if (!this.canAdvance) this.resetLevels();
        this.controller.play();
        this.requestRender();
    }

    pause(): void {
        this.controller.pause();
        this.requestRender();
    }

    /** Back to level 0; playback stops. */
    resetLevels(): void {
        this.controller.reset(0);
        this.setState({level: 0});
        this.requestRender();
    }

    /** The controller follows the revealed level and starts paused: a scene never opens in playback. */
    protected override restoreTransientState(saved: TransientState | undefined): void {
        super.restoreTransientState(saved);
        this.controller.reset(this.state.level);
    }

    protected override stopLessonAnimations(): void {
        this.pause();
    }

    protected override beforeFigureCapture(): void {
        this.pause();
    }

    // ---- Actions -----------------------------------------------------------------------------------------------------

    /** Sets the degree 1-3 and rebuilds a valid vector of the same kind for the current points; refused when there are too few points. */
    setDegree(degree: number) {
        const {points, knots, level} = this.state;
        if (!Number.isInteger(degree) || degree < BASIS_MIN_DEGREE || degree > BASIS_MAX_DEGREE || degree === this.state.degree) return;
        if (points.length < degree + 1) return;
        this.setState({degree, knots: knotsForCount(degree, isClamped(knots, this.state.degree), points.length), level: Math.min(level, degree)});
    }

    /** Adds (true) or removes (false) the last control point; the vector is rebuilt for the new count with the same kind. */
    changePointCount(add: boolean) {
        const {points, knots, degree} = this.state;
        const count = points.length + (add ? 1 : -1);
        if (count < degree + 1 || count > DEBOOR_MAX_POINTS) return;
        const next = add ? [...points, appendedPoint(points)] : points.slice(0, -1);
        const rebuilt = knotsForCount(degree, isClamped(knots, degree), count);
        // The kernel check, so a vector the model would refuse never reaches the state (the count stays unchanged).
        try {
            BSplineCurve.check(next.length, degree, rebuilt);
        } catch (error) {
            if (error instanceof InvalidKnotVectorError) return;
            throw error;
        }
        this.setState({points: next, knots: rebuilt});
    }

    /** Sets the slider by its raw value; it is held inside the domain. */
    setT(value: number) {
        if (!Number.isFinite(value) || !this.scene) return;
        this.setState({t: clampParameter(this.state.knots, this.state.degree, value)});
    }

    /**
     * A typed knot value, applied through the model curve's `setKnots`. Returns the localized reason when refused (the state keeps
     * the previous vector), or undefined when accepted.
     */
    editKnot(index: number, value: number): string | undefined {
        const {knots, degree} = this.state;
        if (!this.scene || !Number.isInteger(index) || index < 0 || index >= knots.length) return undefined;
        const candidate = knots.map((knot, i) => i === index ? value : knot);
        const n = lastIndexOf(knots, degree);
        try {
            if (!Number.isFinite(value) || Math.abs(value) > KNOT_LIMIT) throw new InvalidKnotVectorError("not_finite");
            this.scene.curve.getCurve().setKnots(candidate);
        } catch (error) {
            if (error instanceof InvalidKnotVectorError) return renderMessage(knotRejectionMessage(error.reason, candidate, degree, n));
            throw error;
        }
        this.setState({knots: candidate});
        return undefined;
    }

    // ---- Lesson actions ----------------------------------------------------------------------------------------------

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        // The raw slider parameter t, held inside the current domain like the slider.
        registry.onDiscriminated('parameter', 't', action => {
            const {knots, degree} = this.state;
            if (knotProblem(knots, degree)) throw new Error('The knot vector is invalid, so there is no parameter.');
            if (!Number.isFinite(action.value)) throw new Error('The parameter t must be a finite number.');
            this.setState({t: clampParameter(knots, degree, action.value)});
        });
        registry.onDiscriminated('animation', DEBOOR_ANIMATION_ID, action => this.lessonCommand(action.command), {
            supports: action => LESSON_COMMANDS.includes(action.command),
        });
    }

    private lessonCommand(command: LessonAnimationCommand): void {
        if (command === 'next-step') this.nextStep();
        else if (command === 'play') this.play();
        else if (command === 'pause') this.pause();
        else if (command === 'reset') this.resetLevels();
    }

    // ---- Controls ----------------------------------------------------------------------------------------------------

    override getGraphCommands(): JSX.Element[] {
        if (!this.state.initialized) return [];
        const {degree, knots, points, t: position, level} = this.state;
        const [start, end] = this.scene ? this.scene.domain() : [knots[degree], knots[knots.length - degree - 1]];
        const playing = this.playing;
        const nextUnavailable = !this.canAdvance;
        const status = t("bsd_levels_status", {value0: level, value1: degree});
        return super.getGraphCommands().concat(
            <div key="degree"><ChoiceSelect label={t("bsb_degree")} value={String(degree)}
                                            options={Array.from({length: BASIS_MAX_DEGREE - BASIS_MIN_DEGREE + 1}, (_, i) => String(BASIS_MIN_DEGREE + i))
                                                .filter(value => points.length >= Number(value) + 1).map(value => ({value, text: value}))}
                                            onChange={value => this.setDegree(Number(value))}/></div>,
            <div key="count"><CountSetter label={t("bsd_point_count")} n={points.length} min={degree + 1} max={DEBOOR_MAX_POINTS}
                                          onPlus={() => this.changePointCount(true)} onMinus={() => this.changePointCount(false)}/>
                <p className="inspector-help">{t("bsd_point_count_help")}</p></div>,
            <div key="position"><Slider min={start} max={end} step={0.01} value={Math.min(end, Math.max(start, position))}
                                        customText={t("bsb_slider_t")} help={t("bsd_slider_help")} onChange={value => this.setT(value)}/></div>,
            // An unavailable control stays focusable (aria-disabled, not disabled), as in the other iterations.
            <div key="playback" className="inspector-group">
                <div className="inspector-playback" role="group" aria-label={t("bsd_controls")}>
                    <button type="button" data-action="next-step" aria-disabled={nextUnavailable || playing}
                            onClick={() => { if (!nextUnavailable && !playing) this.nextStep(); }}>{t("bsd_next_level")}</button>
                    <button type="button" data-action="play-pause" onClick={() => { if (playing) this.pause(); else this.play(); }}>
                        {playing ? t("pause") : t("play")}</button>
                    <button type="button" data-action="reset" aria-disabled={!playing && level === 0}
                            onClick={() => { if (playing || level !== 0) this.resetLevels(); }}>{t("bsd_reset_levels")}</button>
                </div>
                <p className="inspector-help" role="status" aria-live="polite" data-deboor-status="levels">{status}</p>
            </div>,
            <div key="knots"><KnotEditor knots={knots} onEdit={(index, value) => this.editKnot(index, value)}/></div>,
        );
    }
}

export default DeBoorGraph;
