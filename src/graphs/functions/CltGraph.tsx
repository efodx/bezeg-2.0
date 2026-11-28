import React from "react";
import type JXG from "jsxgraph";
import {BoundingBox, DomainError, FunctionLessonActions, FunctionPanel} from "./BaseFunctionGraph";
import IterativeFunctionGraph, {IterationActionId} from "./IterativeFunctionGraph";
import type {GraphDeclaration} from "../base/declare/graphDeclaration";
import type {Lease, ParameterBinding} from "../base/writes/parameterArbiter";
import {runAs} from "../base/writes/writeSource";
import {PuckOwned, PuckOwnedGroup} from "../base/controls/PuckOwnership";
import Slider from "../../inputs/Slider";
import {CountSetter} from "../../inputs/CountSetter";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {PlaybackButtons, playbackBlocks} from "../base/controls/PlaybackButtons";
import {guard, guardField} from "../base/controls/guard";
import {FunctionStatus} from "./FunctionStatus";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import {currentLanguage, Message, message, renderMessage, t} from "../../localization";
import {formatNumber, formatSignificant} from "../../analysis/format";
import {
    CLT_EXAMPLE_IDS, CLT_HEIGHT_COUNT, CLT_HEIGHT_MAX, CLT_N_MAX, CltCurve, CltEdit, cltExampleOf, CltModel, cltView, CltViewResult,
    chooseCltExample, DEFAULT_CLT_MODEL, fitCltView, isCltExampleId, setCltCdf, setCltHeight, setCltN,
} from "../../analysis/cltModel";
import {IterationOutcome} from "../../learning/runtime/iterationController";
import {cltDistance, cltEditMessage, cltNumber} from "./cltMessages";
import {functionPresetCollections} from "./functionPresetCollections";

const CLT_COLORS = {sum: "#2468a2", normal: "#bd6047"} as const;

/** Time between two playback steps: one copy added per interval, never more than one per frame (ADR 0012). */
export const CLT_STEP_INTERVAL_MS = 700;

/**
 * The ids of the declaration: the number of copies n is a board count puck, the distribution function a switch puck, and Next step, Play
 * and Reset are board actions; the heights and the example stay in Orodja. The legend names the two curves.
 */
export type CltIds = {
    param: "clt-n";
    row: "n" | "mean" | "variance" | "sum-mean" | "sum-variance" | "kolmogorov" | "mass-residual";
    note: "clt"; legend: "sum" | "normal"; section: never; action: IterationActionId | "cdf";
};

/** The value of a curve at x by linear interpolation; NaN outside its grid (the marks leave such a sample out). */
function curveFunction(curve: CltCurve): (x: number) => number {
    return x => {
        const xs = curve.x;
        if (xs.length === 0 || x < xs[0] || x > xs[xs.length - 1]) return NaN;
        let low = 0;
        let high = xs.length - 1;
        while (high - low > 1) {
            const middle = (low + high) >> 1;
            if (xs[middle] <= x) low = middle; else high = middle;
        }
        const span = xs[high] - xs[low];
        return span === 0 ? curve.y[low] : curve.y[low] + (curve.y[high] - curve.y[low]) * (x - xs[low]) / span;
    };
}

/**
 * The central limit theorem without randomness (lesson P3): the standardized density (or CDF) of the sum of n independent
 * copies of a piecewise linear base density, drawn over the standard normal curve on a fixed view. The model is
 * `{heights, n, cdf}` (`src/analysis/cltModel`); the iteration index is n (n - 1 additions), so Next step adds one copy
 * (one convolution thanks to the model's history cache) and Reset returns to n = 1.
 *
 * Board objects (the count does not depend on n): the n-fold curve and the normal curve, both rebuilt from point lists on
 * every board update. The base shape is edited with sliders and number fields in the inspector (no handles
 * on the board: the board shows the standardized sum, whose coordinates are not the base shape's).
 *
 * Playback writes n, which is a board puck: Play takes an animation lease on it (ADR 0064) and every tick runs inside it, so a
 * learner or lesson write of n ends the playback at once and the declaration needs no other hook of the iteration base.
 */
export class CltGraph extends IterativeFunctionGraph<CltModel> {
    /** The elements the legend names, by the `object` id of their legend entry (`drawnObject`); cleared when the scene is rebuilt. */
    private readonly drawn = new Map<string, JXG.GeometryElement>();
    /** The lease of the running playback on n; absent while paused. */
    private playLease?: Lease;

    override presetCollection() {
        return functionPresetCollections["prob-clt"];
    }

    protected defaultModel(): CltModel {
        return {...DEFAULT_CLT_MODEL, heights: [...DEFAULT_CLT_MODEL.heights]};
    }

    protected defaultBoundingBox(): BoundingBox {
        return fitCltView(DEFAULT_CLT_MODEL);
    }

    /** The plot is a density in standardized units: the axes have different scales. */
    protected override get equalAxisUnits(): boolean {
        return false;
    }

    /** The view follows the base shape (its peak sets the top) and the density/CDF choice, not n. */
    protected override exampleView() {
        return {key: `${this.model.heights.join(",")}|${this.model.cdf}`, box: fitCltView(this.model)};
    }

    private viewOf(model: CltModel): CltViewResult {
        return this.memoView(model, () => cltView(model));
    }

    // ---- Iteration -----------------------------------------------------------------------------------------------

    protected animationId(): string {
        return "clt-sum";
    }

    protected stepIntervalMs(): number {
        return CLT_STEP_INTERVAL_MS;
    }

    protected iterationIndex(model: CltModel): number {
        return model.n - 1;
    }

    protected canAdvance(): boolean {
        return this.model.n < CLT_N_MAX;
    }

    protected cannotAdvanceMessage(): Message {
        return message("prob_clt_cannot_advance", {value0: CLT_N_MAX});
    }

    /** Adds one copy: n + 1. A playback tick runs inside the lease on n; Next step is the learner's own write. */
    protected transition(): IterationOutcome {
        const lease = this.playLease;
        if (lease === undefined || !this.playback.isPlaying) return this.addCopy();
        let outcome: IterationOutcome = "complete";
        if (lease.run(() => { outcome = this.addCopy(); })) {
            if (outcome === "complete") this.releaseLease();
            return outcome;
        }
        return "complete"; // the lease ended under this tick: the playback was stopped by the write that ended it
    }

    private addCopy(): IterationOutcome {
        if (!this.canAdvance()) return "complete";
        const next = setCltN(this.model, this.model.n + 1);
        if (!next.ok) return "complete";
        this.commitModel(next.model);
        return next.model.n < CLT_N_MAX ? "continue" : "complete";
    }

    /** Play: leases n first (inside the learner's press or the lesson command), then starts the ticks; no lease is kept for a playback that did not start. */
    protected override play(): void {
        this.releaseLease();
        this.playLease = this.parameters?.lease(["clt-n"], reason => {
            if (reason === "released") return;
            this.playLease = undefined;
            this.pauseIteration(); // a learner or lesson write of n, or a lesson frame, took the key
        });
        if (this.parameters && !this.playLease) return; // the learner holds n: the arbiter refuses the lease, so playback does not start
        super.play();
        if (!this.playback.isPlaying) this.releaseLease();
    }

    private releaseLease(): void {
        const lease = this.playLease;
        this.playLease = undefined;
        lease?.release();
    }

    protected override pauseIteration(): void {
        this.releaseLease();
        super.pauseIteration();
    }

    override importPresetData(data: CltModel): void {
        this.releaseLease();
        super.importPresetData(data);
    }

    /** Back to n = 1 with the same shape; playback stops. */
    protected resetIteration(): void {
        this.replaceModel({...this.model, n: 1});
        this.refusals.clear(); // the button and the lesson reset/replay commands both land here
    }

    // ---- Model operations (read and write the synchronous model) ------------------------------

    private accepted(edit: CltEdit): CltModel {
        if (!edit.ok) throw new DomainError(cltEditMessage(edit.issue));
        return edit.model;
    }

    /** Runs an inspector change: a refusal is shown alone in the graph's refusal notice, an accepted change clears it. */
    private guarded(action: () => void): boolean {
        return guard(this.refusals, action);
    }

    /** Shows the whole standardized plot when the edit changed what the fixed view depends on (peak, density or CDF). */
    private refitIfChanged(before: CltModel, after: CltModel): void {
        if (this.generatedObjectCount === 0) return;
        const view = fitCltView(after);
        const previous = fitCltView(before);
        if (view.some((value, index) => value !== previous[index])) this.boardView.setIntent(view, {keepAspectRatio: this.equalAxisUnits});
    }

    private replaceAndRefit(next: CltModel): void {
        const before = this.model;
        this.replaceModel(next);
        this.refitIfChanged(before, next);
    }

    /** Sets one base height: the shape is a new base, so the history restarts at the same n and playback stops. */
    protected setHeight(index: unknown, value: unknown): void {
        const next = this.accepted(setCltHeight(this.model, index, value));
        if (next !== this.model) this.replaceAndRefit(next);
        else this.pauseIteration();
    }

    protected setN(value: unknown): void {
        const next = this.accepted(setCltN(this.model, value));
        if (next !== this.model) this.replaceModel(next);
    }

    protected setCdf(value: unknown): void {
        const before = this.model;
        const next = this.accepted(setCltCdf(before, value));
        if (next === before) return;
        this.commitModel(next);
        this.refitIfChanged(before, next);
    }

    protected setExample(id: unknown): void {
        const next = this.accepted(chooseCltExample(this.model, id));
        if (next !== this.model) this.replaceAndRefit(next);
        else this.pauseIteration();
    }

    /**
     * Lesson steps go through the same validated setters as the inspector, so a refused value throws a DomainError. An
     * example step restarts the history at n = 1, pauses playback and refits like the UI; n keeps the view, and the CDF
     * step refits only when the plot height changes.
     */
    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {"clt-n": value => this.setN(value)},
            visibility: {"clt-cdf": visible => this.setCdf(visible)},
            choices: {"clt-example": value => this.setExample(value)},
        };
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected createScene(): void {
        const board = this.board;
        const strokeWidth = () => this.displaySettings.strokeWidth;

        const polyline = (id: string, color: string, dash: number, data: () => { x: number[]; y: number[] }) => {
            const curve = this.own(board.create("curve", [[], []], {
                strokeColor: color, dash, fillOpacity: 0, highlight: false, fixed: true, strokeWidth,
            })) as unknown as { updateDataArray: () => void; dataX: number[]; dataY: number[] };
            curve.updateDataArray = () => {
                const {x, y} = data();
                curve.dataX = x;
                curve.dataY = y;
            };
            this.drawn.set(id, curve as unknown as JXG.GeometryElement);
        };
        const empty = {x: [] as number[], y: [] as number[]};
        polyline("normal", CLT_COLORS.normal, 2, () => {
            const result = this.viewOf(this.model);
            return result.ok ? result.view.normal : empty;
        });
        polyline("sum", CLT_COLORS.sum, 0, () => {
            const result = this.viewOf(this.model);
            return result.ok ? result.view.curve : empty;
        });
        // No caption: its two lines (n and the Kolmogorov distance) are rows of the Odčitki card.
    }

    protected override onSceneRemoved(): void {
        super.onSceneRemoved();
        this.drawn.clear();
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const state = this.model;
        const language = currentLanguage();
        const example = cltExampleOf(state);
        const options = [
            ...CLT_EXAMPLE_IDS.map(id => ({value: id, text: t(id === "uniform" ? "prob_clt_example_uniform" : "prob_clt_example_skewed")})),
            ...(example === undefined ? [{value: "custom", text: t("prob_clt_example_custom")}] : []),
        ];
        const playing = this.playback.isPlaying;
        const atMax = state.n >= CLT_N_MAX;
        return <>
            <div className="inspector-group">
                <PlaybackButtons placement="graph" groupLabel={t("prob_clt_iteration_controls")} playing={playing}
                                 nextLabel={t("prob_clt_next_step")} resetLabel={t("prob_clt_reset")}
                                 {...playbackBlocks({atStart: state.n === 1, atEnd: atMax, playing})}
                                 onNext={() => this.guarded(() => this.nextStep())}
                                 onPlayPause={() => { if (playing) this.pauseIteration(); else this.play(); }}
                                 onReset={() => this.resetIteration()}/>
                <p className="inspector-help">{t("prob_clt_playback_note")}</p>
                <PuckOwned param="clt-n"><CountSetter label={t("prob_clt_n_label")} n={state.n} min={1} max={CLT_N_MAX}
                        rejectedHint={t("prob_clt_n_rejected", {value0: CLT_N_MAX})}
                        onPlus={() => this.guarded(() => this.setN(state.n + 1))} onMinus={() => this.guarded(() => this.setN(state.n - 1))}
                        onSet={next => guardField(this.refusals, () => this.setN(next))}/></PuckOwned>
            </div>
            <div className="inspector-group">
                {state.heights.map((height, index) => <Slider key={index}
                    customText={t("prob_clt_height_label", {value0: index + 1, value1: formatNumber(index / (CLT_HEIGHT_COUNT - 1), language, 2)})}
                    min={0} max={CLT_HEIGHT_MAX} step={0.05} value={height}
                    rejectedHint={t("prob_clt_zero_rejected")} onChange={next => this.guarded(() => this.setHeight(index, next))}
                    onTypedChange={next => guardField(this.refusals, () => this.setHeight(index, next))}/>)}
                <p className="inspector-help">{t("prob_clt_heights_help")}</p>
            </div>
            <div className="inspector-group">
                <ChoiceSelect label={t("prob_clt_example_label")} value={example ?? "custom"} help={t("prob_clt_example_help")} options={options}
                              onChange={next => { if (isCltExampleId(next)) this.guarded(() => this.setExample(next)); }}/>
            </div>
            <PuckOwnedGroup params={["cdf"]} className="inspector-group">
                <PuckOwned param="cdf"><OnOffSwitch checked={state.cdf} label={t("prob_clt_cdf_label")} onChange={next => this.guarded(() => this.setCdf(next))}/></PuckOwned>
            </PuckOwnedGroup>
        </>;
    }

    // ---- Declaration (task 08) ---------------------------------------------------------------------------------------

    /** Parameter writes (ADR 0064): n is the one bound key; playback writes it as `animation` under a lease. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {"clt-n": {read: () => this.model.n, apply: (value: number) => this.setN(value)}};
    }

    /**
     * The common declaration (rows, note, status, view marks) plus n as a board count puck, the distribution function as a switch puck,
     * the playback actions and the legend of the two curves. The frame follows the base shape and the density or distribution choice, not
     * the lesson scene's stored box, so the curves stay clear of the cards. The heights and the example stay in Orodja.
     */
    protected override declaration(): GraphDeclaration {
        return {
            ...this.commonDeclaration(),
            followView: fitCltView(this.model),
            parameters: [
                {key: "clt-n", kind: "count", label: message("prob_clt_n_name"), symbol: "n", placement: "board", min: 1, max: CLT_N_MAX},
            ],
            legend: [
                {id: "sum", label: message("prob_clt_legend_sum"), kind: "line", object: "sum"},
                {id: "normal", label: message("prob_clt_legend_normal"), kind: "dashed", object: "normal"},
            ],
            actions: [
                ...this.iterationActions(),
                {id: "cdf", label: message("prob_clt_cdf_name"), help: message("prob_clt_cdf_label"), placement: "board", enabled: true, pressed: this.model.cdf, puck: true},
            ],
        };
    }

    override performAction(id: string): void {
        if (id === "cdf") runAs("learner", () => this.guarded(() => this.setCdf(!this.model.cdf)));
        else if (!this.performIterationAction(id)) throw new Error("Unknown action");
    }

    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const drawn = this.drawn.get(id);
        if (!drawn) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const element = drawn as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        return {color: String(element.evalVisProp("strokecolor")), visible: Boolean(element.evalVisProp("visible"))};
    }

    /**
     * The rows of the inspector as declared data: the values the removed board caption gave (n, the Kolmogorov distance) and the
     * moments, the note, and the statuses. The marks are the two curves and the points the learner compares: the normal curve at
     * -3, 0 and 3 (its peak in the density view) and the highest point of the sum.
     */
    protected override functionPanel(): FunctionPanel {
        const model = this.model;
        const language = currentLanguage();
        const result = this.viewOf(model);
        const formatted = (text: string) => ({kind: "formatted" as const, text});
        const rows = result.ok ? [
            {id: "n" as const, name: message("prob_clt_readout_n"), value: formatted(String(model.n))},
            {id: "mean" as const, name: message("prob_clt_readout_mean"), value: formatted(cltNumber(result.view.mean, language))},
            {id: "variance" as const, name: message("prob_clt_readout_variance"), value: formatted(cltNumber(result.view.variance, language))},
            {id: "sum-mean" as const, name: message("prob_clt_readout_sum_mean"), value: formatted(cltNumber(result.view.sumMean, language))},
            {id: "sum-variance" as const, name: message("prob_clt_readout_sum_variance"), value: formatted(cltNumber(result.view.sumVariance, language))},
            {id: "kolmogorov" as const, name: message("prob_clt_readout_kolmogorov"), value: formatted(cltDistance(result.view.kolmogorov, language))},
            {id: "mass-residual" as const, name: message("prob_clt_readout_residual"), value: formatted(formatSignificant(result.view.massResidual, language, 3))},
        ] : [{id: "n" as const, name: message("prob_clt_readout_n"), value: formatted(String(model.n))}];
        const status: {id: string; text: Message; tone?: "warning" | "muted"}[] = [];
        if (!result.ok) status.push({id: "failed", text: cltEditMessage(result.issue), tone: "warning"});
        if (model.n >= CLT_N_MAX) status.push({id: "max-n", text: this.cannotAdvanceMessage(), tone: "muted"});
        if (!result.ok) return {rows, notes: [{id: "clt", text: message("prob_clt_note")}], status};
        const normal = curveFunction(result.view.normal);
        const top = result.view.curve.y.reduce((best, value, index) => value > result.view.curve.y[best] ? index : best, 0);
        return {
            rows,
            notes: [{id: "clt", text: message("prob_clt_note")}],
            ...(status.length > 0 ? {status} : {}),
            plotted: [normal, curveFunction(result.view.curve)],
            must: [-3, 0, 3].map(x => ({x, y: normal(x)})).concat([{x: result.view.curve.x[top], y: result.view.curve.y[top]}]),
        };
    }

    protected renderReadout(): React.ReactNode {
        const status = this.functionPanel().status ?? [];
        return <>
            {this.renderDeclaredReadout()}
            <FunctionStatus dataAttribute="prob-clt-status" lines={status.map(line => ({id: line.id, text: renderMessage(line.text)}))} muted={this.playback.isPlaying}/>
        </>;
    }
}

export default CltGraph;
