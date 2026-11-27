import React from "react";
import {message, messageNumber, t} from "../../../localization";
import Slider from "../../../inputs/Slider";
import {ChoiceSelect} from "../../../inputs/ChoiceSelect";
import {PlaybackButtons} from "../../base/controls/PlaybackButtons";
import {PuckOwned} from "../../base/controls/PuckOwnership";
import type {GraphDeclaration, LegendEntry, ParameterDeclaration, ReadoutNote, ReadoutRow} from "../../base/declare/graphDeclaration";
import type {ParameterBinding} from "../../base/writes/parameterArbiter";
import {runAs} from "../../base/writes/writeSource";
import {DomainError} from "../../functions/BaseFunctionGraph";
import {prefersReducedMotion, ReducedMotion} from "../../base/controls/reducedMotion";
import BaseGraph, {BaseGraphState} from "../../base/BaseGraph";
import type {SceneDeclaration} from "../../base/OwnedScene";
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

/**
 * The ids this graph declares: the parameter t (or the angle theta) and the cycloid radius as board pucks bound in the arbiter, the
 * velocity, its length, the ray radius, the arc length and the area as rows, the cusp sentence as a note, and a legend of the trace,
 * the velocity vector, the ray and the rolling circle. The curve choice and the roll playback stay in Orodja.
 */
export type ParametricIds = {
    param: 'parametric-t' | 'parametric-radius';
    row: 'velocity' | 'speed' | 'ray' | 'length' | 'area';
    note: 'stopped';
    section: never;
    legend: 'curve' | 'velocity' | 'ray' | 'circle';
    action: never;
};

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
 * directly, because the Bezier and function graph classes assume control points or a function model. The BaseGraph
 * slot owns one {@link ParametricScene} per catalogue curve: another curve rebuilds it, and it is released with the figure
 * scene and on unmount. The scene reads radius, parameter and trace flag lazily, so sliders and same-curve imports keep it.
 */
export class ParametricCurveGraph extends BaseGraph<ParametricGraphState, ParametricPresetData, ParametricScene> {
    /** The roll animation (a full pass of the domain takes {@link ROLL_DURATION_MS}); created on first use, as the base constructor already imports a Preset. */
    private rollDriverInstance?: AnimationDriver;
    private get rollDriver(): AnimationDriver {
        return this.rollDriverInstance ??= new AnimationDriver(delta => {
            const [from, to] = PARAMETRIC_CATALOGUE[this.state.curve].domain;
            const next = this.state.parameter + (to - from) * delta / ROLL_DURATION_MS;
            // The roll's own step: a user edit goes through setParameter, which pauses the roll.
            this.setState({parameter: clampParameter(this.state, next)});
            if (next >= to) this.rollDriver.stop();
        }).useLease({
            // The frames write `parametric-t` as `animation` under a lease (ADR 0064); a learner or lesson write ends the roll.
            arbiter: () => this.parameters,
            keys: ['parametric-t'],
            // A lesson step or frame change ends every lease first (BaseGraph.stopAnimations, as `lesson`): the roll returns to the start.
            onInterrupted: reason => {
                if (reason === 'frame') this.setParameter(PARAMETRIC_CATALOGUE[this.state.curve].domain[0]);
            },
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

    /** Scene imports (Preset, checkpoint, figure batch) stop the roll; an import of another curve rebuilds the scene through the slot. */
    override importPresetData(data: ParametricPresetData) {
        this.stopRoll();
        this.setState({curve: data.curve, radius: data.radius, parameter: data.parameter, traceFull: true});
    }

    /**
     * A Preset with a saved view keeps it; one without (a hand-written file or another curve's Preset) is fitted to its
     * curve, so the new curve is not shown in the previous curve's view box. `BaseGraph` applies the saved view before the
     * data, so the fit cannot live in `importPresetData`.
     */
    protected override fitPresetView(data: unknown) {
        if (data) this.fitToCurve();
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

    /** The host builds the declared scene right after this, for the state's curve (a hand-written Preset may name another). */
    override initialize() {
        this.fitToCurve();
    }

    /**
     * The scene has nothing to synchronize: it reads everything but its curve lazily. It is kept while the curve is
     * unchanged and rebuilt for another one (catalogue choice, import, checkpoint restore). The scene cleans up a
     * failed construction itself.
     */
    protected override sceneDeclaration(): SceneDeclaration<ParametricScene> {
        return {
            create: board => new ParametricScene({
                board,
                curve: this.state.curve,
                radius: () => this.state.radius,
                parameter: () => clampParameter(this.state, this.state.parameter),
                traceFull: () => this.state.traceFull,
            }),
            sync: scene => scene.curve === this.state.curve,
            dispose: scene => scene.dispose(),
        };
    }

    /** Test seam: the tests read the live scene through it. */
    private get scene(): ParametricScene | undefined {
        return this.ownedScene;
    }

    private fitToCurve() {
        if (!this.board) return;
        this.boardView.setIntent(widenToCanvas(curveViewBox(this.state), this.board.canvasWidth, this.board.canvasHeight), {keepAspectRatio: true});
        this.board.fullUpdate();
    }

    /** The roll driver is graph-owned; the slot releases the scene itself. */
    protected override disposeFigureScene(): void {
        this.stopRoll();
    }

    override unmount() {
        this.stopRoll();
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
            runAs('lesson', () => this.setParameter(PARAMETRIC_CATALOGUE[this.state.curve].domain[0]));
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
        // Reduced motion: lesson play/replay show the completed roll statically instead of animating (decision 57).
        const play = () => {
            if (this.reducedMotion()) this.setParameter(PARAMETRIC_CATALOGUE[this.state.curve].domain[1]);
            else this.playRoll();
        };
        if (command === 'play') play();
        else if (command === 'pause') this.stopRoll();
        else if (command === 'stop' || command === 'reset') this.rewindRoll();
        else if (command === 'replay') {
            this.rewindRoll();
            play();
        }
        this.requestRender();
    }

    /** Read at render time, so a changed system setting applies at the next render. The slider still sets the parameter. */
    reducedMotion(): boolean {
        return prefersReducedMotion();
    }

    /** An export captures one settled scene, so playback stops first. */
    protected override beforeFigureCapture(): void {
        this.pausePlayback();
    }

    override pausePlayback(): void {
        this.stopRoll();
    }

    // ---- Declaration -------------------------------------------------------------------------------------------------

    /** Parameter writes (ADR 0064): t and the radius go through the validated setters, which also pause the roll. A value out of range is refused, never clamped. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            'parametric-t': {
                read: () => clampParameter(this.state, this.state.parameter),
                apply: (value: unknown) => {
                    const [t0, t1] = PARAMETRIC_CATALOGUE[this.state.curve].domain;
                    if (typeof value !== 'number' || !Number.isFinite(value) || value < t0 || value > t1) {
                        throw new DomainError(message('parametric_t_refused', {value0: messageNumber(t0, 4), value1: messageNumber(t1, 4)}));
                    }
                    this.setParameter(value);
                },
            },
            'parametric-radius': {
                read: () => this.state.radius,
                apply: (value: unknown) => {
                    if (typeof value !== 'number' || !Number.isFinite(value) || value < CYCLOID_RADIUS_MIN || value > CYCLOID_RADIUS_MAX) {
                        throw new DomainError(message('parametric_radius_refused', {value0: messageNumber(CYCLOID_RADIUS_MIN, 2), value1: messageNumber(CYCLOID_RADIUS_MAX, 2)}));
                    }
                    this.setRadius(value);
                },
            },
        };
    }

    private readoutRows(): ReadoutRow<ParametricIds>[] {
        const scene = this.scene;
        if (!scene) return [];
        const {velocity, ray, length, area} = scene.values();
        const rows: ReadoutRow<ParametricIds>[] = [];
        if (velocity.status === 'moving') {
            rows.push(
                {id: 'velocity', name: message('parametric_velocity_name'), symbol: "r'", value: message('parametric_vector_pair', {value0: messageNumber(velocity.vector[0], 4), value1: messageNumber(velocity.vector[1], 4)})},
                {id: 'speed', name: message('parametric_speed_name'), symbol: "|r'|", value: messageNumber(velocity.speed, 4)},
            );
        }
        if (ray !== undefined) rows.push({id: 'ray', name: message('parametric_ray_name'), symbol: '\\rho', value: messageNumber(ray, 4)});
        rows.push(
            {id: 'length', name: message('parametric_length_name'), value: messageNumber(length, 4)},
            {id: 'area', name: message('parametric_area_name'), value: messageNumber(area, 4)},
        );
        return rows;
    }

    /** The board caption sentence of a cusp is a note: no direction of motion, so no vector and no tangent. */
    private readoutNotes(): ReadoutNote<ParametricIds>[] {
        const values = this.scene?.values();
        return values?.velocity.status === 'stopped' ? [{id: 'stopped', text: message('parametric_status_stopped'), tone: 'warning'}] : [];
    }

    /** What the learner watches: the whole trace with the room the velocity arrow and the rolling circle need (the old fit box). */
    private watchedBox(): [number, number, number, number] {
        return curveViewBox(this.state);
    }

    /**
     * The common declaration: the parameter (a board puck; the angle of a polar curve), the cycloid radius, the rows and the note that were the board caption, the
     * legend of what is drawn now (the velocity arrow only while the point moves, the trace once it has a length) and the view box. The curve choice and the roll
     * stay in Orodja.
     */
    protected override declaration(): GraphDeclaration<ParametricIds> {
        const {curve, parameter, traceFull} = this.state;
        const entry = PARAMETRIC_CATALOGUE[curve];
        const [t0, t1] = entry.domain;
        const polar = entry.kind === 'polar';
        const parameters: ParameterDeclaration<ParametricIds['param']>[] = [
            {key: 'parametric-t', kind: 'range', label: message(polar ? 'parametric_theta_name' : 'parametric_t_name'), symbol: polar ? '\\theta' : 't', placement: 'board',
                min: t0, max: t1, step: 0.01, maxDecimals: 2},
            ...(curve === 'cycloid' ? [{key: 'parametric-radius' as const, kind: 'range' as const, label: message('parametric_radius_name'), symbol: 'R', placement: 'board' as const,
                min: CYCLOID_RADIUS_MIN, max: CYCLOID_RADIUS_MAX, step: 0.05, maxDecimals: 2}] : []),
        ];
        const moving = this.scene?.values().velocity.status === 'moving';
        const legend: LegendEntry<ParametricIds>[] = [
            ...(traceFull || clampParameter(this.state, parameter) > t0 ? [{id: 'curve' as const, label: message('parametric_curve_label'), kind: 'line' as const, object: 'curve'}] : []),
            ...(moving ? [{id: 'velocity' as const, label: message('parametric_legend_velocity'), kind: 'dashed' as const, object: 'velocity'}] : []),
            ...(polar ? [{id: 'ray' as const, label: message('parametric_legend_ray'), kind: 'dashed' as const, object: 'ray'}] : []),
            ...(curve === 'cycloid' ? [{id: 'circle' as const, label: message('parametric_legend_circle'), kind: 'dashed' as const, object: 'circle'}] : []),
        ];
        const box = this.watchedBox();
        return {
            parameters, legend,
            readouts: [{id: 'values', rows: this.readoutRows()}],
            notes: this.readoutNotes(),
            marks: {must: [{kind: 'box', left: box[0], top: box[1], right: box[2], bottom: box[3]}]},
            followView: box,
        };
    }

    /** The legend ids are the scene's element names; colour and visibility come from the drawn element. */
    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        if (id !== 'curve' && id !== 'velocity' && id !== 'ray' && id !== 'circle') return undefined;
        const element = this.scene?.element(id);
        if (!element) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const drawn = element as typeof element & {evalVisProp(name: string): unknown};
        return {color: String(drawn.evalVisProp('strokecolor')), visible: Boolean(drawn.evalVisProp('visible'))};
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
            <PuckOwned key="parameter" param="parametric-t"><div><Slider min={t0} max={t1} step={0.01} value={clampParameter(this.state, parameter)}
                                         customText={polar ? t("parametric_slider_theta") : t("parametric_slider_t")}
                                         onChange={value => this.setParameter(value)}/></div></PuckOwned>,
            ...(curve === 'cycloid' ? [<PuckOwned key="radius" param="parametric-radius"><div><Slider min={CYCLOID_RADIUS_MIN} max={CYCLOID_RADIUS_MAX} step={0.05} value={radius}
                                                                 customText={t("parametric_radius_label")}
                                                                 onChange={value => this.setRadius(value)}/></div></PuckOwned>] : []),
            <div key="roll"><ReducedMotion>{() =>
                <PlaybackButtons placement="graph" groupLabel={t("parametric_roll_group")} playing={this.rolling}
                                 playBlock={this.reducedMotion() ? 'reduced-motion' : undefined}
                                 onPlayPause={() => { if (this.rolling) this.stopRoll(); else this.playRoll(); this.requestRender(); }}/>}
            </ReducedMotion></div>,
        );
    }
}

export default ParametricCurveGraph;
