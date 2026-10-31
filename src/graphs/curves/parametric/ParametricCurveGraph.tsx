import React from "react";
import Button from "react-bootstrap/Button";
import {t} from "../../../localization";
import Slider from "../../../inputs/Slider";
import {ChoiceSelect} from "../../../inputs/ChoiceSelect";
import BaseGraph, {BaseGraphState} from "../../base/BaseGraph";
import {Preset} from "../../base/presets/Presets";
import {
    clampParameter, CYCLOID_RADIUS_MAX, CYCLOID_RADIUS_MIN, curveViewBox, isParametricCurveId,
    PARAMETRIC_CATALOGUE, PARAMETRIC_CURVE_IDS, ParametricCurveId,
} from "./parametricCatalogue";
import {DEFAULT_PARAMETRIC_PRESET, ParametricPresetData, parametricPresetCollection} from "./parametricPresetCollection";
import {ParametricScene} from "./ParametricScene";

export interface ParametricGraphState extends BaseGraphState {
    curve: ParametricCurveId;
    /** Radius of the rolling circle; used by the cycloid only. */
    radius: number;
    /** The t (cycloid) or theta (polar curves) at which the point and velocity are drawn. */
    parameter: number;
}

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
    private rollFrame?: number;
    private rollLast?: number;

    override getInitialState(): ParametricGraphState {
        return {initialized: false, ...DEFAULT_PARAMETRIC_PRESET};
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
        this.setState({curve: data.curve, radius: data.radius, parameter: data.parameter});
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

    override initialize() {
        this.ensureScene();
        this.fitToCurve();
    }

    /** Idempotent: removes any earlier scene and creates one for the current catalogue choice. */
    private ensureScene() {
        this.removeScene();
        if (!this.board || !this.graphSession?.isAlive) return;
        this.scene = new ParametricScene({
            board: this.board,
            curve: this.state.curve,
            radius: () => this.state.radius,
            parameter: () => clampParameter(this.state, this.state.parameter),
            fontSize: () => this.displaySettings.fontSize,
        });
    }

    private removeScene() {
        this.scene?.dispose();
        this.scene = undefined;
    }

    private fitToCurve() {
        if (!this.board) return;
        this.board.setBoundingBox(curveViewBox(this.state), true);
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
        this.setState({curve, parameter: PARAMETRIC_CATALOGUE[curve].domain[0]});
        this.ensureScene();
        this.fitToCurve();
    }

    setRadius(radius: number) {
        if (!Number.isFinite(radius)) return;
        this.setState({radius: Math.min(CYCLOID_RADIUS_MAX, Math.max(CYCLOID_RADIUS_MIN, radius))});
        this.fitToCurve();
    }

    setParameter(value: number) {
        this.setState({parameter: clampParameter(this.state, value)});
    }

    // ---- Roll animation (id PARAMETRIC_ROLL_ANIMATION_ID; lesson wiring belongs to the registration slice) ---------------

    get rolling(): boolean {
        return this.rollFrame !== undefined;
    }

    /** Starts the roll from the current parameter (from the start when it is at the end). */
    playRoll() {
        if (this.rolling) return;
        const [t0, t1] = PARAMETRIC_CATALOGUE[this.state.curve].domain;
        if (this.state.parameter >= t1) this.setParameter(t0);
        this.rollLast = undefined;
        const step = (now: number) => {
            const [from, to] = PARAMETRIC_CATALOGUE[this.state.curve].domain;
            const elapsed = this.rollLast === undefined ? 0 : now - this.rollLast;
            this.rollLast = now;
            const next = this.state.parameter + (to - from) * elapsed / ROLL_DURATION_MS;
            this.setParameter(next);
            if (next >= to) {
                this.rollFrame = undefined;
            } else {
                this.rollFrame = window.requestAnimationFrame(step);
            }
        };
        this.rollFrame = window.requestAnimationFrame(step);
    }

    /** Stops the roll and keeps the parameter where it is. */
    stopRoll() {
        if (this.rollFrame !== undefined) window.cancelAnimationFrame(this.rollFrame);
        this.rollFrame = undefined;
        this.rollLast = undefined;
    }

    /** Lesson step change or leaving the lesson: stop and return to the start of the domain. */
    protected override stopLessonAnimations(): void {
        const wasRolling = this.rolling;
        this.stopRoll();
        if (wasRolling || this.state.parameter !== PARAMETRIC_CATALOGUE[this.state.curve].domain[0]) {
            this.setParameter(PARAMETRIC_CATALOGUE[this.state.curve].domain[0]);
        }
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
            <div key="roll"><Button variant="outline-secondary" size="sm"
                                    onClick={() => { if (this.rolling) this.stopRoll(); else this.playRoll(); this.requestRender(); }}>
                {this.rolling ? t("parametric_roll_stop") : t("parametric_roll_play")}</Button></div>,
        );
    }
}

export default ParametricCurveGraph;
