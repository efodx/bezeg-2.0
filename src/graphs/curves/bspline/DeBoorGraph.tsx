import type {StoredGraphState} from "../../base/presets/Presets";
import React from "react";
import {message, renderMessage, t} from "../../../localization";
import {domain as curveDomain, evaluate} from "../../../bezeg/impl/curve/bspline";
import type {ActionDeclaration, GraphDeclaration, LegendEntry, ParameterDeclaration, ViewMark, ViewMarks} from "../../base/declare/graphDeclaration";
import {PuckOwned} from "../../base/controls/PuckOwnership";
import {runAs} from "../../base/writes/writeSource";
import {DomainError} from "../../functions/BaseFunctionGraph";
import type {ParameterBinding} from "../../base/writes/parameterArbiter";
import Slider from "../../../inputs/Slider";
import {CountSetter} from "../../../inputs/CountSetter";
import BaseGraph, {BaseGraphState, TransientState} from "../../base/BaseGraph";
import {constructOrSweep, type SceneDeclaration} from "../../base/OwnedScene";
import {BSplineCurve, InvalidKnotVectorError} from "../../../bezeg/impl/curve/bspline-curve";
import type {LessonAnimationCommand, LessonCurveFixture} from "../../../learning/model";
import type {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {AnimationScheduler} from "../../../learning/runtime/animation";
import {TracePlayback} from "../../base/tracePlayback";
import {BSplinePresetData, bsplinePresetCollection} from "./bsplinePresetCollection";
import {knotRejectionMessage} from "./bsplineKnotMessages";
import {DeBoorScene} from "./DeBoorScene";
import {BSplinePointList} from "./BSplinePointList";
import {KnotEditor} from "./KnotEditor";
import {BASIS_MAX_DEGREE, BASIS_MIN_DEGREE, isClamped, KNOT_LIMIT, knotProblem, lastIndexOf} from "./bsplineBasisModel";
import {
    appendedPoint, ControlPoint, DEBOOR_ANIMATION_ID, DEBOOR_DEFAULT_T, DEBOOR_MAX_POINTS, DEBOOR_STEP_INTERVAL_MS, clampParameter,
    assertDrawableCurve, drawableRejection, deBoorPresetData, defaultDeBoorData, knotsForCount,
} from "./bsplineDeBoorModel";
import {LiveReadout, SettledReadout} from "../../base/controls/LiveReadout";
import {PlaybackButtons, playbackBlocks} from "../../base/controls/PlaybackButtons";

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

/**
 * The ids this graph declares: the parameter t (a board slider puck), the legend of what the board draws (curve, control points, the
 * active points of level 0, the intermediate points and C(t)) and the three playback actions (the next level, play and reset, which stay
 * in the playback group). The degree, the point count, the point list and the knots are setup and stay in Orodja; the readout of the
 * levels is board text.
 */
export type DeBoorIds = {
    param: 'deboor-t';
    row: never;
    note: never;
    legend: 'curve' | 'control' | 'active' | 'levels' | 'point';
    section: never;
    action: 'next-level' | 'play' | 'reset-levels';
};

const VIEW_MARK_SAMPLES = 25;

const initialData =(): Omit<DeBoorGraphState, 'initialized'> => {
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
export class DeBoorGraph extends BaseGraph<DeBoorGraphState, BSplinePresetData, DeBoorScene> {
    /** The shared playback policy; the revealed level (`state.level`) is its step index and stays in the scene state. */
    private readonly playback: TracePlayback;
    /** The graph's one announcement: the levels status, silent while Play runs. */
    private readonly liveReadout = new SettledReadout();

    constructor(private readonly scheduler?: AnimationScheduler) {
        super();
        this.playback = new TracePlayback({
            runLength: () => this.state.degree + 1,
            step: () => this.state.level,
            writeStep: level => this.setState({level}),
            exportBusy: () => this.exportBusy,
            requestRender: () => this.requestRender(),
            intervalMs: () => DEBOOR_STEP_INTERVAL_MS,
        }, scheduler);
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

    /** Refuses persisted data this graph cannot show, before anything changes; same limits as importPresetData. */
    protected override consumerRefusal(data: BSplinePresetData) {
        return drawableRejection(data, DEBOOR_MAX_POINTS);
    }

    /** Rejects data the graph cannot draw before touching the state, then rebuilds the scene and returns the iteration to level 0. */
    override importPresetData(data: BSplinePresetData) {
        assertDrawableCurve(data, DEBOOR_MAX_POINTS);
        this.setState({
            degree: data.degree, knots: [...data.knots], points: data.points.map(point => [point[0], point[1]] as const),
            level: Math.min(this.state.level, data.degree),
        });
    }

    /** The just-imported data wins over the mount-time defaults and over a stale stored state. */
    protected override figurePresetGraphState(graphState: StoredGraphState | undefined): DeBoorGraphState {
        const merged = super.figurePresetGraphState(graphState);
        const {degree, knots, points} = this.state;
        return {...merged, degree, knots: [...knots], points: points.map(point => [point[0], point[1]] as const), level: Math.min(merged.level, degree)};
    }

    protected override initialView(): [number, number, number, number] {
        return [-1.5, 3.5, 5.5, -1.5];
    }

    /** The host builds the declared scene right after this; nothing else is initialized. */
    override initialize() {
    }

    /** `sync` takes knots and points only: another degree or point count rebuilds the scene (also on import and checkpoint restore). */
    protected override sceneDeclaration(): SceneDeclaration<DeBoorScene> {
        return {
            create: board => constructOrSweep(board, () => new DeBoorScene({
                board,
                degree: () => this.state.degree,
                knots: () => this.state.knots,
                points: () => this.state.points,
                t: () => this.state.t,
                level: () => this.state.level,
                fontSize: () => this.displaySettings.fontSize,
                // A JSXGraph drag handler is outside the DOM input tagging, so the write names its source.
                onPointsDrag: points => runAs('learner', () => this.setState({points})),
            })),
            sync: scene => {
                const {degree, points} = this.state;
                if (!scene.fits(degree, points.length)) return false;
                scene.sync();
                return true;
            },
            dispose: scene => scene.dispose(),
        };
    }

    /** Test seam: the characterization tests read the live scene through it. */
    private get scene(): DeBoorScene | undefined {
        return this.ownedScene;
    }

    override mount(container: HTMLElement): void {
        // A disposed controller stays silent for good; a remount (React StrictMode) needs a new one.
        this.playback.mount();
        super.mount(container);
    }

    override unmount() {
        this.liveReadout.cancel();
        this.playback.unmount();
        super.unmount();
    }

    protected override onStateChange(prevState: Readonly<DeBoorGraphState>) {
        if (prevState === this.state || !this.board) return;
        const {state} = this;
        // Any edit (points, knots, degree, t) ends playback; the revealed level stays.
        this.playback.settle(state.degree !== prevState.degree || state.knots !== prevState.knots || state.points !== prevState.points
            || state.t !== prevState.t, false);
        this.boardUpdate();
    }

    // ---- Animation ---------------------------------------------------------------------------------------------------

    /** Whether another level can be revealed. */
    get canAdvance(): boolean {
        return this.state.level < this.state.degree;
    }

    get playing(): boolean {
        return this.playback.isPlaying;
    }

    /** Reveals one level. It takes over from playback; false when all levels are shown (or a figure is being captured). */
    nextStep(): boolean {
        const before = this.state.level;
        this.playback.nextStep();
        return this.state.level !== before;
    }

    /** Starts or resumes playback; from the full triangle it starts again at level 0. */
    play(): void {
        if (!this.canAdvance && !this.exportBusy) this.resetLevels();
        this.playback.play();
    }

    pause(): void {
        this.playback.pause();
    }

    /** Back to level 0; playback stops. */
    resetLevels(): void {
        this.playback.resetTrace();
    }

    /** The controller follows the revealed level and starts paused: a scene never opens in playback. */
    protected override restoreTransientState(saved: TransientState | undefined): void {
        super.restoreTransientState(saved);
        this.playback.restoreTo(this.state.level);
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

    /** A typed control point: the same path as a board drag. */
    editPoint(index: number, value: ControlPoint) {
        const {points} = this.state;
        if (!Number.isInteger(index) || index < 0 || index >= points.length) return;
        this.setState({points: points.map((point, i) => i === index ? value : point)});
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

    // ---- Declaration -------------------------------------------------------------------------------------------------

    /** Parameter writes (ADR 0064). Key `deboor-t`: the slider parameter, through the setter the slider calls (held inside the domain). */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            'deboor-t': {
                read: () => this.state.t,
                apply: (value: unknown) => {
                    if (typeof value !== 'number' || !Number.isFinite(value)) throw new DomainError(message('bsd_t_not_finite'));
                    this.setT(value);
                },
            },
        };
    }

    /**
     * Pure data from the state: the parameter t on the board (changed while the triangle is watched), the legend, and the playback
     * actions (kept in the playback group, so in Edit). Setup (degree, point count, points, knots) stays in Orodja; the levels' sentences
     * are board text, so no note is declared.
     */
    protected override declaration(): GraphDeclaration<DeBoorIds> {
        const {knots, degree, points, level} = this.state;
        const [start, end] = this.knotDomain(knots, degree, points.length);
        const parameters: ParameterDeclaration<DeBoorIds['param']>[] = [{
            key: 'deboor-t', kind: 'range', label: message('bsd_param_name'), symbol: 't', placement: 'board', min: start, max: end, step: 0.01, maxDecimals: 2,
        }];
        const legend: LegendEntry<DeBoorIds>[] = [
            {id: 'curve', label: message('curve'), kind: 'line', object: 'curve'},
            {id: 'control', label: message('control_points'), kind: 'point', object: 'control'},
            {id: 'active', label: message('bsd_legend_active'), kind: 'ring', object: 'active'},
            ...(degree >= 2 ? [{id: 'levels' as const, label: message('bsd_legend_levels'), kind: 'point' as const, object: 'levels'}] : []),
            {id: 'point', label: message('bsd_legend_point'), kind: 'point', object: 'point'},
        ];
        const playback = {placement: 'tools' as const, tab: 'edit' as const};
        const actions: ActionDeclaration<DeBoorIds>[] = [
            {id: 'next-level', label: message('bsd_next_level'), enabled: this.canAdvance && !this.playing, ...playback},
            {id: 'play', label: message('play'), enabled: true, pressed: this.playing, ...playback},
            {id: 'reset-levels', label: message('bsd_reset_levels'), enabled: level > 0 || this.playing, ...playback},
        ];
        return {parameters, legend, actions, marks: this.viewMarks()};
    }

    /** The parameter domain from the state alone (no board read): the knot span [u_k, u_n+1]. */
    private knotDomain(knots: readonly number[], degree: number, count: number): [number, number] {
        try {
            return curveDomain(knots, degree, count - 1);
        } catch {
            return [knots[degree], knots[knots.length - degree - 1]];
        }
    }

    private viewMarksCache: {key: string; marks: ViewMarks} | undefined;

    /** What the view director keeps visible: the control points and C(t) (must), samples of the curve over its domain (nice); memoized on the state's data. */
    private viewMarks(): ViewMarks {
        const {degree, knots, points, t: position} = this.state;
        const key = `${degree}|${knots.join(',')}|${points.map(p => p.join(',')).join(';')}|${position}`;
        if (this.viewMarksCache?.key === key) return this.viewMarksCache.marks;
        const finite = (p: readonly number[]) => Number.isFinite(p[0]) && Number.isFinite(p[1]);
        const [start, end] = this.knotDomain(knots, degree, points.length);
        let value: readonly number[] | undefined;
        try {
            value = evaluate(knots, degree, points, clampParameter(knots, degree, position));
        } catch {
            value = undefined;
        }
        const must: ViewMark[] = [...points, ...(value ? [value] : [])].filter(finite).map(([x, y]): ViewMark => ({kind: 'point', x, y}));
        const samples: (readonly [number, number])[] = [];
        for (let i = 0; i < VIEW_MARK_SAMPLES; i++) {
            try {
                const p = evaluate(knots, degree, points, start + (end - start) * i / (VIEW_MARK_SAMPLES - 1));
                if (finite(p)) samples.push([p[0], p[1]]);
            } catch {
                // a sample the kernel refuses is left out
            }
        }
        const marks: ViewMarks = {must, nice: samples.length > 1 ? [{kind: 'polyline', points: samples}] : []};
        this.viewMarksCache = {key, marks};
        return marks;
    }

    /** The element a legend entry's `object` names, as the board holds it now. */
    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const scene = this.scene;
        if (!scene) return undefined;
        const read = (element: JXG.GeometryElement | undefined, colorProperty: 'strokecolor' | 'fillcolor') => {
            if (!element) return undefined;
            // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
            const drawn = element as JXG.GeometryElement & {evalVisProp(name: string): unknown};
            return {color: String(drawn.evalVisProp(colorProperty)), visible: Boolean(drawn.evalVisProp('visible'))};
        };
        switch (id) {
            case 'curve': return read(scene.curve.getJxgCurve(), 'strokecolor');
            case 'control': return read(scene.curve.getJxgPoints()[0], 'fillcolor');
            case 'active': return read(scene.ringElements()[0], 'strokecolor');
            case 'levels': return read(scene.levelElements(1)?.[0], 'fillcolor');
            case 'point': return read(scene.levelElements(scene.degree)?.[0], 'fillcolor');
            default: return undefined;
        }
    }

    override performAction(id: string): void {
        if (id === 'next-level') runAs('learner', () => { this.nextStep(); });
        else if (id === 'play') runAs('learner', () => { if (this.playing) this.pause(); else this.play(); });
        else if (id === 'reset-levels') runAs('learner', () => this.resetLevels());
        else throw new Error('Unknown action');
    }

    // ---- Controls ----------------------------------------------------------------------------------------------------

    override getGraphCommands(): JSX.Element[] {
        if (!this.state.initialized) return [];
        const {degree, knots, points, t: position, level} = this.state;
        const [start, end] = this.scene ? this.scene.domain() : [knots[degree], knots[knots.length - degree - 1]];
        const playing = this.playing;
        const maxDegree = Math.min(BASIS_MAX_DEGREE, points.length - 1);
        const status = t("bsd_levels_status", {value0: level, value1: degree});
        this.liveReadout.report(status);
        return super.getGraphCommands().concat(
            <div key="playback" className="inspector-group">
                <PlaybackButtons placement="graph" groupLabel={t("bsd_controls")} nextLabel={t("bsd_next_level")} resetLabel={t("bsd_reset_levels")} playing={playing}
                                 onNext={() => this.nextStep()} onPlayPause={() => { if (playing) this.pause(); else this.play(); }}
                                 onReset={() => this.resetLevels()}
                                 {...playbackBlocks({atStart: level === 0, atEnd: !this.canAdvance, playing})} playBlock={undefined}/>
                <p className="inspector-help" data-deboor-status="levels">{status}</p>
                <LiveReadout readout={this.liveReadout} muted={playing}/>
            </div>,
            <PuckOwned key="position" param="deboor-t"><div><Slider min={start} max={end} step={0.01} value={Math.min(end, Math.max(start, position))}
                                        customText={t("bsb_slider_t")} help={t("bsd_slider_help")} onChange={value => this.setT(value)}/></div></PuckOwned>,
            <div key="degree"><CountSetter label={t("bsb_degree")} n={degree} min={BASIS_MIN_DEGREE} max={maxDegree}
                                           maxReason={maxDegree < BASIS_MAX_DEGREE ? t("bsp_degree_needs_points", {value0: points.length, value1: maxDegree}) : undefined}
                                           onPlus={() => this.setDegree(degree + 1)} onMinus={() => this.setDegree(degree - 1)}
                                           onSet={value => this.setDegree(value)}/></div>,
            <div key="count"><CountSetter label={t("bsd_point_count")} n={points.length} min={degree + 1} max={DEBOOR_MAX_POINTS}
                                          onPlus={() => this.changePointCount(true)} onMinus={() => this.changePointCount(false)}/>
                <p className="inspector-help">{t("bsd_point_count_help")}</p></div>,
            <div key="points"><BSplinePointList points={points} onEdit={(index, value) => this.editPoint(index, value)}/></div>,
            <div key="knots"><KnotEditor knots={knots} onEdit={(index, value) => this.editKnot(index, value)}/></div>,
        );
    }
}

export default DeBoorGraph;
