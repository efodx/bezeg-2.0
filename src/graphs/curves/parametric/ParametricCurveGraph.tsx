import React from "react";
import {t} from "../../../localization";
import Slider from "../../../inputs/Slider";
import {ChoiceSelect} from "../../../inputs/ChoiceSelect";
import {PlaybackButtons} from "../../base/controls/PlaybackButtons";
import BaseGraph, {BaseGraphState} from "../../base/BaseGraph";
import {Preset} from "../../base/presets/Presets";
import {AnimationDriver} from "../../../learning/runtime/animation";
import type {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import type {LessonAnimationCommand} from "../../../learning/model";
import {
    clampParameter, CYCLOID_RADIUS_MAX, CYCLOID_RADIUS_MIN, curveViewBox, isParametricCurveId,
    PARAMETRIC_CATALOGUE, PARAMETRIC_CURVE_IDS, PARAMETRIC_ROLL_ANIMATION_ID, ParametricCurveId,
} from "./parametricCatalogue";
import {DEFAULT_PARAMETRIC_PRESET, ParametricPresetData, parametricPresetCollection} from "./parametricPresetCollection";
import {ParametricScene} from "./ParametricScene";

export interface ParametricGraphState extends BaseGraphState {
    curve: ParametricCurveId;
    /** Radius of the rolling circle; used by the cycloid only. */
    radius: number;
    /** The t (cycloid) or theta (polar curves) at which the point and velocity are drawn. */
    parameter: number;
    /** Lesson-scene state only (never a Preset field): false draws the trace from the domain start to the parameter. */
    traceFull: boolean;
}

/**
 * The box widened to the canvas aspect around its centre, so the whole curve stays in view on a narrow or tall canvas
 * (JSXGraph's own aspect fit can crop the longer side). Without a usable canvas size the box is returned unchanged.
 */
export function widenToCanvas(box: [number, number, number, number], width: number | undefined, height: number | undefined): [number, number, number, number] {
    if (!(width && height && width > 0 && height > 0)) return box;
    const [left, top, right, bottom] = box;
    const scale = Math.max((right - left) / width, (top - bottom) / height);
    const halfW = scale * width / 2, halfH = scale * height / 2;
    const cx = (left + right) / 2, cy = (top + bottom) / 2;
    return [cx - halfW, cy + halfH, cx + halfW, cy - halfH];
}

/** The roll animation commands a lesson can send (there is no iteration, so `next-step` is rejected). */
const ROLL_LESSON_COMMANDS: readonly LessonAnimationCommand[] = ['play', 'pause', 'replay', 'stop', 'reset'];

/** A full pass of the roll animation takes this long. */
export const ROLL_DURATION_MS = 6000;

const curveLabel = (id: ParametricCurveId): string => {
    switch (id) {
        case 'cycloid': return t("parametric_curve_cycloid");
        case 'cardioid': return t("parametric_curve_cardioid");
        case 'rose': return t("parametric_curve_rose");
        case 'spiral': return t("parametric_curve_spiral");
    }
};

/**
 * Parametric and polar curves Demonstration (curve geometry L1): a fixed catalogue of analytic curves, a parameter slider,
 * the velocity vector r'(t), the radius ray of polar curves and arc length and area readouts. It extends `BaseGraph`
 * directly, because the Bezier and function graph classes assume control points or a function model. One owned
 * {@link ParametricScene} is created per catalogue choice and per Preset import, and disposed with the scene and on unmount.
 * The scene reads the scene state lazily, so sliders need no rebuild.
 */
export class ParametricCurveGraph extends BaseGraph<ParametricGraphState, ParametricPresetData> {
    private scene?: ParametricScene;
    /** The catalogue curve the standing scene was built for (the scene reads it once). */
    private sceneCurve?: ParametricCurveId;
    /** The roll animation (a full pass of the domain takes {@link ROLL_DURATION_MS}); created on first use, as the base constructor already imports a Preset. */
    private rollDriverInstance?: AnimationDriver;
    private get rollDriver(): AnimationDriver {
        return this.rollDriverInstance ??= new AnimationDriver(delta => {
            const [from, to] = PARAMETRIC_CATALOGUE[this.state.curve].domain;
            const next = this.state.parameter + (to - from) * delta / ROLL_DURATION_MS;
            // The roll's own step: a user edit goes through setParameter, which pauses the roll.
            this.setState({parameter: clampParameter(this.state, next)});
            if (next >= to) this.rollDriver.stop();
        });
    }

    override getInitialState(): ParametricGraphState {
        return {initialized: false, ...DEFAULT_PARAMETRIC_PRESET, traceFull: true};
    }

    override presetCollection() {
        return parametricPresetCollection;
    }

    defaultPreset(): ParametricPresetData {
        return {...DEFAULT_PARAMETRIC_PRESET};
    }

    override exportPresetData(): ParametricPresetData {
        const {curve, radius, parameter} = this.state;
        return {curve, radius, parameter};
    }

    /** Scene imports (Preset, checkpoint, figure batch) rebuild the scene: the old elements go, one new set arrives. */
    override importPresetData(data: ParametricPresetData) {
        this.stopRoll();
        this.setState({curve: data.curve, radius: data.radius, parameter: data.parameter, traceFull: true});
        this.ensureScene();
    }

    /**
     * A Preset with a saved view keeps it; one without (a hand-written file or another curve's Preset) is fitted to its
     * curve, so the new curve is not shown in the previous curve's view box. `BaseGraph` applies the saved view before the
     * data, so the fit cannot live in `importPresetData`.
     */
    override importPreset(preset: Preset) {
        super.importPreset(preset);
        if (!preset.boardState && preset.data) this.fitToCurve();
    }

    /**
     * Lesson scenes replace the state with `getInitialState()` merged with this, right after `importPresetData`. The
     * catalogue choice lives in the state, so the imported data (the default scene's or a fixture's) is carried over;
     * otherwise a fixture would be reset to the default curve while its scene stays built for the fixture's curve.
     */
    protected override lessonDefaultState(): ParametricGraphState {
        const {curve, radius, parameter} = this.state;
        return {initialized: true, curve, radius, parameter, traceFull: true};
    }

    /** A lesson scene starts from the default curve; its view is fitted like a fresh mount, since the previous scene may have shown another curve. */
    protected override prepareLessonDefaultScene(): void {
        super.prepareLessonDefaultScene();
        this.fitToCurve();
    }

    override initialize() {
        // The figure path's import has just built the scene; mount has none yet. A Preset whose graph state names
        // another curve than its data (a hand-written file) is rebuilt for the state's curve, as before.
        if (!this.scene || this.sceneCurve !== this.state.curve) this.ensureScene();
        this.fitToCurve();
    }

    /** Idempotent: removes any earlier scene and creates one for the current catalogue choice. */
    private ensureScene() {
        // Figure-path disposal has already removed the scene; tear down only a scene still standing (mount, lesson entries).
        if (this.scene) this.removeScene();
        if (!this.board || !this.graphSession?.isAlive) return;
        this.sceneCurve = this.state.curve;
        this.scene = new ParametricScene({
            board: this.board,
            curve: this.state.curve,
            radius: () => this.state.radius,
            parameter: () => clampParameter(this.state, this.state.parameter),
            traceFull: () => this.state.traceFull,
            fontSize: () => this.displaySettings.fontSize,
        });
    }

    private removeScene() {
        this.scene?.dispose();
        this.scene = undefined;
    }

    private fitToCurve() {
        if (!this.board) return;
        this.board.setBoundingBox(widenToCanvas(curveViewBox(this.state), this.board.canvasWidth, this.board.canvasHeight), true);
        this.board.fullUpdate();
    }

    protected override disposeFigureScene(): void {
        this.stopRoll();
        this.removeScene();
    }

    override unmount() {
        this.stopRoll();
        this.removeScene();
        super.unmount();
    }

    protected override onStateChange(prevState: Readonly<ParametricGraphState>) {
        if (prevState !== this.state && this.board) this.boardUpdate();
    }

    // ---- Actions -----------------------------------------------------------------------------------------------------

    setCurve(curve: ParametricCurveId) {
        if (!isParametricCurveId(curve) || curve === this.state.curve) return;
        this.stopRoll();
        this.setState({curve, parameter: PARAMETRIC_CATALOGUE[curve].domain[0], traceFull: true});
        this.ensureScene();
        this.fitToCurve();
    }

    setRadius(radius: number) {
        if (!Number.isFinite(radius)) return;
        this.stopRoll();
        this.setState({radius: Math.min(CYCLOID_RADIUS_MAX, Math.max(CYCLOID_RADIUS_MIN, radius))});
        this.fitToCurve();
    }

    /** A user or lesson edit of the parameter pauses the roll (decision 57); the roll itself advances through its own step. */
    setParameter(value: number) {
        this.stopRoll();
        this.setState({parameter: clampParameter(this.state, value)});
    }

    // ---- Roll animation (id PARAMETRIC_ROLL_ANIMATION_ID) ---------------

    get rolling(): boolean {
        return this.rollDriverInstance?.isRunning() ?? false;
    }

    /** Starts the roll from the current parameter (from the start when it is at the end). */
    playRoll() {
        if (this.rolling) return;
        const [t0, t1] = PARAMETRIC_CATALOGUE[this.state.curve].domain;
        if (this.state.parameter >= t1) this.setParameter(t0);
        this.rollDriver.play();
    }

    /** Stops the roll and keeps the parameter where it is. */
    stopRoll() {
        this.rollDriverInstance?.stop();
    }

    /** Lesson step change or leaving the lesson: stop and return to the start of the domain. */
    protected override stopLessonAnimations(): void {
        const wasRolling = this.rolling;
        this.stopRoll();
        if (wasRolling) {
            this.setParameter(PARAMETRIC_CATALOGUE[this.state.curve].domain[0]);
        }
    }

    // ---- Lesson actions ----------------------------------------------------------------------------------------------

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on('parametric-curve', action => {
            if (!isParametricCurveId(action.curve)) throw new Error('The curve must be one of the catalogue curves.');
            if (action.radius !== undefined && !(Number.isFinite(action.radius) && action.radius >= CYCLOID_RADIUS_MIN && action.radius <= CYCLOID_RADIUS_MAX)) {
                throw new Error(`The radius must be a number from ${CYCLOID_RADIUS_MIN} to ${CYCLOID_RADIUS_MAX}.`);
            }
            this.setCurve(action.curve);
            if (action.radius !== undefined) this.setRadius(action.radius);
        });
        registry.onDiscriminated('parameter', 't', action => {
            const [t0, t1] = PARAMETRIC_CATALOGUE[this.state.curve].domain;
            if (!Number.isFinite(action.value) || action.value < t0 || action.value > t1) {
                throw new Error(`The parameter must be a number from ${t0} to ${t1} for this curve.`);
            }
            this.setParameter(action.value);
        });
        registry.onDiscriminated('curve-visibility', 'parametric-trace-full', action => this.setState({traceFull: action.visible}));
        registry.onDiscriminated('animation', PARAMETRIC_ROLL_ANIMATION_ID, action => this.rollCommand(action.command), {
            supports: action => ROLL_LESSON_COMMANDS.includes(action.command),
        });
    }

    /** Stops the roll and returns to the start of the domain, rolling or not. */
    private rewindRoll(): void {
        this.stopRoll();
        this.setParameter(PARAMETRIC_CATALOGUE[this.state.curve].domain[0]);
    }

    /** `play` rolls on, `pause` keeps the parameter, `stop` and `reset` return to the start of the domain, `replay` does that and rolls. */
    private rollCommand(command: LessonAnimationCommand): void {
        if (command === 'play') this.playRoll();
        else if (command === 'pause') this.stopRoll();
        else if (command === 'stop' || command === 'reset') this.rewindRoll();
        else if (command === 'replay') {
            this.rewindRoll();
            this.playRoll();
        }
        this.requestRender();
    }

    /** Read at render time, so a changed system setting applies at the next render. The slider still sets the parameter. */
    reducedMotion(): boolean {
        return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    }

    override pausePlayback(): void {
        this.stopRoll();
    }

    // ---- Controls ----------------------------------------------------------------------------------------------------

    override getGraphCommands(): JSX.Element[] {
        if (!this.state.initialized) return [];
        const {curve, radius, parameter} = this.state;
        const [t0, t1] = PARAMETRIC_CATALOGUE[curve].domain;
        const polar = PARAMETRIC_CATALOGUE[curve].kind === 'polar';
        return super.getGraphCommands().concat(
            <div key="curve"><ChoiceSelect label={t("parametric_curve_label")} value={curve}
                                           options={PARAMETRIC_CURVE_IDS.map(id => ({value: id, text: curveLabel(id)}))}
                                           onChange={value => { if (isParametricCurveId(value)) this.setCurve(value); }}/></div>,
            <div key="parameter"><Slider min={t0} max={t1} step={0.01} value={clampParameter(this.state, parameter)}
                                         customText={polar ? t("parametric_slider_theta") : t("parametric_slider_t")}
                                         onChange={value => this.setParameter(value)}/></div>,
            ...(curve === 'cycloid' ? [<div key="radius"><Slider min={CYCLOID_RADIUS_MIN} max={CYCLOID_RADIUS_MAX} step={0.05} value={radius}
                                                                 customText={t("parametric_radius_label")}
                                                                 onChange={value => this.setRadius(value)}/></div>] : []),
            <div key="roll"><PlaybackButtons groupLabel={t("parametric_roll_group")} playing={this.rolling}
                                             playBlock={this.reducedMotion() ? 'reduced-motion' : undefined}
                                             onPlayPause={() => { if (this.rolling) this.stopRoll(); else this.playRoll(); this.requestRender(); }}/></div>,
        );
    }
}

export default ParametricCurveGraph;
