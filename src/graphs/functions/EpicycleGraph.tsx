import React, {useSyncExternalStore} from "react";
import {PlaybackButtons} from "../base/controls/PlaybackButtons";
import {ReadoutHelp, ReadoutScrollTable} from "../base/controls/ReadoutParts";
import BaseFunctionGraph, {BoundingBox, DomainError, FillCurve, FunctionLessonActions} from "./BaseFunctionGraph";
import {FunctionLegend} from "./FunctionReadout";
import {TransientState} from "../base/BaseGraph";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {InspectorDisclosure} from "../../inputs/InspectorDisclosure";
import {guard, guardField} from "../base/controls/guard";
import {FunctionStatus, FunctionStatusLine} from "./FunctionStatus";
import {NumberInput} from "../../inputs/NumberInput";
import Slider from "../../inputs/Slider";
import {currentLanguage, message, renderMessage, t, useT} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {AnimationDriver, AnimationScheduler} from "../../learning/runtime/animation";
import {FourierComplex} from "../../analysis/fourier";
import {epicycleChain} from "../../analysis/closedSpline";
import {
    analyzeEpicycle, chooseEpicycleExample, defaultEpicycleModel, EPICYCLE_COORDINATE_MAX, EPICYCLE_COORDINATE_MIN, EPICYCLE_EXAMPLE_IDS, EPICYCLE_MAX_N,
    EPICYCLE_PARAMETRIZATIONS, EPICYCLE_VALUE_BIG_STEP, EPICYCLE_VALUE_STEP, EpicycleAnalysis, EpicycleEdit, EpicycleExampleId, EpicycleModel,
    epicycleLoopSamples, epicycleTerms, epicycleTrace, matchEpicycleExample, maxTraceError, moveEpicycleControl, moveEpicycleVertex, setEpicycleN,
    setEpicycleParametrization, snapEpicycleValue,
} from "../../analysis/epicycleModel";
import {epicycleIssueMessage} from "./epicycleMessages";
import {epicyclePresetCollection} from "./functionPresetCollections";
import "./EpicycleGraph.css";

const TWO_PI = 2 * Math.PI;
const BOARD_VIEW: BoundingBox = [-3.2, 3.2, 3.2, -3.2];
/** One turn of the time t takes this long, measured from frame timestamps (never frame counts). */
export const EPICYCLE_PERIOD_MS = 10000;
/** Each circle is a closed polygon of this many segments (ADR 0040: a fixed point count). */
export const EPICYCLE_CIRCLE_SEGMENTS = 48;
/** The most end points and arcs a model can have; the handle pool is this big, so the board object count never depends on the loop. */
const MAX_VERTICES = 8;
const COLORS = {chain: "#bd6047", circles: "#8a9aa8", trace: "#2468a2", loop: "#4c9a8a", polygon: "#8c7a9a", vertex: "#2468a2", control: "#bd6047"};

/** What depends on the loop and the parametrization only, and what depends on N besides: kept until one of its inputs changes. */
interface Cache {
    vertices: EpicycleModel["vertices"];
    spans: EpicycleModel["spans"];
    parametrization: EpicycleModel["parametrization"];
    analysis: EpicycleAnalysis;
    loop?: { x: number[]; y: number[]; samples: FourierComplex[] };
    trace?: { N: number; x: number[]; y: number[]; samples: FourierComplex[] };
    error?: { N: number; value: number };
}

/** The drawing of a whole closed curve: sample 0 appended, so no gap shows between the last sample and the first. */
const closed = (samples: { x: readonly number[]; y: readonly number[] }) => ({x: [...samples.x, samples.x[0]], y: [...samples.y, samples.y[0]]});
const xy = (samples: readonly FourierComplex[]) => ({x: samples.map(s => s.re), y: samples.map(s => s.im)});

/**
 * The epicycle graph (Fourier series lesson F5, ADR 0040): a closed curve z built from up to 8 end points and line or cubic arcs,
 * and its Fourier partial sum S_N drawn as a chain of rotating circles. The model (`analysis/epicycleModel`) owns the rules; this
 * draws them. Time t and the playing flag are host state, not model fields, and never stored in a Preset.
 *
 * Board objects, a fixed set whatever N is: control polygon, original loop, all circles (one NaN-separated curve), the arm chain,
 * the trace, and a pool of 8 end point handles and 16 control point handles (shown only for the points the loop has). A time
 * step redraws only the chain, the circles and the trace slice; the coefficients, the loop samples and the trace are cached per
 * loop and parametrization, the trace per N.
 */
export class EpicycleGraph extends BaseFunctionGraph<EpicycleModel> {
    private readonly driver: AnimationDriver;
    private cache?: Cache;
    private vertexHandles: JXG.Point[] = [];
    private controlHandles: JXG.Point[] = [];
    // ---- Host state: not in the model, not in a Preset -----------------------------------------------------------------
    private timeValue = 0;
    private playingValue = false;
    private hostVersion = 0;
    private readonly hostListeners = new Set<() => void>();

    constructor(options: { scheduler?: AnimationScheduler } = {}) {
        super();
        this.driver = new AnimationDriver(delta => this.step(delta), options.scheduler);
    }

    override presetCollection() {
        return epicyclePresetCollection;
    }

    protected defaultModel(): EpicycleModel {
        return defaultEpicycleModel();
    }

    protected defaultBoundingBox(): BoundingBox {
        return [...BOARD_VIEW];
    }

    // ---- Host state --------------------------------------------------------------------------------------------------

    readonly subscribeHost = (listener: () => void): (() => void) => {
        this.hostListeners.add(listener);
        return () => { this.hostListeners.delete(listener); };
    };
    readonly hostSnapshot = (): number => this.hostVersion;

    private notifyHost(): void {
        this.hostVersion++;
        this.hostListeners.forEach(listener => listener());
    }

    get time(): number {
        return this.timeValue;
    }

    get playing(): boolean {
        return this.playingValue;
    }

    /** Stops the frame loop; the time stays where it is. */
    private halt(): void {
        this.driver.stop();
        if (this.playingValue) {
            this.playingValue = false;
            this.notifyHost();
        }
    }

    private resetTime(): void {
        this.halt();
        this.timeValue = 0;
        this.refusals.clear();
        this.notifyHost();
    }

    /** Read at the time of the call, so a changed system setting applies at the next Play. */
    reducedMotion(): boolean {
        return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    }

    /** The play button: starts the frame loop from the current time. Under reduced motion nothing moves; the slider still sets the time. */
    play(): void {
        if (this.playingValue || this.reducedMotion() || !this.graphSession?.isAlive) return;
        this.playingValue = true;
        this.refusals.clear();
        this.driver.play();
        this.boardUpdate();
        this.notifyHost();
    }

    pause(): void {
        this.halt();
        this.boardUpdate();
    }

    /** Sets the time (the slider and the lesson action): a value in [0, 2 pi). It pauses playback. */
    setTime(value: unknown): void {
        if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value >= TWO_PI) {
            throw new DomainError(message("epicycle_issue_time"));
        }
        this.halt();
        this.timeValue = value;
        this.boardUpdate();
        this.notifyHost();
    }

    private step(delta: number): void {
        this.timeValue = (this.timeValue + (TWO_PI * delta) / EPICYCLE_PERIOD_MS) % TWO_PI;
        this.boardUpdate();
        this.notifyHost();
    }

    override unmount(): void {
        this.driver.dispose();
        this.playingValue = false;
        this.timeValue = 0;
        this.refusals.clear();
        this.hostListeners.clear();
        super.unmount();
    }

    override pausePlayback(): void {
        this.halt();
        super.pausePlayback();
    }

    protected override stopLessonAnimations(): void {
        this.halt();
    }

    protected override beforeFigureCapture(): void {
        this.halt();
    }

    /** The time of a lesson checkpoint; playback and the rejection are never captured. */
    protected override captureTransientState(): TransientState {
        return {...super.captureTransientState(), epicycleTime: this.timeValue};
    }

    /** Every scene replacement lands stopped, without a rejection, at the saved time when it is valid and at t = 0 otherwise. */
    protected override restoreTransientState(saved: TransientState | undefined): void {
        super.restoreTransientState(saved);
        const time = saved?.epicycleTime;
        this.halt();
        this.refusals.clear();
        this.timeValue = typeof time === "number" && Number.isFinite(time) && time >= 0 && time < TWO_PI ? time : 0;
        this.notifyHost();
    }

    /** A direct import (not a scene replacement) also shows its loop at t = 0, stopped. */
    override importPresetData(data: EpicycleModel): void {
        this.resetTime();
        super.importPresetData(data);
    }

    // ---- Cached mathematics ---------------------------------------------------------------------------------------

    private cacheFor(model: EpicycleModel): Cache {
        const cache = this.cache;
        if (cache && cache.vertices === model.vertices && cache.spans === model.spans && cache.parametrization === model.parametrization) return cache;
        this.cache = {vertices: model.vertices, spans: model.spans, parametrization: model.parametrization, analysis: analyzeEpicycle(model)};
        return this.cache;
    }

    protected analysisOf(model: EpicycleModel): EpicycleAnalysis {
        return this.cacheFor(model).analysis;
    }

    protected loopOf(model: EpicycleModel): NonNullable<Cache["loop"]> {
        const cache = this.cacheFor(model);
        if (!cache.loop) {
            const samples = epicycleLoopSamples(cache.analysis);
            cache.loop = {...xy(samples), samples};
        }
        return cache.loop;
    }

    protected traceOf(model: EpicycleModel): NonNullable<Cache["trace"]> {
        const cache = this.cacheFor(model);
        if (!cache.trace || cache.trace.N !== model.N) {
            const samples = epicycleTrace(cache.analysis, model.N);
            cache.trace = {N: model.N, ...xy(samples), samples};
        }
        return cache.trace;
    }

    protected errorOf(model: EpicycleModel): number {
        const cache = this.cacheFor(model);
        if (!cache.error || cache.error.N !== model.N) {
            cache.error = {N: model.N, value: maxTraceError(cache.analysis, model.N, this.loopOf(model).samples, this.traceOf(model).samples)};
        }
        return cache.error.value;
    }

    protected override onSceneRemoved(): void {
        this.vertexHandles = [];
        this.controlHandles = [];
        this.cache = undefined;
    }

    // ---- Model operations ---------------------------------------------------------------------------------------------

    /** Applies an accepted edit (it pauses playback); a refused one throws a `DomainError` with the model's reason. */
    private accepted(edit: EpicycleEdit, options: { syncScene?: boolean } = {}): void {
        if (!edit.ok) throw new DomainError(epicycleIssueMessage(edit.issue));
        if (edit.model === this.model) return;
        this.halt();
        this.refusals.clear();
        this.commitModel(edit.model, options);
        this.notifyHost();
    }

    setN(value: unknown): void {
        this.accepted(setEpicycleN(this.model, value));
    }

    setParametrization(value: unknown): void {
        this.accepted(setEpicycleParametrization(this.model, value));
    }

    setExample(value: unknown): void {
        const edit = chooseEpicycleExample(this.model, value);
        if (!edit.ok) throw new DomainError(epicycleIssueMessage(edit.issue));
        // Choosing an example gives t = 0, stopped, even when the loop is the same.
        this.resetTime();
        this.commitModel(edit.model);
    }

    setVertex(index: unknown, x: unknown, y: unknown, options: { syncScene?: boolean } = {}): void {
        this.accepted(moveEpicycleVertex(this.model, index, x, y), options);
    }

    setControl(index: unknown, which: unknown, x: unknown, y: unknown, options: { syncScene?: boolean } = {}): void {
        this.accepted(moveEpicycleControl(this.model, index, which, x, y), options);
    }

    /** An inspector edit: a refusal goes to the graph's one notice, an accepted change (even a no-op) clears it. Returns whether it applied. */
    private attempt(action: () => void): boolean {
        return guard(this.refusals, action);
    }

    /** A drag edit: the refusal says the point stays; repeated frames of one refusal are not announced again (decision 17). */
    private attemptDrag(action: () => void): boolean {
        try {
            action();
        } catch (error) {
            if (!(error instanceof DomainError)) throw error;
            if (error.reason) this.refusals.refuse(message("epicycle_rejected", {value0: error.reason}));
            return false;
        }
        this.refusals.clear();
        return true;
    }

    protected override lessonFunctionActions(): FunctionLessonActions {
        const parameters: Record<string, (value: number) => void> = {
            "epicycle-n": value => this.setN(value),
            "epicycle-time": value => this.setTime(value),
        };
        for (let i = 0; i < MAX_VERTICES; i++) {
            parameters[`epicycle-vertex-${i}-x`] = value => this.setVertex(i, value, this.model.vertices[i]?.y);
            parameters[`epicycle-vertex-${i}-y`] = value => this.setVertex(i, this.model.vertices[i]?.x, value);
            for (const which of [1, 2] as const) {
                const current = (axis: "x" | "y") => {
                    const span = this.model.spans[i];
                    return span?.kind === "cubic" ? (which === 1 ? span.c1 : span.c2)[axis] : undefined;
                };
                parameters[`epicycle-control-${i}-${which}-x`] = value => this.setControl(i, which, value, current("y"));
                parameters[`epicycle-control-${i}-${which}-y`] = value => this.setControl(i, which, current("x"), value);
            }
        }
        return {
            parameters,
            choices: {
                "epicycle-example": value => this.setExample(value),
                "epicycle-parametrization": value => this.setParametrization(value),
            },
        };
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected createScene(): void {
        const board = this.board;
        const strokeWidth = this.displayStrokeWidth;
        const thin = this.displayThinWidth(0.6);
        const curve = (attributes: object, data: () => { x: number[]; y: number[] }) => {
            const created = this.own(board.create("curve", [[], []], {highlight: false, fixed: true, ...attributes})) as unknown as FillCurve;
            created.updateDataArray = () => {
                const samples = data();
                created.dataX = samples.x;
                created.dataY = samples.y;
            };
        };

        // Layers, lowest first: the control polygon, the original loop, the circles, the chain, the trace, the handles.
        curve({strokeColor: COLORS.polygon, strokeWidth: thin, dash: 2}, () => this.polygonData(this.model));
        curve({strokeColor: COLORS.loop, strokeWidth}, () => closed(this.loopOf(this.model)));
        curve({strokeColor: COLORS.circles, strokeWidth: thin}, () => this.circlesData(this.model).circles);
        curve({strokeColor: COLORS.chain, strokeWidth}, () => this.circlesData(this.model).chain);
        curve({strokeColor: COLORS.trace, strokeWidth: () => this.displaySettings.strokeWidth * 1.4}, () => this.traceData(this.model));

        const markerSize = () => Math.max(4, this.displaySettings.pointSize * 0.9);
        const handle = (exists: () => boolean, face: string, color: string, size: () => number, drag: (point: JXG.Point) => void) => {
            const point = this.own(board.create("point", [0, 0], {
                ...this.styles.point.default, name: "", withLabel: false, face, size, fillColor: color, strokeColor: color, highlightFillColor: color,
                visible: exists,
            })) as JXG.Point;
            point.on("drag", () => drag(point));
            return point;
        };
        this.vertexHandles = Array.from({length: MAX_VERTICES}, (_, i) => handle(
            () => i < this.model.vertices.length, "o", COLORS.vertex, markerSize, point => this.dragVertex(i, point)));
        const controlHandles: JXG.Point[] = [];
        for (let i = 0; i < MAX_VERTICES; i++) {
            for (const which of [1, 2] as const) {
                controlHandles.push(handle(
                    () => this.model.spans[i]?.kind === "cubic", "[]", COLORS.control, () => Math.max(3, markerSize() * 0.8), point => this.dragControl(i, which, point)));
            }
        }
        this.controlHandles = controlHandles;
        this.syncSceneToModel();
    }

    private dragVertex(index: number, point: JXG.Point): void {
        const x = snapEpicycleValue(point.X());
        const y = snapEpicycleValue(point.Y());
        this.attemptDrag(() => this.setVertex(index, x, y, {syncScene: false}));
        this.syncSceneToModel();
    }

    private dragControl(index: number, which: 1 | 2, point: JXG.Point): void {
        const x = snapEpicycleValue(point.X());
        const y = snapEpicycleValue(point.Y());
        this.attemptDrag(() => this.setControl(index, which, x, y, {syncScene: false}));
        this.syncSceneToModel();
    }

    /** Moves the handles that are not already at the model's position (a rejected drag returns its handle to the last valid one). */
    protected override syncSceneToModel(): void {
        const place = (point: JXG.Point | undefined, x: number, y: number) => {
            if (point && (point.X() !== x || point.Y() !== y)) point.moveTo([x, y]);
        };
        this.model.vertices.forEach((v, i) => place(this.vertexHandles[i], v.x, v.y));
        this.model.spans.forEach((span, i) => {
            if (span.kind !== "cubic") return;
            place(this.controlHandles[2 * i], span.c1.x, span.c1.y);
            place(this.controlHandles[2 * i + 1], span.c2.x, span.c2.y);
        });
    }

    /** The cubic arcs' control polygons a, c1, c2, b as one NaN-separated polyline. */
    private polygonData(model: EpicycleModel): { x: number[]; y: number[] } {
        const x: number[] = [];
        const y: number[] = [];
        const m = model.vertices.length;
        model.spans.forEach((span, i) => {
            if (span.kind !== "cubic") return;
            const a = model.vertices[i];
            const b = model.vertices[(i + 1) % m];
            if (x.length > 0) {
                x.push(NaN);
                y.push(NaN);
            }
            for (const p of [a, span.c1, span.c2, b]) {
                x.push(p.x);
                y.push(p.y);
            }
        });
        return {x, y};
    }

    /** The arm chain and the circles at the current time: the only data that a time step recomputes. */
    private circlesData(model: EpicycleModel): { chain: { x: number[]; y: number[] }; circles: { x: number[]; y: number[] } } {
        const {points} = epicycleChain(this.analysisOf(model).coefficients, model.N, this.timeValue);
        const chain = {x: [0, ...points.map(p => p.re)], y: [0, ...points.map(p => p.im)]};
        const cx: number[] = [];
        const cy: number[] = [];
        for (let i = 0; i + 1 < points.length; i++) {
            const centre = points[i];
            const radius = Math.hypot(points[i + 1].re - centre.re, points[i + 1].im - centre.im);
            if (i > 0) {
                cx.push(NaN);
                cy.push(NaN);
            }
            for (let j = 0; j <= EPICYCLE_CIRCLE_SEGMENTS; j++) {
                const angle = (TWO_PI * j) / EPICYCLE_CIRCLE_SEGMENTS;
                cx.push(centre.re + radius * Math.cos(angle));
                cy.push(centre.im + radius * Math.sin(angle));
            }
        }
        return {chain, circles: {x: cx, y: cy}};
    }

    /** At t = 0 and stopped the whole trace (to compare S_N with the loop); otherwise the part up to t, ending at the chain tip. */
    private traceData(model: EpicycleModel): { x: number[]; y: number[] } {
        const trace = this.traceOf(model);
        if (!this.playingValue && this.timeValue === 0) return closed(trace);
        const count = Math.floor((this.timeValue / TWO_PI) * trace.x.length) + 1;
        const tip = epicycleChain(this.analysisOf(model).coefficients, model.N, this.timeValue).sum;
        return {x: [...trace.x.slice(0, count), tip.re], y: [...trace.y.slice(0, count), tip.im]};
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    private number(value: number, decimals = 4): string {
        return formatNumber(value, currentLanguage(), decimals);
    }

    private exampleText(id: EpicycleExampleId | "custom"): string {
        const names = {
            circle: t("epicycle_example_circle"), diamond: t("epicycle_example_diamond"), uneven: t("epicycle_example_uneven"),
            custom: t("epicycle_example_custom"),
        };
        return names[id];
    }

    protected renderControls(): React.ReactNode {
        const state = this.model;
        const example = matchEpicycleExample(state);
        const options = [
            ...EPICYCLE_EXAMPLE_IDS.map(id => ({value: id, text: this.exampleText(id)})),
            ...(example === undefined ? [{value: "custom", text: this.exampleText("custom"), disabled: true}] : []),
        ];
        const parametrizationText = {equal: t("epicycle_param_equal"), chord: t("epicycle_param_chord")};
        const analysis = this.analysisOf(state);
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("epicycle_example_label")} value={example ?? "custom"} options={options}
                              onChange={next => this.attempt(() => this.setExample(next))}/>
            </div>
            <div className="inspector-group">
                <Slider customText={t("epicycle_n_label")} min={0} max={EPICYCLE_MAX_N} step={1} value={state.N}
                        rejectedHint={renderMessage(epicycleIssueMessage({kind: "n", min: 0, max: EPICYCLE_MAX_N}))}
                        onChange={(next: number) => this.attempt(() => this.setN(next))}
                        onTypedChange={(next: number) => guardField(this.refusals, () => this.setN(next))}/>
                {state.N >= EPICYCLE_MAX_N && <p className="inspector-help" data-testid="epicycle-n-cap">
                    {t("epicycle_n_cap", {value0: EPICYCLE_MAX_N, value1: 2 * EPICYCLE_MAX_N})}</p>}
            </div>
            <div className="inspector-group">
                <ChoiceSelect label={t("epicycle_param_label")} value={state.parametrization} help={t("epicycle_param_help")}
                              options={EPICYCLE_PARAMETRIZATIONS.map(id => ({value: id, text: parametrizationText[id]}))}
                              onChange={next => this.attempt(() => this.setParametrization(next))}/>
                {state.parametrization === "chord" && analysis.fellBack
                    && <ReadoutHelp hooks={{"data-testid": "epicycle-chord-fallback"}}>{t("epicycle_chord_fallback")}</ReadoutHelp>}
            </div>
            <EpicyclePlayback graph={this}/>
            <InspectorDisclosure title={t("epicycle_handles_summary")}>
                {this.renderHandleFields(state)}
            </InspectorDisclosure>
        </>;
    }

    private renderHandleFields(state: EpicycleModel): React.ReactNode {
        const hint = renderMessage(epicycleIssueMessage({kind: "coordinate", min: EPICYCLE_COORDINATE_MIN, max: EPICYCLE_COORDINATE_MAX}));
        const field = (key: string, label: string, value: number, apply: (value: number) => void) =>
            <NumberInput key={key} label={label} value={value} min={EPICYCLE_COORDINATE_MIN} max={EPICYCLE_COORDINATE_MAX} step={EPICYCLE_VALUE_STEP}
                         bigStep={EPICYCLE_VALUE_BIG_STEP} decimals={2} rejectedHint={hint} onChange={next => guardField(this.refusals, () => apply(next))}/>;
        const vertex = (i: number, axis: "x" | "y") => field(
            `v${i}${axis}`, t("epicycle_vertex_coordinate", {value0: i + 1, value1: axis}), state.vertices[i][axis],
            next => this.setVertex(i, axis === "x" ? next : this.model.vertices[i].x, axis === "y" ? next : this.model.vertices[i].y));
        const control = (i: number, which: 1 | 2, axis: "x" | "y") => {
            const span = state.spans[i];
            const read = (model: EpicycleModel) => {
                const s = model.spans[i];
                return s.kind === "cubic" ? (which === 1 ? s.c1 : s.c2) : {x: 0, y: 0};
            };
            return field(`c${i}${which}${axis}`, t("epicycle_control_coordinate", {value0: i + 1, value1: which, value2: axis}),
                span.kind === "cubic" ? read(state)[axis] : 0,
                next => this.setControl(i, which, axis === "x" ? next : read(this.model).x, axis === "y" ? next : read(this.model).y));
        };
        return <div className="epicycle-fields">
            {state.vertices.map((_, i) => <React.Fragment key={i}>{vertex(i, "x")}{vertex(i, "y")}</React.Fragment>)}
            {state.spans.map((span, i) => span.kind === "cubic"
                ? <React.Fragment key={`c${i}`}>{control(i, 1, "x")}{control(i, 1, "y")}{control(i, 2, "x")}{control(i, 2, "y")}</React.Fragment>
                : null)}
            <p className="inspector-help">{t("epicycle_handles_help")}</p>
        </div>;
    }

    protected renderReadout(): React.ReactNode {
        const state = this.model;
        const analysis = this.analysisOf(state);
        const {centre, terms} = epicycleTerms(analysis, state.N);
        const largest = terms.length === 0 ? undefined : terms.reduce((best, term) => (term.modulus > best.modulus ? term : best));
        const rows = [{k: 0, modulus: centre}, ...terms];
        return <>
            <EpicycleStatus graph={this} lines={[{id: "status", text: largest
                ? t("epicycle_status", {
                    value0: state.N, value1: rows.length, value2: largest.k, value3: this.number(largest.modulus, 4), value4: this.number(this.errorOf(state), 5),
                })
                : t("epicycle_status_no_rotating", {value0: state.N, value1: rows.length, value2: this.number(this.errorOf(state), 5)})}]}/>
            <EpicycleTable rows={rows}/>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        return <FunctionLegend items={[
            {id: "chain", color: COLORS.chain, label: t("epicycle_legend_chain"), kind: "line"},
            {id: "circles", color: COLORS.circles, label: t("epicycle_legend_circles"), kind: "line"},
            {id: "trace", color: COLORS.trace, label: t("epicycle_legend_trace"), kind: "line"},
            {id: "loop", color: COLORS.loop, label: t("epicycle_legend_loop"), kind: "line"},
            {id: "polygon", color: COLORS.polygon, label: t("epicycle_legend_polygon"), kind: "dashed-line"},
            {id: "vertices", color: COLORS.vertex, label: t("epicycle_legend_vertices"), kind: "dot"},
            {id: "controls", color: COLORS.control, label: t("epicycle_legend_controls"), kind: "diamond"},
        ]}/>;
    }
}

/** The terms in chain order with |c_k|: the text alternative of the picture, scrolling within the inspector. */
function EpicycleTable(props: { rows: readonly { k: number; modulus: number }[] }) {
    const text = useT();
    const language = currentLanguage();
    return <div className="inspector-group">
        <div className="epicycle-table" data-testid="epicycle-table">
            <ReadoutScrollTable label={text("epicycle_table_summary")}>
            <table>
                <caption>{text("epicycle_table_summary")}</caption>
                <thead><tr><th scope="col">{text("epicycle_table_k")}</th><th scope="col">{text("epicycle_table_modulus")}</th></tr></thead>
                <tbody>
                {props.rows.map(row => <tr key={row.k} data-k={row.k}>
                    <th scope="row">{formatNumber(row.k, language, 0)}</th>
                    <td>{formatNumber(row.modulus, language, 4)}</td>
                </tr>)}
                </tbody>
            </table>
            </ReadoutScrollTable>
        </div>
    </div>;
}

/** Play or pause and the time slider: host state, so only this part re-renders on a frame. */
function EpicyclePlayback(props: { graph: EpicycleGraph }) {
    const text = useT();
    const {graph} = props;
    useSyncExternalStore(graph.subscribeHost, graph.hostSnapshot);
    const language = currentLanguage();
    return <div className="inspector-group">
        <PlaybackButtons groupLabel={text("epicycle_playback_group")} playing={graph.playing}
                         playBlock={!graph.playing && graph.reducedMotion() ? "reduced-motion" : undefined}
                         onPlayPause={() => (graph.playing ? graph.pause() : graph.play())}/>
        <Slider customText={text("epicycle_time_label")} min={0} max={6.28} step={0.01} value={Math.min(graph.time, 6.28)}
                formatValue={value => formatNumber(value / TWO_PI, language, 2)}
                onChange={(next: number) => { try { graph.setTime(next); } catch (error) { if (!(error instanceof DomainError)) throw error; } }}/>
        <p className="inspector-help">{text("epicycle_playback_help")}</p>
    </div>;
}

/** The status sentence and its one announcement region, silent while the run plays (the host state is read here, not in the inspector). */
function EpicycleStatus(props: { graph: EpicycleGraph; lines: readonly FunctionStatusLine[] }) {
    const {graph} = props;
    useSyncExternalStore(graph.subscribeHost, graph.hostSnapshot);
    return <FunctionStatus className="epicycle-status" lines={props.lines} dataAttribute="epicycle-status" muted={graph.playing}/>;
}

export default EpicycleGraph;
